# 统一环境变量加载

## 问题

`learn/` 目录下 10 个脚本各自重复 `from dotenv import load_dotenv` + `load_dotenv()`，部分脚本甚至遗漏，导致加载方式不统一。

## 方案

新增 `learn/config.py` 作为统一入口，其他脚本改为导入该模块。

### learn/config.py

```python
"""统一环境变量加载。"""
from dotenv import load_dotenv
load_dotenv()
```

### 脚本改动

需改动的 11 个文件：

| 文件 | 操作 |
|------|------|
| `learn/day1-demo/req_call.py` | 删 dotenv 两行，加 `from learn.config import *` |
| `learn/day2-demo/sdk_call.py` | 同上 |
| `learn/day2-demo/json/json_mode.py` | 同上 |
| `learn/day2-demo/seed/seed.py` | 同上 |
| `learn/day2-demo/embedding/sdk_text_vector.py` | 同上 |
| `learn/day2-demo/tiktoken/count_token.py` | 同上 |
| `learn/day2-demo/tiktoken/limit_token.py` | 同上 |
| `learn/day2-demo/tiktoken/limit_token_all.py` | 同上 |
| `learn/day2-demo/vision/offline_image_to_text.py` | 同上 |
| `learn/day2-demo/req_call.py` | 加 `from learn.config import *`（原本缺失） |
| `learn/day2-demo/embedding/req_text_vector.py` | 加 `from learn.config import *`（原本缺失） |

### 运行方式

不变：`python learn/day2-demo/tiktoken/count_token.py`，工作目录在项目根即可。

### 不涉及

`learn/day2-demo/vision/online_image_to_text.py` 使用 `OpenAI()` 无参构造，不在本次改动范围。
