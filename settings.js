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
  lives: 2,             // per player
  invulnerableMs: 1500,
  powerUps: {
    spawnEveryMs: 6000,      // a new pickup appears this often (if there is room)
    lifetimeMs: 8000,        // an uncollected pickup disappears after this
    maxOnScreen: 2,
    weights: { shield: 3, speed: 3, magnet: 3, predator: 1 },  // predator is the rare one
    durations: { shield: 10000, speed: 6000, magnet: 8000, predator: 8000 },
    speedMultiplier: 1.6,
    magnetRange: 240,        // coins within this distance get pulled in
    magnetPull: 280,
    eatBonus: 50,            // points gained per monster eaten
    eatRespawnMs: 5000,      // an eaten drone is gone this long
    colors: { shield: 0x4dabff, speed: 0xffa94d, magnet: 0xc77dff, predator: 0xff4fd8 },
    labels: { shield: 'S', speed: '>', magnet: 'M', predator: 'E' }
  },
  // Difficulty ramps up linearly over the round: the delays shrink from Start to End.
  escalation: {
    coinSpawnStartMs: 6000,  // extra coins appear this often at the start...
    coinSpawnEndMs: 1200,    // ...and this often at the very end
    maxExtraCoins: 6,
    coinLifetimeMs: 7000,
    enemySpawnStartMs: 12000,  // a new drone appears this often at the start...
    enemySpawnEndMs: 3000,     // ...and this often at the very end
    maxDrones: 10,
    enemyWarningMs: 1000     // a new drone is a harmless ghost for this long before it goes live
  },
  players: [
    // sprite is the texture prefix: <sprite>_idle, <sprite>_walk, <sprite>_jump.
    { name: 'P1 (Arrows)', sprite: 'player', css: '#ffb066' },
    { name: 'P2 (WASD)', sprite: 'player2', css: '#ff8a94' }  // red variant of the player
  ],
  playerSize: 48,
  foodSize: 34,
  enemySize: 46,
  maxNameLength: 20,  // high score table names
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
