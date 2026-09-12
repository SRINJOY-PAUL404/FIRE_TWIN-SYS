# FireTwin AI – Digital Twin-Based Fire Extinguisher Monitoring System

FireTwin AI is a full-stack, production-quality web application that serves as a Digital Twin for fire extinguishers across a university campus. It monitors extinguisher availability, health, pressure levels, expiry dates, and location in real-time through simulated IoT devices.

## Features

- **Enterprise Dashboard**: KPI cards, real-time metrics, and analytics.
- **Campus Map**: Visual representation of extinguishers and their status.
- **Real-Time IoT Simulation**: Instant updates via WebSockets and MQTT.
- **AI Predictive Maintenance**: Remaining useful life and failure probability estimation.
- **RBAC Authentication**: Secure login and role management (Admin, Safety Officer).
- **CRUD Operations**: Complete management of extinguishers and buildings.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Chart.js, React Router
- **Backend**: FastAPI, SQLAlchemy, Pydantic, Passlib, JWT
- **Database**: PostgreSQL 15
- **Real-Time**: Eclipse Mosquitto (MQTT), WebSockets
- **Infrastructure**: Docker & Docker Compose

## Prerequisites

- **Docker & Docker Compose**
- **Node.js 18+** (if running frontend locally outside Docker)
- **Python 3.10+** (if running backend locally outside Docker)

## Installation & Setup

### Method 1: Fully Dockerized (Recommended)

1. Clone or navigate to the project directory.
2. Run the following command to start all services (Database, MQTT Broker, Backend API, Frontend):
   ```bash
   docker-compose up --build -d
   ```
3. Once the containers are up, the backend API will be available at `http://localhost:8000`.
4. The frontend application will be available at `http://localhost:5173`.

### Method 2: Hybrid (Docker for Infra, Local for Apps)

If you prefer to run the backend and frontend locally for development:

1. **Start Infrastructure (PostgreSQL & Mosquitto)**
   ```bash
   docker-compose up -d db mqtt
   ```

2. **Setup Backend**
   ```bash
   cd backend
   python -m venv venv
   # Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
   pip install -r requirements.txt
   
   # Seed the database with demo data (100 extinguishers)
   python seed.py
   
   # Run the API server
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Start IoT Simulator** (in a new terminal)
   ```bash
   cd backend
   # Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
   python iot_simulator.py
   ```

4. **Setup Frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Demo Credentials

You can use the seeded admin account to log in (once the frontend login page is fully connected to the API):

- **Email**: `admin@firetwin.edu`
- **Password**: `joy9123`

## API Documentation

FastAPI automatically generates interactive API documentation. You can access it at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Project Structure

```text
/
├── backend/
│   ├── main.py              # FastAPI application & WebSocket endpoint
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic validation schemas
│   ├── database.py          # Database connection
│   ├── auth.py              # JWT authentication logic
│   ├── seed.py              # Script to generate 100 demo extinguishers
│   ├── mqtt_client.py       # Subscribes to Mosquitto and updates DB
│   ├── ws_manager.py        # Broadcasts real-time updates to frontend
│   ├── iot_simulator.py     # Simulates ESP32 sensors publishing data
│   ├── routers/             # REST API endpoints (auth, buildings, ai, etc.)
│   └── requirements.txt     
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI (Navbar, Sidebar, Layout)
│   │   ├── pages/           # Views (Dashboard, Map, Extinguishers)
│   │   ├── App.tsx          # React Router configuration
│   │   └── index.css        # Tailwind CSS entry
│   ├── vite.config.ts       
│   └── package.json         
├── mosquitto/
│   └── config/
│       └── mosquitto.conf   # MQTT Broker configuration
└── docker-compose.yml       # Orchestrates all services
```
