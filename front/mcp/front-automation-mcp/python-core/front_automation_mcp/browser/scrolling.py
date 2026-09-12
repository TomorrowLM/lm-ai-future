from __future__ import annotations

from typing import Any


async def scroll_all(page: Any, max_rounds: int = 20) -> dict[str, Any]:
    stable_rounds = 0
    total_containers = 0
    rounds = 0
    for round_index in range(max(1, min(max_rounds, 100))):
        state = await page.evaluate(
            """() => {
              const nodes = [document.scrollingElement, ...document.querySelectorAll('*')]
                .filter(e => e && e.scrollHeight > e.clientHeight + 20);
              let moved = false;
              for (const e of nodes) {
                const before = e.scrollTop;
                const step = Math.max(240, Math.floor(e.clientHeight * 0.8));
                e.scrollTop = Math.min(e.scrollHeight, before + step);
                if (e.scrollTop !== before) moved = true;
              }
              const beforeWindow = window.scrollY;
              window.scrollBy(0, Math.max(240, Math.floor(window.innerHeight * 0.8)));
              if (window.scrollY !== beforeWindow) moved = true;
              return {moved, containers: nodes.length, scrollY: window.scrollY, height: document.body.scrollHeight};
            }"""
        )
        rounds = round_index + 1
        total_containers = max(total_containers, state.get("containers", 0))
        await page.wait_for_timeout(250)
        if not state.get("moved"):
            stable_rounds += 1
        else:
            stable_rounds = 0
        if stable_rounds >= 2:
            break
    return {"scrolled": True, "containers": total_containers, "rounds": rounds, "stable": stable_rounds >= 2}


class ScrollingMixin:
    async def scroll_all(self, page: Any, max_rounds: int = 20) -> dict[str, Any]:
        return await scroll_all(page, max_rounds)
