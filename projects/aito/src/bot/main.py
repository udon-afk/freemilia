import discord
from discord.ext import commands
import os
import asyncio
import logging
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from src.config import DISCORD_TOKEN

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MiliaVoice")

intents = discord.Intents.default()
intents.message_content = True

class MyriaBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        extensions = [
            "src.bot.cogs.voice_chat",
            "src.bot.cogs.text_chat",
            "src.bot.cogs.system"
        ]
        
        for ext in extensions:
            try:
                await self.load_extension(ext)
                logger.info(f"Loaded: {ext}")
            except Exception as e:
                logger.error(f"Fail {ext}: {e}")

        # Start WebSocket Server
        from ..services.websocket_server import app, WS_HOST, WS_PORT, WebSocketServer
        import uvicorn
        
        config = uvicorn.Config(app, host=WS_HOST, port=WS_PORT, log_level="info")
        server = uvicorn.Server(config)
        
        # Attach Bot to WS Server
        ws_server = WebSocketServer()
        ws_server.bot = self
        self.ws_server = ws_server

        self.loop.create_task(server.serve())
        logger.info("WebSocket server started.")

    async def on_ready(self):
        logger.info(f"Logged in as {self.user}")

if __name__ == "__main__":
    bot = MyriaBot()
    bot.run(DISCORD_TOKEN)
