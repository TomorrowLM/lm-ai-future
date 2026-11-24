"""GLM Embeddings 适配器：通过 GLM API 为 LangChain 文本生成向量。"""

import os

from langchain_core.embeddings import Embeddings
from openai import OpenAI

import core.config  # noqa: F401  # Load project environment variables.


class GLMEmbeddings(Embeddings):
	"""通过 OpenAI 兼容接口调用 GLM embedding 模型。"""

	def __init__(self, model: str = "embedding-2") -> None:
		# core.config 在导入时加载项目根目录的 .env。
		api_key = os.getenv("GLM_API_KEY")
		base_url = os.getenv("GLM_BASE_URL")
		if not api_key or not base_url:
			raise ValueError("请在 .env 中配置 GLM_API_KEY 和 GLM_BASE_URL")

		self.model = model
		self.client = OpenAI(api_key=api_key, base_url=base_url)

	def embed_documents(self, texts: list[str]) -> list[list[float]]:
		# 文档向量按输入顺序返回，供向量库批量写入和检索。
		return [self._embed(text) for text in texts]

	def embed_query(self, text: str) -> list[float]:
		# 查询文本必须使用相同模型编码，才能与文档向量比较。
		return self._embed(text)

	def _embed(self, text: str) -> list[float]:
		# 调用 GLM 的 OpenAI 兼容 Embeddings API，返回单条文本的向量。
		response = self.client.embeddings.create(
			input=text,
			model=self.model,
		)
		return response.data[0].embedding
