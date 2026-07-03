(function () {
  const canvas = document.getElementById('game');
  const ui = {
    overlay: document.getElementById('overlay'),
    hud: document.getElementById('hud'),
    pauseScreen: document.getElementById('pauseScreen'),
    upgradeScreen: document.getElementById('upgradeScreen'),
    gameOverScreen: document.getElementById('gameOverScreen'),
    touchControls: document.getElementById('touchControls'),
    bestScore: document.getElementById('bestScore'),
    sparkCount: document.getElementById('sparkCount'),
    bestWave: document.getElementById('bestWave'),
    bossClears: document.getElementById('bossClears'),
    permUpgrades: document.getElementById('permUpgrades'),
    hudScore: document.getElementById('hudScore'),
    hudWave: document.getElementById('hudWave'),
    hudCharge: document.getElementById('hudCharge'),
    hudCombo: document.getElementById('hudCombo'),
    hudHp: document.getElementById('hudHp'),
    hpBar: document.getElementById('hpBar'),
    dashBar: document.getElementById('dashBar'),
    eventBanner: document.getElementById('eventBanner'),
    upgradeChoices: document.getElementById('upgradeChoices'),
    resultBadge: document.getElementById('resultBadge'),
    resultTitle: document.getElementById('resultTitle'),
    resultText: document.getElementById('resultText'),
    finalScore: document.getElementById('finalScore'),
    finalWave: document.getElementById('finalWave'),
    finalKills: document.getElementById('finalKills'),
    finalSparks: document.getElementById('finalSparks'),
    btnStart: document.getElementById('btnStart'),
    btnContinue: document.getElementById('btnContinue'),
    btnAudio: document.getElementById('btnAudio'),
    btnResetSave: document.getElementById('btnResetSave'),
    btnResume: document.getElementById('btnResume'),
    btnRestartPause: document.getElementById('btnRestartPause'),
    btnRestart: document.getElementById('btnRestart'),
    btnMenu: document.getElementById('btnMenu'),
    stickBase: document.getElementById('stickBase'),
    stickKnob: document.getElementById('stickKnob'),
    dashButton: document.getElementById('dashButton'),
  };

  const safe = (fn) => {
    try {
      return fn();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  let game = null;
  let input = null;

  function bindLaunchButtons() {
    const launch = (continueLast = false) => {
      if (!game) return;
      void game.startRun(continueLast).catch(err => console.error(err));
    };

    ui.btnStart.addEventListener('click', () => launch(false));
    ui.btnContinue.addEventListener('click', () => launch(true));
    ui.btnRestart.addEventListener('click', () => launch(false));
    ui.btnRestartPause.addEventListener('click', () => launch(false));

    ui.btnStart.addEventListener('pointerdown', e => { e.preventDefault(); launch(false); }, { passive: false });
    ui.btnContinue.addEventListener('pointerdown', e => { e.preventDefault(); launch(true); }, { passive: false });
    ui.btnRestart.addEventListener('pointerdown', e => { e.preventDefault(); launch(false); }, { passive: false });
    ui.btnRestartPause.addEventListener('pointerdown', e => { e.preventDefault(); launch(false); }, { passive: false });
  }

  function startLoop() {
    let last = performance.now();

    function frame(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      if (game) {
        try {
          if (input && input.wantsPause()) game.togglePause();
          game.update(dt);
        } catch (err) {
          console.error('Game loop error:', err);
          try {
            game.goMenu();
          } catch {}
        }
      }

      if (input) input.tick();
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function init() {
    safe(() => {
      const save = window.NRC_SAVE.load();
      const audio = new window.NRC_AudioEngine();
      audio.setEnabled(save.audioEnabled);
      input = new window.NRC_InputManager(canvas);
      game = new window.NRC_Game(canvas, ui, audio, window.NRC_SAVE, input);

      game.perm = save;
      game.renderPermMenu();
      game.updateMenuStats();
      game.goMenu();

      bindLaunchButtons();

      const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
      ui.touchControls.classList.toggle('hidden', !isTouch);
    });

    startLoop();
  }

  // Wait one animation frame so layout is settled before measuring the canvas.
  requestAnimationFrame(() => {
    requestAnimationFrame(init);
  });
})();
