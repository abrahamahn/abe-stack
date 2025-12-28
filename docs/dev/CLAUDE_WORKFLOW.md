# Claude Session Workflow

This document explains the automated workflow for managing Claude Code sessions and branches.

## Overview

When working with Claude Code, each session creates a new branch (e.g., `claude/feature-name-sessionID`). To streamline development and avoid branch clutter, we've implemented an **automated merge and cleanup workflow**.

## How It Works

### Automatic Workflow (GitHub Actions)

When Claude pushes to a `claude/*` branch (can push multiple times per session):

1. **GitHub Action Triggers** - Detects push to `claude/*` branch
2. **Auto-Merge** - Merges the session branch into `dev` (ground truth)
3. **Auto-Push** - Pushes the updated `dev` branch to remote
4. **Keep Alive** - Session branch remains active for continued work

**Result**: The `dev` branch is always up-to-date with the latest Claude session changes. Claude session branches remain active until the session ends, allowing multiple pushes.

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Session                                              │
│ └─> Push 1 to claude/feature-xyz-sessionID                 │
│ └─> Push 2 to claude/feature-xyz-sessionID (same branch)   │
│ └─> Push N to claude/feature-xyz-sessionID (same branch)   │
└────────────────────────┬────────────────────────────────────┘
                         │ (Each push triggers workflow)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions (Ground Truth Automation)                    │
│ 1. Merge claude/feature-xyz-sessionID into dev             │
│ 2. Push dev to remote (GROUND TRUTH)                       │
│ 3. Keep session branch alive for next push                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Dev Branch (Ground Truth)                                   │
│ └─> Always has latest Claude session changes               │
│ └─> Updated on every Claude push                           │
│ └─> Local users pull from dev                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Claude Session Branch                                       │
│ └─> Remains active during session                          │
│ └─> Cleaned up manually after session ends                 │
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
- **`dev`** - Active development (**GROUND TRUTH**, auto-updated on every Claude push)
- **`claude/*`** - Session branches (active during session, cleaned up manually when session ends)

### Workflow

1. Claude works in session branches (`claude/*`)
2. Changes automatically merge to `dev`
3. You pull from `dev` to get latest
4. When ready, merge `dev` → `main` for release

## Manual Cleanup (After Session Ends)

When a Claude session ends, clean up the session branch(es):

```bash
# Run the cleanup script
bash scripts/cleanup-claude-branches.sh
```

Options:

- Keep latest branch, delete others (useful if you want to keep reference to most recent session)
- Delete all Claude branches (clean slate)
- Cancel

**Note**: Claude session branches are kept alive during active sessions to allow multiple pushes. Clean them up when the session is complete.

## GitHub Actions Configuration

The automation is configured in `.github/workflows/auto-merge-claude-sessions.yml`

### What It Does

- **Trigger**: On push to any `claude/*` branch
- **Merge**: Automatically merges to `dev` (if no conflicts)
- **Keep Alive**: Session branch remains active for multiple pushes
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
```

**Note**: The Claude session branch remains active after conflict resolution, allowing continued work in the same session.

## Benefits

✅ **Single Source of Truth** - `dev` = latest Claude changes (ground truth)
✅ **Zero Manual Work** - Automatic merge on every Claude push
✅ **Multi-Push Support** - Session branches stay alive, allowing multiple pushes
✅ **Simple for Users** - Just `gt` or `git pull origin dev`
✅ **Clear History** - All changes tracked in `dev` branch
✅ **No Redundancy** - Removed unnecessary `claude-latest` branch

### Repository State During Active Session

While Claude is working:

```
Remote Branches:
  origin/dev                      ← GROUND TRUTH (auto-updated)
  origin/main                     ← Production stable
  origin/claude/task-sessionID    ← Active session (stays alive)

Local Branches:
  dev                             ← Auto-synced with ground truth
  main                            ← Production stable
```

### Repository State After Session

After cleaning up (using cleanup script):

```
Remote Branches:
  origin/dev     ← GROUND TRUTH (all changes merged)
  origin/main    ← Production stable

Local Branches:
  dev            ← Auto-synced with ground truth
  main           ← Production stable
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

### Example 1: Single Session with Multiple Pushes

```bash
# Claude session: claude/add-feature-abc123

# Push 1: Initial implementation
# → GitHub Action auto-merges to dev
# → Branch stays alive

# Push 2: Bug fixes
# → GitHub Action auto-merges to dev
# → Branch still alive

# Push 3: Final tweaks
# → GitHub Action auto-merges to dev
# → Branch still alive

# You pull the changes (at any point)
git checkout dev
git pull origin dev
# ✓ You now have the latest changes

# After session ends, cleanup manually
bash scripts/cleanup-claude-branches.sh
```

### Example 2: Multiple Sessions Over Time

```bash
# Session 1: claude/feature-a-session1
# - Push 1 → merged to dev
# - Push 2 → merged to dev
# - Session complete → cleanup manually

# Session 2: claude/feature-b-session2
# - Push 1 → merged to dev
# - Push 2 → merged to dev
# - Session complete → cleanup manually

# After all sessions:
# - dev has all features (a, b)
# - All claude/* branches cleaned up manually when needed
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
