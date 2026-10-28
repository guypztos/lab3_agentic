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
  players: [
    { name: 'P1 (Arrows)', color: 0x71e8ce, css: '#71e8ce' },
    { name: 'P2 (WASD)', color: 0x7aa2ff, css: '#7aa2ff' }
  ],

  // --- polish tuning: polish owner adds keys below ---
};
