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
        self.stt = STTEngine() # Handles model loading
        self.recorders = {} # {user_id: AudioRecorder}
        self.executor = ThreadPoolExecutor(max_workers=2) # parallel transcriptions
        self.cleanup_temp_files.start()  # Start cleanup task

    def cog_unload(self):
        """Cleanup when cog is unloaded."""
        self.cleanup_temp_files.cancel()

    def _safe_delete_file(self, path, file_type="temp"):
        """Safely delete a file with logging."""
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
        """Remove orphaned temp files older than 5 minutes."""
        try:
            if not os.path.exists(TEMP_DIR):
                return
            cutoff = time.time() - 300  # 5 minutes
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
                    # Listen to everyone
                    vc.listen(voice_recv.BasicSink(self.on_voice_packet))
                except Exception as e:
                    await ctx.send(f"Failed to connect: {e}")
                    logger.error(f"Voice connection failed: {e}")
                    return
            await ctx.send(f"Connected to {channel.name}")
        else:
            await ctx.send("You are not in a voice channel.")

    @commands.command()
    async def leave(self, ctx):
        if ctx.voice_client:
            await ctx.voice_client.disconnect()
            await ctx.send("Disconnected.")

    def on_voice_packet(self, user, data):
        """
        Callback from BasicSink.
        user: discord.Member or User
        data: VoiceData object (has .pcm)
        """
        if not user or user.bot:
            return
        
        # Check if ignoring specific ID (Double check safety)
        if BOT_USER_ID and str(user.id) == str(BOT_USER_ID):
            return

        user_id = user.id
        
        if user_id not in self.recorders:
            self.recorders[user_id] = AudioRecorder(user_id)
        
        # Write to recorder
        # data.pcm is bytes
        file_path = self.recorders[user_id].write(data.pcm)
        
        if file_path:
            # Silence detected and file saved. Transcribe it.
            asyncio.run_coroutine_threadsafe(self.process_transcription(user, file_path), self.bot.loop)

    async def process_transcription(self, user, file_path):
        logger.info(f"Transcribing audio for {user.name}...")
        
        # Run specialized STT in executor
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(self.executor, self.stt.transcribe, file_path)
        
        if text:
            logger.info(f"Transcription ({user.name}): {text}")
            
            # Send 'Listening' event to backend/frontend if needed
            # await self.bot.ws_server.broadcast({...})

            # Show in debug channel
            if CHAT_CHANNEL_ID:
                channel = self.bot.get_channel(CHAT_CHANNEL_ID)
                if channel:
                    await channel.send(f"🎤 **{user.name}**: {text}")
            
            # Message dispatch (To Ollama etc)
            await self.handle_dialogue(user, text)
            
        else:
            logger.debug("No text transcribed.")
            
        # Cleanup input audio file
        self._safe_delete_file(file_path, "input audio")

    @commands.command()
    async def speak_test(self, ctx, *, text="これはマイクのテストです。聞こえていますか？"):
        """
        Debug command to force TTS playback.
        """
        if not ctx.voice_client:
            if ctx.author.voice:
                await ctx.author.voice.channel.connect(cls=voice_recv.VoiceRecvClient)
            else:
                await ctx.send("Voice channel ni inai yo!")
                return

        await ctx.send(f"Testing TTS with: {text}")
        
        # Manually trigger pipeline from step 2 (TTS)
        # We need a dummy user object or just use ctx.author
        await self.handle_dialogue(ctx.author, f"REPEAT_THIS: {text}", skip_llm=True)

    async def handle_dialogue(self, user, text, skip_llm=False):
        """
        Main pipeline: Text -> Ollama -> SBV2 -> Voice
        """
        if not user.guild.voice_client:
            logger.warning("No voice client found in handle_dialogue")
            return

        loop = asyncio.get_event_loop()
        
        ollama_client = None
        sbv2_client = None
        
        text_cog = self.bot.get_cog("TextChat")
        if text_cog:
            ollama_client = text_cog.ollama
            sbv2_client = text_cog.sbv2
        else:
            from ...services.ollama_client import OllamaClient
            from ...services.sbv2_client import SBV2Client
            ollama_client = OllamaClient()
            sbv2_client = SBV2Client()

        if skip_llm:
            # Extract text (remove REPEAT_THIS prefix if present, purely for clarity)
            ai_text = text.replace("REPEAT_THIS: ", "")
        else:
            try:
                ai_text = await loop.run_in_executor(
                    None, 
                    lambda: ollama_client.generate(text, user_id=user.id)
                )
            except Exception as e:
                logger.error(f"Ollama error: {e}")
                ai_text = "ごめんね、聞こえなかったみたい。"

        if not ai_text:
            logger.warning("No AI text generated.")
            return

        logger.info(f"AI Response: {ai_text}")

        # 2. WebSocket Broadcast
        if hasattr(self.bot, "ws_server"):
            await self.bot.ws_server.broadcast({
                "type": "speaking", 
                "text": ai_text,
                "source": "voice_chat"
            })

        # 3. SBV2 TTS (Async)
        logger.info("Generating TTS...")
        try:
            wav_path = await loop.run_in_executor(
                None,
                lambda: sbv2_client.tts(ai_text)
            )
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return

        # 4. Play Audio
        import os
        if wav_path and os.path.exists(wav_path):
             file_size = os.path.getsize(wav_path)
             logger.info(f"Playing audio: {wav_path} (Size: {file_size} bytes)")
             
             if file_size == 0:
                 logger.error("Generated WAV file is empty!")
                 return

             def after_play(error):
                 if error:
                     logger.error(f"Player error: {error}")
                 else:
                     logger.info("Playback finished successfully.")
                 # Clean up TTS output file
                 try:
                     if wav_path and os.path.exists(wav_path):
                         os.remove(wav_path)
                         logger.debug(f"Removed TTS file: {wav_path}")
                 except Exception as e:
                     logger.warning(f"Failed to remove TTS file {wav_path}: {e}")

             source = discord.FFmpegPCMAudio(wav_path)
             
             if user.guild.voice_client.is_playing():
                 user.guild.voice_client.stop()
                 
             user.guild.voice_client.play(source, after=after_play)
        else:
            logger.warning("Failed to generate voice audio or file not found.")

async def setup(bot):
    await bot.add_cog(VoiceChat(bot))
