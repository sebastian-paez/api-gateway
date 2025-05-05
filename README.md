# API Gateway + Dashboard

This project implements an **API Gateway** featuring:

* **JWT Authentication**
* **Token Bucket Rate Limiting** 
* **Round‑Robin Load Balancing**
* **Traffic Simulation**
* **Admin Dashboard**

---

## Prerequisites

* **WSL / Linux**: Redis must be installed and accessible to the backend.
* **Windows PowerShell**: for running the FastAPI servers and React client.
* **Python 3.9+** and `pip` (backend dependencies)
* **Node.js 16+** and `npm` (frontend dependencies)

---

## Setup & Run

### 1. Start Redis - WSL / Linux

```bash
sudo service redis-server start
```

### 2. Start Backend Services – PowerShell

```powershell
cd ./server
./start_servers.ps1
```

### 3. Start Frontend – PowerShell

```powershell
cd ./client
npm install
npm start
```

After running these steps, open your browser at `http://localhost:3000` to access the dashboard. Log in or register, then simulate traffic and inspect metrics.

---

## Notes

* You can adjust ports, Redis host/port, or other settings via environment variables or by editing `main.py`.
* The dashboard polls `/metrics` every few seconds. Use **Clear Metrics** to reset counts.
* Every time the `main` server is restarted (or every 24 hours), all users will have to generate a new token by registering and logging in again.
