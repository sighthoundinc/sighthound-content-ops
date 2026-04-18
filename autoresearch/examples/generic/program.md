# [Your Task] AutoResearch

## Goal

**Minimise validation loss on the held-out validation set.**

Current baseline: **val_loss = 0.850**

Brief description of what the model does and why this metric matters.

## What you CAN modify

**`model.py`**:
- Hidden dimensions, layer count, activation functions, dropout
- Normalisation (BatchNorm, LayerNorm, GroupNorm)

**`train.py`**:
- Learning rate and schedule (warmup, cosine decay)
- Optimiser choice (Adam, AdamW, SGD with momentum)
- Regularisation (weight decay, gradient clipping, dropout)
- Loss function (e.g. label smoothing if classification)

**`config.py`**:
- Any hyperparameters exposed in the config

## What you CANNOT modify

- `data/` — dataset is fixed
- The validation/test evaluation logic
- The `--seed 42` flag

## Experiment Priorities

1. **Learning rate schedule** (cosine with warmup)
2. **Gradient clipping** (max_norm=1.0)
3. **Weight decay** (1e-4)
4. **Increase model capacity** (wider or deeper)
5. **Different optimiser** (try AdamW if using Adam)
6. **Combine best found changes**
7. **More aggressive regularisation** if overfitting
8. **Lower LR** if loss oscillates late in training

## Simplicity Criterion

Improvements below MIN_DELTA are noise — discard.
Improvements that delete code are always worth keeping.
