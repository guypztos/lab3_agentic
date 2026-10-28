/* global Phaser, COIN_DASH, COIN_DASH_SPRITES, CoinDashFX, CoinDashStorage */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  // The main menu starts this scene with { players: 1 or 2 }; restarting with R keeps the same data.
  init(data) { this.playerCount = data && data.players === 2 ? 2 : 1; }

  preload() {
    for (const [key, url] of Object.entries(COIN_DASH_SPRITES)) {
      if (!this.textures.exists(key)) this.load.image(key, url);
    }
  }

  create() {
    const c = COIN_DASH;
    this.score = 0;      // team total points across players
    this.collected = 0;  // snacks collected by everyone; the coin sound rises in pitch with it
    this.finished = false;
    this.enteringName = false;
    this.best = CoinDashStorage.getBest();
    this.paused = false;
    this.time.paused = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    const textStyle = (extra) => ({ stroke: '#0a1120', strokeThickness: 4, ...extra });
    this.timerText = this.add.text(c.width / 2, 12, '', textStyle({ font: '18px monospace', color: '#ffffff' }))
      .setOrigin(0.5, 0);

    // Each player has their own sprite, controls, score, lives, effects and HUD.
    const kb = this.input.keyboard;
    const arrows = kb.createCursorKeys();
    const wasd = kb.addKeys('W,A,S,D');
    const arrowKeys = { up: arrows.up, down: arrows.down, left: arrows.left, right: arrows.right };
    const wasdKeys = { up: wasd.W, down: wasd.S, left: wasd.A, right: wasd.D };
    this.players = c.players.slice(0, this.playerCount).map((cfg, i) => {
      const x = this.playerCount === 1 ? c.width / 2 : c.width / 2 + (i ? 60 : -60);
      if (!this.anims.exists(`${cfg.sprite}-walk`)) {
        this.anims.create({ key: `${cfg.sprite}-walk`, frameRate: 7, repeat: -1,
          frames: [{ key: `${cfg.sprite}_walk` }, { key: `${cfg.sprite}_idle` }] });
      }
      const sprite = this.physics.add.sprite(x, c.height / 2, `${cfg.sprite}_idle`)
        .setDisplaySize(c.playerSize, c.playerSize);
      // Hitbox is the round body in the 128px frame, not the whole square image.
      sprite.body.setCircle(34, 30, 38).setCollideWorldBounds(true);
      // Sprites cannot be outlined, so active power-ups are shown by a ring that follows the player.
      const ring = this.add.circle(x, c.height / 2, c.playerSize / 2 + 4).setVisible(false);
      const right = i === 1;
      const hud = this.add.text(right ? c.width - 18 : 18, 12, '', textStyle({ font: '18px monospace', color: cfg.css }))
        .setOrigin(right ? 1 : 0, 0);
      const effectsHud = this.add.text(right ? c.width - 18 : 18, 31, '',
        textStyle({ font: '12px monospace', color: cfg.css, strokeThickness: 3 })).setOrigin(right ? 1 : 0, 0);
      return {
        name: cfg.name, texture: cfg.sprite, sprite, ring, hud, effectsHud, score: 0, jumpUntil: 0, lives: c.lives, alive: true,
        // A single player can use either control scheme; with two, P1 takes arrows and P2 takes WASD.
        keys: this.playerCount === 1 ? [arrowKeys, wasdKeys] : [i === 0 ? arrowKeys : wasdKeys],
        invulnerableUntil: 0, outline: null,
        effects: { shield: 0, speed: 0, magnet: 0, predator: 0 }  // expiry time per effect
      };
    });

    this.coin = this.physics.add.sprite(100, 100, 'food_apple').setDisplaySize(c.foodSize, c.foodSize);
    this.coin.body.setCircle(24, 8, 8);
    // Pulse size rather than bob position, so the tween never fights placeCoin().
    this.tweens.add({ targets: this.coin, scale: this.coin.scale * 1.12,
      duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      this.addDrone(90 + i * 270, 100, (35 + i * 105) * Math.PI / 180, 0);
    }
    this.extraCoins = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.players.forEach(p => {
      this.physics.add.overlap(p.sprite, this.coin, () => {
        if (this.finished || !p.alive) return;
        this.collectFood(p, this.coinFood, this.coin.x, this.coin.y);
        this.placeCoin();
      });
      this.physics.add.overlap(p.sprite, this.extraCoins, (sprite, coin) => this.collectExtraCoin(p, coin));
      this.physics.add.overlap(p.sprite, this.drones, (sprite, drone) => this.hitByDrone(p, drone));
      this.physics.add.overlap(p.sprite, this.pickups, (sprite, pickup) => this.collectPowerUp(p, pickup));
    });
    this.scheduleCoinSpawn();
    this.scheduleEnemySpawn();
    this.time.addEvent({ delay: c.powerUps.spawnEveryMs, loop: true, callback: () => this.spawnPowerUp() });
    CoinDashFX.onStart(this);
    this.input.keyboard.addKey('R');
    // While a name is being typed, R and M are just letters.
    this.input.keyboard.on('keydown-R', () => { if (!this.enteringName) this.scene.restart(); });
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    // From the pause or end screen, M goes back to the main menu to switch between 1 and 2 players.
    this.input.keyboard.on('keydown-M', () => {
      if (!this.enteringName && (this.paused || this.finished)) this.scene.start('MainMenu');
    });
  }

  addScore(player, amount) {
    player.score += amount;
    this.score += amount;
  }

  // Rarer food is worth more: pick by weight.
  pickFood() {
    const foods = COIN_DASH.foods;
    let roll = Math.random() * foods.reduce((sum, f) => sum + f.weight, 0);
    return foods.find(f => (roll -= f.weight) < 0) || foods[0];
  }

  collectFood(player, food, x, y) {
    this.addScore(player, food.points);
    this.collected++;
    player.jumpUntil = this.time.now + 300;
    CoinDashFX.onCoin(this, x, y);
  }

  secondsLeft() { return Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000)); }

  roundProgress() {
    const total = COIN_DASH.roundSeconds * 1000;
    return Phaser.Math.Clamp(1 - (this.deadline - this.time.now) / total, 0, 1);
  }

  // Delay between spawns, shrinking from startMs to endMs as the round progresses.
  rampDelay(startMs, endMs) { return Phaser.Math.Linear(startMs, endMs, this.roundProgress()); }

  // A random spot that is at least minDistance from every player still in the game.
  randomSpotAwayFromPlayers(minDistance, margin = 25) {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(margin, c.width - margin);
      y = Phaser.Math.Between(margin + 45, c.height - margin);
    } while (this.players.some(p => p.alive
      && Phaser.Math.Distance.Between(x, y, p.sprite.x, p.sprite.y) < minDistance));
    return { x, y };
  }

  isInvulnerable(player) { return this.time.now < player.invulnerableUntil; }

  isActive(player, type) { return player.effects[type] > this.time.now; }

  addDrone(x, y, angle, warningMs) {
    const c = COIN_DASH;
    const drone = this.drones.create(x, y, 'enemy_walk').setDisplaySize(c.enemySize, c.enemySize);
    // Hitbox is the round body in the 128px frame; horns and feet don't count.
    drone.body.setCircle(34, 30, 43).setCollideWorldBounds(true).setBounce(1, 1);
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
        const { x, y } = this.randomSpotAwayFromPlayers(180);
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
        const { x, y } = this.randomSpotAwayFromPlayers(60);
        const food = this.pickFood();
        const coin = this.extraCoins.create(x, y, food.key).setDisplaySize(COIN_DASH.foodSize, COIN_DASH.foodSize);
        coin.body.setCircle(24, 8, 8);
        coin.food = food;
        coin.expires = this.time.now + e.coinLifetimeMs;
      }
      this.scheduleCoinSpawn();
    });
  }

  collectExtraCoin(player, coin) {
    if (this.finished || !player.alive || !coin.active) return;
    this.collectFood(player, coin.food, coin.x, coin.y);
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
      this.add.text(c.width / 2, c.height / 2, 'PAUSED\nPress P or Esc to resume\nPress M for the main menu',
        { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }).setOrigin(0.5).setDepth(10)
    ];
    CoinDashFX.onPause?.(this, true);
  }

  resume() {
    // The scene clock may keep running while paused, so push every deadline back by the pause length.
    const gap = Math.max(0, this.time.now - this.pausedAt);
    this.deadline += gap;
    this.players.forEach(p => {
      if (p.invulnerableUntil) p.invulnerableUntil += gap;
      Object.keys(p.effects).forEach(t => { if (p.effects[t]) p.effects[t] += gap; });
    });
    this.pickups.getChildren().forEach(pickup => { pickup.expires += gap; });
    this.extraCoins.getChildren().forEach(coin => { coin.expires += gap; });
    this.paused = false;
    this.time.paused = false;
    this.physics.resume();
    this.pauseOverlay.forEach(o => o.destroy());
    CoinDashFX.onPause?.(this, false);
  }

  hitByDrone(player, drone) {
    if (this.finished || !player.alive) return;
    if (this.isActive(player, 'predator')) return this.eatDrone(player, drone);
    if (this.isInvulnerable(player)) return;
    if (this.isActive(player, 'shield')) {
      // The shield soaks up one hit, then gives a short grace period.
      player.effects.shield = 0;
      player.invulnerableUntil = this.time.now + 800;
      return;
    }
    player.lives--;
    drone.setTexture('enemy_hit');
    this.time.delayedCall(400, () => { if (!this.finished) drone.setTexture('enemy_walk'); });
    CoinDashFX.onHit(this);
    if (player.lives <= 0) return this.knockOut(player);
    player.invulnerableUntil = this.time.now + COIN_DASH.invulnerableMs;
  }

  knockOut(player) {
    player.alive = false;
    player.sprite.body.setVelocity(0, 0);
    player.sprite.body.enable = false;
    player.sprite.setAlpha(0.25);
    player.ring.setVisible(false);
    player.effectsHud.setText('');
    if (this.players.every(q => !q.alive)) {
      this.finish(this.playerCount > 1 ? 'Both players were caught!' : 'A drone caught you!');
    }
  }

  eatDrone(player, drone) {
    if (!drone.visible) return;
    const p = COIN_DASH.powerUps;
    drone.setVisible(false);
    drone.body.enable = false;
    this.addScore(player, p.eatBonus);
    CoinDashFX.onEat?.(this, drone.x, drone.y);
    this.time.delayedCall(p.eatRespawnMs, () => this.respawnDrone(drone));
  }

  respawnDrone(drone) {
    const c = COIN_DASH;
    const { x, y } = this.randomSpotAwayFromPlayers(150);
    drone.setPosition(x, y);
    drone.body.enable = true;
    drone.body.reset(x, y);
    drone.setVisible(true);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
  }

  spawnPowerUp() {
    const p = COIN_DASH.powerUps;
    if (this.finished || this.pickups.countActive() >= p.maxOnScreen) return;
    const types = Object.keys(p.weights);
    let roll = Math.random() * types.reduce((sum, t) => sum + p.weights[t], 0);
    const type = types.find(t => (roll -= p.weights[t]) < 0) || types[0];
    const { x, y } = this.randomSpotAwayFromPlayers(90, 30);
    const pickup = this.add.circle(x, y, type === 'predator' ? 15 : 12, p.colors[type]).setStrokeStyle(2, 0xffffff);
    this.pickups.add(pickup);
    pickup.body.setCircle(pickup.radius);
    pickup.powerType = type;
    pickup.expires = this.time.now + p.lifetimeMs;
    pickup.label = this.add.text(x, y, p.labels[type], { font: 'bold 14px monospace', color: '#101c31' }).setOrigin(0.5);
  }

  // A power-up belongs only to the player who picked it up.
  collectPowerUp(player, pickup) {
    if (this.finished || !player.alive || !pickup.active) return;
    player.effects[pickup.powerType] = this.time.now + COIN_DASH.powerUps.durations[pickup.powerType];
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
    // Magnet: each coin is pulled toward the nearest magnet holder that is close enough.
    const magnets = this.players.filter(q => q.alive && this.isActive(q, 'magnet'));
    [this.coin, ...this.extraCoins.getChildren()].forEach(coin => {
      let target = null, best = p.magnetRange;
      magnets.forEach(q => {
        const gap = Phaser.Math.Distance.Between(coin.x, coin.y, q.sprite.x, q.sprite.y);
        if (gap < best) { best = gap; target = q; }
      });
      if (target) {
        const pull = new Phaser.Math.Vector2(target.sprite.x - coin.x, target.sprite.y - coin.y)
          .normalize().scale(p.magnetPull);
        coin.body.setVelocity(pull.x, pull.y);
      } else {
        coin.body.setVelocity(0, 0);
      }
    });
    // Outline each player in the colour of their strongest active effect; list them under their score.
    this.players.forEach(q => {
      if (!q.alive) return;
      const names = ['predator', 'shield', 'speed', 'magnet'].filter(t => this.isActive(q, t));
      const colour = names.length ? p.colors[names[0]] : null;
      if (colour !== q.outline) {
        q.outline = colour;
        q.ring.setVisible(colour !== null);
        if (colour !== null) q.ring.setStrokeStyle(3, colour);
      }
      q.ring.setPosition(q.sprite.x, q.sprite.y);
      q.effectsHud.setText(names.map(t => `${t.toUpperCase()} ${Math.ceil((q.effects[t] - now) / 1000)}s`).join('  '));
    });
  }

  drawHud(seconds) {
    const top = Math.max(this.best, ...this.players.map(p => p.score));
    this.timerText.setText(`Time: ${seconds}s · Best: ${top}`);
    this.players.forEach(p => {
      const hearts = '♥'.repeat(p.lives) + '♡'.repeat(COIN_DASH.lives - p.lives);
      const label = this.playerCount === 1 ? 'Score' : p.name;
      p.hud.setText(`${label}: ${p.score}  ${hearts}${p.alive ? '' : ' (out)'}`);
    });
  }

  placeCoin() {
    // Avoid spawning the next coin directly underneath a player.
    const { x, y } = this.randomSpotAwayFromPlayers(60);
    this.coinFood = this.pickFood();
    this.coin.setTexture(this.coinFood.key).setDisplaySize(COIN_DASH.foodSize, COIN_DASH.foodSize);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update() {
    if (this.finished || this.paused) return;
    const seconds = this.secondsLeft();
    this.updatePowerUps();
    this.players.forEach(p => {
      if (!p.alive) return;
      const held = dir => p.keys.some(k => k[dir].isDown);
      const dx = Number(held('right')) - Number(held('left'));
      const dy = Number(held('down')) - Number(held('up'));
      const speed = COIN_DASH.playerSpeed * (this.isActive(p, 'speed') ? COIN_DASH.powerUps.speedMultiplier : 1);
      const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(speed);
      p.sprite.body.setVelocity(direction.x, direction.y);
      this.animatePlayer(p, dx);
      // Blink while invulnerable so the player can see the grace period.
      p.sprite.setAlpha(this.isInvulnerable(p) && Math.floor(this.time.now / 100) % 2 ? 0.3 : 1);
    });
    for (const drone of this.drones.getChildren()) drone.setFlipX(drone.body.velocity.x < 0);
    this.drawHud(seconds);
    if (seconds === 0) this.finish('Time is up!');
  }

  animatePlayer(p, dx) {
    if (dx) p.sprite.setFlipX(dx < 0);
    if (this.time.now < p.jumpUntil) {
      p.sprite.anims.stop();
      p.sprite.setTexture(`${p.texture}_jump`);
    } else if (p.sprite.body.velocity.lengthSq() > 0) {
      p.sprite.anims.play(`${p.texture}-walk`, true);
    } else {
      p.sprite.anims.stop();
      p.sprite.setTexture(`${p.texture}_idle`);
    }
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    this.drawHud(this.secondsLeft());
    CoinDashFX.onFinish(this, reason);
    const c = COIN_DASH;
    let summary;
    if (this.playerCount === 1) {
      summary = `${this.score} points (${this.collected} snacks)`;
    } else {
      const [p1, p2] = this.players;
      const result = p1.score === p2.score ? "It's a tie!"
        : `${(p1.score > p2.score ? p1 : p2).name} wins!`;
      summary = `${p1.name}: ${p1.score}   ${p2.name}: ${p2.score}\n${result}`;
    }
    this.endPanel = this.add.rectangle(c.width / 2, c.height / 2, 600, 0, 0x0a1120, 0.95);
    this.endText = this.add.text(c.width / 2, c.height / 2, '',
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
    // With two players, only the higher of the two scores goes into the table.
    const top = Math.max(...this.players.map(p => p.score));
    if (CoinDashStorage.qualifies(top)) this.askName(`${reason}\n${summary}`, top);
    else this.showEndText(`${reason}\n${summary}\nPress R to try again\nPress M for the main menu`);
  }

  showEndText(text) {
    this.endText.setText(text);
    this.endPanel.setSize(600, this.endText.height + 40);
  }

  // Type a name for the high score table: up to maxNameLength characters, Enter to save.
  askName(summary, score) {
    const maxLength = COIN_DASH.maxNameLength;
    this.enteringName = true;
    this.input.keyboard.addCapture('SPACE');
    let name = '';
    const render = () => this.showEndText(`${summary}\nNew high score: ${score}! Enter your name:`
      + `\n${name}_\nEnter to save (up to ${maxLength} characters)`);
    render();
    const onKey = (event) => {
      // A movement key still held from playing would otherwise auto-repeat into the name.
      if (event.repeat) return;
      if (event.key.length === 1 && name.length < maxLength) name += event.key;
      else if (event.key === 'Backspace') name = name.slice(0, -1);
      else if (event.key === 'Enter' && name.trim()) {
        this.input.keyboard.off('keydown', onKey);
        const rank = CoinDashStorage.addScore(name.trim(), score);
        this.scene.start('HighScores', { highlight: rank });
        return;
      }
      render();
    };
    this.input.keyboard.on('keydown', onKey);
  }
}
