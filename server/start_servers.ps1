# Start API Gateway
Start-Process uvicorn -ArgumentList "main:app --reload --port 8000"

# Light services
Start-Process uvicorn -ArgumentList "light_service:app --reload --port 8001"
Start-Process uvicorn -ArgumentList "light_service:app --reload --port 8003"

# Heavy services
Start-Process uvicorn -ArgumentList "heavy_service:app --reload --port 8002"
Start-Process uvicorn -ArgumentList "heavy_service:app --reload --port 8004"