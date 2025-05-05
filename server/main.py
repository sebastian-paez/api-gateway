import os
import json
import time
import random
import asyncio
import httpx

from math import floor
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
import redis

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

app = FastAPI()

cache = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True
)

services = {
    "light": ["http://localhost:8001", "http://localhost:8003"],
    "heavy": ["http://localhost:8002", "http://localhost:8004"],
}

user_plans = {
    "basic":   {"capacity": 5,  "refill_rate": 1},
    "premium": {"capacity": 20, "refill_rate": 5},
}

def handle_request(db, key: str, plan: str, tokens_required: int = 1) -> bool:
    now = time.time()
    cap  = user_plans[plan]["capacity"]
    rate = user_plans[plan]["refill_rate"]

    raw = db.get(key)
    if raw:
        bucket = json.loads(raw)
    else:
        bucket = {"tokens": cap, "last_refill": now}

    elapsed = now - bucket["last_refill"]
    bucket["tokens"] = min(cap, bucket["tokens"] + floor(elapsed * rate))
    bucket["last_refill"] = now

    allowed = False
    if bucket["tokens"] >= tokens_required:
        bucket["tokens"] -= tokens_required
        allowed = True

    db.set(key, json.dumps(bucket), ex=3600)
    # plan metrics
    db.incr(f"metrics:plan:{plan}:{'allowed' if allowed else 'blocked'}")
    return allowed

@app.post("/register", status_code=201)
async def register(username: str, password: str):
    pw_key = f"user:{username}:password"
    if cache.exists(pw_key):
        raise HTTPException(400, "User already exists")
    cache.set(pw_key, hash_password(password), ex=86400)
    cache.set(f"user:{username}:plan", "basic", ex=86400)
    return {"message": "User registered"}

@app.post("/login")
async def login(username: str, password: str):
    pw_key = f"user:{username}:password"
    stored = cache.get(pw_key)
    if not stored or not verify_password(password, stored):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(username)
    return {"access_token": token, "token_type": "bearer"}

@app.get("/request/{service}")
async def proxy(
    service: str,
    request: Request,
    auth_user: str = Depends(get_current_user)
):
    if service not in services:
        raise HTTPException(400, "Invalid service")

    client_id = request.headers.get("X-Client-ID") or auth_user
    if client_id == auth_user:
        user_plan = cache.get(f"user:{auth_user}:plan") or "basic"
    else:
        user_plan = "premium" if client_id.startswith("premium_") else "basic"

    bucket_key = f"{client_id}:bucket"
    if not handle_request(cache, bucket_key, user_plan):
        # status code metric
        cache.incr("metrics:status:429")
        raise HTTPException(429, "Too many requests")

    # round‑robin
    instances = services[service]
    idx = cache.incr(f"lb:{service}:counter") % len(instances)
    target = instances[idx]

    instance_label = f"{service}-{idx}"        # e.g. "light-0", "heavy-1"
    cache.incr(f"metrics:instance:{instance_label}")

    start = time.time()
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{target}/data")
    latency = time.time() - start

    # record service count
    cache.incr(f"metrics:service:{service}")
    # record status code
    cache.incr(f"metrics:status:{resp.status_code}")
    # record latency sum/count
    cache.incr(f"metrics:latency:count:{service}")
    cache.incrbyfloat(f"metrics:latency:sum:{service}", latency)

    return resp.json()

@app.put("/user/plan/{new_plan}")
async def update_plan(
    new_plan: str,
    user: str = Depends(get_current_user)
):
    if new_plan not in user_plans:
        raise HTTPException(400, "Invalid plan")
    cache.set(f"user:{user}:plan", new_plan, ex=86400)
    return {"message": f"Plan updated to {new_plan}"}

@app.get("/metrics")
async def get_metrics():
    """
    Returns a rich metrics object.
    """
    # plan metrics
    plans = {}
    for plan in user_plans:
        allowed = int(cache.get(f"metrics:plan:{plan}:allowed") or 0)
        blocked = int(cache.get(f"metrics:plan:{plan}:blocked") or 0)
        plans[plan] = { "allowed": allowed, "blocked": blocked }

    # service counts
    services_m = {}
    for svc in services:
        services_m[svc] = int(cache.get(f"metrics:service:{svc}") or 0)

    # status codes
    status_m = {}
    for code in ["200","429","400","500"]:
        status_m[code] = int(cache.get(f"metrics:status:{code}") or 0)

    # latency averages
    latency_m = {}
    for svc in services:
        cnt = float(cache.get(f"metrics:latency:count:{svc}") or 0)
        summ = float(cache.get(f"metrics:latency:sum:{svc}") or 0.0)
        latency_m[svc] = cnt > 0 and summ/cnt or 0.0

    # per-instance counts
    instances_m = {}
    for service, urls in services.items():
        for idx, _ in enumerate(urls):
            label = f"{service}-{idx}"
            instances_m[label] = int(cache.get(f"metrics:instance:{label}") or 0)

    return {
        "plans": plans,
        "services": services_m,
        "status": status_m,
        "latency": latency_m,
        "instances" : instances_m
    }

@app.post("/metrics/clear")
async def clear_metrics():
    for plan in user_plans:
        cache.set(f"metrics:plan:{plan}:allowed", 0)
        cache.set(f"metrics:plan:{plan}:blocked", 0)
    for svc in services:
        cache.set(f"metrics:service:{svc}", 0)
        cache.set(f"metrics:latency:count:{svc}", 0)
        cache.set(f"metrics:latency:sum:{svc}", 0.0)
    for code in ["200","429","400","500"]:
        cache.set(f"metrics:status:{code}", 0)
    for svc, urls in services.items():
        for idx in range(len(urls)):
            cache.set(f"metrics:instance:{svc}-{idx}", 0)
    return {"message": "Metrics cleared"}

class TrafficPayload(BaseModel):
    total_requests:   int   = Field(..., ge=1)
    pct_heavy:        float = Field(..., ge=0, le=1)
    num_basic_users:  int   = Field(..., ge=0)
    num_premium_users:int   = Field(..., ge=0)
    mode:             str   = Field(..., pattern="^(burst|over_time)$")
    duration_seconds: int   = Field(0, ge=0)

async def _simulate_requests(cfg: TrafficPayload):
    sim_token = create_access_token("simulator")

    total       = cfg.total_requests
    heavy_cnt   = int(total * cfg.pct_heavy)
    light_cnt   = total - heavy_cnt

    # Build pools of exactly the sizes the admin set:
    BASIC_USERS   = [f"basic_user_{i}"   for i in range(cfg.num_basic_users)]
    PREMIUM_USERS = [f"premium_user_{i}" for i in range(cfg.num_premium_users)]

    # Compose workload list of (service, user_id)
    workload = []
    # First heavy requests
    for _ in range(heavy_cnt):
        # pick from both pools proportionally?
        # e.g. premium first until you exhaust premium count, then basic
        uid = PREMIUM_USERS[_ % len(PREMIUM_USERS)] if _ < int(total * (cfg.num_premium_users/(cfg.num_basic_users+cfg.num_premium_users))) else BASIC_USERS[_ % len(BASIC_USERS)]
        workload.append(("heavy", uid))
    # Then light
    for i in range(light_cnt):
        idx = heavy_cnt + i
        uid = PREMIUM_USERS[idx % len(PREMIUM_USERS)] if idx < int(total * (cfg.num_premium_users/(cfg.num_basic_users+cfg.num_premium_users))) else BASIC_USERS[idx % len(BASIC_USERS)]
        workload.append(("light", uid))

    random.shuffle(workload)

    async with httpx.AsyncClient() as client:
        if cfg.mode == "burst":
            tasks = [
                client.get(
                    f"http://localhost:8000/request/{svc}",
                    headers={
                        "Authorization": f"Bearer {sim_token}",
                        "X-Client-ID": uid
                    }
                )
                for svc, uid in workload
            ]
            await asyncio.gather(*tasks, return_exceptions=True)
        else:
            interval = cfg.duration_seconds / max(total,1)
            for svc, uid in workload:
                await client.get(
                    f"http://localhost:8000/request/{svc}",
                    headers={
                        "Authorization": f"Bearer {sim_token}",
                        "X-Client-ID": uid
                    }
                )
                await asyncio.sleep(interval)

@app.post("/simulate-traffic")
async def simulate_traffic(
    payload: TrafficPayload,
    background_tasks: BackgroundTasks
):
    if payload.mode == "over_time" and payload.duration_seconds <= 0:
        raise HTTPException(400, "duration_seconds must be > 0 for over_time")
    background_tasks.add_task(_simulate_requests, payload)
    return {"message": f"Simulating {payload.total_requests} requests ({payload.mode})"}
