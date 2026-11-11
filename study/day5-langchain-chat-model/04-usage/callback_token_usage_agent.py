# pip install -qU langchain-community wikipedia
# from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.agents import create_agent
from langchain_community.agent_toolkits.load_tools import load_tools
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_community.callbacks.manager import get_openai_callback
import core.config
import os

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "您是一个乐于助人的助手"),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ]
)
# llm = ChatOpenAI(model="gpt-4")
llm = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"), 
    temperature=0
)
tools = load_tools(["wikipedia"])
# agent = create_tool_calling_agent(llm, tools, prompt)
# agent_executor = AgentExecutor(
#     agent=agent, tools=tools, verbose=True, stream_runnable=False
# )
agent = create_agent(
    model=llm,
    tools=tools,
    system_prompt="你是一位得力的助手。",
    # middleware=[...],          # 可选：中间件 可选：结构化输出
)
with get_openai_callback() as cb:
    response = agent.invoke(
        {
            "input": "蜂鸟的学名是什么，哪种鸟是最快的？"
        }
    )
    print(f"总令牌数：{cb.total_tokens}")
    print(f"提示令牌：{cb.prompt_tokens}")
    print(f"完成令牌：{cb.completion_tokens}")
    print(f"总成本（美元）：${cb.total_cost}")
