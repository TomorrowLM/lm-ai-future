#pip install requests
import requests
import json
import os

print(os.getenv('OPENAI_BASE_URL'))
url = os.getenv('OPENAI_BASE_URL') + "/chat/completions"
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
