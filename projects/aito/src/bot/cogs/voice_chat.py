import discord
from discord.ext import commands, voice_recv, tasks
import logging
import asyncio
import os
import time
from concurrent.futures import ThreadPoolExecutor
from ...services.stt_engine import STTEngine
from ...utils.audio_recorder import AudioRecorder
from ...config import VOICE_CHANNEL_ID, CHAT_CHANNEL_ID, BOT_USER_ID

logger = logging.getLogger(__name__)

TEMP_DIR = "./data/temp"

class VoiceChat(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.stt = STTEngine() 
        self.recorders = {} 
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.cleanup_temp_files.start()

    def cog_unload(self):
        self.cleanup_temp_files.cancel()

    def _safe_delete_file(self, path, file_type="temp"):
        try:
            if path and os.path.exists(path):
                os.remove(path)
                return True
        except:
            pass
        return False

    @tasks.loop(minutes=10)
    async def cleanup_temp_files(self):
        try:
            if not os.path.exists(TEMP_DIR):
                return
            cutoff = time.time() - 300 
            for f in os.listdir(TEMP_DIR):
                path = os.path.join(TEMP_DIR, f)
                if os.path.isfile(path) and os.path.getmtime(path) < cutoff:
                    self._safe_delete_file(path)
        except Exception as e:
            logger.error(f"Error during temp file cleanup: {e}")

    @commands.command()
    async def join(self, ctx):
        if ctx.author.voice:
            channel = ctx.author.voice.channel
            if ctx.voice_client:
                await ctx.voice_client.move_to(channel)
            else:
                try:
                    vc = await channel.connect(cls=voice_recv.VoiceRecvClient)
                    vc.listen(voice_recv.BasicSink(self.on_voice_packet))
                except Exception as e:
                    await ctx.send(f"接続失敗: {e}")
                    return
            await ctx.send(f"「{channel.name}」に入ったよ！お喋りしよう！🎀")
        else:
            await ctx.send("お兄ちゃん、VCに入って呼んでね！")

    @commands.command()
    async def leave(self, ctx):
        if ctx.voice_client:
            await ctx.voice_client.disconnect()
            await ctx.send("バイバイ、お兄ちゃん！🎀")

    def on_voice_packet(self, user, data):
        if not user or user.bot: return
        user_id = user.id
        if user_id not in self.recorders:
            self.recorders[user_id] = AudioRecorder(user_id)
        file_path = self.recorders[user_id].write(data.pcm)
        if file_path:
            asyncio.run_coroutine_threadsafe(self.process_transcription(user, file_path), self.bot.loop)

    async def process_transcription(self, user, file_path):
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(self.executor, self.stt.transcribe, file_path)
        if text:
            logger.info(f"User Voice: {text}")
            # BROADCAST TO CLAWDBOT VIA WS
            if hasattr(self.bot, "ws_server"):
                await self.bot.ws_server.broadcast({
                    "type": "voice_input",
                    "user_id": user.id,
                    "user_name": user.name,
                    "text": text
                })
        self._safe_delete_file(file_path)

    async def play_tts_only(self, vc, text):
        """
        Called by WebSocket server when Clawdbot sends a response.
        """
        if not vc or not vc.is_connected():
            return

        loop = asyncio.get_event_loop()
        text_cog = self.bot.get_cog("TextChat")
        sbv2_client = text_cog.sbv2 if text_cog else None
        
        if not sbv2_client:
            from ...services.sbv2_client import SBV2Client
            sbv2_client = SBV2Client()

        logger.info(f"Generating voice for response: {text}")
        wav_path = await loop.run_in_executor(None, lambda: sbv2_client.tts(text))

        if wav_path and os.path.exists(wav_path):
            def after_play(error):
                self._safe_delete_file(wav_path)
            
            source = discord.FFmpegPCMAudio(wav_path)
            if vc.is_playing():
                vc.stop()
            vc.play(source, after=after_play)

async def setup(bot):
    await bot.add_cog(VoiceChat(bot))
