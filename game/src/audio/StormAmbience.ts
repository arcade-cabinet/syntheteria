/**
 * Synthesized storm ambience for Syntheteria.
 *
 * The world is powered by electrical storms. This module creates layered
 * audio that responds to the current storm intensity (0 – ~1.5):
 *
 *   Wind        — filtered brown noise; intensity modulates volume & filter sweep
 *   Thunder     — low-frequency rumble triggered on lightning strikes
 *   Elec crackle — high-frequency noise bursts near lightning rods
 *   Rain static — pink noise bed that fills out the low end
 *
 * All synthesis uses Tone.js — no audio files required.
 */

import * as Tone from "tone";
import audioConfig from "../../../config/audio.json";
import { getCategoryBus, isAudioInitialized } from "./SoundEngine";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let windNoise: Tone.Noise | null = null;
let windFilter: Tone.AutoFilter | null = null;
let windVolume: Tone.Volume | null = null;

let rainNoise: Tone.Noise | null = null;
let rainFilter: Tone.Filter | null = null;
let rainVolume: Tone.Volume | null = null;

let crackleNoise: Tone.Noise | null = null;
let crackleFilter: Tone.Filter | null = null;
let crackleVolume: Tone.Volume | null = null;
let crackleLfo: Tone.LFO | null = null;
let crackleGain: Tone.Gain | null = null;

let started = false;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Start all storm ambience layers. Call once after SoundEngine.initAudio().
 * Idempotent — calling again is a no-op.
 */
export function startStormAmbience(): void {
	if (started || !isAudioInitialized()) return;

	const bus = getCategoryBus("ambience");
	if (!bus) return;

	const baseVolDb =
		20 * Math.log10(Math.max(0.001, audioConfig.stormAmbienceVolume ?? 0.4));

	// --- Wind layer: brown noise through swept auto-filter ---
	windVolume = new Tone.Volume(baseVolDb - 6);
	windVolume.connect(bus);

	windFilter = new Tone.AutoFilter({
		frequency: 0.15,
		baseFrequency: 80,
		octaves: 3,
		depth: 0.8,
	});
	windFilter.connect(windVolume);
	windFilter.start();

	windNoise = new Tone.Noise("brown");
	windNoise.connect(windFilter);
	windNoise.start();

	// --- Rain static: pink noise through low-pass ---
	rainVolume = new Tone.Volume(baseVolDb - 14);
	rainVolume.connect(bus);

	rainFilter = new Tone.Filter(600, "lowpass");
	rainFilter.connect(rainVolume);

	rainNoise = new Tone.Noise("pink");
	rainNoise.connect(rainFilter);
	rainNoise.start();

	// --- Electrical crackle: white noise bursts gated by fast LFO ---
	crackleVolume = new Tone.Volume(baseVolDb - 18);
	crackleVolume.connect(bus);

	crackleFilter = new Tone.Filter({
		frequency: 4000,
		type: "highpass",
	});
	crackleFilter.connect(crackleVolume);

	crackleGain = new Tone.Gain(0);
	crackleGain.connect(crackleFilter);

	crackleLfo = new Tone.LFO({
		frequency: 6,
		min: 0,
		max: 1,
		type: "square",
	});
	crackleLfo.connect(crackleGain.gain);
	crackleLfo.start();

	crackleNoise = new Tone.Noise("white");
	crackleNoise.connect(crackleGain);
	crackleNoise.start();

	started = true;
}

/**
 * Stop and dispose all storm ambience layers.
 */
export function stopStormAmbience(): void {
	if (!started) return;

	windNoise?.stop();
	windNoise?.dispose();
	windFilter?.dispose();
	windVolume?.dispose();
	windNoise = null;
	windFilter = null;
	windVolume = null;

	rainNoise?.stop();
	rainNoise?.dispose();
	rainFilter?.dispose();
	rainVolume?.dispose();
	rainNoise = null;
	rainFilter = null;
	rainVolume = null;

	crackleNoise?.stop();
	crackleNoise?.dispose();
	crackleLfo?.stop();
	crackleLfo?.dispose();
	crackleGain?.dispose();
	crackleFilter?.dispose();
	crackleVolume?.dispose();
	crackleNoise = null;
	crackleLfo = null;
	crackleGain = null;
	crackleFilter = null;
	crackleVolume = null;

	started = false;
}

// ---------------------------------------------------------------------------
// Real-time modulation
// ---------------------------------------------------------------------------

/**
 * Update storm audio to match the current storm intensity.
 *
 * @param stormIntensity - Game power system intensity value (typically 0 – 1.5).
 *   0   = calm (quiet wind, no crackle)
 *   0.5 = moderate (audible wind and rain)
 *   1.0 = strong storm (loud wind, crackle active)
 *   1.5 = extreme (max volume, fast crackle bursts)
 */
export function updateStormAudio(stormIntensity: number): void {
	if (!started) return;

	const t = Math.min(stormIntensity / 1.5, 1); // normalize to 0-1

	// Wind: volume ramps from -24 dB (calm) to -4 dB (extreme)
	if (windVolume) {
		windVolume.volume.value = -24 + t * 20;
	}
	// Wind filter sweep speeds up with intensity
	if (windFilter) {
		windFilter.frequency.value = 0.08 + t * 0.4;
	}

	// Rain: fades in after 30% intensity
	if (rainVolume) {
		const rainT = Math.max(0, (t - 0.3) / 0.7);
		rainVolume.volume.value = rainT > 0 ? -18 + rainT * 12 : -60;
	}
	// Rain filter opens with intensity
	if (rainFilter) {
		rainFilter.frequency.value = 400 + t * 600;
	}

	// Crackle: only audible above 40% intensity; LFO rate increases
	if (crackleVolume) {
		const crackleT = Math.max(0, (t - 0.4) / 0.6);
		crackleVolume.volume.value = crackleT > 0 ? -20 + crackleT * 14 : -60;
	}
	if (crackleLfo) {
		const crackleT = Math.max(0, (t - 0.4) / 0.6);
		crackleLfo.frequency.value = 4 + crackleT * 16; // 4-20 Hz bursts
	}
}

// ---------------------------------------------------------------------------
// One-shot events
// ---------------------------------------------------------------------------

/**
 * Play a thunder rumble. Triggered when lightning strikes occur in the game.
 * Uses a noise burst through a low-pass filter with long release for rumble.
 */
export function playThunder(): void {
	if (!isAudioInitialized()) return;

	const bus = getCategoryBus("ambience");
	if (!bus) return;

	// Low rumble from brown noise
	const noise = new Tone.Noise("brown");
	const filter = new Tone.Filter({
		frequency: 120 + Math.random() * 80,
		type: "lowpass",
		rolloff: -24,
	});
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.02,
		decay: 0.5 + Math.random() * 0.3,
		sustain: 0.15,
		release: 2.0 + Math.random() * 1.5,
	});

	// Bright crack layered on top
	const crack = new Tone.Noise("white");
	const crackFilter = new Tone.Filter(800, "lowpass");
	const crackEnv = new Tone.AmplitudeEnvelope({
		attack: 0.005,
		decay: 0.08,
		sustain: 0,
		release: 0.15,
	});

	const vol = new Tone.Volume(-6);
	vol.connect(bus);

	noise.connect(filter);
	filter.connect(env);
	env.connect(vol);

	crack.connect(crackFilter);
	crackFilter.connect(crackEnv);
	crackEnv.connect(vol);

	noise.start();
	crack.start();
	env.triggerAttackRelease(1.2);
	crackEnv.triggerAttackRelease(0.06);

	setTimeout(() => {
		noise.stop();
		crack.stop();
		noise.dispose();
		filter.dispose();
		env.dispose();
		crack.dispose();
		crackFilter.dispose();
		crackEnv.dispose();
		vol.dispose();
	}, 5000);
}

/**
 * Play an electrical crackle burst — used near lightning rods when they
 * discharge or absorb a strike.
 */
export function playElectricalCrackle(): void {
	if (!isAudioInitialized()) return;

	const bus = getCategoryBus("sfx");
	if (!bus) return;

	const noise = new Tone.Noise("white");
	const filter = new Tone.Filter({
		frequency: 3000 + Math.random() * 2000,
		type: "highpass",
	});
	const crusher = new Tone.BitCrusher(3);
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.002,
		decay: 0.05 + Math.random() * 0.05,
		sustain: 0.1,
		release: 0.12,
	});
	const vol = new Tone.Volume(-10);
	vol.connect(bus);

	noise.connect(crusher);
	crusher.connect(filter);
	filter.connect(env);
	env.connect(vol);

	noise.start();
	env.triggerAttackRelease(0.08 + Math.random() * 0.06);

	setTimeout(() => {
		noise.stop();
		noise.dispose();
		filter.dispose();
		crusher.dispose();
		env.dispose();
		vol.dispose();
	}, 600);
}

export function isStormAmbienceStarted(): boolean {
	return started;
}
