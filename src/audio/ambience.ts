/**
 * Ambient storm soundscape — perpetual low rumble + periodic thunder.
 *
 * Two layers:
 *   1. Storm rumble: brown noise → lowpass 200Hz → ambient gain.
 *      Always playing. Subtle background atmosphere.
 *   2. Thunder crack: white noise burst → reverb → ambient gain.
 *      Fires every 15-30 seconds at random intervals.
 *      Volume varies for near/distant effect.
 *
 * Starts on first user gesture alongside initAudio(). Idempotent.
 * Safe to call before audio is initialized — silently no-ops.
 */

import type * as ToneNs from "tone";
import { getAmbientOutput, isAudioInitialized } from "./audioEngine";

// ─── Storm rumble state ──────────────────────────────────────────────────────

let noise: ToneNs.Noise | null = null;
let filter: ToneNs.Filter | null = null;
let running = false;

// ─── Thunder state ───────────────────────────────────────────────────────────

let thunderNoise: ToneNs.NoiseSynth | null = null;
let thunderReverb: ToneNs.Reverb | null = null;
let thunderTimer: ReturnType<typeof setTimeout> | null = null;
let _ToneRef: typeof ToneNs | null = null;

/** Thunder interval range in ms. */
const THUNDER_MIN_MS = 15_000;
const THUNDER_MAX_MS = 30_000;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start the ambient storm loop. No-ops if audio not initialized or already running.
 */
export function startAmbience(): void {
	if (running) return;

	const output = getAmbientOutput();
	if (!output || !isAudioInitialized()) return;

	import("tone")
		.then((Tone) => {
			if (running) return;
			const currentOutput = getAmbientOutput();
			if (!currentOutput) return;

			try {
				_ToneRef = Tone;

				// Layer 1: Storm rumble — brown noise through lowpass
				filter = new Tone.Filter({
					type: "lowpass",
					frequency: 200,
					rolloff: -24,
				}).connect(currentOutput);

				noise = new Tone.Noise("brown").connect(filter);
				noise.volume.value = -12;
				noise.start();

				// Layer 2: Thunder — noise synth through reverb (created once, reused)
				thunderReverb = new Tone.Reverb({
					decay: 4,
					wet: 0.8,
				}).connect(currentOutput);

				thunderNoise = new Tone.NoiseSynth({
					noise: { type: "white" },
					envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.3 },
				}).connect(thunderReverb);

				running = true;

				// Schedule first thunder
				scheduleThunder();
			} catch {
				// Swallow audio errors — never crash the game for sound
			}
		})
		.catch(() => {
			// Import failure — no audio
		});
}

/**
 * Stop the ambient loop, thunder, and dispose all nodes.
 */
export function stopAmbience(): void {
	if (!running) return;

	if (thunderTimer) {
		clearTimeout(thunderTimer);
		thunderTimer = null;
	}

	try {
		noise?.stop();
		noise?.dispose();
		filter?.dispose();
		thunderNoise?.dispose();
		thunderReverb?.dispose();
	} catch {
		// Swallow disposal errors
	}

	noise = null;
	filter = null;
	thunderNoise = null;
	thunderReverb = null;
	_ToneRef = null;
	running = false;
}

// ─── Thunder scheduling ──────────────────────────────────────────────────────

function scheduleThunder(): void {
	if (!running) return;

	const delay =
		THUNDER_MIN_MS + Math.random() * (THUNDER_MAX_MS - THUNDER_MIN_MS);
	thunderTimer = setTimeout(() => {
		fireThunder();
		scheduleThunder(); // Chain next crack
	}, delay);
}

function fireThunder(): void {
	if (!thunderNoise || !running) return;

	try {
		// Vary volume for near/distant effect (-6dB to -18dB)
		thunderNoise.volume.value = -6 - Math.random() * 12;
		thunderNoise.triggerAttackRelease("8n");
	} catch {
		// Swallow — audio glitches are non-fatal
	}
}
