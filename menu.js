/* global Phaser, COIN_DASH, CoinDashAudio */
// Title screen. Both choices start the same game for now; CoinDash receives { players } to use later.
class MainMenu extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create() {
    const c = COIN_DASH;
    CoinDashAudio.init(this.sound.context);
    CoinDashAudio.startMusic();
    this.add.text(c.width / 2, 130, 'COIN DASH', {
      font: 'bold 64px monospace', color: '#ffd166', stroke: '#0a1120', strokeThickness: 6 }).setOrigin(0.5);
    this.add.text(c.width / 2, 420, '↑ ↓ to choose · Enter to start', {
      font: '16px monospace', color: '#ffffff', stroke: '#0a1120', strokeThickness: 4 }).setOrigin(0.5);

    this.selected = 0;
    this.buttons = [['1 Player', 1], ['2 Players', 2]].map(([label, players], i) => {
      const y = 250 + i * 80;
      const box = this.add.rectangle(c.width / 2, y, 260, 58, 0x0a1120, 0.85)
        .setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
      const text = this.add.text(c.width / 2, y, label, {
        font: 'bold 26px monospace', color: '#ffffff' }).setOrigin(0.5);
      box.on('pointerover', () => this.select(i));
      box.on('pointerdown', () => this.choose(players));
      return { box, text, players };
    });
    this.select(0);

    this.input.keyboard.on('keydown-UP', () => this.select(this.selected - 1));
    this.input.keyboard.on('keydown-DOWN', () => this.select(this.selected + 1));
    this.input.keyboard.on('keydown-ENTER', () => this.choose(this.buttons[this.selected].players));
    this.input.keyboard.on('keydown-SPACE', () => this.choose(this.buttons[this.selected].players));
  }

  select(index) {
    this.selected = Phaser.Math.Wrap(index, 0, this.buttons.length);
    this.buttons.forEach(({ box, text }, i) => {
      const on = i === this.selected;
      box.setStrokeStyle(3, on ? COIN_DASH.colors.coin : 0xffffff);
      text.setColor(on ? '#ffd166' : '#ffffff');
    });
  }

  choose(players) {
    this.scene.start('CoinDash', { players });
  }
}
