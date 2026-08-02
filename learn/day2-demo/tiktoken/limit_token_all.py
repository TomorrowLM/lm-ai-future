import os
from learn.config import *
from openai import OpenAI
# pip install tiktoken
import tiktoken

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)

# 这是 API 请求和响应的总 token 数量限制。对于 DeepSeek 模型，上下文窗口通常是 65536。
MAX_TOKENS = 8  # 设置最大 token 数量
# 这是我们预留给模型响应的 token 数量。我们需要在计算对话的最大 token 数量时减去这个值，以确保有足够的空间来容纳模型的响应。
MAX_RESPONSE_TOKENS = 6  # 设置响应中预留的最大 token 数量
# DeepSeek 兼容 cl100k_base 编码，统计结果为近似值
encoder = tiktoken.get_encoding("cl100k_base")
def count_tokens(text):
    # 将输入的文本text转换为对应的token列表。
    tokens = encoder.encode(text)
    # 统计文本中的 token 数量（DeepSeek 实际 token 数可能有偏差）
    return len(tokens)
# 假设 MAX_TOKENS 是 4096，而 MAX_RESPONSE_TOKENS 是 500，那么：
# 我们希望对话历史的 token 数量不要超过 3596 (4096 - 500)。
# 这样，当我们发送对话历史给 API 时，仍然有 500 个 token 的空间用于模型生成的响应。
def manage_token_limit(messages):
    """检查整个对话历史的 token 是否超限"""
    # 将 messages 列表转为字符串用于 token 统计
    text = "".join(msg["content"] for msg in messages)
    current_tokens = count_tokens(text)
    if current_tokens > (MAX_TOKENS - MAX_RESPONSE_TOKENS):
        print(f"当前会话 token 数量: {current_tokens}, 超过最大 token 数量: {MAX_TOKENS - MAX_RESPONSE_TOKENS}")
        return False
    return True


def get_gpt_response(messages):
    """获取 DeepSeek 的响应"""
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages
    )
    return response.choices[0].message.content.strip()

def main():
    messages = []

    print("Chat with DeepSeek. Type 'exit' to end the conversation.")
    while True:
        user_input = input("用户: ")
        if user_input.lower() == 'exit':
            break

        # 先检查加上新消息后是否会超限，超限则拒绝本次输入
        new_messages = messages + [{"role": "user", "content": user_input}]
        if not manage_token_limit(new_messages):
            print("消息过长，请精简后重试。")
            continue

        messages = new_messages

        response = get_gpt_response(messages)
        print(f"DeepSeek: {response}")

        messages.append({"role": "assistant", "content": response})


if __name__ == "__main__":
    main()
