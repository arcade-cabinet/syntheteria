/**
 * Ambient Soundscape — Environmental audio tied to world state.
 *
 * Layers:
 * - Wind: continuous noise, intensity tied to storm
 * - Machinery hum: constant subtle drone
 * - Distant thunder: random rumbles, frequency tied to storm intensity
 * - Metal creaking: random atmospheric groans
 *
 * All layers route through the ambient volume channel.
 */

import * as Tone from "tone";
import { getAmbientOutput } from "./audioEngine";

// ─── Module State ────────────────────────────────────────────────────────────

let started = false;

// Layers
let windNoise: Tone.NoiseSynth | null = null;
let windFilter: Tone.Filter | null = null;
let windGain: Tone.Gain | null = null;

let machineryOsc: Tone.Synth | null = null;
let machineryGain: Tone.Gain | null = null;

let thunderNoise: Tone.NoiseSynth | null = null;
let thunderFilter: Tone.Filter | null = null;
let thunderGain: Tone.Gain | null = null;

let creakSynth: Tone.Synth | null = null;
let creakGain: Tone.Gain | null = null;

// Random event timers
let thunderInterval: ReturnType<typeof setTimeout> | null = null;
let creakInterval: ReturnType<typeof setTimeout> | null = null;

// Current storm intensity for modulation
let stormIntensity = 0.5;

// ─── Wind Layer ──────────────────────────────────────────────────────────────

function createWindLayer(output: Tone.Gain) {
	windGain = new Tone.Gain(0.3).connect(output);
	windFilter = new Tone.Filter(800, "lowpass").connect(windGain);

	windNoise = new Tone.NoiseSynth({
		noise: { type: "pink" },
		envelope: { attack: 2, decay: 0, sustain: 1, release: 2 },
		volume: -24,
	}).connect(windFilter);

	windNoise.triggerAttack();
}

// ─── Machinery Hum ───────────────────────────────────────────────────────────

function createMachineryLayer(output: Tone.Gain) {
	machineryGain = new Tone.Gain(0.15).connect(output);

	machineryOsc = new Tone.Synth({
		oscillator: { type: "sine" },
		envelope: { attack: 3, decay: 0, sustain: 1, release: 3 },
		volume: -28,
	}).connect(machineryGain);

	machineryOsc.triggerAttack("A1");
}

// ─── Thunder ─────────────────────────────────────────────────────────────────

function createThunderLayer(output: Tone.Gain) {
	thunderGain = new Tone.Gain(0).connect(output);
	thunderFilter = new Tone.Filter(200, "lowpass").connect(thunderGain);

	thunderNoise = new Tone.NoiseSynth({
		noise: { type: "brown" },
		envelope: { attack: 0.1, decay: 1.5, sustain: 0.1, release: 1.0 },
		volume: -12,
	}).connect(thunderFilter);
}

function scheduleThunder() {
	// Random interval inversely proportional to storm intensity
	const minDelay = 3000;
	const maxDelay = 20000;
	const delay = minDelay + (1 - stormIntensity) * (maxDelay - minDelay);
	const jitter = Math.random() * delay * 0.5;

	thunderInterval = setTimeout(() => {
		if (!started) return;
		// Only rumble if storm is significant
		if (stormIntensity > 0.3 && thunderNoise && thunderGain) {
			thunderGain.gain.value = stormIntensity * 0.6;
			thunderNoise.triggerAttackRelease("2n");
		}
		scheduleThunder();
	}, delay + jitter);
}

// ─── Metal Creaking ──────────────────────────────────────────────────────────

function createCreakLayer(output: Tone.Gain) {
	creakGain = new Tone.Gain(0.2).connect(output);

	creakSynth = new Tone.Synth({
		oscillator: { type: "sawtooth" },
		envelope: { attack: 0.3, decay: 0.5, sustain: 0.1, release: 0.4 },
		volume: -26,
	});
	const filter = new Tone.Filter(600, "bandpass");
	filter.Q.value = 6;
	creakSynth.connect(filter);
	filter.connect(creakGain);
}

function scheduleCreak() {
	const delay = 8000 + Math.random() * 15000;

	creakInterval = setTimeout(() => {
		if (!started) return;
		if (creakSynth) {
			// Random pitch for variety
			const pitches = ["A2", "C3", "E2", "G2", "D3"];
			const pitch = pitches[Math.floor(Math.random() * pitches.length)];
			creakSynth.triggerAttackRelease(pitch, "4n");
		}
		scheduleCreak();
	}, delay);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start the ambient soundscape. Call after audio engine is initialized.
 */
export function startAmbientSoundscape() {
	const output = getAmbientOutput();
	if (!output || started) return;

	createWindLayer(output);
	createMachineryLayer(output);
	createThunderLayer(output);
	createCreakLayer(output);

	scheduleThunder();
	scheduleCreak();

	started = true;
}

/**
 * Update storm intensity to modulate ambient sounds.
 * Called each tick or when weather changes.
 * @param intensity 0-1 storm severity
 */
export function updateStormIntensity(intensity: number) {
	stormIntensity = Math.max(0, Math.min(1, intensity));

	if (!started) return;

	// Wind volume and filter frequency scale with storm
	if (windGain) {
		windGain.gain.linearRampTo(0.2 + stormIntensity * 0.5, 1, Tone.now());
	}
	if (windFilter) {
		const freq = 400 + stormIntensity * 1600;
		windFilter.frequency.linearRampTo(freq, 1, Tone.now());
	}
}

/**
 * Stop all ambient audio and dispose resources.
 */
export function stopAmbientSoundscape() {
	if (!started) return;

	if (thunderInterval) clearTimeout(thunderInterval);
	if (creakInterval) clearTimeout(creakInterval);
	thunderInterval = null;
	creakInterval = null;

	windNoise?.dispose();
	windFilter?.dispose();
	windGain?.dispose();
	windNoise = null;
	windFilter = null;
	windGain = null;

	machineryOsc?.dispose();
	machineryGain?.dispose();
	machineryOsc = null;
	machineryGain = null;

	thunderNoise?.dispose();
	thunderFilter?.dispose();
	thunderGain?.dispose();
	thunderNoise = null;
	thunderFilter = null;
	thunderGain = null;

	creakSynth?.dispose();
	creakGain?.dispose();
	creakSynth = null;
	creakGain = null;

	started = false;
}

/**
 * Check if ambient soundscape is running.
 */
export function isAmbientStarted(): boolean {
	return started;
}

/**
 * Reset ambient soundscape — for testing.
 */
export function _resetAmbientSoundscape() {
	stopAmbientSoundscape();
	stormIntensity = 0.5;
}
