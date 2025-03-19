import redis, httpx, json, time
from fastapi import FastAPI, Request, HTTPException
from TokenBucket import TokenBucket
from math import floor

app = FastAPI()

# create redis cache
cache = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

services = {
    "light": "http://localhost:8001",
    "heavy": "http://localhost:8002",
}

user_plans = {
    "basic": {"capacity": 100, "refill_rate": 1},
    "premium": {"capacity": 500, "refill_rate": 5}
}

def handle_request(db, key, user_plan, tokens_required: int = 1) -> bool:
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
        db.set(key, json.dumps(bucket))
        return True
    else:
        db.set(key, json.dumps(bucket))
        return False

@app.get("/request/{service}")
async def get_data(service: str, request: Request):
    """
    API gateway routes based on service type
    """
    if service not in services:
        raise HTTPException(status_code=400, detail="Invalid service type")
    
    user_id = request.client.host
    plan_key = f"{user_id}:plan"
    bucket_key = f"{user_id}:bucket"

    # get/update user plan
    user_plan = cache.get(plan_key)
    if not user_plan:
        user_plan = "basic"
        cache.set(plan_key, user_plan)

    if not handle_request(cache, bucket_key, user_plan):
        raise HTTPException(status_code=429, detail="Too many requests")

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{services[service]}/data")
        return response.json()

@app.put("/user/plan/{new_plan}")
async def update_plan(new_plan: str, request: Request):
    if new_plan not in user_plans:
        raise HTTPException(status_code=400, detail="Invalid plan")

    user_id = request.client.host
    plan_key = f"{user_id}:plan"

    cache.set(plan_key, new_plan)
    return {"message": f"Plan updated to {new_plan}"}
