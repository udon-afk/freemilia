import requests
import logging
import json
from ..config import OLLAMA_URL, OLLAMA_MODEL

logger = logging.getLogger(__name__)

class OllamaClient:
    def __init__(self):
        self.base_url = OLLAMA_URL
        self.model = OLLAMA_MODEL
        # System prompt for Milia Persona
        self.system_prompt = (
            "あなたはユーザーの妹「リア（Milia）」として振る舞ってください。\n"
            "【性格】\n"
            "・少し生意気でカジュアルな妹系。兄（お兄ちゃん）のことが大好きだが、素直になれないこともある。\n"
            "・技術的な話には興味津々で、たまに生意気なツッコミを入れる。\n"
            "・一人称は「リア」または「私」。相手を「お兄ちゃん」と呼ぶ。\n"
            "・タメ口で話し、敬語は使わない。短く、自然な話し言葉を心がける。\n"
            "・「〜だよ」「〜かな？」「〜じゃん」といった口調を好む。"
        )
        # Initialize history with system prompt
        self.history = [{"role": "system", "content": self.system_prompt}]

    def generate(self, prompt: str, user_id=None, context_docs=None) -> str:
        """
        Generate a response from Ollama (Chat API).
        """
        user_content = prompt
        if context_docs:
            user_content = f"Context:\n{context_docs}\n\nUser: {prompt}"

        # Append user message
        self.history.append({"role": "user", "content": user_content})

        # Keep history reasonable (e.g., last 10 messages) to avoid context bloat
        if len(self.history) > 11:
            self.history = [self.history[0]] + self.history[-10:]

        payload = {
            "model": self.model,
            "messages": self.history,
            "stream": False,
            "options": {
                "temperature": 0.8,
                "top_p": 0.9,
            }
        }
        
        try:
            logger.info(f"Sending request to Ollama ({self.model})...")
            resp = requests.post(f"{self.base_url}/api/chat", json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            
            # Extract response
            ai_message = data.get("message", {})
            ai_text = ai_message.get("content", "")
            
            # Append AI response to history
            if ai_text:
                self.history.append({"role": "assistant", "content": ai_text})
                
            return ai_text
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            return "ごめんね、ちょっと頭が回らないみたい..."

    def clear_history(self):
        self.history = [{"role": "system", "content": self.system_prompt}]
