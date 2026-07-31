import os
from dotenv import load_dotenv
from openai import OpenAI
# pip install --upgrade tiktoken
#tiktoken 用来统计token使用
import tiktoken

load_dotenv()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)
# 初始化 tiktoken 编码器（DeepSeek 兼容 cl100k_base 编码，统计结果为近似值）
encoder = tiktoken.get_encoding("cl100k_base")

def count_tokens(text):
    # 将输入的文本text转换为对应的token列表。
    tokens = encoder.encode(text)
    # 统计文本中的 token 数量（DeepSeek 实际 token 数可能有偏差）
    return len(tokens)


def main():
    # 初始化聊天记录
    messages = [
        {"role": "system", "content": "You are a helpful assistant."}
    ]

    print("开始聊天吧！输入 'exit' 退出。")

    total_tokens = 0

    while True:
        # 获取用户输入
        user_input = input("用户: ")

        if user_input.lower() == 'exit':
            break

        # 添加用户消息到聊天记录
        messages.append({"role": "user", "content": user_input})

        # 统计用户输入的 token 数量并累加
        user_tokens = count_tokens(user_input)
        total_tokens += user_tokens

        # 调用 DeepSeek 模型
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=150,
            temperature=0.7,
            top_p=1,
            n=1
        )

        # 获取助手的回复
        assistant_message = response.choices[0].message.content.strip()

        # 添加助手的回复到聊天记录
        messages.append({"role": "assistant", "content": assistant_message})

        # 统计助手回复的 token 数量并累加
        assistant_tokens = count_tokens(assistant_message)
        total_tokens += assistant_tokens

        # 输出用户输入和助手的回复
        print(f"助手: {assistant_message}")

        # 输出当前聊天记录的总 token 数量
        print(f"用户tokens数: {user_tokens}，助手tokens数: {assistant_tokens}，总token数: {total_tokens}")


if __name__ == "__main__":
    main()
