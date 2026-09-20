# Anatomy iOS

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Default tooling

ponytail (global plugin), rtk (global Bash hook), codegraph (`.codegraph/` index
+ global prompt hook) and caveman at level `full` (`.claude/settings.json` SessionStart hook) are
on by default in this repo. Don't disable them without asking.
