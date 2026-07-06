---
description: Calibration folder doc roles and keeping the README index and figures in sync
paths:
  - 'backend/calibration/**'
---

# CALIBRATION DOCS STANDARDS

## Document roles

- Keep `README.md` as the in-repo runbook and file index: what each script does, re-run steps, and dependencies.
- Keep `.claude/context/calibration.md` as the agent-facing narrative: decisions, hidden contracts, and gotchas.
- Keep each experiment's findings in its own file (`CASE_STUDY.md` for the threshold fit, `CONTRAST_EVAL.md` for the minimal-pair verdict). Do not merge one experiment's findings into another's.

## Keeping in sync

- When adding a harness script, artifact, or figure, add it to the `README.md` Files list in the same change.
- Re-run the plot script after changing its input so a committed figure matches the data behind it.
- Follow methodology and reproducibility per `.claude/rules/lib/380-ml-experiments.md`.
