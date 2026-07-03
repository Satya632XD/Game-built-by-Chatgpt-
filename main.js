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

  const save = window.NRC_SAVE.load();
  const audio = new window.NRC_AudioEngine();
  audio.setEnabled(save.audioEnabled);
  const input = new window.NRC_InputManager(canvas);
  const game = new window.NRC_Game(canvas, ui, audio, window.NRC_SAVE, input);

  game.perm = save;
  game.renderPermMenu();
  game.updateMenuStats();
  if (!save.audioEnabled) audio.setEnabled(false);
  game.goMenu();

  const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  ui.touchControls.classList.toggle('hidden', !isTouch);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (input.wantsPause()) game.togglePause();
    game.update(dt);
    input.tick();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Touch joystick visuals
  const updateStickVisual = () => {
    if (!input.touchMove.active) {
      ui.stickKnob.style.transform = 'translate(0px, 0px)';
      return;
    }
    const dx = input.touchMove.dx;
    const dy = input.touchMove.dy;
    const max = 42;
    const l = Math.hypot(dx, dy) || 1;
    const x = Math.max(-max, Math.min(max, dx / l * Math.min(max, l)));
    const y = Math.max(-max, Math.min(max, dy / l * Math.min(max, l)));
    ui.stickKnob.style.transform = `translate(${x}px, ${y}px)`;
  };
  setInterval(updateStickVisual, 16);

  // Build menu cards now that save is loaded
  game.renderPermMenu();
  game.updateMenuStats();
})();
