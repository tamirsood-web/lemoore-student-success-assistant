# Lemoore Student Success Assistant — Agent Pack

This package contains the shared instructions and planning files for the hackathon repository.

## Use

Copy all files into the root of the team repository while preserving folders.

Every teammate should tell their IDE agent:

> Read `AGENTS.md` and the linked files before making changes. Treat them as repository requirements.

## Important Files

- `AGENTS.md` — primary rules for all coding agents
- `CLAUDE.md` — Claude Code entry point
- `.github/copilot-instructions.md` — GitHub Copilot repository instructions
- `docs/PROJECT_CONTEXT.md` — problem and users
- `docs/ARCHITECTURE.md` — AWS-native technical design
- `docs/MVP_BACKLOG.md` — implementation order
- `docs/EVAL_QUESTIONS.md` — grounding and safety test set
- `docs/AWS_SETUP.md` — shared provisioning checklist
- `docs/DEMO_SCRIPT.md` — judged presentation flow
- `.env.example` — expected configuration names

## First Team Actions

1. Put this pack in the repository and commit it.
2. Choose one AWS region.
3. Confirm Bedrock model access.
4. Create a small approved source corpus.
5. Assign owners using the backlog.
6. Build the grounded public chat vertical slice before the dashboard or stretch features.
