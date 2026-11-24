from pathlib import Path

from langchain.agents import create_agent
from langchain_community.agent_toolkits.sql.toolkit import SQLDatabaseToolkit
from langchain_community.utilities import SQLDatabase
from langchain_openai import ChatOpenAI
import core.config
import os

# Resolve the database beside this script, independent of the launch directory.
db_path = Path(__file__).with_name("langchain.db")
db = SQLDatabase.from_uri(f"sqlite:///{db_path.as_posix()}")
model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY")
)
toolkit = SQLDatabaseToolkit(db=db, llm=model)
tools = toolkit.get_tools()
print(tools)

agent = create_agent(
    model=model,
    tools=tools,
    system_prompt=(
        f"You are an assistant that answers questions about a {db.dialect} database. "
        "Inspect the available tables and schemas before querying. Only run read-only "
        "queries; never modify the database."
    ),
)
result = agent.invoke(
    {"messages": [{"role": "user", "content": "Describe the full_llm_cache table"}]}
)
print(result["messages"][-1].content)
