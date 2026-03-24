/**
 * SFX Library — Procedural sound effects using Tone.js synths.
 *
 * All SFX are synthesized at runtime — no audio file dependencies.
 * Each effect is a short burst of synth + noise + filter combinations
 * that evoke industrial, metallic, machine-world sounds.
 *
 * Categories:
 * - Combat: attack clang, energy burst, projectile whoosh, hit impact, component break
 * - Harvest: grinding, sawing, material collection chime
 * - Construction: hammering, welding, stage completion fanfare
 * - Turn: player turn chime, AI phase drone, new turn fanfare
 * - Cultist: eerie hum, spawn screech, corruption distortion
 */

import * as Tone from "tone";
import { getSfxOutput } from "./audioEngine";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function connectToSfx(node: Tone.ToneAudioNode): boolean {
	const out = getSfxOutput();
	if (!out) return false;
	node.connect(out);
	return true;
}

// ─── Combat SFX ──────────────────────────────────────────────────────────────

/**
 * Metallic clang — melee attack sound.
 * Short metallic hit with rapid decay.
 */
export function playAttackClang() {
	const synth = new Tone.MetalSynth({
		envelope: { attack: 0.001, decay: 0.15, release: 0.1 },
		harmonicity: 5.1,
		modulationIndex: 32,
		resonance: 4000,
		octaves: 1.5,
		volume: -12,
	});
	if (!connectToSfx(synth)) {
		synth.dispose();
		return;
	}
	synth.frequency.value = 200;
	synth.triggerAttackRelease("16n", Tone.now());
	setTimeout(() => synth.dispose(), 500);
}

/**
 * Energy burst — ranged/hacking attack.
 * Quick frequency sweep with distortion.
 */
export function playEnergyBurst() {
	const synth = new Tone.Synth({
		oscillator: { type: "sawtooth" },
		envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.05 },
		volume: -15,
	});
	if (!connectToSfx(synth)) {
		synth.dispose();
		return;
	}
	synth.triggerAttackRelease("C5", "16n", Tone.now());
	synth.frequency.exponentialRampTo(100, 0.1, Tone.now());
	setTimeout(() => synth.dispose(), 400);
}

/**
 * Hit impact — metallic crunch when damage lands.
 */
export function playHitImpact() {
	const noise = new Tone.NoiseSynth({
		noise: { type: "brown" },
		envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 },
		volume: -10,
	});
	if (!connectToSfx(noise)) {
		noise.dispose();
		return;
	}
	noise.triggerAttackRelease("32n", Tone.now());
	setTimeout(() => noise.dispose(), 300);
}

/**
 * Component break — sparky crackle when a component is destroyed.
 */
export function playComponentBreak() {
	const noise = new Tone.NoiseSynth({
		noise: { type: "white" },
		envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
		volume: -14,
	});
	const filter = new Tone.Filter(3000, "bandpass");
	if (!connectToSfx(filter)) {
		noise.dispose();
		filter.dispose();
		return;
	}
	noise.connect(filter);
	noise.triggerAttackRelease("16n", Tone.now());
	setTimeout(() => {
		noise.dispose();
		filter.dispose();
	}, 500);
}

/**
 * Unit destroyed — heavy thud + crackle.
 */
export function playUnitDestroyed() {
	const metal = new Tone.MetalSynth({
		envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
		harmonicity: 3,
		modulationIndex: 16,
		resonance: 1000,
		octaves: 1,
		volume: -8,
	});
	if (!connectToSfx(metal)) {
		metal.dispose();
		return;
	}
	metal.frequency.value = 80;
	metal.triggerAttackRelease("8n", Tone.now());
	setTimeout(() => metal.dispose(), 800);
}

// ─── Harvest SFX ─────────────────────────────────────────────────────────────

/**
 * Grinding — continuous harvest loop sound.
 * Low-frequency noise with resonant filter sweep.
 */
export function playHarvestGrind() {
	const noise = new Tone.NoiseSynth({
		noise: { type: "pink" },
		envelope: { attack: 0.05, decay: 0.3, sustain: 0.2, release: 0.1 },
		volume: -16,
	});
	const filter = new Tone.Filter(800, "lowpass");
	if (!connectToSfx(filter)) {
		noise.dispose();
		filter.dispose();
		return;
	}
	noise.connect(filter);
	filter.frequency.linearRampTo(2000, 0.3, Tone.now());
	noise.triggerAttackRelease("4n", Tone.now());
	setTimeout(() => {
		noise.dispose();
		filter.dispose();
	}, 800);
}

/**
 * Material collection chime — bright ping when resources are deposited.
 */
export function playMaterialCollected() {
	const synth = new Tone.Synth({
		oscillator: { type: "sine" },
		envelope: { attack: 0.002, decay: 0.15, sustain: 0, release: 0.1 },
		volume: -14,
	});
	if (!connectToSfx(synth)) {
		synth.dispose();
		return;
	}
	const now = Tone.now();
	synth.triggerAttackRelease("E5", "16n", now);
	// Second harmonic for a pleasant ding
	const synth2 = new Tone.Synth({
		oscillator: { type: "sine" },
		envelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.1 },
		volume: -18,
	});
	connectToSfx(synth2);
	synth2.triggerAttackRelease("B5", "16n", now + 0.05);
	setTimeout(() => {
		synth.dispose();
		synth2.dispose();
	}, 600);
}

// ─── Construction SFX ────────────────────────────────────────────────────────

/**
 * Hammering — rhythmic metallic taps during construction.
 */
export function playConstructionHammer() {
	const metal = new Tone.MetalSynth({
		envelope: { attack: 0.001, decay: 0.06, release: 0.05 },
		harmonicity: 8,
		modulationIndex: 20,
		resonance: 5000,
		octaves: 1,
		volume: -16,
	});
	if (!connectToSfx(metal)) {
		metal.dispose();
		return;
	}
	metal.frequency.value = 300;
	const now = Tone.now();
	metal.triggerAttackRelease("32n", now);
	metal.triggerAttackRelease("32n", now + 0.12);
	metal.triggerAttackRelease("32n", now + 0.22);
	setTimeout(() => metal.dispose(), 600);
}

/**
 * Welding — sustained high-frequency sizzle.
 */
export function playWeldingSizzle() {
	const noise = new Tone.NoiseSynth({
		noise: { type: "white" },
		envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.15 },
		volume: -18,
	});
	const filter = new Tone.Filter(6000, "highpass");
	if (!connectToSfx(filter)) {
		noise.dispose();
		filter.dispose();
		return;
	}
	noise.connect(filter);
	noise.triggerAttackRelease("4n", Tone.now());
	setTimeout(() => {
		noise.dispose();
		filter.dispose();
	}, 700);
}

/**
 * Stage completion fanfare — brief triumphant sting.
 * Rising three-note chord.
 */
export function playStageComplete() {
	const notes = ["C4", "E4", "G4"];
	const synths: Tone.Synth[] = [];
	const now = Tone.now();

	for (let i = 0; i < notes.length; i++) {
		const synth = new Tone.Synth({
			oscillator: { type: "triangle" },
			envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 },
			volume: -14,
		});
		if (!connectToSfx(synth)) {
			synth.dispose();
			continue;
		}
		synth.triggerAttackRelease(notes[i], "8n", now + i * 0.08);
		synths.push(synth);
	}

	setTimeout(() => {
		for (const s of synths) s.dispose();
	}, 1000);
}

/**
 * Building complete fanfare — fuller chord for operational status.
 */
export function playBuildingComplete() {
	const notes = ["C4", "E4", "G4", "C5"];
	const synths: Tone.Synth[] = [];
	const now = Tone.now();

	for (let i = 0; i < notes.length; i++) {
		const synth = new Tone.Synth({
			oscillator: { type: "triangle" },
			envelope: { attack: 0.01, decay: 0.5, sustain: 0.15, release: 0.3 },
			volume: -12,
		});
		if (!connectToSfx(synth)) {
			synth.dispose();
			continue;
		}
		synth.triggerAttackRelease(notes[i], "4n", now + i * 0.06);
		synths.push(synth);
	}

	setTimeout(() => {
		for (const s of synths) s.dispose();
	}, 1500);
}

// ─── Turn SFX ────────────────────────────────────────────────────────────────

/**
 * Player turn start chime — clean bell-like tone.
 */
export function playTurnStartChime() {
	const synth = new Tone.Synth({
		oscillator: { type: "sine" },
		envelope: { attack: 0.005, decay: 0.4, sustain: 0, release: 0.2 },
		volume: -12,
	});
	if (!connectToSfx(synth)) {
		synth.dispose();
		return;
	}
	synth.triggerAttackRelease("A4", "8n", Tone.now());
	setTimeout(() => synth.dispose(), 800);
}

/**
 * AI faction phase drone — low hum indicating AI is processing.
 */
export function playAIPhaseDrone() {
	const synth = new Tone.Synth({
		oscillator: { type: "sawtooth" },
		envelope: { attack: 0.1, decay: 0.3, sustain: 0.2, release: 0.3 },
		volume: -20,
	});
	const filter = new Tone.Filter(400, "lowpass");
	if (!connectToSfx(filter)) {
		synth.dispose();
		filter.dispose();
		return;
	}
	synth.connect(filter);
	synth.triggerAttackRelease("D2", "2n", Tone.now());
	setTimeout(() => {
		synth.dispose();
		filter.dispose();
	}, 1500);
}

/**
 * New turn fanfare — brief industrial sting marking turn transition.
 */
export function playNewTurnFanfare() {
	const synth = new Tone.Synth({
		oscillator: { type: "square" },
		envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.1 },
		volume: -14,
	});
	if (!connectToSfx(synth)) {
		synth.dispose();
		return;
	}
	const now = Tone.now();
	synth.triggerAttackRelease("G4", "16n", now);
	synth.triggerAttackRelease("D5", "16n", now + 0.1);
	setTimeout(() => synth.dispose(), 500);
}

// ─── Cultist SFX ─────────────────────────────────────────────────────────────

/**
 * Cultist spawn screech — eerie descending wail.
 */
export function playCultistSpawn() {
	const synth = new Tone.Synth({
		oscillator: { type: "sawtooth" },
		envelope: { attack: 0.02, decay: 0.5, sustain: 0.1, release: 0.3 },
		volume: -12,
	});
	const filter = new Tone.Filter(2000, "bandpass");
	filter.Q.value = 8;
	if (!connectToSfx(filter)) {
		synth.dispose();
		filter.dispose();
		return;
	}
	synth.connect(filter);
	synth.triggerAttackRelease("A5", "4n", Tone.now());
	synth.frequency.exponentialRampTo(110, 0.5, Tone.now());
	setTimeout(() => {
		synth.dispose();
		filter.dispose();
	}, 1200);
}

/**
 * Cultist attack — distorted burst.
 */
export function playCultistAttack() {
	const noise = new Tone.NoiseSynth({
		noise: { type: "brown" },
		envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.05 },
		volume: -10,
	});
	const dist = new Tone.Distortion(0.8);
	if (!connectToSfx(dist)) {
		noise.dispose();
		dist.dispose();
		return;
	}
	noise.connect(dist);
	noise.triggerAttackRelease("16n", Tone.now());
	setTimeout(() => {
		noise.dispose();
		dist.dispose();
	}, 400);
}

/**
 * Lightning call — sharp crack followed by rumble.
 */
export function playLightningCall() {
	// Sharp crack
	const crack = new Tone.NoiseSynth({
		noise: { type: "white" },
		envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
		volume: -6,
	});
	if (!connectToSfx(crack)) {
		crack.dispose();
		return;
	}
	crack.triggerAttackRelease("64n", Tone.now());

	// Rumble after crack
	const rumble = new Tone.NoiseSynth({
		noise: { type: "brown" },
		envelope: { attack: 0.05, decay: 0.6, sustain: 0.1, release: 0.3 },
		volume: -14,
	});
	connectToSfx(rumble);
	rumble.triggerAttackRelease("2n", Tone.now() + 0.05);

	setTimeout(() => {
		crack.dispose();
		rumble.dispose();
	}, 1500);
}
