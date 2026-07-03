(function () {
  const C = window.NRC_CONFIG;
  const U = window.NRC_UTIL;

  const PERM_UPGRADES = [
    { id: 'starterShield', name: 'Starter Shield', cost: 6, desc: 'Begin each run with 18 bonus shield HP and a short invulnerability window.' },
    { id: 'magneticTrail', name: 'Magnetic Trail', cost: 5, desc: 'Pickup radius increases, and shards fly toward you from farther away.' },
    { id: 'doubleDash', name: 'Double Dash', cost: 8, desc: 'Start each run with two dash charges instead of one.' },
    { id: 'overclock', name: 'Overclock Core', cost: 7, desc: 'Your ship fires faster and dash cooldown is slightly shorter.' },
    { id: 'salvageLuck', name: 'Salvage Luck', cost: 5, desc: 'Sparks from shards and wave clears are boosted.' },
    { id: 'prismShot', name: 'Prism Shot', cost: 9, desc: 'Shots briefly split on hit, making dense waves melt faster.' },
  ];

  const RUN_UPGRADES = [
    {
      id: 'overclock',
      name: 'Overclock Core',
      tag: 'Offense',
      desc: 'Fire rate increases by 22%. Dash cooldown is reduced a little.',
      apply(game) { game.player.fireRateMult *= 0.78; game.player.dashCooldownMult *= 0.92; }
    },
    {
      id: 'prismShot',
      name: 'Prism Shot',
      tag: 'Damage',
      desc: 'Every hit spawns a forked beam that can chain once to another enemy.',
      apply(game) { game.player.prism = Math.min(1, game.player.prism + 1); }
    },
    {
      id: 'magneticTrail',
      name: 'Magnetic Trail',
      tag: 'Control',
      desc: 'Shard magnet range expands and combo decay slows down.',
      apply(game) { game.player.magnet += 160; game.player.comboDecay *= 0.9; }
    },
    {
      id: 'hexBarrier',
      name: 'Hex Barrier',
      tag: 'Defense',
      desc: 'Gain max HP and instantly restore a small shield.',
      apply(game) { game.player.maxHp += 18; game.player.hp += 18; game.player.shield += 20; }
    },
    {
      id: 'warpDrive',
      name: 'Warp Drive',
      tag: 'Mobility',
      desc: 'Dash range and dash invulnerability window both improve.',
      apply(game) { game.player.dashSpeedMult *= 1.18; game.player.dashDurationMult *= 1.18; }
    },
    {
      id: 'salvageLuck',
      name: 'Salvage Luck',
      tag: 'Economy',
      desc: 'Waves and shards pay out more sparks.',
      apply(game) { game.runSparkMult *= 1.18; game.player.scoreMult *= 1.06; }
    },
    {
      id: 'ionBurst',
      name: 'Ion Burst',
      tag: 'Burst',
      desc: 'Dashing detonates a close-range pulse that damages nearby enemies.',
      apply(game) { game.player.ionBurst = true; }
    },
    {
      id: 'mirrorHull',
      name: 'Mirror Hull',
      tag: 'Shield',
      desc: 'Your shield regenerates over time when not taking damage.',
      apply(game) { game.player.shieldRegen = Math.max(game.player.shieldRegen, 3.2); }
    },
  ];

  const MODIFIERS = [
    {
      name: 'Solar Storm',
      desc: 'Enemy shots are denser, but shards are worth a little more.',
      color: '#ffb36b',
      apply(game) { game.spawnBias = { seeker: 0.34, lancer: 0.30, mine: 0.18, sniper: 0.18 }; game.shardBonus += 0.12; game.enemyShotDamageMult *= 1.08; }
    },
    {
      name: 'Gravity Bloom',
      desc: 'Fields tug at everything. Movement is trickier, rewards are richer.',
      color: '#8be8ff',
      apply(game) { game.gravityFields = true; game.shardBonus += 0.18; game.player.stability *= 0.92; }
    },
    {
      name: 'Void Thorn',
      desc: 'Enemies accelerate faster and make more mistakes to exploit.',
      color: '#b46bff',
      apply(game) { game.enemySpeedMult *= 1.14; game.enemyFireRateMult *= 0.9; }
    },
    {
      name: 'Mirror Dust',
      desc: 'More pickups appear; enemies split into smaller fragments on death.',
      color: '#6dff9e',
      apply(game) { game.pickupChance += 0.22; game.splitChance = 0.4; }
    },
  ];

  const ENEMY_TYPES = {
    seeker: {
      name: 'Seeker',
      hp: 20,
      radius: 18,
      speed: 150,
      score: 70,
      hue: 186,
      attackCooldown: 0,
      update(game, e, dt) {
        const p = game.player;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const acc = 220;
        e.vx += dx / d * acc * dt;
        e.vy += dy / d * acc * dt;
        const vmax = (this.speed + game.wave * 4) * game.enemySpeedMult;
        const v = Math.hypot(e.vx, e.vy) || 1;
        if (v > vmax) { e.vx = e.vx / v * vmax; e.vy = e.vy / v * vmax; }
      },
      onDeath(game, e) { game.spawnRadialBurst(e.x, e.y, 10, 'rgba(124,246,255,0.95)'); }
    },
    lancer: {
      name: 'Lancer',
      hp: 30,
      radius: 20,
      speed: 104,
      score: 110,
      hue: 290,
      attackCooldown: 1.3,
      update(game, e, dt) {
        const p = game.player;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const orbit = 220 + Math.sin(game.time * 2 + e.seed) * 55;
        const desired = orbit - d;
        const perpX = -dy / d, perpY = dx / d;
        const accel = 180 * game.enemySpeedMult;
        e.vx += (dx / d * desired + perpX * 0.8) * accel * dt * 0.004;
        e.vy += (dy / d * desired + perpY * 0.8) * accel * dt * 0.004;
        if (d < 760) {
          e.cooldown -= dt;
          if (e.cooldown <= 0) {
            e.cooldown = this.attackCooldown * game.enemyFireRateMult * (0.85 + Math.random() * 0.5);
            game.spawnEnemyBolt(e.x, e.y, dx / d, dy / d, 260 + game.wave * 8, 10);
          }
        }
      },
      onDeath(game, e) { game.spawnRadialBurst(e.x, e.y, 12, 'rgba(180,107,255,0.95)'); }
    },
    mine: {
      name: 'Mine',
      hp: 16,
      radius: 16,
      speed: 68,
      score: 90,
      hue: 347,
      attackCooldown: 0,
      update(game, e, dt) {
        const p = game.player;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = (d < 260 ? 220 : 72) * game.enemySpeedMult;
        e.vx += dx / d * pull * dt;
        e.vy += dy / d * pull * dt;
        if (d < 34 + p.radius && !e.arm) {
          e.arm = 0.2;
        }
      },
      onDeath(game, e) {
        game.spawnRadialBurst(e.x, e.y, 16, 'rgba(255,95,126,0.95)');
        game.explode(e.x, e.y, 54, 18, 0.35);
      }
    },
    sniper: {
      name: 'Sniper',
      hp: 24,
      radius: 18,
      speed: 92,
      score: 140,
      hue: 46,
      attackCooldown: 1.8,
      update(game, e, dt) {
        const p = game.player;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const desired = (d < 470 ? -120 : 180) * game.enemySpeedMult;
        e.vx += dx / d * desired * dt * 0.7;
        e.vy += dy / d * desired * dt * 0.7;
        e.cooldown -= dt;
        if (e.cooldown <= 0 && d < 860) {
          e.cooldown = this.attackCooldown * game.enemyFireRateMult * (0.9 + Math.random() * 0.3);
          game.spawnTriShot(e.x, e.y, dx / d, dy / d, 215 + game.wave * 6, 8);
        }
      },
      onDeath(game, e) { game.spawnRadialBurst(e.x, e.y, 14, 'rgba(255,217,118,0.95)'); }
    }
  };

  class Game {
    constructor(canvas, ui, audio, save, input) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      this.ui = ui;
      this.audio = audio;
      this.save = save;
      this.input = input;
      this.dpr = 1;
      this.w = 0;
      this.h = 0;
      this.time = 0;
      this.running = false;
      this.state = 'menu';
      this.stateTime = 0;
      this.entities = [];
      this.enemies = [];
      this.enemyBullets = [];
      this.playerBullets = [];
      this.pickups = [];
      this.particles = [];
      this.stars = [];
      this.rings = [];
      this.nebula = [];
      this.wave = 1;
      this.waveTime = 0;
      this.waveCharge = 0;
      this.waveKills = 0;
      this.runKills = 0;
      this.waveTarget = 100;
      this.score = 0;
      this.combo = 1;
      this.comboTimer = 0;
      this.comboPeak = 1;
      this.sectorModifier = null;
      this.spawnBias = { seeker: 0.52, lancer: 0.2, mine: 0.18, sniper: 0.1 };
      this.pickupChance = 0.1;
      this.splitChance = 0;
      this.gravityFields = false;
      this.shardBonus = 0;
      this.enemySpeedMult = 1;
      this.enemyFireRateMult = 1;
      this.enemyShotDamageMult = 1;
      this.scoreMult = 1;
      this.runSparkMult = 1;
      this.camera = { x: 0, y: 0, vx: 0, vy: 0, shake: 0, zoom: 1 };
      this.bannerTimer = 0;
      this.bannerText = '';
      this.bannerColor = '#7cf6ff';
      this.lastUpdate = 0;
      this.touchDashFlash = 0;
      this.slowMo = 0;
      this.gameOverReason = '';
      this.victory = false;
      this.perm = this.save.load();
      this.createStars();
      this.bindUI();
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    bindUI() {
      const launch = (cont = false) => { void this.startRun(cont).catch(() => {}); };
      this.ui.btnStart.addEventListener('click', () => launch());
      this.ui.btnContinue.addEventListener('click', () => launch(true));
      this.ui.btnRestart.addEventListener('click', () => launch());
      this.ui.btnRestartPause.addEventListener('click', () => launch());
      this.ui.btnStart.addEventListener('pointerdown', e => { e.preventDefault(); launch(); }, { passive: false });
      this.ui.btnContinue.addEventListener('pointerdown', e => { e.preventDefault(); launch(true); }, { passive: false });
      this.ui.btnMenu.addEventListener('click', () => this.goMenu());
      this.ui.btnResume.addEventListener('click', () => this.resume());
      this.ui.btnAudio.addEventListener('click', async () => {
        this.perm.audioEnabled = !this.perm.audioEnabled;
        this.audio.setEnabled(this.perm.audioEnabled);
        try { await this.audio.init(this.perm.audioEnabled); } catch { /* continue silently */ }
        this.persist();
        this.ui.btnAudio.textContent = `Audio: ${this.perm.audioEnabled ? 'On' : 'Off'}`;
      });
      this.ui.btnResetSave.addEventListener('click', () => {
        if (confirm('Reset all progress and unlocks?')) {
          this.save.reset();
          this.perm = this.save.load();
          this.audio.setEnabled(this.perm.audioEnabled);
          this.renderPermMenu();
          this.updateMenuStats();
        }
      });
      this.input.onDash = () => { if (this.state === 'playing') this.requestDash(); };
      this.input.onPause = () => this.togglePause();
      this.ui.dashButton.addEventListener('click', () => this.requestDash());
      this.ui.dashButton.addEventListener('pointerdown', e => { e.preventDefault(); this.requestDash(); });
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = Math.max(1, Math.floor(rect.width));
      this.h = Math.max(1, Math.floor(rect.height));
      this.canvas.width = Math.floor(this.w * this.dpr);
      this.canvas.height = Math.floor(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    createStars() {
      this.stars.length = 0;
      for (let i = 0; i < C.starCount; i++) {
        this.stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), r: 0.5 + Math.random() * 1.8 });
      }
      this.rings = Array.from({ length: 10 }, (_, i) => ({ radius: 240 + i * 210, phase: Math.random() * Math.PI * 2, speed: 0.08 + Math.random() * 0.12 }));
      this.nebula = Array.from({ length: 20 }, () => ({ x: (Math.random() * 2 - 1) * 2400, y: (Math.random() * 2 - 1) * 2400, r: 180 + Math.random() * 480, hue: Math.random() * 360 }));
    }

    goMenu() {
      this.state = 'menu';
      this.showScreen(this.ui.overlay);
      this.hide(this.ui.hud);
      this.hide(this.ui.pauseScreen);
      this.hide(this.ui.upgradeScreen);
      this.hide(this.ui.gameOverScreen);
      this.hideTouch(false);
      this.updateMenuStats();
    }

    showScreen(el) {
      [this.ui.overlay, this.ui.pauseScreen, this.ui.upgradeScreen, this.ui.gameOverScreen].forEach(x => {
        x.classList.add('hidden'); x.classList.remove('screen--visible');
      });
      el.classList.remove('hidden');
      requestAnimationFrame(() => el.classList.add('screen--visible'));
    }

    hide(el) { el.classList.add('hidden'); el.classList.remove('screen--visible'); }
    hideTouch(hide = true) { this.ui.touchControls.classList.toggle('hidden', hide); }

    persist() {
      try { this.persist(); } catch { /* ignore storage errors */ }
    }

    updateMenuStats() {
      this.ui.bestScore.textContent = String(this.perm.bestScore || 0);
      this.ui.sparkCount.textContent = String(this.perm.sparks || 0);
      this.ui.bestWave.textContent = `Wave ${this.perm.bestWave || 0}`;
      this.ui.bossClears.textContent = String(this.perm.bossClears || 0);
      this.ui.btnContinue.disabled = (this.perm.runs || 0) === 0;
      this.ui.btnAudio.textContent = `Audio: ${this.perm.audioEnabled ? 'On' : 'Off'}`;
    }

    renderPermMenu() {
      this.ui.permUpgrades.innerHTML = '';
      for (const up of PERM_UPGRADES) {
        const owned = !!this.perm.unlocked[up.id];
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
          <div class="upgrade-card__head">
            <strong>${up.name}</strong>
            <span class="small">${owned ? 'Owned' : `${up.cost} Sparks`}</span>
          </div>
          <div class="upgrade-card__body">${up.desc}</div>
          <div class="upgrade-card__foot">
            <span class="small">${owned ? 'Permanent' : 'Unlock for future runs'}</span>
            <button class="btn buy-btn ${owned ? 'btn--ghost' : 'btn--primary'}" ${owned ? 'disabled' : ''}>${owned ? 'Unlocked' : 'Buy'}</button>
          </div>
        `;
        const btn = card.querySelector('button');
        if (!owned) {
          btn.addEventListener('click', () => this.buyPerm(up.id));
        }
        this.ui.permUpgrades.appendChild(card);
      }
    }

    buyPerm(id) {
      const up = PERM_UPGRADES.find(x => x.id === id);
      if (!up || this.perm.unlocked[id] || this.perm.sparks < up.cost) return;
      this.perm.sparks -= up.cost;
      this.perm.unlocked[id] = true;
      this.perm.equipped = id;
      this.persist();
      this.renderPermMenu();
      this.updateMenuStats();
      this.audio.upgrade();
    }

    async startRun(continueLast = false) {
      this.running = true;
      this.state = 'playing';
      this.stateTime = 0;
      this.wave = continueLast ? Math.max(1, this.perm.bestWave || 1) : 1;
      this.score = 0;
      this.combo = 1;
      this.comboTimer = 0;
      this.comboPeak = 1;
      this.waveTime = 0;
      this.waveCharge = 0;
      this.waveKills = 0;
      this.runKills = 0;
      this.waveTarget = 100;
      this.enemies.length = 0;
      this.enemyBullets.length = 0;
      this.playerBullets.length = 0;
      this.pickups.length = 0;
      this.particles.length = 0;
      this.sectorModifier = null;
      this.spawnBias = { seeker: 0.52, lancer: 0.2, mine: 0.18, sniper: 0.1 };
      this.pickupChance = 0.1;
      this.splitChance = 0;
      this.gravityFields = false;
      this.shardBonus = 0;
      this.enemySpeedMult = 1 + Math.max(0, this.wave - 1) * 0.04;
      this.enemyFireRateMult = 1;
      this.enemyShotDamageMult = 1;
      this.scoreMult = 1;
      this.runSparkMult = 1;
      this.camera = { x: 0, y: 0, vx: 0, vy: 0, shake: 0, zoom: 1 };
      this.bannerTimer = 0;
      this.bannerText = '';
      this.gameOverReason = '';
      this.victory = false;
      this.bossSpawned = false;
      this.boss = null;
      this.startSparks = this.perm.sparks || 0;
      this.createPlayer();
      this.applyPermanentBuffs();
      this.spawnSector();
      this.hide(this.ui.overlay);
      this.hide(this.ui.pauseScreen);
      this.hide(this.ui.upgradeScreen);
      this.hide(this.ui.gameOverScreen);
      this.ui.hud.classList.remove('hidden');
      this.hideTouch(!this.input.usingTouch);
      this.perm.runs = (this.perm.runs || 0) + 1;
      this.persist();

      try { void this.audio.init(this.perm.audioEnabled).catch(() => {}); } catch { /* audio is optional */ }
      this.audio.tone({ freq: 246, type: 'triangle', dur: 0.12, gain: 0.05 });
      this.audio.tone({ freq: 369.99, type: 'triangle', dur: 0.12, gain: 0.03 });
    }

    createPlayer() {
      this.player = {
        x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
        radius: 18,
        hp: C.basePlayerHp,
        maxHp: C.basePlayerHp,
        shield: 0,
        shieldMax: 0,
        invuln: 0,
        dashTime: 0,
        dashCooldown: 0,
        dashCooldownMax: C.dashCooldown,
        dashCharges: 1,
        dashChargesMax: 1,
        fireCooldown: 0,
        fireRateMult: 1,
        dashCooldownMult: 1,
        dashSpeedMult: 1,
        dashDurationMult: 1,
        scoreMult: 1,
        comboDecay: C.comboDecay,
        magnet: 220,
        prism: 0,
        ionBurst: false,
        shieldRegen: 0,
        stability: 1,
        hurtFlash: 0,
        trailHue: 186,
        lastShotAt: 0,
      };
    }

    applyPermanentBuffs() {
      const eq = this.perm.equipped || 'starterShield';
      if (eq === 'starterShield') {
        this.player.maxHp += 18;
        this.player.hp += 18;
        this.player.shield = 18;
      } else if (eq === 'magneticTrail') {
        this.player.magnet += 170;
      } else if (eq === 'doubleDash') {
        this.player.dashChargesMax = 2;
        this.player.dashCharges = 2;
      } else if (eq === 'overclock') {
        this.player.fireRateMult *= 0.88;
        this.player.dashCooldownMult *= 0.92;
      } else if (eq === 'salvageLuck') {
        this.runSparkMult *= 1.15;
        this.scoreMult *= 1.05;
      } else if (eq === 'prismShot') {
        this.player.prism = 1;
      }
    }

    spawnSector() {
      this.spawnBias = { seeker: 0.52, lancer: 0.2, mine: 0.18, sniper: 0.1 };
      this.pickupChance = 0.1;
      this.splitChance = 0;
      this.gravityFields = false;
      this.shardBonus = 0;
      this.enemySpeedMult = 1 + Math.max(0, this.wave - 1) * 0.04;
      this.enemyFireRateMult = 1;
      this.enemyShotDamageMult = 1;
      const mod = U.pick(MODIFIERS);
      this.sectorModifier = mod;
      mod.apply(this);
      this.banner(mod.name, mod.desc, mod.color);
      this.audio.tone({ freq: 280 + this.wave * 14, type: 'triangle', dur: 0.11, gain: 0.04 });
      for (let i = 0; i < 8 + this.wave; i++) this.spawnPickupAt(this.player.x + U.rand(-620, 620), this.player.y + U.rand(-620, 620), 'shard');
      this.ensureEnemies(8 + this.wave * 2);
    }

    banner(title, desc, color) {
      this.bannerText = `${title} — ${desc}`;
      this.bannerTimer = 3.8;
      this.bannerColor = color;
      this.ui.eventBanner.textContent = this.bannerText;
      this.ui.eventBanner.style.borderColor = color;
      this.ui.eventBanner.style.boxShadow = `0 0 22px ${color}33`;
      this.ui.eventBanner.classList.add('show');
    }

    ensureEnemies(target) {
      const max = Math.min(C.maxEnemies, target);
      while (this.enemies.length < max) this.spawnEnemy();
    }

    chooseEnemyType() {
      const w = this.wave;
      const options = [];
      const add = (type, weight) => { for (let i = 0; i < weight; i++) options.push(type); };
      add('seeker', Math.round(7 + w * this.spawnBias.seeker * 4));
      add('lancer', Math.round(3 + w * this.spawnBias.lancer * 3));
      add('mine', Math.round(2 + w * this.spawnBias.mine * 4));
      add('sniper', Math.max(1, Math.round((w - 2) * this.spawnBias.sniper * 2)));
      return U.pick(options);
    }

    spawnEnemy() {
      const type = this.chooseEnemyType();
      const proto = ENEMY_TYPES[type];
      const angle = Math.random() * Math.PI * 2;
      const dist = U.rand(660, 380);
      const spawnX = this.player.x + Math.cos(angle) * dist;
      const spawnY = this.player.y + Math.sin(angle) * dist;
      const enemy = {
        type,
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: 0,
        hp: proto.hp + Math.floor(this.wave * (type === 'mine' ? 1.2 : 1.45)),
        maxHp: proto.hp,
        radius: proto.radius,
        cooldown: proto.attackCooldown || 0,
        seed: Math.random() * 9,
        hue: proto.hue,
        flash: 0,
        arm: 0,
      };
      this.enemies.push(enemy);
    }

    spawnPickupAt(x, y, kind = 'shard') {
      this.pickups.push({ x, y, vx: U.rand(-30, 30), vy: U.rand(-30, 30), radius: 10, kind, value: C.baseShardValue + Math.floor(this.wave * 1.5), life: 28, pulse: Math.random() * Math.PI * 2 });
    }

    spawnEnemyBolt(x, y, dx, dy, speed, damage) {
      this.enemyBullets.push({ x, y, vx: dx * speed, vy: dy * speed, radius: 5, damage: damage * this.enemyShotDamageMult, life: 4.5, hue: 292, trail: 0 });
    }

    spawnTriShot(x, y, dx, dy, speed, damage) {
      const a = Math.atan2(dy, dx);
      for (let i = -1; i <= 1; i++) {
        const ang = a + i * 0.18;
        this.spawnEnemyBolt(x, y, Math.cos(ang), Math.sin(ang), speed, damage);
      }
    }

    spawnPlayerShot(x, y, dx, dy, speed, damage, extra = {}) {
      this.playerBullets.push({ x, y, vx: dx * speed, vy: dy * speed, radius: 4, damage, life: 2.2, pierce: extra.pierce || 0, split: extra.split || 0, hue: extra.hue || 186, trail: 0, fromDash: !!extra.fromDash });
    }

    spawnRadialBurst(x, y, count, color) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = U.rand(90, 20) + Math.random() * 70;
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.rand(0.8, 0.25), size: U.rand(5, 1.4), color, glow: 1, drag: 0.9, gravity: 0 });
      }
    }

    explode(x, y, radius, damage, shake) {
      this.camera.shake = Math.min(18, this.camera.shake + shake);
      this.slowMo = Math.max(this.slowMo, 0.09);
      for (const e of this.enemies) {
        const dx = e.x - x, dy = e.y - y;
        const d = Math.hypot(dx, dy);
        if (d < radius) {
          e.hp -= damage * (1 - d / radius);
        }
      }
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = U.rand(260, 80);
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.rand(0.7, 0.18), size: U.rand(4, 1), color: 'rgba(255,95,126,0.92)', glow: 1, drag: 0.88, gravity: 0 });
      }
    }

    requestDash() {
      if (this.state !== 'playing') return;
      const p = this.player;
      if (p.dashCooldown > 0 || p.dashCharges <= 0) return;
      const mv = this.input.movementVector();
      const dir = mv.mag > 0 ? mv : (Math.hypot(p.vx, p.vy) > 1 ? { x: p.vx, y: p.vy, mag: 1 } : { x: 1, y: 0, mag: 1 });
      const [nx, ny] = U.normalize(dir.x, dir.y);
      const dashSpeed = C.dashSpeed * p.dashSpeedMult;
      p.vx = nx * dashSpeed;
      p.vy = ny * dashSpeed;
      p.dashTime = C.dashDuration * p.dashDurationMult;
      p.invuln = Math.max(p.invuln, p.dashTime + 0.02);
      p.dashCooldown = C.dashCooldown * p.dashCooldownMult;
      p.dashCharges -= 1;
      this.camera.shake = Math.min(14, this.camera.shake + 4);
      this.audio.dash();
      this.slowMo = Math.max(this.slowMo, 0.04);
      this.touchDashFlash = 0.16;
      this.spawnRadialBurst(p.x, p.y, 14, 'rgba(124,246,255,0.95)');
      if (p.ionBurst) this.explode(p.x, p.y, 110, 18, 0.18);
    }

    togglePause() {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    }

    pause() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      this.showScreen(this.ui.pauseScreen);
      this.audio.tone({ freq: 170, type: 'sine', dur: 0.05, gain: 0.03 });
    }

    resume() {
      if (this.state !== 'paused') return;
      this.state = 'playing';
      this.hide(this.ui.pauseScreen);
    }

    showUpgradeDraft() {
      this.state = 'upgrade';
      this.ui.upgradeChoices.innerHTML = '';
      const choices = U.shuffle(RUN_UPGRADES.slice()).slice(0, 3);
      for (const choice of choices) {
        const card = document.createElement('button');
        card.className = 'choice-card';
        card.innerHTML = `
          <div class="tag">${choice.tag}</div>
          <strong>${choice.name}</strong>
          <div class="desc">${choice.desc}</div>
          <div class="meta">Select to continue into the next sector.</div>
        `;
        card.addEventListener('click', () => {
          choice.apply(this);
          this.audio.upgrade();
          this.wave += 1;
          this.waveTime = 0;
          this.waveCharge = 0;
          this.waveKills = 0;
          this.waveTarget = 100 + this.wave * 12;
          this.state = 'playing';
          this.hide(this.ui.upgradeScreen);
          this.banner(`Sector ${this.wave}`, 'The rift intensifies. Rewards and dangers both escalate.', '#7cf6ff');
          this.spawnSector();
        });
        this.ui.upgradeChoices.appendChild(card);
      }
      this.showScreen(this.ui.upgradeScreen);
    }

    update(dt) {
      this.time += dt;
      if (this.bannerTimer > 0) {
        this.bannerTimer -= dt;
        if (this.bannerTimer <= 0) this.ui.eventBanner.classList.remove('show');
      }
      this.slowMo = Math.max(0, this.slowMo - dt);
      if (this.touchDashFlash > 0) this.touchDashFlash -= dt;
      if (this.state !== 'playing') {
        this.updateCamera(dt * 0.5);
        this.draw();
        return;
      }
      const p = this.player;
      const mv = this.input.movementVector();
      const accel = C.playerAccel * p.stability;
      p.ax = mv.x * accel;
      p.ay = mv.y * accel;
      p.vx += p.ax * dt;
      p.vy += p.ay * dt;
      if (mv.mag < 0.06 && p.dashTime <= 0) {
        const drag = Math.pow(0.85, dt * 60);
        p.vx *= drag;
        p.vy *= drag;
      }
      const speed = Math.hypot(p.vx, p.vy);
      const maxSpeed = C.basePlayerSpeed + (p.dashTime > 0 ? 150 : 0);
      if (speed > maxSpeed) { p.vx = p.vx / speed * maxSpeed; p.vy = p.vy / speed * maxSpeed; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const dist = Math.hypot(p.x, p.y);
      if (dist > C.worldRadius) {
        const [nx, ny] = U.normalize(p.x, p.y);
        p.x = nx * C.worldRadius;
        p.y = ny * C.worldRadius;
        p.vx -= nx * 220;
        p.vy -= ny * 220;
        p.hp -= 8 * dt;
      }
      if (p.invuln > 0) p.invuln -= dt;
      if (p.dashTime > 0) p.dashTime -= dt;
      if (p.dashCooldown > 0) p.dashCooldown -= dt;
      if (p.dashCooldown <= 0 && p.dashCharges < p.dashChargesMax) {
        p.dashCharges += 1;
        p.dashCooldown = C.dashCooldown * p.dashCooldownMult;
      }
      if (p.shieldRegen > 0 && p.hp < p.maxHp && p.invuln <= 0) {
        p.shield = Math.min(p.shield + p.shieldRegen * dt, 32);
      }
      p.fireCooldown -= dt;
      p.hurtFlash = Math.max(0, p.hurtFlash - dt * 1.6);
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) this.combo = U.lerp(this.combo, 1, dt * 0.45);
      this.waveTime += dt;

      const nearest = this.findNearestEnemy(C.autoAimRange);
      if (nearest) this.autoFire(nearest, dt);

      this.updateEnemies(dt);
      this.updateBullets(dt);
      this.updatePickups(dt);
      this.updateParticles(dt);
      this.updateCamera(dt);
      this.resolvePickupMagnet(dt);
      this.updateWaveProgress(dt);
      this.updateUI();
      this.checkDeath();
      this.draw();
      this.input.consumeDashTap();
    }

    autoFire(target, dt) {
      const p = this.player;
      const rate = C.baseFireRate * p.fireRateMult;
      if (p.fireCooldown > 0) return;
      const dx = target.x - p.x, dy = target.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const [nx, ny] = [dx / d, dy / d];
      p.fireCooldown = rate;
      p.lastShotAt = this.time;
      const damage = C.baseDamage + Math.floor(this.wave * 0.5) + Math.floor(this.combo * 2);
      const speed = 680 + this.wave * 8;
      this.spawnPlayerShot(p.x + nx * 22, p.y + ny * 22, nx, ny, speed, damage, { pierce: p.prism, split: p.prism > 0 ? 1 : 0, hue: 186 + (this.wave % 4) * 20 });
      if (p.prism > 0 && Math.random() < 0.42) this.spawnPlayerShot(p.x + ny * 14, p.y - nx * 14, nx * 0.96, ny * 0.96, speed * 0.96, Math.floor(damage * 0.7), { pierce: 0, split: 0, hue: 290 });
      this.spawnTrail(p.x + nx * 18, p.y + ny * 18, -nx * 34, -ny * 34, 'rgba(124,246,255,0.22)');
      if (Math.random() < 0.12) this.spawnParticleGlow(p.x + nx * 18, p.y + ny * 18, 'rgba(124,246,255,0.8)', 0.22);
    }

    spawnParticleGlow(x, y, color, life = 0.3) {
      this.particles.push({ x, y, vx: U.rand(-30, 30), vy: U.rand(-30, 30), life, size: U.rand(12, 5), color, glow: 1, drag: 0.98, gravity: 0 });
    }

    spawnTrail(x, y, vx, vy, color) {
      this.particles.push({ x, y, vx, vy, life: 0.24, size: 7, color, glow: 0.9, drag: 0.84, gravity: 0 });
    }

    findNearestEnemy(range) {
      let best = null;
      let bestD2 = range * range;
      const p = this.player;
      for (const e of this.enemies) {
        const dx = e.x - p.x, dy = e.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = e; }
      }
      if (this.boss) {
        const dx = this.boss.x - p.x, dy = this.boss.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = this.boss; }
      }
      return best;
    }

    updateEnemies(dt) {
      const p = this.player;
      const grav = this.gravityFields ? 0.18 : 0;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const proto = ENEMY_TYPES[e.type];
        proto.update.call(proto, this, e, dt);
        if (grav) {
          const dx = p.x - e.x, dy = p.y - e.y;
          const d = Math.hypot(dx, dy) || 1;
          e.vx += dx / d * grav * 120 * dt;
          e.vy += dy / d * grav * 120 * dt;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vx *= Math.pow(0.987, dt * 60);
        e.vy *= Math.pow(0.987, dt * 60);
        e.flash = Math.max(0, e.flash - dt * 2.8);
        e.arm = Math.max(0, e.arm - dt);
        const dx = e.x - p.x, dy = e.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const hitDist = e.radius + p.radius;
        if (d < hitDist && p.invuln <= 0) {
          this.damagePlayer(12 + this.wave * 0.55, dx / d, dy / d, e.type === 'mine' ? 1.1 : 0.7);
          this.killEnemy(i, true);
          continue;
        }
        if (e.hp <= 0) {
          this.killEnemy(i, false);
        }
      }
      if (this.wave >= C.bossWave && this.enemies.length === 0 && this.state === 'playing' && !this.bossSpawned) {
        this.spawnBoss();
      }
    }

    spawnBoss() {
      this.bossSpawned = true;
      const angle = Math.random() * Math.PI * 2;
      const dist = 580;
      const x = this.player.x + Math.cos(angle) * dist;
      const y = this.player.y + Math.sin(angle) * dist;
      this.boss = {
        x, y, vx: 0, vy: 0, hp: 520 + this.wave * 32, maxHp: 520 + this.wave * 32, radius: 44,
        phase: 0, pattern: 0, cooldown: 1.2, shield: 40, shieldMax: 40, flash: 0, seed: Math.random() * 10
      };
      this.banner('BOSS ENCOUNTER', 'The Rift Monarch has entered the sector.', '#ff5f7e');
      this.audio.boss();
      for (let i = 0; i < 34; i++) this.particles.push({ x, y, vx: U.rand(-180, 180), vy: U.rand(-180, 180), life: U.rand(1.2, 0.2), size: U.rand(8, 2), color: 'rgba(255,95,126,0.92)', glow: 1, drag: 0.94, gravity: 0 });
      this.camera.shake = 14;
    }

    updateBoss(dt) {
      const b = this.boss;
      const p = this.player;
      if (!b) return;
      b.phase += dt;
      const dx = p.x - b.x, dy = p.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const [nx, ny] = [dx / d, dy / d];
      const orbit = 310 + Math.sin(this.time * 1.2 + b.seed) * 70;
      const pull = (d - orbit) * 0.7;
      b.vx += nx * pull * dt * 16;
      b.vy += ny * pull * dt * 16;
      b.vx += (-ny * 16 + Math.sin(b.phase * 1.5) * 10) * dt;
      b.vy += (nx * 16 + Math.cos(b.phase * 1.2) * 10) * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= Math.pow(0.98, dt * 60);
      b.vy *= Math.pow(0.98, dt * 60);
      b.cooldown -= dt;
      if (b.cooldown <= 0) {
        b.cooldown = 1.0 + Math.random() * 0.35;
        const mode = b.pattern++ % 3;
        if (mode === 0) {
          const base = Math.atan2(dy, dx);
          for (let i = -5; i <= 5; i++) {
            const ang = base + i * 0.11;
            this.spawnEnemyBolt(b.x, b.y, Math.cos(ang), Math.sin(ang), 250 + this.wave * 12, 12);
          }
        } else if (mode === 1) {
          const count = 14;
          for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2 + this.time * 2.1;
            this.spawnEnemyBolt(b.x, b.y, Math.cos(ang), Math.sin(ang), 200 + this.wave * 8, 10);
          }
        } else {
          for (let i = 0; i < 4; i++) {
            const ang = Math.atan2(dy, dx) + U.rand(-0.28, 0.28);
            this.spawnEnemyBolt(b.x, b.y, Math.cos(ang), Math.sin(ang), 320 + this.wave * 6, 14);
          }
        }
      }
      b.flash = Math.max(0, b.flash - dt * 2.8);
      const hdx = b.x - p.x, hdy = b.y - p.y;
      const hd = Math.hypot(hdx, hdy);
      if (hd < b.radius + p.radius && p.invuln <= 0) this.damagePlayer(18 + this.wave * 0.8, hdx / hd, hdy / hd, 1.3);
      if (b.hp <= 0) {
        this.victory = true;
        this.endRun(true, 'The Rift Monarch falls. The sector opens.');
      }
    }

    updateBullets(dt) {
      const p = this.player;
      for (let i = this.playerBullets.length - 1; i >= 0; i--) {
        const b = this.playerBullets[i];
        b.life -= dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.trail = Math.max(0, b.trail - dt);
        if (b.life <= 0) { this.playerBullets.splice(i, 1); continue; }
        let hit = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const dx = e.x - b.x, dy = e.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < e.radius + b.radius) {
            e.hp -= b.damage;
            e.flash = 0.14;
            b.life = 0.001;
            hit = true;
            this.scoreHit(e, b.damage, e.hp <= 0);
            this.particles.push({ x: b.x, y: b.y, vx: U.rand(-180,180), vy: U.rand(-180,180), life: 0.26, size: U.rand(7, 3), color: `hsla(${b.hue}, 100%, 70%, 0.95)`, glow: 1, drag: 0.92, gravity: 0 });
            if (b.split > 0) {
              const ang = Math.atan2(dy, dx);
              const delta = 0.45;
              this.spawnPlayerShot(b.x, b.y, Math.cos(ang + delta), Math.sin(ang + delta), 520, Math.floor(b.damage * 0.55), { pierce: 0, split: 0, hue: 290 });
              this.spawnPlayerShot(b.x, b.y, Math.cos(ang - delta), Math.sin(ang - delta), 520, Math.floor(b.damage * 0.55), { pierce: 0, split: 0, hue: 260 });
            }
            if (e.hp <= 0) {
              this.killEnemy(j, false);
              if (Math.random() < this.splitChance) this.spawnSplitEnemies(e.x, e.y);
            }
            if (b.pierce > 0) {
              b.pierce -= 1;
              b.life = 0.12;
            } else break;
          }
        }
        if (!hit && this.boss) {
          const bss = this.boss;
          const dx = bss.x - b.x, dy = bss.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < bss.radius + b.radius) {
            bss.hp -= b.damage;
            bss.flash = 0.18;
            b.life = 0.001;
            this.scoreHit(bss, b.damage, bss.hp <= 0);
            this.particles.push({ x: b.x, y: b.y, vx: U.rand(-140,140), vy: U.rand(-140,140), life: 0.3, size: U.rand(10, 4), color: 'rgba(255,95,126,0.95)', glow: 1, drag: 0.92, gravity: 0 });
            if (b.split > 0) {
              const ang = Math.atan2(dy, dx);
              this.spawnPlayerShot(b.x, b.y, Math.cos(ang + 0.33), Math.sin(ang + 0.33), 520, Math.floor(b.damage * 0.4), { hue: 290 });
            }
          }
        }
      }

      for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
        const b = this.enemyBullets[i];
        b.life -= dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.trail = Math.max(0, b.trail - dt);
        const dx = p.x - b.x, dy = p.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < p.radius + b.radius && p.invuln <= 0) {
          this.damagePlayer(b.damage, dx / d, dy / d, 0.6);
          b.life = 0;
        }
        if (b.life <= 0) this.enemyBullets.splice(i, 1);
      }
    }

    updatePickups(dt) {
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const p = this.pickups[i];
        p.life -= dt;
        p.pulse += dt * 4;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.96, dt * 60);
        p.vy *= Math.pow(0.96, dt * 60);
        const dx = this.player.x - p.x, dy = this.player.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < this.player.radius + p.radius + 7) {
          this.collectPickup(i, p);
          continue;
        }
        if (p.life <= 0) this.pickups.splice(i, 1);
      }
      if (this.pickups.length < C.maxPickups && Math.random() < 0.03 + this.pickupChance * 0.02) {
        this.spawnPickupAt(this.player.x + U.rand(-760, 760), this.player.y + U.rand(-760, 760), 'shard');
      }
    }

    collectPickup(index, p) {
      this.pickups.splice(index, 1);
      const gain = Math.round((p.value + this.wave * 3) * (1 + this.shardBonus) * this.scoreMult);
      this.score += gain;
      this.combo = Math.min(9.9, this.combo + 0.1 + this.wave * 0.01);
      this.comboPeak = Math.max(this.comboPeak, this.combo);
      this.comboTimer = 2.6;
      this.waveCharge += 8 + this.wave * 0.6;
      this.perm.sparks = (this.perm.sparks || 0) + Math.max(1, Math.floor((1 + gain / 50) * this.runSparkMult * 0.18));
      this.player.hp = Math.min(this.player.maxHp + 12, this.player.hp + 2.2);
      this.player.shield = Math.min(36, this.player.shield + 2.5);
      this.spawnRadialBurst(p.x, p.y, 9, 'rgba(109,255,158,0.95)');
      this.audio.collect();
      this.camera.shake = Math.min(6, this.camera.shake + 1.1);
      this.persist();
    }

    updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.gravity) p.vy += p.gravity * dt;
        p.vx *= Math.pow(p.drag ?? 0.92, dt * 60);
        p.vy *= Math.pow(p.drag ?? 0.92, dt * 60);
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      if (this.particles.length > C.maxParticles) this.particles.length = C.maxParticles;
    }

    updateCamera(dt) {
      const p = this.player;
      const targetX = p.x;
      const targetY = p.y;
      this.camera.x = U.lerp(this.camera.x, targetX, 1 - Math.pow(1 - C.cameraLag, dt * 60));
      this.camera.y = U.lerp(this.camera.y, targetY, 1 - Math.pow(1 - C.cameraLag, dt * 60));
      this.camera.shake = Math.max(0, this.camera.shake - dt * C.shakeDamp);
      const speed = Math.hypot(p.vx, p.vy);
      this.camera.zoom = U.lerp(this.camera.zoom, 1 + Math.min(0.075, speed / 5200), 1 - Math.pow(0.92, dt * 60));
    }

    resolvePickupMagnet(dt) {
      const p = this.player;
      const radius = p.magnet + (this.perm.unlocked.magneticTrail ? 110 : 0);
      for (const item of this.pickups) {
        const dx = p.x - item.x, dy = p.y - item.y;
        const d = Math.hypot(dx, dy);
        if (d < radius && d > 1) {
          const pull = U.map(d, radius, 0, 0, 540);
          item.vx += dx / d * pull * dt;
          item.vy += dy / d * pull * dt;
        }
      }
    }

    updateWaveProgress(dt) {
      const p = this.player;
      this.waveCharge += dt * (this.wave * 1.5 + 0.8);
      if (this.waveTime > C.waveDuration) this.waveCharge += dt * 1.6;
      if (this.waveCharge >= this.waveTarget) {
        if (this.wave >= C.bossWave && !this.bossSpawned) {
          this.spawnBoss();
          this.waveTarget += 9999;
        } else {
          this.showUpgradeDraft();
        }
      }
      if (this.boss) this.updateBoss(dt);
      if (this.enemies.length < Math.min(C.maxEnemies, 7 + this.wave * 2) && Math.random() < 0.05) this.spawnEnemy();
      if (this.wave % C.sectorUpgradeEvery === 0 && this.waveTime > 18 && this.waveCharge < this.waveTarget && Math.random() < 0.004) this.spawnPickupAt(p.x + U.rand(-560, 560), p.y + U.rand(-560, 560));
    }

    scoreHit(target, damage, killed) {
      this.score += Math.round(damage * this.combo * this.scoreMult * (killed ? 1.8 : 0.6));
      this.combo = Math.min(9.9, this.combo + (killed ? 0.22 : 0.06));
      this.comboPeak = Math.max(this.comboPeak, this.combo);
      this.comboTimer = 3.0;
      if (killed) this.camera.shake = Math.min(16, this.camera.shake + 2.2);
      if (killed && Math.random() < 0.18) this.spawnPickupAt(target.x + U.rand(-18, 18), target.y + U.rand(-18, 18));
    }

    killEnemy(index, collided) {
      const e = this.enemies[index];
      if (!e) return;
      const proto = ENEMY_TYPES[e.type];
      this.enemies.splice(index, 1);
      this.waveKills += 1;
      this.score += Math.round((proto.score + this.wave * 8) * this.combo * this.scoreMult);
      this.waveCharge += 10 + this.wave * 0.8;
      this.perm.kills = (this.perm.kills || 0) + 1;
      this.runKills = (this.runKills || 0) + 1;
      this.perm.sparks = (this.perm.sparks || 0) + Math.max(1, Math.floor((2 + this.wave * 0.1) * this.runSparkMult));
      this.scoreHit(e, proto.score * 0.5, true);
      proto.onDeath(this, e);
      if (!collided) this.spawnPickupAt(e.x, e.y);
      if (Math.random() < this.pickupChance + this.wave * 0.01) this.spawnPickupAt(e.x + U.rand(-16, 16), e.y + U.rand(-16, 16));
      if (this.enemies.length < C.maxEnemies && Math.random() < 0.5) this.spawnEnemy();
      this.audio.hit();
      this.persist();
    }

    spawnSplitEnemies(x, y) {
      for (let i = 0; i < 2; i++) {
        const t = U.pick(['seeker', 'seeker', 'mine']);
        const proto = ENEMY_TYPES[t];
        this.enemies.push({ type: t, x: x + U.rand(-18, 18), y: y + U.rand(-18, 18), vx: U.rand(-60, 60), vy: U.rand(-60, 60), hp: Math.max(8, Math.floor(proto.hp * 0.6)), maxHp: proto.hp, radius: Math.max(10, proto.radius * 0.8), cooldown: proto.attackCooldown || 0, seed: Math.random() * 9, hue: proto.hue, flash: 0, arm: 0 });
      }
    }

    damagePlayer(amount, nx, ny, knock = 1) {
      const p = this.player;
      let dmg = amount;
      if (p.shield > 0) {
        const used = Math.min(p.shield, dmg);
        p.shield -= used;
        dmg -= used * 0.85;
      }
      if (dmg > 0) p.hp -= dmg;
      p.invuln = Math.max(p.invuln, 0.28);
      p.hurtFlash = 1;
      p.vx += nx * 180 * knock;
      p.vy += ny * 180 * knock;
      this.camera.shake = Math.min(18, this.camera.shake + 5.5);
      this.slowMo = Math.max(this.slowMo, 0.07);
      this.audio.hit();
      this.spawnRadialBurst(p.x, p.y, 12, 'rgba(255,95,126,0.95)');
    }

    checkDeath() {
      if (this.player.hp > 0) return;
      this.endRun(false, 'Your hull failed under the pressure of the rift.');
    }

    endRun(win, reason) {
      if (this.state === 'gameover') return;
      this.state = 'gameover';
      this.running = false;
      this.gameOverReason = reason;
      this.perm.bestScore = Math.max(this.perm.bestScore || 0, Math.floor(this.score));
      this.perm.bestWave = Math.max(this.perm.bestWave || 0, this.wave);
      if (win) this.perm.bossClears = (this.perm.bossClears || 0) + 1;
      this.perm.sparks = (this.perm.sparks || 0) + Math.max(0, Math.floor(this.score / 350));
      this.persist();
      this.showGameOver(win);
      if (win) this.audio.win(); else this.audio.lose();
    }

    showGameOver(win) {
      this.ui.resultBadge.textContent = win ? 'VICTORY' : 'RUN ENDED';
      this.ui.resultTitle.textContent = win ? 'Rift Cleared' : 'Game Over';
      this.ui.resultText.textContent = win ? 'The final sector opens. Your courier streak becomes legend.' : this.gameOverReason;
      this.ui.finalScore.textContent = String(Math.floor(this.score));
      this.ui.finalWave.textContent = String(this.wave);
      this.ui.finalKills.textContent = String(this.runKills || 0);
      this.ui.finalSparks.textContent = String(Math.max(0, (this.perm.sparks || 0) - (this.startSparks || 0)));
      this.showScreen(this.ui.gameOverScreen);
      this.hide(this.ui.hud);
      this.hideTouch(true);
      this.updateMenuStats();
    }

    updateUI() {
      const p = this.player;
      this.ui.hudScore.textContent = String(Math.floor(this.score));
      this.ui.hudWave.textContent = String(this.wave);
      this.ui.hudCharge.textContent = `${Math.floor(U.clamp(this.waveCharge / this.waveTarget * 100, 0, 100))}%`;
      this.ui.hudCombo.textContent = `x${(1 + (this.combo - 1) * 0.8).toFixed(1)}`;
      this.ui.hudHp.textContent = String(Math.max(0, Math.ceil(p.hp)));
      this.ui.hpBar.style.width = `${U.clamp((p.hp / p.maxHp) * 100, 0, 100)}%`;
      this.ui.dashBar.style.width = `${U.clamp(100 - (p.dashCooldown / (C.dashCooldown * p.dashCooldownMult)) * 100, 0, 100)}%`;
    }

    draw() {
      const ctx = this.ctx;
      const w = this.w, h = this.h;
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#040611';
      ctx.fillRect(0, 0, w, h);

      const cam = this.camera;
      const shakeX = (Math.random() - 0.5) * cam.shake;
      const shakeY = (Math.random() - 0.5) * cam.shake;
      const zoom = cam.zoom;
      ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
      ctx.scale(zoom, zoom);
      ctx.translate(-cam.x, -cam.y);

      this.drawBackdrop(ctx);
      this.drawRings(ctx);
      this.drawNebula(ctx);
      this.drawGrid(ctx);
      this.drawParticles(ctx);
      this.drawPickups(ctx);
      this.drawBullets(ctx);
      this.drawEnemies(ctx);
      this.drawBoss(ctx);
      this.drawPlayer(ctx);
      this.drawHudExtras(ctx);

      ctx.restore();
      this.drawOverlayFX();
    }

    drawBackdrop(ctx) {
      const p = this.player;
      const grad = ctx.createRadialGradient(p.x - 120, p.y - 80, 120, p.x, p.y, 1200);
      grad.addColorStop(0, 'rgba(124,246,255,0.08)');
      grad.addColorStop(0.4, 'rgba(180,107,255,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - 1400, p.y - 1400, 2800, 2800);

      const stars = this.stars;
      for (const s of stars) {
        const x = p.x + s.x * 2500 + Math.sin(this.time * 0.1 + s.z * 6.3) * 22;
        const y = p.y + s.y * 2500 + Math.cos(this.time * 0.11 + s.z * 5.2) * 22;
        const tw = 0.4 + (Math.sin(this.time * (0.8 + s.z) + s.z * 20) * 0.5 + 0.5) * 0.6;
        ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r * (0.9 + tw * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawRings(ctx) {
      const p = this.player;
      ctx.save();
      ctx.strokeStyle = 'rgba(124,246,255,0.08)';
      for (const ring of this.rings) {
        const r = ring.radius + Math.sin(this.time * ring.speed + ring.phase) * 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawNebula(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const n of this.nebula) {
        const driftX = Math.sin(this.time * 0.03 + n.hue) * 80;
        const driftY = Math.cos(this.time * 0.025 + n.hue * 1.3) * 80;
        const g = ctx.createRadialGradient(n.x + driftX, n.y + driftY, 20, n.x + driftX, n.y + driftY, n.r);
        g.addColorStop(0, `hsla(${n.hue}, 100%, 65%, 0.08)`);
        g.addColorStop(0.45, `hsla(${(n.hue + 40) % 360}, 100%, 60%, 0.03)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(n.x + driftX, n.y + driftY, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawGrid(ctx) {
      ctx.save();
      ctx.strokeStyle = 'rgba(124,246,255,0.06)';
      ctx.lineWidth = 1;
      const size = 120;
      const minX = Math.floor((this.camera.x - this.w) / size) * size;
      const minY = Math.floor((this.camera.y - this.h) / size) * size;
      for (let x = minX; x < this.camera.x + this.w; x += size) {
        ctx.beginPath(); ctx.moveTo(x, this.camera.y - this.h); ctx.lineTo(x, this.camera.y + this.h); ctx.stroke();
      }
      for (let y = minY; y < this.camera.y + this.h; y += size) {
        ctx.beginPath(); ctx.moveTo(this.camera.x - this.w, y); ctx.lineTo(this.camera.x + this.w, y); ctx.stroke();
      }
      ctx.restore();
    }

    drawParticles(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.particles) {
        const a = U.clamp(p.life * 2, 0, 1);
        ctx.globalAlpha = a;
        const s = p.size * (0.8 + (1 - a) * 0.4);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
        if (p.glow) {
          ctx.shadowBlur = 22;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.restore();
    }

    drawPickups(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.pickups) {
        const pulse = 1 + Math.sin(p.pulse) * 0.08;
        const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 24 * pulse);
        g.addColorStop(0, 'rgba(109,255,158,0.95)');
        g.addColorStop(0.5, 'rgba(124,246,255,0.35)');
        g.addColorStop(1, 'rgba(109,255,158,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 24 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawBullets(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const b of this.playerBullets) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = `hsla(${b.hue}, 100%, 70%, 0.9)`;
        ctx.fillStyle = `hsla(${b.hue}, 100%, 72%, 0.95)`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        this.drawProjectileTail(ctx, b.x, b.y, b.vx, b.vy, `hsla(${b.hue}, 100%, 70%, 0.2)`);
      }
      for (const b of this.enemyBullets) {
        ctx.shadowBlur = 16;
        ctx.shadowColor = 'rgba(255,95,126,0.9)';
        ctx.fillStyle = 'rgba(255,95,126,0.95)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        this.drawProjectileTail(ctx, b.x, b.y, b.vx, b.vy, 'rgba(255,95,126,0.2)');
      }
      ctx.restore();
    }

    drawProjectileTail(ctx, x, y, vx, vy, color) {
      const l = Math.hypot(vx, vy) || 1;
      const tx = x - vx / l * 14;
      const ty = y - vy / l * 14;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    drawEnemies(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const e of this.enemies) {
        const proto = ENEMY_TYPES[e.type];
        const r = e.radius;
        const glow = ctx.createRadialGradient(e.x, e.y, r * 0.2, e.x, e.y, r * 2.7);
        glow.addColorStop(0, `hsla(${e.hue}, 100%, 70%, 0.28)`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(e.x, e.y, r * 2.7, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2);
        const pulse = 1 + Math.sin(this.time * 5 + e.seed) * 0.05;
        ctx.scale(pulse, pulse);
        ctx.strokeStyle = e.flash > 0 ? '#ffffff' : `hsl(${e.hue}, 100%, 65%)`;
        ctx.fillStyle = e.flash > 0 ? 'rgba(255,255,255,0.9)' : `hsla(${e.hue}, 100%, 64%, 0.85)`;
        ctx.lineWidth = 2;
        if (e.type === 'seeker') this.drawSeeker(ctx, r);
        else if (e.type === 'lancer') this.drawLancer(ctx, r, e);
        else if (e.type === 'mine') this.drawMine(ctx, r, e);
        else this.drawSniper(ctx, r, e);
        ctx.restore();
        if (e.arm > 0) {
          ctx.strokeStyle = 'rgba(255,95,126,0.6)';
          ctx.beginPath(); ctx.arc(e.x, e.y, r + 8, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawSeeker(ctx, r) {
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.2);
      ctx.lineTo(r * 0.92, r * 1.02);
      ctx.lineTo(0, r * 0.48);
      ctx.lineTo(-r * 0.92, r * 1.02);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    drawLancer(ctx, r, e) {
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.3);
      ctx.lineTo(r * 1.2, -r * 0.15);
      ctx.lineTo(r * 0.42, r * 1.1);
      ctx.lineTo(-r * 0.42, r * 1.1);
      ctx.lineTo(-r * 1.2, -r * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(0, r * 1.06); ctx.stroke();
    }

    drawMine(ctx, r, e) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + this.time * 0.4;
        const rr = i % 2 ? r * 0.75 : r * 1.15;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
    }

    drawSniper(ctx, r, e) {
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.25);
      ctx.lineTo(r * 0.7, -r * 0.2);
      ctx.lineTo(r * 0.48, r * 1.15);
      ctx.lineTo(-r * 0.48, r * 1.15);
      ctx.lineTo(-r * 0.7, -r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2); ctx.stroke();
    }

    drawBoss(ctx) {
      if (!this.boss) return;
      const b = this.boss;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(b.x, b.y, b.radius * 0.2, b.x, b.y, b.radius * 3.2);
      g.addColorStop(0, 'rgba(255,95,126,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(this.time * 0.6);
      ctx.strokeStyle = 'rgba(255,95,126,0.82)';
      ctx.fillStyle = b.flash > 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,95,126,0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.rotate(Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.moveTo(0, -b.radius * 1.4);
        ctx.lineTo(b.radius * 1.05, b.radius * 0.76);
        ctx.lineTo(-b.radius * 1.05, b.radius * 0.76);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.52, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
      ctx.restore();
      const hp = b.hp / b.maxHp;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(b.x - 60, b.y - 78, 120, 8);
      ctx.fillStyle = '#ff5f7e';
      ctx.fillRect(b.x - 60, b.y - 78, 120 * U.clamp(hp, 0, 1), 8);
      ctx.restore();
    }

    drawPlayer(ctx) {
      const p = this.player;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 80);
      gl.addColorStop(0, 'rgba(124,246,255,0.34)');
      gl.addColorStop(0.45, 'rgba(180,107,255,0.16)');
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(p.x, p.y, 80, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(p.x, p.y);
      const ang = Math.atan2(p.vy, p.vx) || -Math.PI / 2;
      ctx.rotate(ang + Math.PI / 2);
      const thrust = Math.min(1, Math.hypot(p.vx, p.vy) / 480);
      const blink = 0.9 + Math.sin(this.time * 12) * 0.06;
      const dashScale = p.dashTime > 0 ? 1.1 : 1;
      ctx.scale(dashScale, dashScale);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.fillStyle = p.hurtFlash > 0 ? 'rgba(255,95,126,0.9)' : 'rgba(124,246,255,0.92)';
      ctx.beginPath();
      ctx.moveTo(0, -p.radius * 1.6);
      ctx.lineTo(p.radius * 1.1, p.radius * 0.9);
      ctx.lineTo(0, p.radius * 0.45);
      ctx.lineTo(-p.radius * 1.1, p.radius * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.26)';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(-p.radius * 0.7, p.radius * 0.32);
      ctx.lineTo(0, -p.radius * 1.1 * blink);
      ctx.lineTo(p.radius * 0.7, p.radius * 0.32);
      ctx.stroke();
      if (p.dashTime > 0) {
        ctx.strokeStyle = 'rgba(124,246,255,0.32)';
        ctx.beginPath(); ctx.arc(0, 0, p.radius * 1.5 + thrust * 8, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }

    drawHudExtras(ctx) {
      const p = this.player;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (p.shield > 0) {
        ctx.strokeStyle = 'rgba(124,246,255,0.32)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 14 + p.shield * 0.12, 0, Math.PI * 2); ctx.stroke();
      }
      if (this.touchDashFlash > 0) {
        ctx.strokeStyle = `rgba(255,95,126,${this.touchDashFlash / 0.16})`;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 22, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    drawOverlayFX() {
      const ctx = this.ctx;
      const w = this.w, h = this.h;
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  window.NRC_PERM_UPGRADES = PERM_UPGRADES;
  window.NRC_RUN_UPGRADES = RUN_UPGRADES;
  window.NRC_Game = Game;
})();
