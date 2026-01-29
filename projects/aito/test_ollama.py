import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

def test_ollama():
    print(f"Testing connectivity to {OLLAMA_URL} with model {OLLAMA_MODEL}...")
    try:
        url = f"{OLLAMA_URL}/api/generate"
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": "Hello, are you there?",
            "stream": False
        }
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            print("Success! Response from Ollama:")
            print(response.json().get("response"))
        else:
            print(f"Failed with status code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error connecting to Ollama: {e}")

if __name__ == "__main__":
    test_ollama()
