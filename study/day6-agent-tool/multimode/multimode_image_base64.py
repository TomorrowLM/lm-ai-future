from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
import base64
import httpx

image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
image_data = base64.b64encode(httpx.get(image_url).content).decode("utf-8")
model = ChatOpenAI(model="gpt-4o")
message = HumanMessage(
    content=[
        {"type": "text", "text": "用中文描述这张图片中的天气"},
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
        },
    ],
)
response = model.invoke([message])
print(response.content)
#图片中的天气晴朗，天空中有一些稀薄的白云，整体呈现出蓝色。阳光明媚，光线充足，草地和树木显得非常绿意盎然。这种天气非常适合户外活动，比如散步或野餐。总的来说，天气非常舒适宜人。

