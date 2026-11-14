# pip install -qU langchain langchain-openai
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
import core.config;
import os;
model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY")
)

joke_query = "告诉我一个笑话。"
parser = JsonOutputParser()
print(parser.get_format_instructions())
prompt = PromptTemplate(
    template="回答用户的查询。\n{format_instructions}\n{query}\n",
    input_variables=["query"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)
chain = prompt | model | parser
response = chain.invoke({"query": joke_query})
print(response)
