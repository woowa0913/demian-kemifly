import { MEDIA_PATHS } from "./config.js";

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  const music = new Audio(MEDIA_PATHS.bgm);
  music.loop = true;
  music.preload = "auto";
  music.volume = 0.36;

  function unlock() {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.34;
      master.connect(context.destination);
    }
    if (context.state === "suspended") context.resume().catch(() => {});
    if (!muted) startMusic();
  }

  function toggleMute() {
    muted = !muted;
    music.muted = muted;
    if (!context) return muted;
    master.gain.setTargetAtTime(muted ? 0 : 0.34, context.currentTime, 0.04);
    if (muted) music.pause();
    else startMusic();
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function startMusic() {
    if (muted) return;
    music.play().catch(() => {});
  }

  function play(event) {
    if (muted) return;
    unlock();
    if (!context) return;
    const type = typeof event === "string" ? event : event.type;
    const now = context.currentTime;
    if (type === "flap") tone(520, now, 0.08, "sine", 0.09, 820);
    else if (type === "collect") sparkle(now, 740, 1040);
    else if (type === "heal") sparkle(now, 520, 760);
    else if (type === "shield") sparkle(now, 420, 920);
    else if (type === "damage") noise(now, 0.12, 0.13);
    else if (type === "near") tone(980, now, 0.07, "triangle", 0.055, 1260);
    else if (type === "fever") sparkle(now, 880, 1320);
    else if (type === "levelup") levelUp(now);
    else if (type === "gameover") gameOver(now);
    else if (type === "start" || type === "button") tone(440, now, 0.08, "triangle", 0.055, 660);
  }

  function sparkle(now, a, b) {
    tone(a, now, 0.07, "triangle", 0.06);
    tone(b, now + 0.055, 0.1, "sine", 0.045);
  }

  function gameOver(now) {
    tone(330, now, 0.16, "sawtooth", 0.05, 220);
    tone(196, now + 0.14, 0.28, "triangle", 0.055, 130);
  }

  function levelUp(now) {
    sparkle(now, 760, 1180);
    tone(1480, now + 0.12, 0.18, "triangle", 0.055);
  }

  function tone(freq, start, duration, type, gainValue, endFreq = null) {
    if (!context || !master) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function noise(start, duration, gainValue) {
    if (!context || !master) return;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.sin(i * 87.13) * Math.exp(-i / data.length);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = 620;
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return { unlock, play, toggleMute, isMuted };
}
