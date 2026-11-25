"""Pylings 练习启动器 — python3 run.py 直接选题目"""
import subprocess
import os
from pathlib import Path

EXERCISES_DIR = Path(__file__).parent / "exercises"

def collect_exercises():
    exercises = []
    for topic in sorted(EXERCISES_DIR.iterdir()):
        if topic.is_dir():
            for f in sorted(topic.glob("*.py")):
                exercises.append(f.relative_to(EXERCISES_DIR))
    return exercises

exercises = collect_exercises()

print("Pylings 练习题列表：\n")
for i, ex in enumerate(exercises, 1):
    print(f"  {i:2d}. {ex}")

print(f"\n输入序号 (1-{len(exercises)}) 运行对应题目，输入 q 退出")

while True:
    choice = input("\n> ").strip()
    if choice.lower() == "q":
        break
    try:
        idx = int(choice) - 1
        if 0 <= idx < len(exercises):
            target = EXERCISES_DIR / exercises[idx]
            print(f"--- 运行 {exercises[idx]} ---\n")
            subprocess.run(["python3", str(target)])
        else:
            print("序号超出范围")
    except ValueError:
        print("请输入数字或 q 退出")
