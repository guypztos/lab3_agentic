/* global COIN_DASH */
// Sound effects and background music, synthesised with Web Audio so there are no audio files.
window.CoinDashAudio = (() => {
  let ctx = null;
  let music = null;
  // Am - F - C - G, one bar each: bass root (MIDI note) and the arpeggio's intervals above it.
  const CHORDS = [[45, [0, 3, 7, 12]], [41, [0, 4, 7, 12]], [48, [0, 4, 7, 12]], [43, [0, 4, 7, 12]]];
  const STEP_SECONDS = 60 / 120 / 2; // eighth notes at 120 BPM

  const midiToFreq = (note) => 440 * Math.pow(2, (note - 69) / 12);

  function output(volume) {
    const out = ctx.createGain();
    out.gain.value = volume;
    out.connect(ctx.destination);
    return out;
  }

  function tone(dest, freq, type, t, duration, peak) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.01);
    return osc;
  }

  function playStep(step, t) {
    const [root, intervals] = CHORDS[Math.floor(step / 8) % CHORDS.length];
    const pos = step % 8;
    if (pos % 2 === 0) tone(music.out, midiToFreq(root), 'triangle', t, 0.22, 0.6);
    tone(music.out, midiToFreq(root + 24 + intervals[pos % 4]), 'square', t, 0.12, 0.12);
  }

  return {
    init(context) { ctx = context || null; },

    // Rising two-note chime; each coin this round lifts the pitch a semitone, up to an octave.
    coin(score) {
      if (!ctx || COIN_DASH.soundVolume <= 0) return;
      const out = output(COIN_DASH.soundVolume);
      const base = 880 * Math.pow(2, Math.min(score - 1, 12) / 12);
      const t = ctx.currentTime;
      tone(out, base, 'square', t, 0.25, 0.5);
      tone(out, base * 1.5, 'square', t + 0.07, 0.25, 0.5);
    },

    // A noisy impact followed by a falling "wah-wah-wah-waaah".
    crash() {
      if (!ctx || COIN_DASH.soundVolume <= 0) return;
      const out = output(COIN_DASH.soundVolume);
      const t = ctx.currentTime;
      const noise = ctx.createBufferSource();
      noise.buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
      const data = noise.buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, t);
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.3);
      noise.connect(filter).connect(out);
      noise.start(t);
      [392, 370, 349].forEach((freq, i) => tone(out, freq, 'sawtooth', t + 0.3 + i * 0.25, 0.22, 0.3));
      tone(out, 330, 'sawtooth', t + 1.05, 0.8, 0.3).frequency.exponentialRampToValueAtTime(220, t + 1.85);
    },

    // Loops for the life of the page, so restarting a round does not start a second copy.
    startMusic() {
      if (!ctx || music || COIN_DASH.musicVolume <= 0) return;
      music = { out: output(COIN_DASH.musicVolume), step: 0, next: ctx.currentTime + 0.1 };
      setInterval(() => {
        // After the tab was hidden, skip ahead rather than playing every missed note at once.
        if (music.next < ctx.currentTime) music.next = ctx.currentTime + 0.05;
        // Schedule slightly ahead so notes stay on the beat even when the timer fires late.
        while (music.next < ctx.currentTime + 0.2) {
          playStep(music.step++, music.next);
          music.next += STEP_SECONDS;
        }
      }, 50);
    }
  };
})();
