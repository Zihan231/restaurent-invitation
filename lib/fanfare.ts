// Grand-opening sound effect, synthesized with the Web Audio API (no audio files to download).
// Timeline (seconds after the tap), lined up with the curtain and confetti:
//   0.00 – 1.10  timpani roll building up, fabric whoosh as the curtain starts to part
//   0.74 – 0.98  brass pickup "da-da-da"
//   1.10         cymbal crash + boom + full brass fanfare chord (confetti fires here)
//   1.55         rising flourish, sparkling chimes over the confetti
// Audio runs on the browser's audio thread, so it does not compete with the animation.

const HIT = 1.1; // must match the confetti delay in Invitation.tsx

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function noiseBuffer(ac: AudioContext) {
  if (noise) return noise;
  noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

// Synthetic concert-hall reverb: decaying stereo noise.
function hallImpulse(ac: AudioContext, seconds: number) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

export function playFanfare() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    // Must be created/resumed inside the tap handler for mobile autoplay rules.
    ctx = ctx ?? new AC();
    void ctx.resume();
    const ac = ctx;
    const t0 = ac.currentTime + 0.03;
    const T = t0 + HIT;

    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    const master = ac.createGain();
    master.gain.value = 0.6; // keeps the peak of the big hit below clipping on phone speakers
    master.connect(comp).connect(ac.destination);

    const reverb = ac.createConvolver();
    reverb.buffer = hallImpulse(ac, 2.4);
    const wet = ac.createGain();
    wet.gain.value = 0.32;
    reverb.connect(wet).connect(master);

    // everything goes dry to the master and also into the hall
    const out = ac.createGain();
    out.connect(master);
    out.connect(reverb);

    const env = (g: GainNode, at: number, peak: number, decay: number) => {
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    };
    const noiseSrc = (at: number, dur: number) => {
      const s = ac.createBufferSource();
      s.buffer = noiseBuffer(ac);
      s.loop = true;
      s.start(at, Math.random());
      s.stop(at + dur);
      return s;
    };

    // --- timpani roll, crescendo into the hit ---
    for (let t = 0; t < HIT - 0.04; t += 0.048) {
      const at = t0 + t + Math.random() * 0.008;
      const vel = 0.06 + 0.42 * Math.pow(t / HIT, 2);
      const n = noiseSrc(at, 0.14);
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 160;
      bp.Q.value = 0.9;
      const g = ac.createGain();
      env(g, at, vel, 0.13);
      n.connect(bp).connect(g).connect(out);
      const o = ac.createOscillator();
      o.frequency.value = 82;
      const og = ac.createGain();
      env(og, at, vel * 0.5, 0.18);
      o.connect(og).connect(out);
      o.start(at);
      o.stop(at + 0.2);
    }

    // --- curtain whoosh (filtered noise sweep) ---
    {
      const n = noiseSrc(t0 + 0.3, 3.0);
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 0.7;
      lp.frequency.setValueAtTime(250, t0 + 0.3);
      lp.frequency.exponentialRampToValueAtTime(1600, t0 + 1.5);
      lp.frequency.exponentialRampToValueAtTime(350, t0 + 3.3);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0 + 0.3);
      g.gain.exponentialRampToValueAtTime(0.07, t0 + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.3);
      n.connect(lp).connect(g).connect(out);
    }

    // --- brass voice: detuned saws through a swelling low-pass ---
    const brass = (freq: number, at: number, dur: number, vel: number) => {
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 1.2;
      lp.frequency.setValueAtTime(freq * 1.5, at);
      lp.frequency.exponentialRampToValueAtTime(Math.min(freq * 7, 9000), at + 0.07);
      lp.frequency.exponentialRampToValueAtTime(Math.min(freq * 3.5, 6000), at + 0.45);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vel, at + 0.05);
      g.gain.exponentialRampToValueAtTime(vel * 0.7, at + 0.35);
      g.gain.setValueAtTime(vel * 0.7, at + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.9);
      lp.connect(g).connect(out);
      const vib = ac.createOscillator();
      vib.frequency.value = 5.5;
      const vibAmt = ac.createGain();
      vibAmt.gain.setValueAtTime(0, at);
      vibAmt.gain.linearRampToValueAtTime(7, at + 0.5);
      vib.connect(vibAmt);
      vib.start(at);
      vib.stop(at + dur + 1);
      for (const det of [-9, 0, 9]) {
        const o = ac.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = freq;
        o.detune.value = det;
        vibAmt.connect(o.detune);
        o.connect(lp);
        o.start(at);
        o.stop(at + dur + 1);
      }
    };

    // pickup: da-da-da
    for (const [i, off] of [0.36, 0.24, 0.12].entries()) {
      brass(392, T - off, 0.08, 0.16);
      brass(196, T - off, 0.08, 0.08 + i * 0.01);
    }
    // the big chord (C major, wide voicing)
    for (const f of [65.41, 130.81, 196, 261.63, 329.63, 392, 523.25]) brass(f, T, 1.9, f < 100 ? 0.12 : 0.085);
    // rising flourish
    [659.25, 783.99, 1046.5].forEach((f, i) => brass(f, T + 0.45 + i * 0.11, 1.2 - i * 0.15, 0.06));

    // --- boom ---
    {
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(120, T);
      o.frequency.exponentialRampToValueAtTime(38, T + 0.6);
      const g = ac.createGain();
      env(g, T, 0.9, 1.5);
      o.connect(g).connect(out);
      o.start(T);
      o.stop(T + 1.6);
    }

    // --- cymbal crash ---
    {
      const n = noiseSrc(T, 3.2);
      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 4200;
      const g = ac.createGain();
      env(g, T, 0.42, 3.0);
      n.connect(hp).connect(g).connect(out);
      const n2 = noiseSrc(T, 1.8);
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 9000;
      bp.Q.value = 1.5;
      const g2 = ac.createGain();
      env(g2, T, 0.25, 1.6);
      n2.connect(bp).connect(g2).connect(out);
    }

    // --- sparkling chimes over the confetti ---
    const bells = [1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2637.02];
    for (let i = 0; i < 14; i++) {
      const at = T + 0.08 + i * 0.1 + Math.random() * 0.05;
      const f = bells[Math.floor(Math.random() * bells.length)];
      for (const [mult, amp] of [[1, 0.05], [2.76, 0.018]] as const) {
        const o = ac.createOscillator();
        o.frequency.value = f * mult;
        const g = ac.createGain();
        env(g, at, amp, 0.9);
        o.connect(g).connect(out);
        o.start(at);
        o.stop(at + 1);
      }
    }
  } catch {
    /* sound is a nice-to-have; never block the invitation */
  }
}
