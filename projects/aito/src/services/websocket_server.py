from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import logging
import json

logger = logging.getLogger(__name__)

app = FastAPI()

class WebSocketServer:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WebSocketServer, cls).__new__(cls)
            cls._instance.active_connections = []
        return cls._instance

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("New WebSocket connection accepted.")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket disconnected.")

    async def broadcast(self, data: dict):
        message = json.dumps(data)
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to send to websocket: {e}")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    server = WebSocketServer()
    await server.connect(websocket)
    try:
        while True:
            # Wait for data from client (though we mostly broadcast)
            data = await websocket.receive_text()
            logger.debug(f"Received from WS: {data}")
    except WebSocketDisconnect:
        server.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS endpoint error: {e}")
        server.disconnect(websocket)
