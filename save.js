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

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const save = structuredClone(defaults);
      Object.assign(save, data);
      save.unlocked = Object.assign(structuredClone(defaults.unlocked), data.unlocked || {});
      save.audioEnabled = localStorage.getItem(audioKey);
      save.audioEnabled = save.audioEnabled == null ? defaults.audioEnabled : save.audioEnabled === 'true';
      if (!save.unlocked[save.equipped]) save.equipped = 'starterShield';
      return save;
    } catch {
      return structuredClone(defaults);
    }
  }

  function write(save) {
    localStorage.setItem(storageKey, JSON.stringify({
      bestScore: save.bestScore,
      bestWave: save.bestWave,
      bossClears: save.bossClears,
      runs: save.runs,
      kills: save.kills,
      sparks: save.sparks,
      unlocked: save.unlocked,
      equipped: save.equipped,
    }));
    localStorage.setItem(audioKey, String(save.audioEnabled));
  }

  function reset() {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(audioKey);
  }

  window.NRC_SAVE = { load, write, reset, defaults };
})();
