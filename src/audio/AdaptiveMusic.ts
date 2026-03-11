/**
 * Adaptive music system for Syntheteria.
 *
 * Music adapts seamlessly to the current game state using layered synthesis
 * via Tone.js Transport. Each state adds or removes instrument layers on top
 * of a persistent base drone, creating smooth state transitions.
 *
 * Game states → music layers:
 *   explore  — Ambient drone (sine pad, long reverb). Base layer always present.
 *   build    — Add rhythmic percussion (hi-hat clicks, kick at BPM 80)
 *   combat   — Add aggressive lead (saw synth with distortion, faster BPM 100)
 *   raid     — Add tense stab chord (square wave arpeggio, warning feel)
 *   victory  — Full chord progression (major triad ascending)
 *
 * All layers use Tone.Transport for synchronized timing.
 * Transitions crossfade over TRANSITION_S seconds.
 */

import * as Tone from "tone";
import { getCategoryBus, isAudioInitialized } from "./SoundEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MusicState = "explore" | "build" | "combat" | "raid" | "victory";

interface MusicLayer {
	gain: Tone.Gain;
	dispose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRANSITION_S = 1.5;
const BASE_BPM = 80;
const COMBAT_BPM = 100;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let currentState: MusicState | null = null;
let running = false;

// Persistent base drone (always on when music is running)
let droneOsc: Tone.Oscillator | null = null;
let droneOsc2: Tone.Oscillator | null = null;
let droneReverb: Tone.Reverb | null = null;
let droneGain: Tone.Gain | null = null;

// Optional state-specific layers
const stateLayers = new Map<MusicState, MusicLayer>();

// ---------------------------------------------------------------------------
// Base drone — always running
// ---------------------------------------------------------------------------

function startBaseDrone(bus: Tone.Volume): void {
	// Pad drone: two detuned sine oscillators through long reverb
	droneOsc = new Tone.Oscillator({ frequency: 110, type: "sine" });
	droneOsc2 = new Tone.Oscillator({ frequency: 110.5, type: "sine" }); // slight detune
	droneReverb = new Tone.Reverb({ decay: 6, wet: 0.7 });
	droneGain = new Tone.Gain(0.5);

	const droneVol = new Tone.Volume(-16);
	droneGain.connect(droneReverb);
	droneReverb.connect(droneVol);
	droneVol.connect(bus);

	droneOsc.connect(droneGain);
	droneOsc2.connect(droneGain);
	droneOsc.start();
	droneOsc2.start();
}

function stopBaseDrone(): void {
	droneOsc?.stop();
	droneOsc2?.stop();
	droneOsc?.dispose();
	droneOsc2?.dispose();
	droneReverb?.dispose();
	droneGain?.dispose();
	droneOsc = null;
	droneOsc2 = null;
	droneReverb = null;
	droneGain = null;
}

// ---------------------------------------------------------------------------
// State layer factories
// ---------------------------------------------------------------------------

function createBuildLayer(bus: Tone.Volume): MusicLayer {
	const gain = new Tone.Gain(0);
	gain.connect(bus);

	// Hi-hat clicks at 1/8 notes
	const hihat = new Tone.MetalSynth({
		envelope: { attack: 0.001, decay: 0.04, release: 0.02 },
		harmonicity: 5.1,
		modulationIndex: 32,
		resonance: 8000,
		octaves: 1.5,
	});
	hihat.volume.value = -24;
	hihat.connect(gain);

	// Kick at 1/4 notes
	const kick = new Tone.MembraneSynth({
		pitchDecay: 0.05,
		octaves: 6,
		envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
	});
	kick.volume.value = -18;
	kick.connect(gain);

	Tone.Transport.bpm.value = BASE_BPM;

	// Schedule hi-hat pattern (1/8 notes)
	const hihatSeq = new Tone.Sequence(
		(time) => {
			hihat.triggerAttackRelease("C4", "32n", time);
		},
		[0, 1, 0, 1, 0, 1, 0, 1],
		"8n",
	);
	hihatSeq.start(0);

	// Schedule kick pattern (quarter notes)
	const kickSeq = new Tone.Sequence(
		(time) => {
			kick.triggerAttackRelease("C1", "8n", time);
		},
		[1, 0, 0, 1],
		"4n",
	);
	kickSeq.start(0);

	return {
		gain,
		dispose: () => {
			hihatSeq.stop();
			kickSeq.stop();
			hihatSeq.dispose();
			kickSeq.dispose();
			hihat.dispose();
			kick.dispose();
			gain.dispose();
		},
	};
}

function createCombatLayer(bus: Tone.Volume): MusicLayer {
	const gain = new Tone.Gain(0);
	gain.connect(bus);

	// Aggressive sawtooth lead
	const lead = new Tone.Synth({
		oscillator: { type: "sawtooth" },
		envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 },
	});
	const leadDist = new Tone.Distortion(0.4);
	const leadFilter = new Tone.Filter(1800, "lowpass");
	const leadVol = new Tone.Volume(-14);

	lead.connect(leadDist);
	leadDist.connect(leadFilter);
	leadFilter.connect(leadVol);
	leadVol.connect(gain);

	Tone.Transport.bpm.value = COMBAT_BPM;

	// Driving lead pattern — power chords
	const leadNotes = ["C3", "G3", "C3", "Bb2", "G2", "G2", "C3", "F3"];
	let noteIdx = 0;
	const leadSeq = new Tone.Sequence(
		(time) => {
			lead.triggerAttackRelease(leadNotes[noteIdx % leadNotes.length], "8n", time);
			noteIdx++;
		},
		[1, 0, 1, 0, 1, 1, 0, 1],
		"8n",
	);
	leadSeq.start(0);

	return {
		gain,
		dispose: () => {
			leadSeq.stop();
			leadSeq.dispose();
			lead.dispose();
			leadDist.dispose();
			leadFilter.dispose();
			leadVol.dispose();
			gain.dispose();
		},
	};
}

function createRaidLayer(bus: Tone.Volume): MusicLayer {
	const gain = new Tone.Gain(0);
	gain.connect(bus);

	// Tense stab: square wave chord stabs
	const stab = new Tone.Synth({
		oscillator: { type: "square" },
		envelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.2 },
	});
	const stabFilter = new Tone.Filter(600, "lowpass");
	const stabVol = new Tone.Volume(-16);

	stab.connect(stabFilter);
	stabFilter.connect(stabVol);
	stabVol.connect(gain);

	// Warning arpeggio: ascending minor 3rd pattern
	const raidNotes = ["E3", "G3", "E3", null, "E3", "G3", null, null];
	let noteIdx = 0;
	const raidSeq = new Tone.Sequence(
		(time) => {
			const note = raidNotes[noteIdx % raidNotes.length];
			if (note) {
				stab.triggerAttackRelease(note, "16n", time);
			}
			noteIdx++;
		},
		raidNotes.map((_, i) => i),
		"8n",
	);
	raidSeq.start(0);

	return {
		gain,
		dispose: () => {
			raidSeq.stop();
			raidSeq.dispose();
			stab.dispose();
			stabFilter.dispose();
			stabVol.dispose();
			gain.dispose();
		},
	};
}

function createVictoryLayer(bus: Tone.Volume): MusicLayer {
	const gain = new Tone.Gain(0);
	gain.connect(bus);

	const synth = new Tone.Synth({
		oscillator: { type: "triangle" },
		envelope: { attack: 0.05, decay: 0.3, sustain: 0.6, release: 1.0 },
	});
	const reverb = new Tone.Reverb({ decay: 3, wet: 0.5 });
	const vol = new Tone.Volume(-10);

	synth.connect(reverb);
	reverb.connect(vol);
	vol.connect(gain);

	// Major triad ascending arpeggio: C4 E4 G4 C5
	const victoryNotes = ["C4", "E4", "G4", "C5"];
	let noteIdx = 0;
	const victorySeq = new Tone.Sequence(
		(time) => {
			if (noteIdx < victoryNotes.length) {
				synth.triggerAttackRelease(victoryNotes[noteIdx], "4n", time);
				noteIdx++;
			}
		},
		[0, 1, 2, 3],
		"4n",
	);
	victorySeq.start(0);

	return {
		gain,
		dispose: () => {
			victorySeq.stop();
			victorySeq.dispose();
			synth.dispose();
			reverb.dispose();
			vol.dispose();
			gain.dispose();
		},
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start the adaptive music system. Safe to call multiple times.
 * Music only starts after the audio engine is initialized.
 */
export function startAdaptiveMusic(): void {
	if (!isAudioInitialized()) return;
	if (running) return;

	const bus = getCategoryBus("music");
	if (!bus) return;

	startBaseDrone(bus);
	Tone.Transport.bpm.value = BASE_BPM;
	Tone.Transport.start();

	running = true;
	currentState = "explore";
}

/**
 * Stop all adaptive music and dispose all nodes.
 */
export function stopAdaptiveMusic(): void {
	if (!running) return;

	// Dispose all state layers
	for (const [, layer] of stateLayers) {
		layer.gain.gain.rampTo(0, 0.5);
		setTimeout(() => layer.dispose(), 600);
	}
	stateLayers.clear();

	stopBaseDrone();
	Tone.Transport.stop();

	running = false;
	currentState = null;
}

/**
 * Transition to a new music state. Each state crossfades in/out over
 * TRANSITION_S seconds. The base drone always persists.
 *
 * @param state - Target music state.
 */
export function setMusicState(state: MusicState): void {
	if (!running) return;
	if (state === currentState) return;

	const bus = getCategoryBus("music");
	if (!bus) return;

	// Fade out previous state layer (if any)
	const prevLayer = stateLayers.get(currentState ?? "explore");
	if (prevLayer) {
		prevLayer.gain.gain.rampTo(0, TRANSITION_S);
		const toDispose = prevLayer;
		setTimeout(() => {
			toDispose.dispose();
		}, TRANSITION_S * 1000 + 100);
		stateLayers.delete(currentState ?? "explore");
	}

	currentState = state;

	// Explore has no additional layer — just the base drone
	if (state === "explore") {
		Tone.Transport.bpm.rampTo(BASE_BPM, TRANSITION_S);
		return;
	}

	// Create and fade in new state layer
	let newLayer: MusicLayer;
	switch (state) {
		case "build":
			newLayer = createBuildLayer(bus);
			break;
		case "combat":
			newLayer = createCombatLayer(bus);
			Tone.Transport.bpm.rampTo(COMBAT_BPM, TRANSITION_S);
			break;
		case "raid":
			newLayer = createRaidLayer(bus);
			break;
		case "victory":
			newLayer = createVictoryLayer(bus);
			break;
	}

	newLayer.gain.gain.setValueAtTime(0, Tone.now());
	newLayer.gain.gain.rampTo(1, TRANSITION_S);
	stateLayers.set(state, newLayer);
}

/**
 * Get the current music state. Returns null if music is not running.
 */
export function getMusicState(): MusicState | null {
	return currentState;
}

/**
 * Check if the adaptive music system is currently running.
 */
export function isAdaptiveMusicRunning(): boolean {
	return running;
}
