#!/usr/bin/env python
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langserve import add_routes
from langchain_core.prompts import ChatPromptTemplate

import core.config

app = FastAPI(
    title="LangChain 服务器",
    version="1.0",
    description="使用 Langchain 的 Runnable 接口的简单 API 服务器",
)
llm = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)
add_routes(
    app,
    llm,
    path="/openai",
)

from langchain_core.output_parsers import StrOutputParser
parser = StrOutputParser()
add_routes(
    app,
    llm | parser,
    path="/openai_str_parser",
)

prompt = ChatPromptTemplate.from_template("告诉我一个关于 {topic} 的笑话")
add_routes(
    app,
    prompt | llm,
    path="/openai_ext",
)

# 设置所有启用 CORS 的来源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=8000)
