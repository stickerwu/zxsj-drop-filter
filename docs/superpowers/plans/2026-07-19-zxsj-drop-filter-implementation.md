# 诛仙世界秘境掉落筛选 Implementation Plan

**Goal:** Build and publish a maintainable Tauri desktop replacement for the existing dungeon-drop filter.

**Architecture:** React/TypeScript/Vite renders the shadcn/ui three-column workbench. Pure TypeScript owns normalized data, matching, weighted probability, sorting, summaries, JSON validation, and the `zx1` compatibility boundary. Tauri owns native windows, file access, clipboard, and packaging.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, TanStack Table, Zod, Vitest, pnpm.

## Global Constraints

- Default UI is the confirmed “青玉纸本” light theme.
- Default layout is a resizable three-column workbench.
- Empty filters mean no restriction.
- `命中任一` uses set intersection; `同一词条全满足` uses set containment.
- Probability uses exact internal values and display-only rounding.
- Public repository includes demo data only; real `.zx` files are ignored.
- MIT License; sync `main` and tags to GitHub and Gitee.

## Tasks

1. Initialize Vite, Tauri, Tailwind, shadcn, Vitest, lint and MIT metadata.
2. Implement normalized domain types and attribute expansion.
3. Implement matching, weighted probability, recommendation sorting and summaries with TDD.
4. Implement versioned JSON parsing and the `.zx` compatibility boundary.
5. Build the shadcn three-column workbench with resizable panels, filters, table, tabs, detail panel and copy actions.
6. Build the data editor with add, edit, duplicate, verify, remove and apply actions.
7. Add README, demo data, screenshots, CI and release metadata.
8. Run lint, tests, Vite build and Tauri build; audit secrets and data files; sync GitHub and Gitee.
