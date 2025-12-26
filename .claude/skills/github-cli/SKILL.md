---
name: github-cli
description: Use GitHub CLI (gh) to manage issues and pull requests from Claude Code. Use when the user wants to create PRs, link commits to issues, fetch PR context, or automate GitHub workflows. Includes install/auth checks, safe branching, clean commits, and PR creation templates.
---

# GitHub CLI (gh) integration

## Preconditions (verify before doing anything)
1. `gh --version` works
2. `gh auth status` is authenticated
3. Repo has a remote (usually `origin`) and correct upstream branch

If missing, propose the install/auth steps (don't guess).

## Installation (reference)
- macOS: `brew install gh`
- Ubuntu/Debian: install from GitHub CLI packages
- Windows: `winget install --id GitHub.cli`

## Authentication
```bash
gh auth login
# Follow prompts to authenticate via browser
```

## Standard flow (issue-driven)

### 1) Sync main branch
```bash
git checkout main
git pull --rebase
```

### 2) Create branch
```bash
git checkout -b feat/<short-slug>  # or fix/<slug>
```

### 3) Implement changes
Follow EPCP workflow if available

### 4) Verify locally
```bash
# Run tests/lint/build
npm test  # or pytest, etc.
```

### 5) Commit
```bash
git add -p  # Stage selectively
git commit -m "feat: description"
```

### 6) Push
```bash
git push -u origin <branch>
```

### 7) Create PR
```bash
gh pr create --fill  # or provide title/body explicitly
```

## PR body template
Use [templates/pr-body.md](templates/pr-body.md)

## Useful gh commands

### Issues
```bash
gh issue list                    # List open issues
gh issue view 123                # View issue details
gh issue create                  # Create new issue
gh issue close 123               # Close issue
```

### Pull Requests
```bash
gh pr list                       # List open PRs
gh pr view 123                   # View PR details
gh pr create --title "..." --body "..."
gh pr merge 123                  # Merge PR
gh pr checkout 123               # Checkout PR branch
```

### Workflow
```bash
gh run list                      # List workflow runs
gh run view 123                  # View run details
gh run watch 123                 # Watch run in real-time
```

## Safe defaults
- Stage selectively (`git add -p`)
- Avoid committing secrets or local config
- If CI is required, ensure a minimal test step is run before PR
- Never force push to main/master

## Commit message format (conventional commits)
```
type(scope): description

feat: new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructuring
test: tests
chore: maintenance
```
