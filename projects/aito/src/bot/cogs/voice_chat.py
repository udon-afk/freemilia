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
        self.recorders = {} # {user_id: AudioRecorder}
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.cleanup_temp_files.start()

    def cog_unload(self):
        self.cleanup_temp_files.cancel()

    def _safe_delete_file(self, path, file_type="temp"):
        try:
            if path and os.path.exists(path):
                os.remove(path)
                logger.debug(f"Removed {file_type} file: {path}")
                return True
        except Exception as e:
            logger.warning(f"Failed to remove {file_type} file {path}: {e}")
        return False

    @tasks.loop(minutes=10)
    async def cleanup_temp_files(self):
        try:
            if not os.path.exists(TEMP_DIR):
                return
            cutoff = time.time() - 300 
            cleaned = 0
            for f in os.listdir(TEMP_DIR):
                path = os.path.join(TEMP_DIR, f)
                if os.path.isfile(path) and os.path.getmtime(path) < cutoff:
                    if self._safe_delete_file(path, "orphaned"):
                        cleaned += 1
            if cleaned > 0:
                logger.info(f"Cleaned up {cleaned} orphaned temp files.")
        except Exception as e:
            logger.error(f"Error during temp file cleanup: {e}")

    @cleanup_temp_files.before_loop
    async def before_cleanup(self):
        await self.bot.wait_until_ready()

    @commands.Cog.listener()
    async def on_ready(self):
        logger.info("VoiceChat Cog loaded.")

    @commands.command()
    async def join(self, ctx):
        if ctx.author.voice:
            channel = ctx.author.voice.channel
            if ctx.voice_client:
                await ctx.voice_client.move_to(channel)
            else:
                try:
                    vc = await channel.connect(cls=voice_recv.VoiceRecvClient)
                    # Use BasicSink to capture voice
                    vc.listen(voice_recv.BasicSink(self.on_voice_packet))
                except Exception as e:
                    await ctx.send(f"接続に失敗したよ: {e}")
                    logger.error(f"Voice connection failed: {e}")
                    return
            await ctx.send(f"「{channel.name}」にお邪魔するね！🎀")
        else:
            await ctx.send("お兄ちゃん、先にボイスチャンネルに入っててよ！")

    @commands.command()
    async def leave(self, ctx):
        if ctx.voice_client:
            await ctx.voice_client.disconnect()
            await ctx.send("またね、お兄ちゃん！バイバイ！🎀")

    def on_voice_packet(self, user, data):
        if not user or user.bot:
            return
        
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
            logger.info(f"Transcription ({user.name}): {text}")
            if CHAT_CHANNEL_ID:
                channel = self.bot.get_channel(CHAT_CHANNEL_ID)
                if channel:
                    await channel.send(f"🎤 **{user.name}**: {text}")
            
            await self.handle_dialogue(user, text)
            
        self._safe_delete_file(file_path, "input audio")

    async def handle_dialogue(self, user, text):
        if not user.guild.voice_client:
            return

        loop = asyncio.get_event_loop()
        text_cog = self.bot.get_cog("TextChat")
        if text_cog:
            ollama_client = text_cog.ollama
            sbv2_client = text_cog.sbv2
        else:
            from ...services.ollama_client import OllamaClient
            from ...services.sbv2_client import SBV2Client
            ollama_client = OllamaClient()
            sbv2_client = SBV2Client()

        try:
            ai_text = await loop.run_in_executor(
                None, 
                lambda: ollama_client.generate(text, user_id=user.id)
            )
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            ai_text = "ごめんね、ちょっと聞こえなかったかも。"

        if not ai_text:
            return

        logger.info(f"AI Response: {ai_text}")

        # SBV2 TTS
        try:
            wav_path = await loop.run_in_executor(
                None,
                lambda: sbv2_client.tts(ai_text)
            )
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return

        # Play Audio
        if wav_path and os.path.exists(wav_path):
             def after_play(error):
                 if error:
                     logger.error(f"Player error: {error}")
                 try:
                     if wav_path and os.path.exists(wav_path):
                         os.remove(wav_path)
                 except:
                     pass

             source = discord.FFmpegPCMAudio(wav_path)
             if user.guild.voice_client.is_playing():
                 user.guild.voice_client.stop()
             user.guild.voice_client.play(source, after=after_play)

async def setup(bot):
    await bot.add_cog(VoiceChat(bot))
