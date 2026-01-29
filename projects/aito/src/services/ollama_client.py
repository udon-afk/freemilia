import requests
import logging
import json
from ..config import WS_HOST, WS_PORT

logger = logging.getLogger(__name__)

class OllamaClient:
    """
    Dummy client that redirects generation requests to Clawdbot via WebSocket.
    """
    def __init__(self):
        self.ws_url = f"ws://{WS_HOST}:{WS_PORT}/ws"

    def generate(self, prompt: str, user_id=None, context_docs=None) -> str:
        """
        In this new architecture, we don't call Ollama locally.
        Instead, we wait for Clawdbot to handle the 'brain' part.
        However, to keep the current Python bot flow working, we will 
        send a 'request_reply' signal to the WebSocket server.
        """
        logger.info(f"Forwarding prompt to Clawdbot via WS: {prompt}")
        
        # In a real sync-to-async bridge this is tricky, 
        # but for now we'll rely on the WebSocket server to broadcast 
        # the user's text, and Clawdbot (who is listening to Discord) 
        # will generate the reply.
        
        # For the VoiceChat cog to get a return value, we need a way to wait for it.
        # But wait! If Clawdbot is the brain, it can just send the text BACK 
        # to the Python bot's TTS endpoint.
        
        return "" # We'll handle the flow asynchronously now

    def clear_history(self):
        pass
