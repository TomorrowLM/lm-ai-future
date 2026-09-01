from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
import os
import core.config

model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)
system_template = "Translate the following into {language}:"
prompt_template = ChatPromptTemplate.from_messages(
    [("system", system_template), ("user", "{text}")]
)
result = prompt_template.invoke({"language": "Chinese", "text": "hi"})
print(result.to_messages())
# [SystemMessage(content='Translate the following into Chinese:'), HumanMessage(content='hi')]

parser = StrOutputParser()

# 使用Chains方式调用
chain = prompt_template | model | parser
response = chain.invoke({"language": "Chinese", "text": "hi"})
print(response)
# 你好
