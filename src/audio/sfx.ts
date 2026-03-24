/**
 * Game SFX — synthesized sound effects with pooling and rate limiting.
 *
 * Architecture:
 *   - Synth POOL: each SfxName has a fixed pool of pre-created synths.
 *     On play, we grab the next available synth and return it to the pool
 *     after a cooldown. No create+dispose per play.
 *   - Rate limiting: max MAX_CONCURRENT per SfxName prevents audio mush
 *     when many events fire in one frame (e.g., 10 combats resolved).
 *   - Pool is lazily initialized on first play (after Tone.js is loaded).
 *
 * Call playSfx("unit_select") etc. from game systems and UI handlers.
 * Safe to call before initAudio() — silently no-ops if audio not ready.
 */

import type * as ToneNs from "tone";
import { getSfxOutput, isAudioInitialized } from "./audioEngine";

// Lazy Tone.js module ref
let Tone: typeof ToneNs | null = null;

async function ensureTone(): Promise<typeof ToneNs | null> {
	if (Tone) return Tone;
	if (!isAudioInitialized()) return null;
	Tone = await import("tone");
	return Tone;
}

// ─── SFX Definitions ────────────────────────────────────────────────────────

export type SfxName =
	| "unit_select"
	| "unit_move"
	| "unit_death"
	| "attack_hit"
	| "attack_miss"
	| "harvest_complete"
	| "build_complete"
	| "building_destroyed"
	| "building_upgrade"
	| "tech_researched"
	| "epoch_transition"
	| "hacking_start"
	| "hacking_complete"
	| "synthesis_complete"
	| "poi_discovered"
	| "turn_advance"
	| "cultist_spawn"
	| "victory"
	| "defeat";

/** Max concurrent instances per SfxName type. */
const MAX_CONCURRENT = 3;

/** Pool size per SfxName. */
const POOL_SIZE = 3;

// ─── Synth Pool ──────────────────────────────────────────────────────────────

interface PooledSynth {
	synth: ToneNs.Synth | ToneNs.NoiseSynth | ToneNs.FMSynth | ToneNs.PolySynth;
	/** Secondary synth for effects that use two (attack_hit). */
	secondary?: ToneNs.Synth | ToneNs.NoiseSynth;
	busy: boolean;
}

type SynthPool = PooledSynth[];

const pools = new Map<SfxName, SynthPool>();
const activeCount = new Map<SfxName, number>();

/** Synth factory — creates a fresh synth for a given SfxName. */
function createPooledSynth(
	T: typeof ToneNs,
	name: SfxName,
	output: ToneNs.Gain,
): PooledSynth {
	switch (name) {
		case "unit_select":
			return {
				synth: new T.Synth({
					oscillator: { type: "triangle" },
					envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
				}).connect(output),
				busy: false,
			};
		case "unit_move":
			return {
				synth: new T.Synth({
					oscillator: { type: "sine" },
					envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
				}).connect(output),
				busy: false,
			};
		case "unit_death": {
			// Heavy metallic crash: sawtooth attack + noise decay
			const noise = new T.NoiseSynth({
				noise: { type: "white" },
				envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.15 },
			}).connect(output);
			const synth = new T.Synth({
				oscillator: { type: "sawtooth" },
				envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.2 },
			}).connect(output);
			return { synth: noise, secondary: synth, busy: false };
		}
		case "attack_hit": {
			const noise = new T.NoiseSynth({
				noise: { type: "white" },
				envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
			}).connect(output);
			const synth = new T.Synth({
				oscillator: { type: "sawtooth" },
				envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
			}).connect(output);
			return { synth: noise, secondary: synth, busy: false };
		}
		case "attack_miss": {
			const noise = new T.NoiseSynth({
				noise: { type: "brown" },
				envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 },
			}).connect(output);
			return { synth: noise, busy: false };
		}
		case "harvest_complete":
			return {
				synth: new T.Synth({
					oscillator: { type: "triangle" },
					envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.15 },
				}).connect(output),
				busy: false,
			};
		case "build_complete":
			return {
				synth: new T.Synth({
					oscillator: { type: "square" },
					envelope: { attack: 0.01, decay: 0.15, sustain: 0.1, release: 0.2 },
				}).connect(output),
				busy: false,
			};
		case "building_destroyed": {
			// Explosion: noise burst + low-frequency rumble
			const noise = new T.NoiseSynth({
				noise: { type: "white" },
				envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
			}).connect(output);
			const synth = new T.Synth({
				oscillator: { type: "sine" },
				envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.3 },
			}).connect(output);
			return { synth: noise, secondary: synth, busy: false };
		}
		case "building_upgrade":
			return {
				synth: new T.Synth({
					oscillator: { type: "triangle" },
					envelope: { attack: 0.01, decay: 0.15, sustain: 0.1, release: 0.15 },
				}).connect(output),
				busy: false,
			};
		case "tech_researched":
			return {
				synth: new T.Synth({
					oscillator: { type: "triangle" },
					envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
				}).connect(output),
				busy: false,
			};
		case "epoch_transition":
			return {
				synth: new T.PolySynth(T.Synth, {
					oscillator: { type: "triangle" },
					envelope: { attack: 0.1, decay: 0.6, sustain: 0.3, release: 0.8 },
				}).connect(output),
				busy: false,
			};
		case "hacking_start":
			return {
				synth: new T.FMSynth({
					harmonicity: 5,
					modulationIndex: 20,
					envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.15 },
					modulation: { type: "sine" },
				}).connect(output),
				busy: false,
			};
		case "hacking_complete":
			return {
				synth: new T.Synth({
					oscillator: { type: "square" },
					envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 },
				}).connect(output),
				busy: false,
			};
		case "synthesis_complete": {
			// Chemical reaction: filtered noise + sine
			const noise = new T.NoiseSynth({
				noise: { type: "pink" },
				envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
			}).connect(output);
			const synth = new T.Synth({
				oscillator: { type: "sine" },
				envelope: { attack: 0.02, decay: 0.3, sustain: 0, release: 0.2 },
			}).connect(output);
			return { synth: noise, secondary: synth, busy: false };
		}
		case "poi_discovered":
			return {
				synth: new T.FMSynth({
					harmonicity: 2,
					modulationIndex: 8,
					envelope: { attack: 0.02, decay: 0.4, sustain: 0.1, release: 0.3 },
					modulation: { type: "triangle" },
				}).connect(output),
				busy: false,
			};
		case "turn_advance":
			return {
				synth: new T.Synth({
					oscillator: { type: "sine" },
					envelope: { attack: 0.02, decay: 0.3, sustain: 0, release: 0.2 },
				}).connect(output),
				busy: false,
			};
		case "cultist_spawn":
			return {
				synth: new T.FMSynth({
					harmonicity: 3,
					modulationIndex: 10,
					envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
					modulation: { type: "square" },
				}).connect(output),
				busy: false,
			};
		case "victory":
			return {
				synth: new T.PolySynth(T.Synth, {
					oscillator: { type: "triangle" },
					envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 0.5 },
				}).connect(output),
				busy: false,
			};
		case "defeat":
			return {
				synth: new T.Synth({
					oscillator: { type: "sawtooth" },
					envelope: { attack: 0.05, decay: 0.5, sustain: 0.2, release: 0.8 },
				}).connect(output),
				busy: false,
			};
	}
}

function getOrCreatePool(
	T: typeof ToneNs,
	name: SfxName,
	output: ToneNs.Gain,
): SynthPool {
	let pool = pools.get(name);
	if (pool) return pool;

	pool = [];
	for (let i = 0; i < POOL_SIZE; i++) {
		pool.push(createPooledSynth(T, name, output));
	}
	pools.set(name, pool);
	return pool;
}

/** Grab a free synth from the pool. Returns null if all busy or rate-limited. */
function acquireSynth(
	T: typeof ToneNs,
	name: SfxName,
	output: ToneNs.Gain,
): PooledSynth | null {
	const count = activeCount.get(name) ?? 0;
	if (count >= MAX_CONCURRENT) return null;

	const pool = getOrCreatePool(T, name, output);
	for (const entry of pool) {
		if (!entry.busy) {
			entry.busy = true;
			activeCount.set(name, count + 1);
			return entry;
		}
	}
	return null;
}

/** Release a synth back to the pool after its sound finishes. */
function releaseSynth(name: SfxName, entry: PooledSynth): void {
	entry.busy = false;
	const count = activeCount.get(name) ?? 1;
	activeCount.set(name, Math.max(0, count - 1));
}

// ─── SFX Play Functions ──────────────────────────────────────────────────────

type SfxTrigger = (entry: PooledSynth) => number;

/** Returns the total duration in ms after which the synth can be released. */
const SFX_TRIGGERS: Record<SfxName, SfxTrigger> = {
	unit_select: (e) => {
		(e.synth as ToneNs.Synth).triggerAttackRelease("C5", "16n");
		return 300;
	},

	unit_move: (e) => {
		const synth = e.synth as ToneNs.Synth;
		synth.triggerAttackRelease("E4", "16n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("G4", "16n");
			} catch {
				/* skip */
			}
		}, 80);
		return 400;
	},

	unit_death: (e) => {
		// Heavy metallic crash: sawtooth hit + noise decay
		(e.synth as ToneNs.NoiseSynth).triggerAttackRelease("8n");
		if (e.secondary) {
			(e.secondary as ToneNs.Synth).triggerAttackRelease("A2", "8n");
		}
		return 500;
	},

	attack_hit: (e) => {
		(e.synth as ToneNs.NoiseSynth).triggerAttackRelease("8n");
		if (e.secondary) {
			(e.secondary as ToneNs.Synth).triggerAttackRelease("C3", "16n");
		}
		return 400;
	},

	attack_miss: (e) => {
		(e.synth as ToneNs.NoiseSynth).triggerAttackRelease("32n");
		return 200;
	},

	harvest_complete: (e) => {
		const synth = e.synth as ToneNs.Synth;
		synth.triggerAttackRelease("E5", "16n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("G5", "16n");
			} catch {
				/* skip */
			}
		}, 100);
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("B5", "16n");
			} catch {
				/* skip */
			}
		}, 200);
		return 500;
	},

	build_complete: (e) => {
		const synth = e.synth as ToneNs.Synth;
		synth.triggerAttackRelease("C4", "8n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("E4", "8n");
			} catch {
				/* skip */
			}
		}, 120);
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("G4", "8n");
			} catch {
				/* skip */
			}
		}, 240);
		return 640;
	},

	building_destroyed: (e) => {
		// Explosion: noise burst + low-frequency rumble
		(e.synth as ToneNs.NoiseSynth).triggerAttackRelease("4n");
		if (e.secondary) {
			(e.secondary as ToneNs.Synth).triggerAttackRelease("E1", "4n");
		}
		return 700;
	},

	building_upgrade: (e) => {
		// Rising tone + click
		const synth = e.synth as ToneNs.Synth;
		synth.triggerAttackRelease("C5", "16n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("E5", "16n");
			} catch {
				/* skip */
			}
		}, 80);
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("G5", "16n");
			} catch {
				/* skip */
			}
		}, 160);
		return 460;
	},

	tech_researched: (e) => {
		// Discovery chime: ascending triangle arpeggio
		const synth = e.synth as ToneNs.Synth;
		synth.triggerAttackRelease("C5", "16n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("E5", "16n");
			} catch {
				/* skip */
			}
		}, 100);
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("G5", "16n");
			} catch {
				/* skip */
			}
		}, 200);
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("C6", "8n");
			} catch {
				/* skip */
			}
		}, 300);
		return 700;
	},

	epoch_transition: (e) => {
		// Dramatic chord progression — longer, grander
		const synth = e.synth as ToneNs.PolySynth;
		synth.triggerAttackRelease(["C3", "E3", "G3"], "4n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease(["F3", "A3", "C4"], "4n");
			} catch {
				/* skip */
			}
		}, 500);
		setTimeout(() => {
			try {
				synth.triggerAttackRelease(["G3", "B3", "D4"], "4n");
			} catch {
				/* skip */
			}
		}, 1000);
		setTimeout(() => {
			try {
				synth.triggerAttackRelease(["C3", "E3", "G3", "C4"], "2n");
			} catch {
				/* skip */
			}
		}, 1500);
		return 3000;
	},

	hacking_start: (e) => {
		// Electronic interference: FM synth modulated tone
		const synth = e.synth as ToneNs.FMSynth;
		synth.triggerAttackRelease("A3", "8n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("C4", "8n");
			} catch {
				/* skip */
			}
		}, 120);
		return 400;
	},

	hacking_complete: (e) => {
		// Digital success: quick ascending beeps
		const synth = e.synth as ToneNs.Synth;
		synth.triggerAttackRelease("E5", "32n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("G5", "32n");
			} catch {
				/* skip */
			}
		}, 60);
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("B5", "32n");
			} catch {
				/* skip */
			}
		}, 120);
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("E6", "16n");
			} catch {
				/* skip */
			}
		}, 180);
		return 400;
	},

	synthesis_complete: (e) => {
		// Chemical reaction: filtered noise + sine
		(e.synth as ToneNs.NoiseSynth).triggerAttackRelease("8n");
		if (e.secondary) {
			(e.secondary as ToneNs.Synth).triggerAttackRelease("D4", "8n");
		}
		setTimeout(() => {
			try {
				if (e.secondary) {
					(e.secondary as ToneNs.Synth).triggerAttackRelease("F#4", "8n");
				}
			} catch {
				/* skip */
			}
		}, 150);
		return 500;
	},

	poi_discovered: (e) => {
		// Mysterious find: bell-like FM synth
		const synth = e.synth as ToneNs.FMSynth;
		synth.triggerAttackRelease("E5", "8n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("B5", "8n");
			} catch {
				/* skip */
			}
		}, 200);
		return 600;
	},

	turn_advance: (e) => {
		(e.synth as ToneNs.Synth).triggerAttackRelease("G4", "8n");
		return 500;
	},

	cultist_spawn: (e) => {
		(e.synth as ToneNs.FMSynth).triggerAttackRelease("D#3", "8n");
		return 500;
	},

	victory: (e) => {
		const synth = e.synth as ToneNs.PolySynth;
		synth.triggerAttackRelease(["C4", "E4", "G4"], "4n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease(["C4", "E4", "G4", "C5"], "2n");
			} catch {
				/* skip */
			}
		}, 400);
		return 1900;
	},

	defeat: (e) => {
		const synth = e.synth as ToneNs.Synth;
		synth.triggerAttackRelease("C3", "4n");
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("B2", "4n");
			} catch {
				/* skip */
			}
		}, 400);
		setTimeout(() => {
			try {
				synth.triggerAttackRelease("Bb2", "2n");
			} catch {
				/* skip */
			}
		}, 800);
		return 2300;
	},
};

// ─── Rate limiter ───────────────────────────────────────────────────────────

/** Minimum interval (ms) between plays of the same SfxName. */
const MIN_PLAY_INTERVAL_MS = 50;
const lastPlayTime = new Map<SfxName, number>();

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Play a named sound effect. No-ops if audio engine is not initialized
 * or if the rate limit for this SfxName has been reached.
 * Fire-and-forget — synths are pooled and reused.
 */
export function playSfx(name: SfxName): void {
	const output = getSfxOutput();
	if (!output) return;

	// Rate limiter: skip if same SFX played less than 50ms ago
	const now = performance.now();
	const last = lastPlayTime.get(name) ?? 0;
	if (now - last < MIN_PLAY_INTERVAL_MS) return;
	lastPlayTime.set(name, now);

	ensureTone().then((T) => {
		if (!T) return;
		const currentOutput = getSfxOutput();
		if (!currentOutput) return;

		const entry = acquireSynth(T, name, currentOutput);
		if (!entry) return; // Rate-limited or pool exhausted

		try {
			const duration = SFX_TRIGGERS[name](entry);
			setTimeout(() => releaseSynth(name, entry), duration);
		} catch {
			// Swallow audio errors — never crash the game for sound
			releaseSynth(name, entry);
		}
	});
}

/**
 * Dispose all pooled synths. Call on game exit or audio teardown.
 */
export function disposeSfxPools(): void {
	for (const [, pool] of pools) {
		for (const entry of pool) {
			try {
				entry.synth.dispose();
				entry.secondary?.dispose();
			} catch {
				// Swallow disposal errors
			}
		}
	}
	pools.clear();
	activeCount.clear();
	lastPlayTime.clear();
}
