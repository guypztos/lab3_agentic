// Presentation hooks (sound, particles, screen shake). Owned by the "polish" side.
// game.js calls these at key moments; keep them safe to call with nothing implemented.
window.CoinDashFX = {
  onStart(scene) {},
  onCoin(scene, x, y) {},
  onHit(scene) {},
  onFinish(scene, reason) {}
};
