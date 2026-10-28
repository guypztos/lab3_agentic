/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.finished = false;
    this.paused = false;
    this.time.paused = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.timerText = this.add.text(c.width / 2, 12, '', { font: '18px monospace', color: '#ffffff' })
      .setOrigin(0.5, 0);
    const kb = this.input.keyboard;
    const arrows = kb.createCursorKeys();
    const wasd = kb.addKeys('W,A,S,D');
    // Each player has an independent score, scoreboard, controls and alive flag.
    this.players = c.players.map((p, i) => {
      const sprite = this.add.rectangle(c.width / 2 + (i ? 60 : -60), c.height / 2, 24, 24, p.color);
      this.physics.add.existing(sprite);
      sprite.body.setCollideWorldBounds(true);
      const keys = i === 0
        ? { up: arrows.up, down: arrows.down, left: arrows.left, right: arrows.right }
        : { up: wasd.W, down: wasd.S, left: wasd.A, right: wasd.D };
      const hud = this.add.text(i ? c.width - 18 : 18, 12, '', { font: '18px monospace', color: p.css })
        .setOrigin(i ? 1 : 0, 0);
      return { name: p.name, sprite, keys, hud, score: 0, alive: true };
    });
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.players.forEach(p => {
      this.physics.add.overlap(p.sprite, this.coin, () => {
        if (this.finished || !p.alive) return;
        p.score++;
        CoinDashFX.onCoin(this, this.coin.x, this.coin.y);
        this.placeCoin();
      });
      this.physics.add.overlap(p.sprite, this.drones, () => {
        if (this.finished || !p.alive) return;
        p.alive = false;
        p.sprite.body.setVelocity(0, 0);
        p.sprite.setAlpha(0.25);
        CoinDashFX.onHit(this);
        if (this.players.every(q => !q.alive)) this.finish('Both players were caught!');
      });
    });
    CoinDashFX.onStart(this);
    this.input.keyboard.addKey('R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
  }

  togglePause() {
    if (this.finished) return;
    if (this.paused) this.resume(); else this.pause();
  }

  pause() {
    const c = COIN_DASH;
    this.paused = true;
    this.pausedAt = this.time.now;
    this.physics.pause();
    this.time.paused = true;
    this.pauseOverlay = [
      this.add.rectangle(c.width / 2, c.height / 2, c.width, c.height, 0x0a1120, 0.7).setDepth(10),
      this.add.text(c.width / 2, c.height / 2, 'PAUSED\nPress P or Esc to resume',
        { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }).setOrigin(0.5).setDepth(10)
    ];
    CoinDashFX.onPause?.(this, true);
  }

  resume() {
    // The scene clock may keep running while paused, so push the deadline back by the pause length.
    this.deadline += Math.max(0, this.time.now - this.pausedAt);
    this.paused = false;
    this.time.paused = false;
    this.physics.resume();
    this.pauseOverlay.forEach(o => o.destroy());
    CoinDashFX.onPause?.(this, false);
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath a player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (this.players.some(p => Phaser.Math.Distance.Between(x, y, p.sprite.x, p.sprite.y) < 60));
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  refreshHud(seconds) {
    this.timerText.setText(`Time: ${seconds}s`);
    this.players.forEach(p => p.hud.setText(`${p.name}: ${p.score}${p.alive ? '' : ' (out)'}`));
  }

  update() {
    if (this.finished || this.paused) return;
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.refreshHud(seconds);
    this.players.forEach(p => {
      if (!p.alive) return;
      const k = p.keys;
      const dx = Number(k.right.isDown) - Number(k.left.isDown);
      const dy = Number(k.down.isDown) - Number(k.up.isDown);
      const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
      p.sprite.body.setVelocity(direction.x, direction.y);
    });
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    this.refreshHud(Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000)));
    CoinDashFX.onFinish(this, reason);
    const c = COIN_DASH;
    const [p1, p2] = this.players;
    const result = p1.score === p2.score ? "It's a tie!"
      : `${(p1.score > p2.score ? p1 : p2).name} wins!`;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 190, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${p1.name}: ${p1.score}   ${p2.name}: ${p2.score}\n${result}\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
