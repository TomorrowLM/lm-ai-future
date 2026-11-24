"""HTTP 请求相关的通用组件。"""

import os

import requests


def create_requests_session(proxy_url: str | None = None) -> requests.Session:
    """创建 requests Session；未传代理时默认读取 WIKIPEDIA_PROXY。"""
    if proxy_url is None:
        proxy_url = os.getenv("WIKIPEDIA_PROXY")

    session = requests.Session()
    if proxy_url:
        # 显式代理时不读取系统代理和 NO_PROXY，确保请求使用传入的代理。
        session.trust_env = False
        session.proxies.update({"http": proxy_url, "https": proxy_url})
    return session
