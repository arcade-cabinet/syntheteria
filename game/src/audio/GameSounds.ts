/**
 * Synthesized game sound effects for Syntheteria.
 *
 * All sounds are generated with Tone.js oscillators, noise, and filters —
 * no audio files needed. Each function is a fire-and-forget one-shot that
 * auto-cleans up after playback.
 *
 * Sound palette:
 *   grinding     — harsh filtered noise (ore harvesting / scavenging)
 *   compression  — rising pitch tone with low thump (cube creation)
 *   cubePlace    — solid thunk with reverb (placing a building on the grid)
 *   cubeGrab     — metallic scrape (picking up / selecting a unit)
 *   machineHum   — continuous low drone for active machines (returns stop fn)
 *   alert        — two-tone ascending beep (enemy detection)
 *   damage       — distorted impact (component damage)
 *   metalImpact  — brief metallic hit (combat)
 *   uiBeep       — short square-wave click (UI feedback)
 *   lightningStrike — white noise burst for lightning events
 */

import * as Tone from "tone";
import audioConfig from "../../../config/audio.json";
import { getCategoryBus, isAudioInitialized } from "./SoundEngine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sfxBus(): Tone.Volume | null {
	return getCategoryBus("sfx");
}

function combatVolDb(): number {
	return 20 * Math.log10(Math.max(0.001, audioConfig.combatSfxVolume ?? 0.8));
}

function uiVolDb(): number {
	return 20 * Math.log10(Math.max(0.001, audioConfig.uiFeedbackVolume ?? 0.6));
}

// ---------------------------------------------------------------------------
// Grinding — ore harvesting / scavenging
// ---------------------------------------------------------------------------

/**
 * Harsh bandpass-filtered noise with slow amplitude modulation.
 * Sounds like metal scraping against rock.
 */
export function playGrinding(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const noise = new Tone.Noise("white");
	const bp = new Tone.Filter({
		frequency: 1200,
		type: "bandpass",
		Q: 6,
	});
	const lfo = new Tone.LFO({ frequency: 14, min: 800, max: 1600 });
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.02,
		decay: 0.15,
		sustain: 0.4,
		release: 0.2,
	});
	const vol = new Tone.Volume(-8);
	vol.connect(bus);

	lfo.connect(bp.frequency);
	noise.connect(bp);
	bp.connect(env);
	env.connect(vol);

	lfo.start();
	noise.start();
	env.triggerAttackRelease(0.35);

	setTimeout(() => {
		noise.stop();
		lfo.stop();
		noise.dispose();
		bp.dispose();
		lfo.dispose();
		env.dispose();
		vol.dispose();
	}, 1000);
}

// ---------------------------------------------------------------------------
// Compression — cube creation
// ---------------------------------------------------------------------------

/**
 * Rising pitch sine tone followed by a low thump.
 * Evokes material being compressed into a dense block.
 */
export function playCompression(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	// Rising tone
	const osc = new Tone.Oscillator({ frequency: 200, type: "sine" });
	const oscEnv = new Tone.AmplitudeEnvelope({
		attack: 0.01,
		decay: 0.3,
		sustain: 0,
		release: 0.1,
	});

	// Low thump
	const thump = new Tone.Oscillator({ frequency: 60, type: "sine" });
	const thumpEnv = new Tone.AmplitudeEnvelope({
		attack: 0.005,
		decay: 0.12,
		sustain: 0,
		release: 0.08,
	});

	const vol = new Tone.Volume(-6);
	vol.connect(bus);

	osc.connect(oscEnv);
	oscEnv.connect(vol);
	thump.connect(thumpEnv);
	thumpEnv.connect(vol);

	osc.start();
	thump.start();

	// Rising pitch sweep over 300ms
	osc.frequency.linearRampTo(800, 0.3);
	oscEnv.triggerAttackRelease(0.3);

	// Thump hits at the end of the rise
	setTimeout(() => {
		thumpEnv.triggerAttackRelease(0.1);
	}, 280);

	setTimeout(() => {
		osc.stop();
		thump.stop();
		osc.dispose();
		oscEnv.dispose();
		thump.dispose();
		thumpEnv.dispose();
		vol.dispose();
	}, 1000);
}

// ---------------------------------------------------------------------------
// Cube place — solid thunk with reverb
// ---------------------------------------------------------------------------

/**
 * Short low-frequency hit with reverb tail. Sounds like a heavy object
 * settling onto a surface.
 */
export function playCubePlace(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const osc = new Tone.Oscillator({ frequency: 80, type: "triangle" });
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.003,
		decay: 0.08,
		sustain: 0,
		release: 0.15,
	});
	const noise = new Tone.Noise("brown");
	const noiseEnv = new Tone.AmplitudeEnvelope({
		attack: 0.002,
		decay: 0.04,
		sustain: 0,
		release: 0.06,
	});
	const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.5 });
	const vol = new Tone.Volume(-6);

	reverb.connect(vol);
	vol.connect(bus);

	osc.connect(env);
	env.connect(reverb);
	noise.connect(noiseEnv);
	noiseEnv.connect(reverb);

	osc.start();
	noise.start();
	env.triggerAttackRelease(0.06);
	noiseEnv.triggerAttackRelease(0.03);

	setTimeout(() => {
		osc.stop();
		noise.stop();
		osc.dispose();
		env.dispose();
		noise.dispose();
		noiseEnv.dispose();
		reverb.dispose();
		vol.dispose();
	}, 2500);
}

// ---------------------------------------------------------------------------
// Cube grab — metallic scrape
// ---------------------------------------------------------------------------

/**
 * Short noise burst through a resonant bandpass filter, simulating
 * metal sliding against metal.
 */
export function playCubeGrab(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const noise = new Tone.Noise("white");
	const bp = new Tone.Filter({
		frequency: 2200,
		type: "bandpass",
		Q: 8,
	});
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.005,
		decay: 0.06,
		sustain: 0.15,
		release: 0.1,
	});
	const vol = new Tone.Volume(-10);
	vol.connect(bus);

	noise.connect(bp);
	bp.connect(env);
	env.connect(vol);

	noise.start();
	// Sweep the filter down for a scraping feel
	bp.frequency.linearRampTo(800, 0.12);
	env.triggerAttackRelease(0.12);

	setTimeout(() => {
		noise.stop();
		noise.dispose();
		bp.dispose();
		env.dispose();
		vol.dispose();
	}, 500);
}

// ---------------------------------------------------------------------------
// Machine hum — continuous low drone (looping, returns stop fn)
// ---------------------------------------------------------------------------

/**
 * Low sawtooth oscillator (60 Hz) through a tight low-pass filter.
 * Returns a cleanup function to stop the hum.
 */
export function playMachineHum(): (() => void) | null {
	if (!isAudioInitialized()) return null;
	const bus = sfxBus();
	if (!bus) return null;

	const osc = new Tone.Oscillator({ frequency: 60, type: "sawtooth" });
	const filter = new Tone.Filter(200, "lowpass");
	const vol = new Tone.Volume(-24);
	vol.connect(bus);

	osc.connect(filter);
	filter.connect(vol);
	osc.start();

	return () => {
		osc.stop();
		osc.dispose();
		filter.dispose();
		vol.dispose();
	};
}

// ---------------------------------------------------------------------------
// Alert — two-tone ascending beep (enemy detection)
// ---------------------------------------------------------------------------

/**
 * Two quick ascending square-wave tones. Urgent but not jarring.
 */
export function playAlert(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const synth = new Tone.Synth({
		oscillator: { type: "square" },
		envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.06 },
	});
	const vol = new Tone.Volume(uiVolDb() - 6);
	vol.connect(bus);
	synth.connect(vol);

	// First tone
	synth.triggerAttackRelease("E5", 0.06);

	// Second tone (higher) after short gap
	setTimeout(() => {
		synth.triggerAttackRelease("A5", 0.06);
	}, 100);

	setTimeout(() => {
		synth.dispose();
		vol.dispose();
	}, 500);
}

// ---------------------------------------------------------------------------
// Damage — distorted impact (component damage)
// ---------------------------------------------------------------------------

/**
 * Noise burst through distortion and low-pass filter. Conveys violence
 * and mechanical breakage.
 */
export function playDamage(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const noise = new Tone.Noise("white");
	const dist = new Tone.Distortion(0.8);
	const filter = new Tone.Filter(1000, "lowpass");
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.003,
		decay: 0.1,
		sustain: 0.05,
		release: 0.15,
	});
	const vol = new Tone.Volume(combatVolDb() - 4);
	vol.connect(bus);

	noise.connect(dist);
	dist.connect(filter);
	filter.connect(env);
	env.connect(vol);

	noise.start();
	env.triggerAttackRelease(0.12);

	setTimeout(() => {
		noise.stop();
		noise.dispose();
		dist.dispose();
		filter.dispose();
		env.dispose();
		vol.dispose();
	}, 600);
}

// ---------------------------------------------------------------------------
// Metal impact — brief metallic hit (combat)
// ---------------------------------------------------------------------------

/**
 * MetalSynth one-shot with short decay. Direct port of the old SpatialAudio
 * playMetalImpact, now routed through the SoundEngine bus.
 */
export function playMetalImpact(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const synth = new Tone.MetalSynth({
		envelope: { attack: 0.001, decay: 0.2, release: 0.3 },
		harmonicity: 3.1,
		modulationIndex: 16,
		resonance: 2000,
		octaves: 1.5,
	});
	const vol = new Tone.Volume(combatVolDb() - 8);
	vol.connect(bus);
	synth.connect(vol);

	synth.triggerAttackRelease("C2", 0.15);

	setTimeout(() => {
		synth.dispose();
		vol.dispose();
	}, 1000);
}

// ---------------------------------------------------------------------------
// UI beep — short click
// ---------------------------------------------------------------------------

/**
 * Tiny square-wave blip for menu interactions and confirmations.
 */
export function playUIBeep(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const synth = new Tone.Synth({
		oscillator: { type: "square" },
		envelope: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.05 },
	});
	const vol = new Tone.Volume(uiVolDb() - 10);
	vol.connect(bus);
	synth.connect(vol);

	synth.triggerAttackRelease("C5", 0.03);

	setTimeout(() => {
		synth.dispose();
		vol.dispose();
	}, 200);
}

// ---------------------------------------------------------------------------
// Lightning strike — dramatic discharge (forwarded from old SpatialAudio)
// ---------------------------------------------------------------------------

/**
 * Synthetic thunder crack: white noise burst with a low-pass filter sweep.
 */
export function playLightningStrike(): void {
	if (!isAudioInitialized()) return;
	const bus = getCategoryBus("ambience");
	if (!bus) return;

	const noise = new Tone.Noise("white");
	const filter = new Tone.Filter(800, "lowpass");
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.01,
		decay: 0.3,
		sustain: 0.1,
		release: 1.5,
	});
	const vol = new Tone.Volume(-3);
	vol.connect(bus);

	noise.connect(filter);
	filter.connect(env);
	env.connect(vol);

	noise.start();
	env.triggerAttackRelease(0.8);

	setTimeout(() => {
		noise.stop();
		noise.dispose();
		filter.dispose();
		env.dispose();
		vol.dispose();
	}, 3000);
}
