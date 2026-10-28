/* global CoinDashAudio */
// Presentation hooks (sound, particles, screen shake). Owned by the "polish" side.
// game.js calls these at key moments; keep them safe to call with nothing implemented.
window.CoinDashFX = {
  onStart(scene) {
    CoinDashAudio.init(scene.sound.context);
    CoinDashAudio.startMusic();
  },
  onCoin(scene, x, y) { CoinDashAudio.coin(scene.score); },
  onHit(scene) { CoinDashAudio.crash(); },
  onFinish(scene, reason) {}
};
