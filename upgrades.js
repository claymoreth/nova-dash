// Upgrades and boss rewards: the choices that make the ship stronger.
// One job: the choice lists and what each choice does to the player.
// Flow (which screen follows which) lives in main.js, not here.
export const UPGRADES = [
  { id: 'dash', name: 'EXTRA DASH', desc: 'Dash cooldown 1.5s to 0.9s. Dash more often.' },
  { id: 'shield', name: 'SHIELD', desc: 'Max Hull +30 and Hull fully restored now.' },
  { id: 'spread', name: 'SPREAD SHOT', desc: 'Auto-fire becomes 3 spreading shots. (2x: 5 shots.)' },
];

export const BOSS_REWARDS = {
  1: [
    { id: 'hull50', name: 'HULL +50', desc: 'Max Hull +50. Fly tougher into Sector 2.' },
    { id: 'dashdmg', name: 'DASH DAMAGE +50%', desc: 'Dash hits 50% harder. Bosses fall faster.' },
    { id: 'dashcd', name: 'DASH COOLDOWN -30%', desc: 'Dash recharges 30% faster. Dash more often.' },
  ],
  2: [
    { id: 'hull100', name: 'MAX HULL +100 + FULL HEAL', desc: 'Max Hull +100 and Hull fully restored.' },
    { id: 'doubledash', name: 'DOUBLE DASH', desc: 'Dash twice in a row before cooldown.' },
    { id: 'piercing', name: 'PIERCING DASH', desc: 'One dash destroys up to 3 enemies.' },
  ],
};

// Normal upgrade picked after a sector's enemies are cleared.
export function applyUpgrade(P, u) {
  if (u.id === 'dash') P.dashCdMax = Math.max(0.5, P.dashCdMax - 0.6);
  if (u.id === 'shield') {
    P.maxHull += 30;
    P.hull = P.maxHull;
  }
  if (u.id === 'spread') P.spread = Math.min(5, P.spread + 2);
}

// Boss reward picked after a boss is defeated. Permanent until the game ends.
export function applyBossReward(P, u) {
  if (u.id === 'hull50') {
    P.maxHull += 50;
    P.hull = Math.min(P.maxHull, P.hull + 50);
  }
  if (u.id === 'dashdmg') P.dashDmg *= 1.5;
  if (u.id === 'dashcd') P.dashCdMax *= 0.7;
  if (u.id === 'hull100') {
    P.maxHull += 100;
    P.hull = P.maxHull;
  }
  if (u.id === 'doubledash') {
    P.dashMax = 2;
    P.dashCharges = 2;
  }
  if (u.id === 'piercing') P.dashKillMax = 3;
}
