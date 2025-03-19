import asyncio
from fastapi import FastAPI

app = FastAPI()

@app.get("/data")
async def get_heavy_data():
    await asyncio.sleep(3)
    return {"service": "heavy", "message": "Slow response"}
