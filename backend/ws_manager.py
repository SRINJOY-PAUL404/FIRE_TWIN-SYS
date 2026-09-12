from typing import List
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS Manager] Client connected. Total active: {len(self.active_connections)}", flush=True)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WS Manager] Client disconnected. Total active: {len(self.active_connections)}", flush=True)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        print(f"[WS Manager] Broadcasting to {len(self.active_connections)} client(s): {message.get('extinguisher_code') or message.get('device_id')}", flush=True)
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WS Manager] Error sending to client: {e}", flush=True)
                self.disconnect(connection)

manager = ConnectionManager()

