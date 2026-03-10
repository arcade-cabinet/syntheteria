/**
 * Procedural sound effects for Syntheteria game events.
 *
 * All sounds are generated with Tone.js synthesizers — no audio files needed.
 * Each function is a fire-and-forget one-shot that auto-disposes after playback.
 *
 * These sounds are intended to be triggered via the event system (GameEventBus)
 * rather than called directly from game systems, to maintain audio/gameplay
 * decoupling.
 *
 * Sound palette:
 *   harvesting       — grinding noise (filtered noise oscillator)
 *   compression      — metallic thump (membrane synth with short decay)
 *   cubePickup       — short metallic click
 *   cubeDrop         — low thud
 *   beltHum          — quiet hum (looping, returns stop fn)
 *   powerUp          — ascending tone sweep
 *   damageTaken      — distorted buzz
 *   questComplete    — short ascending arpeggio
 */

import * as Tone from "tone";
import { getCategoryBus, isAudioInitialized } from "./SoundEngine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sfxBus(): Tone.Volume | null {
	return getCategoryBus("sfx");
}

// ---------------------------------------------------------------------------
// Harvesting — grinding noise (filtered noise oscillator)
// ---------------------------------------------------------------------------

/**
 * Harsh grinding noise simulating ore being ground into powder.
 * Uses bandpass-filtered white noise with LFO modulation for
 * a rough, mechanical texture.
 */
export function playHarvesting(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const noise = new Tone.Noise("white");
	const bp = new Tone.Filter({
		frequency: 1000,
		type: "bandpass",
		Q: 5,
	});
	const lfo = new Tone.LFO({ frequency: 18, min: 600, max: 1400 });
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.03,
		decay: 0.2,
		sustain: 0.3,
		release: 0.15,
	});
	const vol = new Tone.Volume(-10);
	vol.connect(bus);

	lfo.connect(bp.frequency);
	noise.connect(bp);
	bp.connect(env);
	env.connect(vol);

	lfo.start();
	noise.start();
	env.triggerAttackRelease(0.4);

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
// Compression — metallic thump (membrane synth with short decay)
// ---------------------------------------------------------------------------

/**
 * Heavy metallic thump with a short membrane-synth transient and
 * low rumble tail. Simulates material being compressed into a cube.
 */
export function playCompressionThump(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const membrane = new Tone.MembraneSynth({
		pitchDecay: 0.05,
		octaves: 4,
		envelope: {
			attack: 0.001,
			decay: 0.15,
			sustain: 0,
			release: 0.1,
		},
	});

	// Add a noise transient for metallic texture
	const noise = new Tone.Noise("white");
	const noiseFilter = new Tone.Filter(3000, "lowpass");
	const noiseEnv = new Tone.AmplitudeEnvelope({
		attack: 0.001,
		decay: 0.04,
		sustain: 0,
		release: 0.03,
	});

	const vol = new Tone.Volume(-6);
	vol.connect(bus);

	membrane.connect(vol);
	noise.connect(noiseFilter);
	noiseFilter.connect(noiseEnv);
	noiseEnv.connect(vol);

	membrane.triggerAttackRelease("C1", 0.1);
	noise.start();
	noiseEnv.triggerAttackRelease(0.03);

	setTimeout(() => {
		noise.stop();
		membrane.dispose();
		noise.dispose();
		noiseFilter.dispose();
		noiseEnv.dispose();
		vol.dispose();
	}, 800);
}

// ---------------------------------------------------------------------------
// Cube pickup — short metallic click
// ---------------------------------------------------------------------------

/**
 * Brief high-frequency click simulating a magnetic lock engaging.
 * Short MetalSynth burst with tight envelope.
 */
export function playCubePickup(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const synth = new Tone.MetalSynth({
		envelope: { attack: 0.001, decay: 0.04, release: 0.02 },
		harmonicity: 5.1,
		modulationIndex: 20,
		resonance: 4000,
		octaves: 1,
	});
	const vol = new Tone.Volume(-12);
	vol.connect(bus);
	synth.connect(vol);

	synth.triggerAttackRelease("C4", 0.02);

	setTimeout(() => {
		synth.dispose();
		vol.dispose();
	}, 300);
}

// ---------------------------------------------------------------------------
// Cube drop — low thud
// ---------------------------------------------------------------------------

/**
 * Low-frequency impact simulating a heavy cube hitting the ground.
 * Triangle wave oscillator with a quick pitch drop.
 */
export function playCubeDrop(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const osc = new Tone.Oscillator({ frequency: 120, type: "triangle" });
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.003,
		decay: 0.12,
		sustain: 0,
		release: 0.1,
	});
	// Brown noise for floor texture
	const noise = new Tone.Noise("brown");
	const noiseEnv = new Tone.AmplitudeEnvelope({
		attack: 0.002,
		decay: 0.06,
		sustain: 0,
		release: 0.04,
	});
	const vol = new Tone.Volume(-8);
	vol.connect(bus);

	osc.connect(env);
	env.connect(vol);
	noise.connect(noiseEnv);
	noiseEnv.connect(vol);

	osc.start();
	noise.start();

	// Quick pitch drop for impact feel
	osc.frequency.linearRampTo(40, 0.08);
	env.triggerAttackRelease(0.1);
	noiseEnv.triggerAttackRelease(0.04);

	setTimeout(() => {
		osc.stop();
		noise.stop();
		osc.dispose();
		env.dispose();
		noise.dispose();
		noiseEnv.dispose();
		vol.dispose();
	}, 500);
}

// ---------------------------------------------------------------------------
// Belt hum — quiet hum (looping, returns stop fn)
// ---------------------------------------------------------------------------

/**
 * Continuous low-frequency hum for nearby conveyor belts.
 * Sawtooth oscillator through a tight low-pass filter.
 * Returns a stop/dispose function; returns null if audio is not ready.
 */
export function playBeltHum(): (() => void) | null {
	if (!isAudioInitialized()) return null;
	const bus = getCategoryBus("ambience");
	if (!bus) return null;

	const osc = new Tone.Oscillator({ frequency: 50, type: "sawtooth" });
	const filter = new Tone.Filter(150, "lowpass");
	const lfo = new Tone.LFO({ frequency: 0.5, min: 45, max: 55 });
	const vol = new Tone.Volume(-26);

	lfo.connect(osc.frequency);
	osc.connect(filter);
	filter.connect(vol);
	vol.connect(bus);

	lfo.start();
	osc.start();

	return () => {
		osc.stop();
		lfo.stop();
		osc.dispose();
		filter.dispose();
		lfo.dispose();
		vol.dispose();
	};
}

// ---------------------------------------------------------------------------
// Power up — ascending tone sweep
// ---------------------------------------------------------------------------

/**
 * Ascending sine-wave sweep with harmonic overtones.
 * Plays when a machine comes online or power connects.
 */
export function playPowerUp(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const osc = new Tone.Oscillator({ frequency: 200, type: "sine" });
	const osc2 = new Tone.Oscillator({ frequency: 400, type: "sine" });
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.05,
		decay: 0.4,
		sustain: 0,
		release: 0.2,
	});
	const env2 = new Tone.AmplitudeEnvelope({
		attack: 0.1,
		decay: 0.3,
		sustain: 0,
		release: 0.15,
	});
	const vol = new Tone.Volume(-10);
	vol.connect(bus);

	osc.connect(env);
	env.connect(vol);
	osc2.connect(env2);
	env2.connect(vol);

	osc.start();
	osc2.start();

	// Ascending sweep
	osc.frequency.linearRampTo(600, 0.4);
	osc2.frequency.linearRampTo(1200, 0.35);

	env.triggerAttackRelease(0.4);
	env2.triggerAttackRelease(0.3);

	setTimeout(() => {
		osc.stop();
		osc2.stop();
		osc.dispose();
		osc2.dispose();
		env.dispose();
		env2.dispose();
		vol.dispose();
	}, 1200);
}

// ---------------------------------------------------------------------------
// Damage taken — distorted buzz
// ---------------------------------------------------------------------------

/**
 * Harsh distorted buzz with rapid frequency modulation.
 * Simulates electrical damage to bot systems.
 */
export function playDamageTaken(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const osc = new Tone.Oscillator({ frequency: 100, type: "sawtooth" });
	const lfo = new Tone.LFO({ frequency: 30, min: 60, max: 140 });
	const dist = new Tone.Distortion(0.9);
	const filter = new Tone.Filter(1500, "lowpass");
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.005,
		decay: 0.15,
		sustain: 0.08,
		release: 0.1,
	});
	const vol = new Tone.Volume(-6);
	vol.connect(bus);

	lfo.connect(osc.frequency);
	osc.connect(dist);
	dist.connect(filter);
	filter.connect(env);
	env.connect(vol);

	lfo.start();
	osc.start();
	env.triggerAttackRelease(0.2);

	setTimeout(() => {
		osc.stop();
		lfo.stop();
		osc.dispose();
		lfo.dispose();
		dist.dispose();
		filter.dispose();
		env.dispose();
		vol.dispose();
	}, 700);
}

// ---------------------------------------------------------------------------
// Quest complete — short ascending arpeggio
// ---------------------------------------------------------------------------

/**
 * Three-note ascending arpeggio with a bright, clean tone.
 * Signals achievement / quest milestone completion.
 */
export function playQuestComplete(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const synth = new Tone.Synth({
		oscillator: { type: "triangle" },
		envelope: {
			attack: 0.01,
			decay: 0.15,
			sustain: 0.1,
			release: 0.3,
		},
	});
	const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.4 });
	const vol = new Tone.Volume(-8);

	reverb.connect(vol);
	vol.connect(bus);
	synth.connect(reverb);

	// Three ascending notes: C5 -> E5 -> G5 (major arpeggio)
	const notes = ["C5", "E5", "G5"];
	const noteDelay = 120; // ms between notes

	for (let i = 0; i < notes.length; i++) {
		setTimeout(() => {
			synth.triggerAttackRelease(notes[i], 0.12);
		}, i * noteDelay);
	}

	setTimeout(() => {
		synth.dispose();
		reverb.dispose();
		vol.dispose();
	}, 2000);
}
