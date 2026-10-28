/* global Phaser, COIN_DASH, MainMenu, CoinDash */
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  // Transparent so the background image set in style.css shows through.
  transparent: true,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  // The first scene listed starts automatically.
  scene: [MainMenu, CoinDash]
});
