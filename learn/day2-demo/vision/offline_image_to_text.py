import os
from pathlib import Path
import base64
import requests
from learn.config import *


def encode_image(image_path):
    print(f"Encoding image: {image_path}")
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')


api_key = os.getenv("GLM_API_KEY")
base_url = os.getenv("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4").rstrip("/")
model = os.getenv("GLM_MODEL", "glm-4.6v-flash")
image_path = Path(__file__).resolve().parent.parent / "images" / "cat.jpeg"

base64_image = encode_image(image_path)

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {api_key}"
}

# payload = {
#     "model": model,
#     "messages": [
#         {
#             "role": "user",
#             "content": [
#                 {
#                     "type": "text",
#                     "text": "这张照片里有什么？"
#                 },
#                 {
#                     "type": "image_url",
#                     "image_url": {
#                         "url": f"data:image/jpeg;base64,{base64_image}"
#                     }
#                 }
#             ]
#         }
#     ],
#     "max_tokens": 300
# }

# response = requests.post(f"{base_url}/chat/completions", headers=headers, json=payload)

# print(response.json())
