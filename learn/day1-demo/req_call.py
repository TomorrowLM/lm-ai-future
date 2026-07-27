import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1") + "/chat/completions"
payload = json.dumps({
    "model": "gpt-4",
    "messages": [
        {"role": "system", "content": "assistant"},
        {"role": "user", "content": "Hello world"}
    ]
})
headers = {
    'Accept': 'application/json',
    'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + os.getenv('OPENAI_API_KEY'),
    'Host': 'api.openai.com',
    'Connection': 'keep-alive'
}

response = requests.request("POST", url, headers=headers, data=payload)
print(response.text)
