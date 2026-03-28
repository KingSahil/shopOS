# GitHub Copilot Instructions for kiranaKeeper (WhatsApp AI Sales Agent)

## 1. Purpose

- This repository is a Node.js WhatsApp chatbot using `@whiskeysockets/baileys`, `better-sqlite3`, and optional Groq LLM integration.
- The AI path converts free-text order intents into structured carts; fallback menu-based flows are available.
- Objective for Copilot: support developer efficiency with safe code edits, clear refactors, and docs-first behavior.

## 2. Key project structure

- `kiranabot/`: main bot implementation.
  - `src/server.js`: app entry point, WhatsApp session bootstrap, message router.
  - `src/nlp/`: intent parsing + Groq tool call integration.
  - `src/stages/`: flow stages (menu state machine).
  - `src/storage.js`: SQLite persistence API.
  - `src/cron_jobs.js`: abandoned cart reminder job.
  - `package.json`: scripts (`npm start`, `npm run dev`).
- `assets/`: demo media and session tokens under `tokens/`.
- Root docs: `README.md`, `CODE_EXPLANATION.md`, `QUICK_REFERENCE.md`, `TROUBLESHOOTING.md`, `INTEGRATION_GUIDE.md`.

## 3. Setup and local run

1. `cd kiranabot`
2. `npm install`
3. `cp .env.example .env` (optional, set `GROQ_API_KEY`, `GROQ_MODEL`)
4. `npm run dev` to start with auto-reload.
5. Scan QR printed in terminal with WhatsApp mobile device.

## 4. Guidance for copilot-based code changes

- Rule 1: follow existing style and stage-based flow in `src/stages`.
- Rule 2: focus first on small, safe modifications (fix bug, add feature toggle, add tests if requested).
- Rule 3: for behavior/feature docs, link to existing README sections; do not duplicate full architecture.
- Rule 4: preserve state format in `src/storage` and `botwhatsapp.db` migrations.

## 5. Project-specific conventions

- Prefer explicit stage numbers / `stage` keys in session state payload.
- Keep UI strings in `src/stages` stage handlers.
- `nlp` branch is separate from menu-driven stage router; changes should isolate risk.

## 6. Known no-op/anti-patterns

- Do not assume a front-end exists; app is a backend WhatsApp bot.
- Do not add frameworks or large refactors without explicit user instruction.
- Avoid changing `tokens/` or `botwhatsapp.db` in repo; these are runtime artifacts.

## 7. Useful checkpoints

- Always validate by running `npm run dev`, verifying QR output, and simulated message flow.
- For AI flow, confirm success path with sample text: `I want 2 milks and an apple delivered to Downtown Dubai`.
- For cron flow, inspect `src/cron_jobs.js` run interval and database query window.

## 8. Next-step suggestions

- Add focused agent instructions for:
  - backend bugfixes (`/create-instruction ...` for `src/stages`, `src/nlp`).
  - docs update tasks (README + QUICK_REFERENCE).
  - feature augmentation (+Groq fallback for local LLM). 

> Keep edits concise. When asked to create or review PRs, include a summary of the affected modules and impact on the WhatsApp ordering pipeline.
