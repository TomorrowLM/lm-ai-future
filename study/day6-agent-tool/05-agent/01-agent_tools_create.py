import os

from bs4 import BeautifulSoup
from langchain.agents import create_agent
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.tools import create_retriever_tool
from langchain_openai import ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_tavily import TavilySearch

from core import GLMEmbeddings, create_requests_session

wiki_url = "https://zh.wikipedia.org/wiki/%E7%8C%AB"
wiki_session = create_requests_session()
response = wiki_session.get(
    wiki_url,
    headers={"User-Agent": "lm-ai-future study script/1.0"},
    timeout=30,
)
response.raise_for_status()
soup = BeautifulSoup(response.text, "html.parser")
content = soup.select_one("#mw-content-text .mw-parser-output")
if content is None:
    raise ValueError("未能从维基百科页面中找到正文")

# 去掉导航和表格等非正文内容，再转换为 LangChain Document。
for element in content.select("script, style, table, .navbox, .metadata"):
    element.decompose()
docs = [
    Document(
        page_content=content.get_text(separator="\n", strip=True),
        metadata={"source": wiki_url},
    )
]
documents = RecursiveCharacterTextSplitter(
    chunk_size=1000, chunk_overlap=200
).split_documents(docs)
vector = Chroma.from_documents(documents, GLMEmbeddings(model="embedding-2"))
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

# create_agent 会构建模型与工具之间的调用循环。
agent = create_agent(model=model, tools=tools)

