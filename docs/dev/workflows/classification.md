# Task Classification

Classify every task before starting.

| Complexity         | Indicators                         | Approach                            |
| ------------------ | ---------------------------------- | ----------------------------------- |
| Simple             | 1 file, <100 lines, known pattern  | Direct execution                    |
| Medium             | 2-5 files, 100-300 lines           | Checkpointed workflow               |
| Complex            | 5+ files, 300+ lines, new patterns | Multi-phase decomposition           |
| Very Complex       | Architectural changes              | Human-supervised                    |
| Migration/Overhaul | Framework swaps, 10+ files         | Human-supervised + dependency-first |

Required reading by complexity:

- Medium: `agent/complex-tasks.md`, `agent/agent-self-check.md`
- Complex: `agent/complex-tasks.md`, `agent/agent-prompts.md`, `agent/agent-self-check.md`

See Also:

- `dev/workflows/precompletion.md`
