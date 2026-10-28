/* global Phaser, COIN_DASH, CoinDashStorage */
// High score table. Receives { highlight } with the rank to emphasise after a new entry.
class HighScores extends Phaser.Scene {
  constructor() { super('HighScores'); }

  create(data) {
    const c = COIN_DASH;
    const cx = c.width / 2;
    const highlight = data && Number.isInteger(data.highlight) ? data.highlight : -1;
    this.add.text(cx, 52, 'HIGH SCORES', {
      font: 'bold 44px monospace', color: '#ffd166', stroke: '#0a1120', strokeThickness: 6 }).setOrigin(0.5);
    this.add.rectangle(cx, 250, 660, 330, 0x0a1120, 0.85).setStrokeStyle(3, 0xffffff);

    const scores = CoinDashStorage.getScores();
    if (!scores.length) {
      this.add.text(cx, 250, 'No scores yet.\nPlay a round to set one!', {
        font: '22px monospace', color: '#ffffff', align: 'center', lineSpacing: 10 }).setOrigin(0.5);
    } else {
      const row = (y, cells, color) => cells.forEach(([text, x, originX]) =>
        this.add.text(x, y, text, { font: '20px monospace', color }).setOrigin(originX, 0.5));
      // Columns sized for 20-character names in 20px monospace.
      row(104, [['#', cx - 300, 0], ['NAME', cx - 250, 0], ['SCORE', cx + 150, 1], ['DATE', cx + 300, 1]], '#71e8ce');
      scores.forEach((entry, i) => {
        const color = i === highlight ? '#ffd166' : '#ffffff';
        row(138 + i * 28, [[`${i + 1}.`, cx - 300, 0], [entry.name.slice(0, COIN_DASH.maxNameLength), cx - 250, 0],
          [String(entry.score), cx + 150, 1], [entry.date || '', cx + 300, 1]], color);
      });
    }

    this.add.text(cx, 455, 'Enter / Esc: back to menu', {
      font: '16px monospace', color: '#ffffff', stroke: '#0a1120', strokeThickness: 4 }).setOrigin(0.5);
    const back = () => this.scene.start('MainMenu');
    ['ENTER', 'ESC', 'SPACE'].forEach(key => this.input.keyboard.once(`keydown-${key}`, back));
    this.input.once('pointerdown', back);
  }
}
