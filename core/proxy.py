import os
# 绕过系统代理（如 Whistle），避免 httpx SSL 握手失败
# os.environ.setdefault("no_proxy", "*")