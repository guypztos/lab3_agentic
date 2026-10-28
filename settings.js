// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a },

  // --- gameplay tuning: gameplay owner adds keys below ---
  playerSize: 48,
  foodSize: 34,
  enemySize: 46,
  // Collectibles: points per pickup and how often each one spawns (relative weight).
  foods: [
    { key: 'food_apple', points: 10, weight: 60 },
    { key: 'food_banana', points: 20, weight: 25 },
    { key: 'food_cake', points: 50, weight: 11 },
    { key: 'food_golden_star', points: 100, weight: 4 },
  ],

  // --- polish tuning: polish owner adds keys below ---
  soundVolume: 0.15,
  musicVolume: 0.06,
};
