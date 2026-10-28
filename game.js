/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.lives = c.lives;
    this.invulnerableUntil = 0;
    this.effects = { shield: 0, speed: 0, magnet: 0, predator: 0 };  // expiry time per effect
    this.outline = null;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.effectsHud = this.add.text(c.width - 18, 15, '', { font: '14px monospace', color: '#ffffff' }).setOrigin(1, 0);
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
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
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      CoinDashFX.onCoin(this, this.coin.x, this.coin.y);
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, (player, drone) => this.hitByDrone(drone));
    this.pickups = this.physics.add.group();
    this.physics.add.overlap(this.player, this.pickups, (player, pickup) => this.collectPowerUp(pickup));
    this.time.addEvent({ delay: c.powerUps.spawnEveryMs, loop: true, callback: () => this.spawnPowerUp() });
    CoinDashFX.onStart(this);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  isInvulnerable() { return this.time.now < this.invulnerableUntil; }

  isActive(type) { return this.effects[type] > this.time.now; }

  hitByDrone(drone) {
    if (this.finished) return;
    if (this.isActive('predator')) return this.eatDrone(drone);
    if (this.isInvulnerable()) return;
    if (this.isActive('shield')) {
      // The shield soaks up one hit, then gives a short grace period.
      this.effects.shield = 0;
      this.invulnerableUntil = this.time.now + 800;
      return;
    }
    this.lives--;
    CoinDashFX.onHit(this);
    if (this.lives <= 0) {
      this.drawHud(Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000)));
      return this.finish('A drone caught you!');
    }
    this.invulnerableUntil = this.time.now + COIN_DASH.invulnerableMs;
  }

  eatDrone(drone) {
    if (!drone.visible) return;
    const p = COIN_DASH.powerUps;
    drone.setVisible(false);
    drone.body.enable = false;
    this.score += p.eatBonus;
    CoinDashFX.onEat?.(this, drone.x, drone.y);
    this.time.delayedCall(p.eatRespawnMs, () => this.respawnDrone(drone));
  }

  respawnDrone(drone) {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 150);
    drone.setPosition(x, y);
    drone.body.enable = true;
    drone.body.reset(x, y);
    drone.setVisible(true);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
  }

  spawnPowerUp() {
    const c = COIN_DASH, p = c.powerUps;
    if (this.finished || this.pickups.countActive() >= p.maxOnScreen) return;
    const types = Object.keys(p.weights);
    let roll = Math.random() * types.reduce((sum, t) => sum + p.weights[t], 0);
    const type = types.find(t => (roll -= p.weights[t]) < 0) || types[0];
    let x, y;
    do {
      x = Phaser.Math.Between(30, c.width - 30);
      y = Phaser.Math.Between(75, c.height - 30);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 90);
    const pickup = this.add.circle(x, y, type === 'predator' ? 15 : 12, p.colors[type]).setStrokeStyle(2, 0xffffff);
    this.pickups.add(pickup);
    pickup.body.setCircle(pickup.radius);
    pickup.powerType = type;
    pickup.expires = this.time.now + p.lifetimeMs;
    pickup.label = this.add.text(x, y, p.labels[type], { font: 'bold 14px monospace', color: '#101c31' }).setOrigin(0.5);
  }

  collectPowerUp(pickup) {
    if (this.finished || !pickup.active) return;
    this.effects[pickup.powerType] = this.time.now + COIN_DASH.powerUps.durations[pickup.powerType];
    CoinDashFX.onPowerUp?.(this, pickup.powerType);
    this.removePickup(pickup);
  }

  removePickup(pickup) {
    pickup.label.destroy();
    pickup.destroy();
  }

  updatePowerUps() {
    const p = COIN_DASH.powerUps, now = this.time.now;
    this.pickups.getChildren().slice().forEach(pickup => {
      const left = pickup.expires - now;
      if (left <= 0) return this.removePickup(pickup);
      const alpha = left < 2000 && Math.floor(now / 150) % 2 ? 0.35 : 1;  // blink before vanishing
      pickup.setAlpha(alpha);
      pickup.label.setAlpha(alpha);
    });
    // Magnet: pull the coin toward the player when it is close enough.
    const gap = Phaser.Math.Distance.Between(this.coin.x, this.coin.y, this.player.x, this.player.y);
    if (this.isActive('magnet') && gap < p.magnetRange) {
      const pull = new Phaser.Math.Vector2(this.player.x - this.coin.x, this.player.y - this.coin.y)
        .normalize().scale(p.magnetPull);
      this.coin.body.setVelocity(pull.x, pull.y);
    } else {
      this.coin.body.setVelocity(0, 0);
    }
    // Outline the player in the colour of the strongest active effect; list effects in the HUD.
    const names = ['predator', 'shield', 'speed', 'magnet'].filter(t => this.isActive(t));
    const colour = names.length ? p.colors[names[0]] : null;
    if (colour !== this.outline) {
      this.outline = colour;
      if (colour === null) this.player.setStrokeStyle(); else this.player.setStrokeStyle(3, colour);
    }
    this.effectsHud.setText(names.map(t => {
      const secs = Math.ceil((this.effects[t] - now) / 1000);
      return `${t.toUpperCase()} ${secs}s`;
    }).join('  '));
  }

  drawHud(seconds) {
    const hearts = '♥'.repeat(this.lives) + '♡'.repeat(COIN_DASH.lives - this.lives);
    this.hud.setText(`Coins: ${this.score}   Lives: ${hearts}   Time: ${seconds}s`);
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed * (this.isActive('speed') ? COIN_DASH.powerUps.speedMultiplier : 1));
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.updatePowerUps();
    // Blink while invulnerable so the player can see the grace period.
    this.player.setAlpha(this.isInvulnerable() && Math.floor(this.time.now / 100) % 2 ? 0.3 : 1);
    this.drawHud(seconds);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    CoinDashFX.onFinish(this, reason);
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
