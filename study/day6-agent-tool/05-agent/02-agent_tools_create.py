import os

# WebBaseLoader 导入时会读取此变量；提前设置以标识网页请求客户端。
os.environ.setdefault("USER_AGENT", "lm-ai-future study script/1.0")

from langchain_openai import ChatOpenAI
from langchain_tavily import TavilySearch
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langsmith import Client


from langchain_core.tools import create_retriever_tool
from langchain_community.document_loaders import WebBaseLoader
# pip install faiss-cpu
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from core import GLMEmbeddings, create_requests_session
import core.config

# WebBaseLoader 负责请求网页并将页面内容转换为 LangChain Document。
loader = WebBaseLoader(
    "https://zh.wikipedia.org/wiki/%E7%8C%AB",
    session=create_requests_session(),
    requests_kwargs={"timeout": 30},
)
docs = loader.load()
documents = RecursiveCharacterTextSplitter(
    chunk_size=1000, chunk_overlap=200
).split_documents(docs)
# 使用项目已配置的 GLM Embeddings 生成向量，并由 FAISS 建立本地相似度索引。
vector = FAISS.from_documents(documents, GLMEmbeddings(model="embedding-2"))
retriever = vector.as_retriever()

retriever_tool = create_retriever_tool(
    retriever,
    "wiki_search",
    "搜索维基百科",
)

model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)

search = TavilySearch(max_results=1)

tools = [search, retriever_tool]

# 从 LangChain Hub 获取适用于工具调用 Agent 的提示模板。
prompt = Client().pull_prompt(
    "hwchase17/openai-functions-agent",
    dangerously_pull_public_prompt=True,
)
print(prompt.messages)

# 用 Hub 提示模板、聊天模型和工具构建 Agent，再由 AgentExecutor 执行。
agent = create_tool_calling_agent(model, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools)
result = agent_executor.invoke(
    {"input": "猫的特征是什么？"}
)
print(result["output"])

