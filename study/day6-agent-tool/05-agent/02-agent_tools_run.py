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
embeddings = GLMEmbeddings(model="embedding-2")
vector = Chroma.from_documents(documents, embeddings)
retriever = vector.as_retriever()

retriever_tool = create_retriever_tool(
    retriever,
    "wiki_search",
    "搜索维基百科",
)
search = TavilySearch(max_results=1)
model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)
tools = [search, retriever_tool]

agent = create_agent(
    model=model,
    tools=tools,
    system_prompt=(
        "Use the Wikipedia search tool for background knowledge and the web search "
        "tool for current information. Answer the user's question in Chinese."
    ),
)
result = agent.invoke(
    {"messages": [{"role": "user", "content": "猫的特征?今天上海天气怎么样?"}]}
)
print(result["messages"][-1].content)
