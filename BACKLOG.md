
## Phase 2 — QA Follow-ups (non-blocking)

- **Cost basis fee tracking:** `holding.totalCost` excludes buy fees — per-holding P&L is ~0.1% optimistic per buy. Total portfolio P&L is accurate. Fix: include fee in `totalCost` on buy.
- **`paper reset` missing from top-level help:** Shows in `omnitrade paper help` but not the main `omnitrade help` screen. Cosmetic fix.
- **SVG gradient ID collision:** IDs use `symbol.replace(/\//g, '_')` — fine for standalone use, could conflict if multiple charts embedded in same HTML page. Low priority.
