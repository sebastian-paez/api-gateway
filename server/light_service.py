import asyncio
from fastapi import FastAPI

app = FastAPI()

@app.get("/data")
async def get_light_data():
    await asyncio.sleep(1)
    return {"service": "light", "message": "Quick response"}
