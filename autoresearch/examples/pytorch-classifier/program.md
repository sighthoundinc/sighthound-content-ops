# PyTorch Classifier AutoResearch

## Goal

**Maximise test F1 on the held-out test set.**

Current baseline: **F1 = 0.720**

The model is a standard CNN + fully connected head trained on image patches.
The test set is fixed (held out before any training) and never touched during the loop.

## What you CAN modify

**`model.py`** — model architecture:
- Number of conv layers (currently 3) — try 4, 5
- Filter counts per layer (currently 32/64/128) — try doubling
- Dropout rate after FC layers (currently 0.5) — try 0.2, 0.3
- Add BatchNorm after conv layers (currently absent)
- FC hidden size (currently 256) — try 512

**`train.py`** — training hyperparameters only:
- Learning rate (currently 1e-3) — try 3e-4, 1e-4
- Add cosine LR schedule with warmup (currently none — constant LR)
- Batch size (currently 64) — try 32, 128
- Weight decay (currently 0) — try 1e-4, 1e-5
- Add label smoothing (currently none)
- Data augmentation (currently only horizontal flip) — try colour jitter, random crop

## What you CANNOT modify

- `data/` — dataset is fixed, never altered
- The test evaluation block in `train.py`
- The `--seed 42` flag
- Any file not listed above

## Experiment Priorities

1. **Cosine LR schedule with warmup** — training often plateaus after epoch 15 with constant LR
2. **BatchNorm after each conv** — often improves convergence and final accuracy
3. **Weight decay 1e-4** — reduces overfitting; almost always helps
4. **Additional data augmentation** — colour jitter, random erasing
5. **Dropout 0.3 → 0.2** — may be too aggressive; try relaxing it
6. **Deeper network (4 conv layers)** — more capacity
7. **Filter doubling** — 64/128/256/256 instead of 32/64/128
8. **Combine #1 + #2 + #3** — stack the top improvements
9. **Learning rate 3e-4** — try if cosine schedule doesn't help alone
10. **Larger FC (512)** — more representation capacity in the head

## Simplicity Criterion

Improvements below 0.005 F1 are noise — discard. Improvements that require more
than ~20 lines of new code need to show >0.01 improvement to be worth keeping.
