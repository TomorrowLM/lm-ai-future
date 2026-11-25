# Async Data Stream Exercises（异步数据流）

These exercises introduce asynchronous data streams in Python, progressing through three building blocks: `yield` (synchronous generators), `await` (coroutines and concurrency), and `yield + await` (async generators). You'll learn to produce values over time, consume them with `async for`, run coroutines concurrently, and compose data pipelines.

---

## Covered Topics

| Exercise    | Concept                                            |
|-------------|----------------------------------------------------|
| `async1.py` | Step 1 — `yield`: synchronous generators           |
| `async2.py` | Step 2 — `await`: coroutines and `asyncio.gather`  |
| `async3.py` | Step 3 — `yield + await`: async generators & pipes |

---

## How to Use

Each file includes:
- A problem to solve
- Clear `TODO` instructions
- Tests using `assert` to verify correct execution

Run a single exercise with `python3 async1.py`, or pick it from the launcher: `python3 run.py`.

---

## Tips
- A `yield` function is a generator — lazy, one value at a time; consume with `for` or `next()`
- `async def` + `await` makes a coroutine; it suspends instead of blocking the event loop
- `async def` + `yield` + `await` makes an async generator; consume it with `async for`
- `asyncio.run()` starts the event loop and runs the top-level coroutine
- Use `asyncio.gather()` to run multiple coroutines concurrently
- `await asyncio.sleep()` simulates async I/O without blocking

---

Stream on, asynchronously.
