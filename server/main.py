import redis, httpx, json, time
from fastapi import FastAPI, Request, HTTPException, Depends
from math import floor
from auth import hash_password, verify_password, create_access_token, get_current_user

app = FastAPI()

# create redis cache
cache = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

services = {
    "light": ["http://localhost:8001", "http://localhost:8003"],
    "heavy": ["http://localhost:8002", "http://localhost:8004"]
}

user_plans = {
    "basic": {"capacity": 5, "refill_rate": 1},
    "premium": {"capacity": 10, "refill_rate": 1},
}

def handle_request(db, key: str, user_plan: str, tokens_required: int = 1) -> bool:
    """
    db: redis db
    key: bucket_key for db
    user_plan: basic or premium
    return: True if sucessful, False is unsuccessful
    """
    now = time.time()

    # get capacity and refill rate from users plan
    capacity = user_plans[user_plan]["capacity"]
    refill_rate = user_plans[user_plan]["refill_rate"]

    # get/create bucket
    bucket_data = db.get(key)
    if bucket_data:
        bucket = json.loads(bucket_data)
    else:
        bucket = {"tokens": capacity, "last_refill": now}

    # refill the bucket
    elapsed_time = now - bucket["last_refill"]
    refill_count = floor(elapsed_time * refill_rate)
    bucket["tokens"] = min(capacity, bucket["tokens"] + refill_count)
    bucket["last_refill"] = now

    # check if request can be handled and update bucket
    if bucket["tokens"] >= tokens_required:
        bucket["tokens"] -= tokens_required
        db.set(key, json.dumps(bucket), ex=3600)
        return True
    else:
        db.set(key, json.dumps(bucket), ex=3600)
        return False
    
def round_robin(service: str) -> str:
    """
    Increment a Redis counter and pick the instance at index = counter % n.
    """
    counter = cache.incr(f"lb:{service}:counter")
    instances = services[service]
    idx = counter % len(instances)
    return instances[idx]

@app.post("/register", status_code=201)
async def register(username: str, password: str):
    key = f"user:{username}:pass"
    if cache.exists(key):
        raise HTTPException(400, "User already exists")
    cache.set(key, hash_password(password), ex=86400)
    cache.set(f"user:{username}:plan", "basic", ex=86400)
    return {"message": "User registered"}

@app.post("/login")
async def login(username: str, password: str):
    key = f"user:{username}:pass"
    stored = cache.get(key)
    if not stored or not verify_password(password, stored):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(username)
    return {"access_token": token}

@app.get("/request/{service}")
async def get_data(service: str, request: Request, user: str = Depends(get_current_user)):
    """
    API gateway routes based on service type
    """
    if service not in services:
        raise HTTPException(status_code=400, detail="Invalid service type")
    
    plan_key = f"user:{user}:plan"
    bucket_key = f"user:{user}:bucket"

    # get/update user plan
    user_plan = cache.get(plan_key)
    if not user_plan:
        user_plan = "basic"
        cache.set(plan_key, user_plan)

    if not handle_request(cache, bucket_key, user_plan):
        raise HTTPException(status_code=429, detail="Too many requests")

    target = round_robin(service)
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{target}/data")
        return response.json()

@app.put("/user/plan/{new_plan}")
async def update_plan(new_plan: str, user: str = Depends(get_current_user)):
    if new_plan not in user_plans:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan_key = f"user:{user}:plan"

    cache.set(plan_key, new_plan, ex=86400)
    return {"message": f"Plan updated to {new_plan}"}
