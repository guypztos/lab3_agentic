/* global Phaser, COIN_DASH, COIN_DASH_SPRITES */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  preload() {
    for (const [key, url] of Object.entries(COIN_DASH_SPRITES)) {
      if (!this.textures.exists(key)) this.load.image(key, url);
    }
  }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.collected = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.hud = this.add.text(18, 12, '', {
      font: '18px monospace', color: '#ffffff', stroke: '#0a1120', strokeThickness: 4 });
    if (!this.anims.exists('player-walk')) {
      this.anims.create({ key: 'player-walk', frameRate: 7, repeat: -1,
        frames: [{ key: 'player_walk' }, { key: 'player_idle' }] });
    }
    this.player = this.physics.add.sprite(c.width / 2, c.height / 2, 'player_idle')
      .setDisplaySize(c.playerSize, c.playerSize);
    // Hitbox is the round body in the 128px frame, not the whole square image.
    this.player.body.setCircle(34, 30, 38).setCollideWorldBounds(true);
    this.jumpUntil = 0;
    this.coin = this.physics.add.sprite(100, 100, 'food_apple').setDisplaySize(c.foodSize, c.foodSize);
    this.coin.body.setCircle(24, 8, 8);
    // Pulse size rather than bob position, so the tween never fights placeCoin().
    this.tweens.add({ targets: this.coin, scale: this.coin.scale * 1.12,
      duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
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
      this.score += this.food.points;
      this.collected++;
      this.jumpUntil = this.time.now + 300;
      CoinDashFX.onCoin(this, this.coin.x, this.coin.y);
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => {
      // Touching two drones at once calls this twice; only the first hit counts.
      if (this.finished) return;
      CoinDashFX.onHit(this);
      this.finish('A drone caught you!');
    });
    CoinDashFX.onStart(this);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    // Rarer food is worth more: pick by weight.
    let roll = Math.random() * c.foods.reduce((sum, f) => sum + f.weight, 0);
    this.food = c.foods.find(f => (roll -= f.weight) < 0) || c.foods[0];
    this.coin.setTexture(this.food.key).setDisplaySize(c.foodSize, c.foodSize);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    this.animatePlayer(dx);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Score: ${this.score}                       Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  animatePlayer(dx) {
    if (dx) this.player.setFlipX(dx < 0);
    if (this.time.now < this.jumpUntil) {
      this.player.anims.stop();
      this.player.setTexture('player_jump');
    } else if (this.player.body.velocity.lengthSq() > 0) {
      this.player.anims.play('player-walk', true);
    } else {
      this.player.anims.stop();
      this.player.setTexture('player_idle');
    }
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    CoinDashFX.onFinish(this, reason);
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} points (${this.collected} snacks)\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
