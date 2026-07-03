(function () {
  const { storageKey, audioKey } = window.NRC_CONFIG;
  const defaults = {
    bestScore: 0,
    bestWave: 0,
    bossClears: 0,
    runs: 0,
    kills: 0,
    sparks: 0,
    audioEnabled: true,
    unlocked: {
      starterShield: false,
      magneticTrail: false,
      doubleDash: false,
      overclock: false,
      salvageLuck: false,
      prismShot: false,
    },
    equipped: 'starterShield',
  };

  function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage can be unavailable */ }
  }

  function removeStorage(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }

  function load() {
    try {
      const data = JSON.parse(read(storageKey) || '{}');
      const save = structuredClone(defaults);
      Object.assign(save, data);
      save.unlocked = Object.assign(structuredClone(defaults.unlocked), data.unlocked || {});
      const audio = read(audioKey);
      save.audioEnabled = audio == null ? defaults.audioEnabled : audio === 'true';
      if (!save.unlocked[save.equipped]) save.equipped = 'starterShield';
      return save;
    } catch {
      return structuredClone(defaults);
    }
  }

  function write(save) {
    writeStorage(storageKey, JSON.stringify({
      bestScore: save.bestScore,
      bestWave: save.bestWave,
      bossClears: save.bossClears,
      runs: save.runs,
      kills: save.kills,
      sparks: save.sparks,
      unlocked: save.unlocked,
      equipped: save.equipped,
    }));
    writeStorage(audioKey, String(save.audioEnabled));
  }

  function reset() {
    removeStorage(storageKey);
    removeStorage(audioKey);
  }

  window.NRC_SAVE = { load, write, reset, defaults };
})();
