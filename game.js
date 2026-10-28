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
    this.paused = false;
    this.time.paused = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.hud = this.add.text(18, 12, '', {
      font: '18px monospace', color: '#ffffff', stroke: '#0a1120', strokeThickness: 4 });
    this.effectsHud = this.add.text(c.width - 18, 15, '', {
      font: '14px monospace', color: '#ffffff', stroke: '#0a1120', strokeThickness: 3 }).setOrigin(1, 0);
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      this.addDrone(90 + i * 270, 100, (35 + i * 105) * Math.PI / 180, 0);
    }
    this.extraCoins = this.physics.add.group();
    this.physics.add.overlap(this.player, this.extraCoins, (player, coin) => this.collectExtraCoin(coin));
    this.scheduleCoinSpawn();
    this.scheduleEnemySpawn();
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
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
  }

  isInvulnerable() { return this.time.now < this.invulnerableUntil; }

  roundProgress() {
    const total = COIN_DASH.roundSeconds * 1000;
    return Phaser.Math.Clamp(1 - (this.deadline - this.time.now) / total, 0, 1);
  }

  // Delay between spawns, shrinking from startMs to endMs as the round progresses.
  rampDelay(startMs, endMs) { return Phaser.Math.Linear(startMs, endMs, this.roundProgress()); }

  randomSpotAwayFromPlayer(minDistance) {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < minDistance);
    return { x, y };
  }

  addDrone(x, y, angle, warningMs) {
    const c = COIN_DASH;
    const drone = this.add.rectangle(x, y, 26, 26, c.colors.drone);
    this.drones.add(drone);
    drone.body.setCollideWorldBounds(true).setBounce(1, 1);
    const launch = () => drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    if (!warningMs) return launch();
    // Spawn as a see-through ghost that cannot hurt anyone, then go live.
    drone.setAlpha(0.35);
    drone.body.enable = false;
    this.time.delayedCall(warningMs, () => {
      drone.setAlpha(1);
      drone.body.enable = true;
      drone.body.reset(x, y);
      launch();
    });
  }

  scheduleEnemySpawn() {
    const e = COIN_DASH.escalation;
    this.time.delayedCall(this.rampDelay(e.enemySpawnStartMs, e.enemySpawnEndMs), () => {
      if (this.finished) return;
      if (this.drones.getLength() < e.maxDrones) {
        const { x, y } = this.randomSpotAwayFromPlayer(180);
        this.addDrone(x, y, Phaser.Math.FloatBetween(0, Math.PI * 2), e.enemyWarningMs);
      }
      this.scheduleEnemySpawn();
    });
  }

  scheduleCoinSpawn() {
    const e = COIN_DASH.escalation;
    this.time.delayedCall(this.rampDelay(e.coinSpawnStartMs, e.coinSpawnEndMs), () => {
      if (this.finished) return;
      if (this.extraCoins.countActive() < e.maxExtraCoins) {
        const { x, y } = this.randomSpotAwayFromPlayer(60);
        const coin = this.add.circle(x, y, 9, COIN_DASH.colors.coin);
        this.extraCoins.add(coin);
        coin.body.setCircle(9);
        coin.expires = this.time.now + e.coinLifetimeMs;
      }
      this.scheduleCoinSpawn();
    });
  }

  collectExtraCoin(coin) {
    if (this.finished || !coin.active) return;
    this.score++;
    CoinDashFX.onCoin(this, coin.x, coin.y);
    coin.destroy();
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
    this.time.paused = true;  // freezes spawn timers and drone respawns
    this.pauseOverlay = [
      this.add.rectangle(c.width / 2, c.height / 2, c.width, c.height, 0x0a1120, 0.7).setDepth(10),
      this.add.text(c.width / 2, c.height / 2, 'PAUSED\nPress P or Esc to resume',
        { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }).setOrigin(0.5).setDepth(10)
    ];
    CoinDashFX.onPause?.(this, true);
  }

  resume() {
    // The scene clock may keep running while paused, so push every deadline back by the pause length.
    const gap = Math.max(0, this.time.now - this.pausedAt);
    this.deadline += gap;
    if (this.invulnerableUntil) this.invulnerableUntil += gap;
    Object.keys(this.effects).forEach(t => { if (this.effects[t]) this.effects[t] += gap; });
    this.pickups.getChildren().forEach(pickup => { pickup.expires += gap; });
    this.extraCoins.getChildren().forEach(coin => { coin.expires += gap; });
    this.paused = false;
    this.time.paused = false;
    this.physics.resume();
    this.pauseOverlay.forEach(o => o.destroy());
    CoinDashFX.onPause?.(this, false);
  }

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
    // Extra coins vanish after a while, blinking first.
    this.extraCoins.getChildren().slice().forEach(coin => {
      const left = coin.expires - now;
      if (left <= 0) return coin.destroy();
      coin.setAlpha(left < 1500 && Math.floor(now / 150) % 2 ? 0.35 : 1);
    });
    // Magnet: pull every coin toward the player when it is close enough.
    [this.coin, ...this.extraCoins.getChildren()].forEach(coin => {
      const gap = Phaser.Math.Distance.Between(coin.x, coin.y, this.player.x, this.player.y);
      if (this.isActive('magnet') && gap < p.magnetRange) {
        const pull = new Phaser.Math.Vector2(this.player.x - coin.x, this.player.y - coin.y)
          .normalize().scale(p.magnetPull);
        coin.body.setVelocity(pull.x, pull.y);
      } else {
        coin.body.setVelocity(0, 0);
      }
    });
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
    if (this.finished || this.paused) return;
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
