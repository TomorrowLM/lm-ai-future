# my-app

## LangServe 服务端与客户端学习小结

本节结合 [服务端](app/server.py)、[LangChain 客户端](app/client.py)和 [HTTP 客户端](app/client_req.py)说明一次调用的完整过程。文档后半部分保留的是早期脚手架说明，运行本示例以本节为准。

### 1. 概念

- **FastAPI**：提供 Web 服务，接收客户端的 HTTP 请求。
- **LangChain Runnable**：具有统一调用方式的组件，例如提示词模板、模型和输出解析器。`|` 用于将前一步的输出传给后一步。
- **LangServe**：将 Runnable 或链发布为 HTTP 接口，也提供 `RemoteRunnable`，让 Python 客户端像使用本地 Runnable 一样调用远端。
- **模型服务**：当前服务端通过 `ChatOpenAI` 连接配置的 OpenAI 兼容接口；变量名和路径中的 `openai` 不代表实际调用的是 OpenAI 的模型。

三条调用链分别是：

```text
客户端提示词 → /openai → 模型 → AIMessage
客户端提示词 → /openai_str_parser → 模型 → StrOutputParser → 字符串
{topic}     → /openai_ext → 服务端提示词 → 模型 → AIMessage
```

跨 HTTP 传输时，模型消息会被序列化为 JSON；`RemoteRunnable` 再将可识别的消息还原为 LangChain 对象。直接使用 `requests` 时，得到的是 HTTP 响应，需要自行解析 JSON。

### 2. 使用场景

- 想在 Python 客户端继续组合提示词和链：选择 `RemoteRunnable`。
- 其他语言或普通 HTTP 客户端需要调用服务：直接请求 LangServe 接口。
- 希望统一管理提示词：将模板放在服务端，客户端只传入变量，例如 `/openai_ext`。
- 希望客户端灵活调整提示词：客户端生成提示词，再调用 `/openai` 或 `/openai_str_parser`。

本示例适合学习已有 LangServe 项目。LangServe 官方已宣布弃用，并建议新项目考虑 LangGraph Platform，见文末参考资料。

### 3. API 说明

#### ChatOpenAI 与 ChatPromptTemplate

服务端的 `ChatOpenAI` 负责连接模型服务，`base_url` 和 `api_key` 分别来自 `DEEPSEEK_BASE_URL`、`DEEPSEEK_API_KEY`。模型名称当前写死为 `deepseek-chat`；修改环境变量不会自动修改模型名称。

`ChatPromptTemplate` 将变量填入消息模板。例如服务端的 `prompt` 接收 `{"topic": "猫"}`，生成内容为“告诉我一个关于 猫 的笑话”的用户消息。客户端示例则创建系统消息和用户消息，要求模型写故事。

#### add_routes

`add_routes(app, runnable, path=...)` 将指定的 Runnable 挂载到 FastAPI。每条路径都可以通过 `/invoke` 同步调用，也提供 `/batch` 和 `/stream` 等接口。

| 路径前缀 | 服务端链 | 输入示例 | `RemoteRunnable.invoke()` 返回值 |
| --- | --- | --- | --- |
| `/openai` | `llm` | 字符串或提示词消息 | `AIMessage` |
| `/openai_str_parser` | `llm \| StrOutputParser()` | 字符串或提示词消息 | 字符串 |
| `/openai_ext` | `prompt \| llm` | `{"topic": "猫"}` | `AIMessage` |

例如，调用 `/openai_ext/invoke` 时，HTTP 请求体为 `{"input": {"topic": "猫"}}`；JSON 响应的 `output` 是包含 `content` 等字段的消息对象，`metadata` 是本次运行的元信息。`/openai_str_parser/invoke` 的 `output` 则是字符串。实际回答和元信息会随模型调用变化。

#### RemoteRunnable、RunnableMap 与 StrOutputParser

- `RemoteRunnable("http://localhost:8000/openai/")` 指向远程路径，调用 `.invoke()` 时由客户端发起对应的 HTTP 请求。
- `RunnableMap({"openai": remote})` 将相同输入交给各个命名分支，返回以分支名为键的字典。本例只有一个分支；`openai` 是客户端定义的字典键，不是服务端 JSON 的固定字段。
- `StrOutputParser` 从模型消息中提取文本，因此解析后的结果是字符串，不能再访问 `.content`。未经过该解析器的 `AIMessage` 可以通过 `.content` 获取内容。

#### invoke、batch 与 stream

- `.invoke(单个输入)`：同步执行一次，等待完整结果。
- `.batch([输入1, 输入2])`：执行多个输入，返回与输入对应的结果列表；涉及多次模型调用。
- `.stream(单个输入)`：迭代返回逐步产生的片段，不保证每个片段都有非空文本。

本例的提示词只有 `topic` 一个变量。传入 `[{'topic': '猫'}]` 给 `.invoke()` 不表示批量：该列表会被当成 `topic` 的值。单次调用应传 `{"topic": "猫"}`，批量调用才使用 `.batch([{"topic": "猫"}])`。当前客户端源码仍使用了列表形式，学习时应注意区分。

### 4. 示例

#### 准备与启动

1. 在 `lm-ai-future` 仓库根目录准备 Python 环境，并在根目录 `.env` 中设置以下变量；不要提交或分享真实密钥。

   ```dotenv
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   DEEPSEEK_API_KEY=填写自己的密钥
   ```

   [公共配置](../../../core/config.py)通过 `python-dotenv` 加载环境变量。也可以在启动进程前直接设置同名环境变量。

2. 如果直连 DeepSeek 官方 API，先将 [服务端](app/server.py)中 `model="deepseek-chat"` 改为账号支持的模型，例如官方当前文档列出的 `deepseek-flash`。官方公告称 `deepseek-chat` 已于 **2026 年 7 月 24 日 15:59 UTC** 后停用；第三方兼容服务的支持情况以其文档为准。本学习小结不会自动修改服务端代码。

3. 在仓库根目录执行：

   ```bash
   uv sync
   uv run python study/day5-langchain-chat-model/02-langserve/app/server.py
   ```

   服务默认监听 `localhost:8000`，启动后可在浏览器访问 `http://localhost:8000/docs` 查看接口。另开终端运行客户端。首次同步依赖和实际模型请求需要网络，模型请求可能产生费用。

#### 使用 RemoteRunnable 组合客户端提示词

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableMap
from langserve import RemoteRunnable

prompt = ChatPromptTemplate.from_messages([
	("system", "你是一个喜欢写故事的助手"),
	("user", "写一个故事，主题是：{topic}"),
])
remote = RemoteRunnable("http://localhost:8000/openai/", timeout=60)
chain = prompt | RunnableMap({"openai": remote})

result = chain.invoke({"topic": "猫"})
print(result["openai"].content)
```

执行顺序：填充客户端提示词 → 发送至服务端 `/openai/invoke` → 服务端调用模型 → 客户端得到 `{"openai": AIMessage(...)}`。如果改用 `/openai_str_parser/`，`result["openai"]` 即为字符串。

#### 使用 requests 调用服务端提示词

```python
import requests

response = requests.post(
	"http://localhost:8000/openai_ext/invoke",
	json={"input": {"topic": "猫"}},
	timeout=60,
)
response.raise_for_status()
result = response.json()
print(result["output"]["content"])
```

执行顺序：发送 JSON → 服务端填充“讲笑话”的提示词 → 调用模型 → 返回 JSON。这个接口与上面的 `/openai` 使用同一个模型，但提示词不同，因此输出内容也不同。`raise_for_status()` 用于及时发现非成功 HTTP 状态。

#### 使用 requests 接收流式结果

```python
import json
import requests

with requests.post(
	"http://localhost:8000/openai_ext/stream",
	json={"input": {"topic": "猫"}},
	stream=True,
	timeout=60,
) as response:
	response.raise_for_status()
	event = ""
	for line in response.iter_lines(decode_unicode=True):
		if line.startswith("event:"):
			event = line[len("event:"):].strip()
		elif line.startswith("data:") and event == "data":
			chunk = json.loads(line[len("data:"):])
			print(chunk.get("content", ""), end="", flush=True)
		elif not line:
			event = ""
```

这里的 `/stream` 使用 Server-Sent Events（SSE）：`event` 区分元信息、数据、结束等事件，`data` 是事件载荷。示例只打印 `data` 事件中的文本，不是完整的通用 SSE 客户端；实际项目还应处理错误事件、连接中断和其他内容类型。`stream=True` 让 `requests` 不必先下载完整响应；现有 `client_req.py` 的流式代码已注释，启用时需要补上该参数。

### 5. 注意事项

| 现象 | 优先检查 |
| --- | --- |
| 连接失败 | 服务是否启动、端口是否为 `8000`、客户端和服务端是否在同一台机器。 |
| 模型调用失败 | 服务端模型名称、`DEEPSEEK_BASE_URL`、密钥、账号权限及服务商状态；不要把密钥贴到日志或聊天中。 |
| HTTP 422 | 请求 JSON 的 `input` 是否符合目标接口；例如 `/openai_ext` 需要包含 `topic` 的对象。 |
| 提示字符串没有 `.content` | 是否调用了 `/openai_str_parser`；该接口返回的是字符串。 |
| 把列表当作单个主题 | `.invoke()` 应传单个字典；多个输入使用 `.batch()`。 |

该示例没有展示身份认证，CORS 配置也较宽松；默认仅在本机学习使用，不应直接暴露到公网。链不会自动记住前一次独立请求的聊天内容；需要连续对话时应显式提供历史或设计会话管理。

### 6. 参考资料

- [LangServe 官方仓库与弃用说明](https://github.com/langchain-ai/langserve)
- [DeepSeek V4 公告：旧模型名称停用时间](https://api-docs.deepseek.com/news/news260424)
- [DeepSeek API 模型及接入说明](https://api-docs.deepseek.com/quick_start/pricing)
- [Requests 高级用法](https://requests.readthedocs.io/en/latest/user/advanced/)

以上行为已使用本仓库根目录虚拟环境中的 `langserve 0.3.3`、`langchain-core 1.6.1` 和假模型在本地核对；没有实际请求 DeepSeek，模型可用性与账户权限仍需自行确认。

## Installation

Install the LangChain CLI if you haven't yet

```bash
pip install -U langchain-cli
```

## Adding packages

```bash
# adding packages from 
# https://github.com/langchain-ai/langchain/tree/master/templates
langchain app add $PROJECT_NAME

# adding custom GitHub repo packages
langchain app add --repo $OWNER/$REPO
# or with whole git string (supports other git providers):
# langchain app add git+https://github.com/hwchase17/chain-of-verification

# with a custom api mount point (defaults to `/{package_name}`)
langchain app add $PROJECT_NAME --api_path=/my/custom/path/rag
```

Note: you remove packages by their api path

```bash
langchain app remove my/custom/path/rag
```

## Setup LangSmith (Optional)
LangSmith will help us trace, monitor and debug LangChain applications. 
You can sign up for LangSmith [here](https://smith.langchain.com/). 
If you don't have access, you can skip this section


```shell
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=<your-api-key>
export LANGCHAIN_PROJECT=<your-project>  # if not specified, defaults to "default"
```

## Launch LangServe

```bash
langchain serve
```

## Running in Docker

This project folder includes a Dockerfile that allows you to easily build and host your LangServe app.

### Building the Image

To build the image, you simply:

```shell
docker build . -t my-langserve-app
```

If you tag your image with something other than `my-langserve-app`,
note it for use in the next step.

### Running the Image Locally

To run the image, you'll need to include any environment variables
necessary for your application.

In the below example, we inject the `OPENAI_API_KEY` environment
variable with the value set in my local environment
(`$OPENAI_API_KEY`)

We also expose port 8080 with the `-p 8080:8080` option.

```shell
docker run -e OPENAI_API_KEY=$OPENAI_API_KEY -p 8080:8080 my-langserve-app
```
