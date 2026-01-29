from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import logging
import json
import asyncio

logger = logging.getLogger(__name__)

app = FastAPI()

class WebSocketServer:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WebSocketServer, cls).__new__(cls)
            cls._instance.active_connections = []
            cls._instance.bot = None # Reference to Discord Bot
        return cls._instance

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("New WebSocket connection accepted (Clawdbot/Client).")

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

    async def handle_message(self, message: str):
        """
        Handle incoming messages from Clawdbot.
        Expected format: {"type": "tts_request", "text": "..."}
        """
        try:
            data = json.loads(message)
            if data.get("type") == "tts_request":
                text = data.get("text")
                if text and self.bot:
                    logger.info(f"Received TTS request from Clawdbot: {text}")
                    # Dispatch to VoiceChat cog to play it
                    voice_cog = self.bot.get_cog("VoiceChat")
                    if voice_cog:
                        # We use a dummy user or find the active VC
                        for vc in self.bot.voice_clients:
                            asyncio.run_coroutine_threadsafe(
                                voice_cog.play_tts_only(vc, text), 
                                self.bot.loop
                            )
        except Exception as e:
            logger.error(f"Error handling WS message: {e}")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    server = WebSocketServer()
    await server.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await server.handle_message(data)
    except WebSocketDisconnect:
        server.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS endpoint error: {e}")
        server.disconnect(websocket)
