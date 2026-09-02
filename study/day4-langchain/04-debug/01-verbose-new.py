import os

import core.config
from langchain.agents import create_agent
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.globals import set_verbose
from langchain_openai import ChatOpenAI


model = ChatOpenAI(
	model="deepseek-chat",
	base_url=os.getenv("DEEPSEEK_BASE_URL"),
	api_key=os.getenv("DEEPSEEK_API_KEY"),
)
tools = [TavilySearchResults(max_results=1)]

agent = create_agent(
	model,
	tools=tools,
	system_prompt="你是一位得力的助手。",
)
set_verbose(True)

response = agent.invoke(
	{
		"messages": [
			{
				"role": "user",
				"content": "谁执导了2023年的电影《奥本海默》，他多少岁了？",
			}
		]
	}
)
print(response["messages"][-1].content)
