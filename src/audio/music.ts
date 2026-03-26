/**
 * Procedural Background Music — ambient drone per epoch.
 *
 * Each epoch has a distinct musical character:
 *   - Epoch 1 (Emergence): Sparse, hopeful — C major pads, slow LFO, low volume
 *   - Epoch 2 (Expansion): Building tension — Am progression, subtle rhythm
 *   - Epoch 3 (Consolidation): Industrial — Dm, metallic timbres, pulse
 *   - Epoch 4 (Convergence): Intense — F#m, driving bass, urgency
 *   - Epoch 5 (Transcendence): Grand — C major resolution, full chord
 *
 * Uses Tone.js PolySynth and FMSynth routed through the music gain channel.
 * Safe to call before audio is initialized — silently no-ops.
 */

import type * as ToneNs from "tone";
import {
	getMusicOutput,
	isAudioInitialized,
	setMusicVolume,
} from "./audioEngine";

// ─── State ──────────────────────────────────────────────────────────────────

let Tone: typeof ToneNs | null = null;
let padSynth: ToneNs.PolySynth | null = null;
let bassSynth: ToneNs.FMSynth | null = null;
let padLoop: ToneNs.Loop | null = null;
let bassLoop: ToneNs.Loop | null = null;
let running = false;
let currentEpoch = 0;

// ─── Epoch Definitions ──────────────────────────────────────────────────────

interface EpochMusic {
	/** Chord notes played on pad synth. */
	padChords: string[][];
	/** Bass notes cycled each beat. */
	bassNotes: string[];
	/** Pad loop interval. */
	padInterval: string;
	/** Bass loop interval. */
	bassInterval: string;
	/** Pad synth oscillator type. */
	padOsc: OscillatorType;
	/** Bass FM harmonicity. */
	bassHarmonicity: number;
	/** Bass FM modulation index. */
	bassModIndex: number;
	/** Pad volume in dB. */
	padVolume: number;
	/** Bass volume in dB. */
	bassVolume: number;
	/** Pad envelope attack. */
	padAttack: number;
	/** Pad envelope release. */
	padRelease: number;
}

const EPOCH_MUSIC: Record<number, EpochMusic> = {
	1: {
		// Emergence — sparse, hopeful C major pads
		padChords: [
			["C3", "E3", "G3"],
			["F3", "A3", "C4"],
			["G3", "B3", "D4"],
			["C3", "E3", "G3"],
		],
		bassNotes: ["C2"],
		padInterval: "4n",
		bassInterval: "1n",
		padOsc: "triangle",
		bassHarmonicity: 1,
		bassModIndex: 2,
		padVolume: -20,
		bassVolume: -24,
		padAttack: 0.5,
		padRelease: 2.0,
	},
	2: {
		// Expansion — building tension, Am progression
		padChords: [
			["A2", "C3", "E3"],
			["F2", "A2", "C3"],
			["G2", "B2", "D3"],
			["E2", "G#2", "B2"],
		],
		bassNotes: ["A1", "F1", "G1", "E1"],
		padInterval: "2n",
		bassInterval: "2n",
		padOsc: "triangle",
		bassHarmonicity: 1.5,
		bassModIndex: 4,
		padVolume: -18,
		bassVolume: -22,
		padAttack: 0.3,
		padRelease: 1.5,
	},
	3: {
		// Consolidation — industrial, Dm, metallic timbres
		padChords: [
			["D3", "F3", "A3"],
			["Bb2", "D3", "F3"],
			["C3", "E3", "G3"],
			["A2", "C#3", "E3"],
		],
		bassNotes: ["D1", "Bb0", "C1", "A0"],
		padInterval: "2n",
		bassInterval: "4n",
		padOsc: "sawtooth",
		bassHarmonicity: 2,
		bassModIndex: 8,
		padVolume: -16,
		bassVolume: -20,
		padAttack: 0.2,
		padRelease: 1.0,
	},
	4: {
		// Convergence — intense, F#m, driving bass
		padChords: [
			["F#3", "A3", "C#4"],
			["D3", "F#3", "A3"],
			["E3", "G#3", "B3"],
			["C#3", "E#3", "G#3"],
		],
		bassNotes: ["F#1", "D1", "E1", "C#1"],
		padInterval: "4n",
		bassInterval: "8n",
		padOsc: "sawtooth",
		bassHarmonicity: 3,
		bassModIndex: 12,
		padVolume: -14,
		bassVolume: -18,
		padAttack: 0.1,
		padRelease: 0.8,
	},
	5: {
		// Transcendence — grand, C major resolution
		padChords: [
			["C3", "E3", "G3", "B3"],
			["F3", "A3", "C4", "E4"],
			["G3", "B3", "D4", "F#4"],
			["C3", "E3", "G3", "C4"],
		],
		bassNotes: ["C2", "F1", "G1", "C2"],
		padInterval: "2n",
		bassInterval: "2n",
		padOsc: "triangle",
		bassHarmonicity: 1,
		bassModIndex: 3,
		padVolume: -12,
		bassVolume: -16,
		padAttack: 0.4,
		padRelease: 2.5,
	},
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensureTone(): Promise<typeof ToneNs | null> {
	if (Tone) return Tone;
	if (!isAudioInitialized()) return null;
	Tone = await import("tone");
	return Tone;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Start procedural music for the given epoch (1-5).
 * Stops any currently playing music and transitions to the new epoch's sound.
 * No-ops if audio engine is not initialized.
 */
export function startMusic(epoch: number): void {
	const output = getMusicOutput();
	if (!output) return;

	const clampedEpoch = Math.max(1, Math.min(5, epoch));
	if (running && currentEpoch === clampedEpoch) return;

	// Stop current music before starting new epoch
	if (running) {
		disposeMusic();
	}

	ensureTone().then((T) => {
		if (!T) return;
		const currentOutput = getMusicOutput();
		if (!currentOutput) return;

		try {
			const def = EPOCH_MUSIC[clampedEpoch];
			if (!def) return;

			// Create pad synth
			padSynth = new T.PolySynth(T.Synth, {
				oscillator: { type: def.padOsc },
				envelope: {
					attack: def.padAttack,
					decay: 0.5,
					sustain: 0.6,
					release: def.padRelease,
				},
			}).connect(currentOutput);
			padSynth.volume.value = def.padVolume;

			// Create bass synth
			bassSynth = new T.FMSynth({
				harmonicity: def.bassHarmonicity,
				modulationIndex: def.bassModIndex,
				envelope: {
					attack: 0.1,
					decay: 0.3,
					sustain: 0.4,
					release: 0.5,
				},
				modulation: { type: "sine" },
			}).connect(currentOutput);
			bassSynth.volume.value = def.bassVolume;

			// Pad loop — cycle through chords
			let padIdx = 0;
			padLoop = new T.Loop(() => {
				if (!padSynth) return;
				try {
					const chord = def.padChords[padIdx % def.padChords.length]!;
					padSynth.triggerAttackRelease(chord, def.padInterval);
					padIdx++;
				} catch (e) {
					// Non-fatal: pad synth trigger error
					console.debug("[music] pad trigger error:", e);
				}
			}, def.padInterval);

			// Bass loop — cycle through bass notes
			let bassIdx = 0;
			bassLoop = new T.Loop(() => {
				if (!bassSynth) return;
				try {
					const note = def.bassNotes[bassIdx % def.bassNotes.length]!;
					bassSynth.triggerAttackRelease(note, def.bassInterval);
					bassIdx++;
				} catch (e) {
					// Non-fatal: bass synth trigger error
					console.debug("[music] bass trigger error:", e);
				}
			}, def.bassInterval);

			// Start Transport if not already running
			if (T.getTransport().state !== "started") {
				T.getTransport().start();
			}

			padLoop.start(0);
			bassLoop.start(0);

			running = true;
			currentEpoch = clampedEpoch;
		} catch (e) {
			// Non-fatal: audio errors never crash the game
			console.warn("[music] start error:", e);
		}
	});
}

/**
 * Stop all procedural music and dispose synths.
 */
export function stopMusic(): void {
	disposeMusic();
}

/**
 * Set music channel volume (0-1 linear scale).
 */
export function setMusicVolumeLevel(vol: number): void {
	setMusicVolume(Math.max(0, Math.min(1, vol)));
}

/**
 * Get whether music is currently playing.
 */
export function isMusicPlaying(): boolean {
	return running;
}

/**
 * Get the current epoch number being played. Returns 0 if not playing.
 */
export function getCurrentMusicEpoch(): number {
	return running ? currentEpoch : 0;
}

// ─── Internal ───────────────────────────────────────────────────────────────

function disposeMusic(): void {
	if (!running && !padSynth && !bassSynth) return;

	try {
		padLoop?.stop();
		padLoop?.dispose();
		bassLoop?.stop();
		bassLoop?.dispose();
		padSynth?.dispose();
		bassSynth?.dispose();
	} catch (e) {
		// Non-fatal: disposal errors during cleanup
		console.warn("[music] disposal error:", e);
	}

	padLoop = null;
	bassLoop = null;
	padSynth = null;
	bassSynth = null;
	running = false;
	currentEpoch = 0;
}
