# Claude Session Workflow

This document explains the automated workflow for managing Claude Code sessions and branches.

## Overview

When working with Claude Code, each session creates a new branch (e.g., `claude/feature-name-sessionID`). To streamline development and avoid branch clutter, we've implemented an **automated merge and cleanup workflow**.

## How It Works

### Automatic Workflow (GitHub Actions)

When Claude pushes a new branch to the repository:

1. **GitHub Action Triggers** - Detects the new `claude/*` branch
2. **Delete Old** - Deletes the previous `claude-latest` branch (if exists)
3. **Rename** - Renames the new session branch to `claude-latest`
4. **Auto-Merge** - Merges `claude-latest` into `dev` (ground truth)
5. **Auto-Push** - Pushes the updated `dev` branch to remote
6. **Cleanup** - Deletes the ephemeral `claude-latest` branch

**Result**: Only `dev` and `main` branches remain. The `dev` branch is always the latest Claude session (ground truth).

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Session                                              │
│ └─> Pushes to claude/feature-xyz-sessionID                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions (Ground Truth Automation)                    │
│ 1. Delete old claude-latest (if exists)                    │
│ 2. Rename new session → claude-latest                      │
│ 3. Merge claude-latest into dev                            │
│ 4. Push dev to remote (GROUND TRUTH)                       │
│ 5. Delete claude-latest (ephemeral)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Dev Branch (Ground Truth)                                   │
│ └─> Always has latest Claude session                       │
│ └─> No Claude branches remain                              │
│ └─> Local users pull from dev                              │
└─────────────────────────────────────────────────────────────┘
```

## For Local Development

### Getting Latest Changes (Ground Truth)

Simply pull from `dev`:

```bash
# Switch to dev branch
git checkout dev

# Pull latest changes (includes latest Claude session work)
git pull origin dev
```

**Quick Sync Alias** (optional):

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, or PowerShell `$PROFILE`):

```bash
# Bash/Zsh
alias gt='git checkout dev && git pull origin dev'

# PowerShell
function Update-GroundTruth {
    git checkout dev
    git pull origin dev
    Write-Host "✓ Local dev synced with ground truth" -ForegroundColor Green
}
Set-Alias gt Update-GroundTruth
```

Now simply run:

```bash
gt
```

To instantly sync your local dev with the latest Claude session.

### Branch Strategy

- **`main`** - Production-ready code
- **`dev`** - Active development (**GROUND TRUTH**, auto-updated with latest Claude sessions)
- **`claude/*`** - Temporary session branches (automatically deleted, never persist)

### Workflow

1. Claude works in session branches (`claude/*`)
2. Changes automatically merge to `dev`
3. You pull from `dev` to get latest
4. When ready, merge `dev` → `main` for release

## Manual Cleanup (Optional)

If you need to manually clean up Claude branches:

```bash
# Run the cleanup script
bash scripts/cleanup-claude-branches.sh
```

Options:

- Keep latest branch, delete others
- Delete all Claude branches
- Cancel

## GitHub Actions Configuration

The automation is configured in `.github/workflows/auto-merge-claude-sessions.yml`

### What It Does

- **Trigger**: On push to any `claude/*` branch
- **Merge**: Automatically merges to `dev` (if no conflicts)
- **Cleanup**: Removes old Claude session branches
- **Notifications**: Shows summary in Actions log

### Permissions Required

The workflow needs:

- `contents: write` - To push to `dev` and delete branches

This is automatically granted via `GITHUB_TOKEN`.

## Handling Merge Conflicts

If the GitHub Action detects a merge conflict:

1. **Action Fails** - The workflow stops and reports the conflict
2. **Manual Resolution** - You need to manually merge:

```bash
# Checkout dev
git checkout dev

# Merge the Claude branch manually
git merge origin/claude/branch-name

# Resolve conflicts
# ... edit files ...

# Commit the merge
git add .
git commit -m "chore: merge Claude session with conflict resolution"

# Push to dev
git push origin dev

# Optionally, delete the Claude branch
git push origin --delete claude/branch-name
```

## Benefits

✅ **Single Source of Truth** - `dev` = latest Claude session (ground truth)
✅ **Zero Manual Work** - Automatic merge + cleanup on every Claude push
✅ **Pristine Repository** - NO Claude branches remain (only `dev` and `main`)
✅ **Simple for Users** - Just `gt` or `git pull origin dev`
✅ **Clear History** - All changes tracked in `dev` branch
✅ **Ephemeral Sessions** - `claude-latest` exists only during merge process

### Final Repository State

After every Claude session:

```
Remote Branches:
  origin/dev     ← GROUND TRUTH (latest AI session)
  origin/main    ← Production stable

Local Branches:
  dev            ← Auto-synced with ground truth
  main           ← Production stable

Claude branches: NONE (all ephemeral)
```

## Troubleshooting

### Action Fails to Merge

**Symptom**: GitHub Action shows merge failure

**Solution**:

- Check the Actions log for conflict details
- Manually merge and resolve conflicts (see above)

### Old Branches Not Deleted

**Symptom**: Old `claude/*` branches still exist

**Solution**:

```bash
# Run manual cleanup
bash scripts/cleanup-claude-branches.sh

# Or delete specific branch
git push origin --delete claude/old-branch-name
```

### Dev Branch Out of Sync

**Symptom**: Your local `dev` is behind remote

**Solution**:

```bash
# Reset local dev to match remote
git checkout dev
git fetch origin
git reset --hard origin/dev
```

## Examples

### Example 1: Normal Workflow

```bash
# Claude pushes to claude/add-feature-abc123
# → GitHub Action auto-merges to dev
# → dev gets pushed to remote
# → Old claude/previous-branch gets deleted

# You pull the changes
git checkout dev
git pull origin dev
# ✓ You now have the latest feature
```

### Example 2: Multiple Claude Sessions

```bash
# Session 1: claude/feature-a-session1 → merged to dev
# Session 2: claude/feature-b-session2 → merged to dev
# Session 3: claude/feature-c-session3 → merged to dev

# After session 3:
# - dev has all features (a, b, c)
# - Only claude/feature-c-session3 exists
# - Old branches (session1, session2) are deleted
```

## Best Practices

1. **Always Pull from Dev** - Get latest changes from `dev`, not Claude branches
2. **Don't Work Directly on Dev** - Use feature branches for manual work
3. **Review Actions Log** - Check GitHub Actions to see merge status
4. **Trust the Automation** - Let the workflow handle merges and cleanup

## Configuration

### Changing Merge Behavior

Edit `.github/workflows/auto-merge-claude-sessions.yml`:

- Change merge commit message format
- Add PR creation on conflict
- Adjust branch retention policy
- Add notifications (Slack, email, etc.)

### Disabling Auto-Merge

To disable the workflow:

1. Delete or rename `.github/workflows/auto-merge-claude-sessions.yml`
2. Or add this to the workflow:

```yaml
on:
  push:
    branches:
      - 'disabled-claude/**' # Change pattern to disable
```

## See Also

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Git Branch Management](https://git-scm.com/book/en/v2/Git-Branching-Branch-Management)
- [Contributing Guide](../manual/CONTRIBUTING.md)

---

**Last Updated**: 2025-12-28
**Workflow Version**: 1.0
