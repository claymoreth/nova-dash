# NOVA DASH

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/claymoreth/nova-dash/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/claymoreth/nova-dash/reward.svg)](https://make.fun/bounty/best-game-01)

NOVA DASH - Fly, Dash, Destroy: dash through enemies to survive

A neon space-combat arcade game. You fly a fighter jet through three sectors
of enemy planes, dashing straight through them to survive, and face a giant
boss plane at the end of every sector. Beat all three bosses — Carrier,
Destroyer, Dreadnought — to win.

## How to play

- **WASD** — move the jet
- **CLICK** — dash toward the mouse (dash through enemies to destroy them,
  dash through bullets to destroy them too; you are invulnerable while dashing)
- **MUTE button** (top-right corner) — toggle sound
- **R** — restart from the game-over or victory screen

Dash kills build your combo (up to x8 score). Clearing a sector lets you pick
1 of 3 upgrades; defeating a boss lets you pick 1 of 3 permanent boss rewards
(double dash, piercing dash, hull and damage buffs). The ship auto-fires at
the nearest enemy, so your two hands stay on moving and dashing.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: pure Canvas 2D, all art and sound drawn and
synthesised from code.
