# import requests

# response = requests.get("https://official-joke-api.appspot.com/random_joke")
# data = response.json()
# print(data)


import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("")

response = requests.post(
    url=f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}",
    json={
        "contents": [
            {"parts": [{"text": "Tell me a fun fact about space"}]}
        ]
    }
)

data = response.json()
print(data["candidates"][0]["content"]["parts"][0]["text"])