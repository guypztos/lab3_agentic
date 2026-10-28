// Persistence (high score table). Owned by the "polish" side.
// localStorage can be missing or blocked (private windows, cleared site data), so every
// access is guarded and the game simply runs with an empty table.
window.CoinDashStorage = (() => {
  const KEY = 'coinDash.highScores';
  const MAX_ENTRIES = 10;

  function load() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY));
      if (!Array.isArray(list)) return [];
      return list.filter(e => e && typeof e.name === 'string' && Number.isFinite(e.score));
    } catch {
      return [];
    }
  }

  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* not persisted */ }
  }

  return {
    // Highest first, at most MAX_ENTRIES of { name, score, date }.
    getScores() { return load(); },

    getBest() {
      const list = load();
      return list.length ? list[0].score : 0;
    },

    // True when this score would earn a place in the table.
    qualifies(score) {
      const list = load();
      return score > 0 && (list.length < MAX_ENTRIES || score > list[list.length - 1].score);
    },

    // Inserts the entry and returns its 0-based rank, or -1 if it did not make the table.
    addScore(name, score) {
      const entry = { name, score, date: new Date().toISOString().slice(0, 10) };
      // Ties go below existing entries: the earlier score keeps its place.
      const list = load().concat(entry).sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
      save(list);
      return list.indexOf(entry);
    }
  };
})();
