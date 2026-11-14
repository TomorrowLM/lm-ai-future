from typing import Literal
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
import core.config
import os

model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)

@tool
def weather_tool(weather: Literal["晴朗的", "多云的", "多雨的","下雪的"]) -> None:
    """Describe the weather"""
    pass


model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)

model_with_tools = model.bind_tools([weather_tool])
image_url_1 = "https://pic1.arkoo.com/56D0B40F99F841DF8A2425762AE2565D/picture/o_1i4qop009177v1tgf14db15he1iaj1is.jpg"
image_url_2 = "https://img0.baidu.com/it/u=3168510799,1711608286&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=751"

message = HumanMessage(
    content=[
        {"type": "text", "text": "用中文描述两张图片中的天气"},
        {"type": "image_url", "image_url": {"url": image_url_1}},
        {"type": "image_url", "image_url": {"url": image_url_2}},
    ],
)
response = model_with_tools.invoke([message])
print(response.tool_calls)
