/**
 * Adaptive Music — Background music that adapts to game state.
 *
 * Music states:
 * - exploration: ambient pads, minimal melody (calm, vast)
 * - combat: increased tempo, percussion, tension
 * - cultist: dissonant tones, deep reverb, ominous
 * - expansion: rising arpeggios, triumphant feel
 *
 * Uses Tone.js Transport for tempo control and crossfades
 * between music states based on game context.
 */

import * as Tone from "tone";
import { getMusicOutput } from "./audioEngine";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MusicState = "exploration" | "combat" | "cultist" | "expansion";

// ─── Module State ────────────────────────────────────────────────────────────

let currentState: MusicState = "exploration";
let musicStarted = false;

// Layers — each state has its own synth/loop that fades in/out
let explorationPad: Tone.PolySynth | null = null;
let combatPerc: Tone.MetalSynth | null = null;
let combatBass: Tone.Synth | null = null;
let cultistDrone: Tone.Synth | null = null;
let expansionArp: Tone.Synth | null = null;

// Gain nodes for crossfading
let explorationGain: Tone.Gain | null = null;
let combatGain: Tone.Gain | null = null;
let cultistGain: Tone.Gain | null = null;
let expansionGain: Tone.Gain | null = null;

// Loops
let explorationLoop: Tone.Loop | null = null;
let combatLoop: Tone.Loop | null = null;
let cultistLoop: Tone.Loop | null = null;
let expansionLoop: Tone.Loop | null = null;

const CROSSFADE_TIME = 2;

// ─── Exploration Layer ───────────────────────────────────────────────────────

function createExplorationLayer(output: Tone.Gain) {
	explorationGain = new Tone.Gain(0).connect(output);

	explorationPad = new Tone.PolySynth(Tone.Synth, {
		oscillator: { type: "sine" },
		envelope: { attack: 1.5, decay: 2, sustain: 0.4, release: 2 },
		volume: -20,
	}).connect(explorationGain);

	const chords = [
		["C3", "E3", "G3"],
		["A2", "C3", "E3"],
		["F2", "A2", "C3"],
		["G2", "B2", "D3"],
	];
	let chordIndex = 0;

	explorationLoop = new Tone.Loop((time) => {
		const chord = chords[chordIndex % chords.length];
		explorationPad?.triggerAttackRelease(chord, "2n", time);
		chordIndex++;
	}, "1m");
}

// ─── Combat Layer ────────────────────────────────────────────────────────────

function createCombatLayer(output: Tone.Gain) {
	combatGain = new Tone.Gain(0).connect(output);

	combatPerc = new Tone.MetalSynth({
		envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
		harmonicity: 5,
		modulationIndex: 16,
		resonance: 3000,
		octaves: 1,
		volume: -18,
	}).connect(combatGain);
	combatPerc.frequency.value = 150;

	combatBass = new Tone.Synth({
		oscillator: { type: "square" },
		envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1 },
		volume: -16,
	}).connect(combatGain);

	let beatIndex = 0;
	combatLoop = new Tone.Loop((time) => {
		// Driving rhythm pattern
		combatPerc?.triggerAttackRelease("16n", time);
		if (beatIndex % 4 === 0) {
			combatBass?.triggerAttackRelease("E2", "8n", time);
		}
		if (beatIndex % 4 === 2) {
			combatBass?.triggerAttackRelease("B1", "8n", time);
		}
		beatIndex++;
	}, "8n");
}

// ─── Cultist Layer ───────────────────────────────────────────────────────────

function createCultistLayer(output: Tone.Gain) {
	cultistGain = new Tone.Gain(0).connect(output);

	cultistDrone = new Tone.Synth({
		oscillator: { type: "sawtooth" },
		envelope: { attack: 2, decay: 3, sustain: 0.5, release: 3 },
		volume: -22,
	});

	const filter = new Tone.Filter(300, "lowpass");
	filter.Q.value = 4;
	cultistDrone.connect(filter);
	filter.connect(cultistGain);

	const notes = ["C2", "Db2", "C2", "B1"];
	let noteIndex = 0;

	cultistLoop = new Tone.Loop((time) => {
		const note = notes[noteIndex % notes.length];
		cultistDrone?.triggerAttackRelease(note, "1m", time);
		noteIndex++;
	}, "2m");
}

// ─── Expansion Layer ─────────────────────────────────────────────────────────

function createExpansionLayer(output: Tone.Gain) {
	expansionGain = new Tone.Gain(0).connect(output);

	expansionArp = new Tone.Synth({
		oscillator: { type: "triangle" },
		envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.1 },
		volume: -16,
	}).connect(expansionGain);

	const pattern = ["C4", "E4", "G4", "C5", "G4", "E4"];
	let patIndex = 0;

	expansionLoop = new Tone.Loop((time) => {
		const note = pattern[patIndex % pattern.length];
		expansionArp?.triggerAttackRelease(note, "16n", time);
		patIndex++;
	}, "8n");
}

// ─── Crossfade ───────────────────────────────────────────────────────────────

function fadeLayer(gain: Tone.Gain | null, target: number) {
	if (!gain) return;
	gain.gain.cancelScheduledValues(Tone.now());
	gain.gain.linearRampTo(target, CROSSFADE_TIME, Tone.now());
}

function setActiveState(state: MusicState) {
	fadeLayer(explorationGain, state === "exploration" ? 1 : 0);
	fadeLayer(combatGain, state === "combat" ? 1 : 0);
	fadeLayer(cultistGain, state === "cultist" ? 1 : 0);
	fadeLayer(expansionGain, state === "expansion" ? 1 : 0);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start adaptive music. Call after audio engine is initialized.
 */
export function startMusic() {
	const output = getMusicOutput();
	if (!output || musicStarted) return;

	createExplorationLayer(output);
	createCombatLayer(output);
	createCultistLayer(output);
	createExpansionLayer(output);

	Tone.getTransport().bpm.value = 90;

	explorationLoop?.start(0);
	combatLoop?.start(0);
	cultistLoop?.start(0);
	expansionLoop?.start(0);

	Tone.getTransport().start();
	musicStarted = true;

	setActiveState(currentState);
}

/**
 * Transition to a new music state with crossfade.
 */
export function setMusicState(state: MusicState) {
	if (state === currentState) return;
	currentState = state;

	// Adjust tempo per state
	const tempoMap: Record<MusicState, number> = {
		exploration: 90,
		combat: 130,
		cultist: 70,
		expansion: 110,
	};
	Tone.getTransport().bpm.rampTo(tempoMap[state], CROSSFADE_TIME);

	if (musicStarted) {
		setActiveState(state);
	}
}

/**
 * Get the current music state.
 */
export function getMusicState(): MusicState {
	return currentState;
}

/**
 * Stop all music and dispose resources.
 */
export function stopMusic() {
	if (!musicStarted) return;

	Tone.getTransport().stop();

	explorationLoop?.dispose();
	combatLoop?.dispose();
	cultistLoop?.dispose();
	expansionLoop?.dispose();
	explorationLoop = null;
	combatLoop = null;
	cultistLoop = null;
	expansionLoop = null;

	explorationPad?.dispose();
	combatPerc?.dispose();
	combatBass?.dispose();
	cultistDrone?.dispose();
	expansionArp?.dispose();
	explorationPad = null;
	combatPerc = null;
	combatBass = null;
	cultistDrone = null;
	expansionArp = null;

	explorationGain?.dispose();
	combatGain?.dispose();
	cultistGain?.dispose();
	expansionGain?.dispose();
	explorationGain = null;
	combatGain = null;
	cultistGain = null;
	expansionGain = null;

	musicStarted = false;
}

/**
 * Reset adaptive music state — for testing.
 */
export function _resetAdaptiveMusic() {
	stopMusic();
	currentState = "exploration";
}
