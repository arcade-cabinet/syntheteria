/**
 * Per-biome ambient soundscapes for Syntheteria.
 *
 * Each biome has a unique layered ambience that plays when the player
 * is in that zone. Biomes crossfade over CROSSFADE_DURATION_MS when
 * the player moves between zones.
 *
 * Biome sound identities:
 *   rust_plains      — industrial hum (low saw) + distant machinery
 *   scrap_hills      — metallic wind through debris (bandpass noise)
 *   crystal_flats    — high crystalline drones (sine harmonics)
 *   deep_forge       — deep rumble (subsonic oscillator) + sparks
 *   storm_ridge      — howling wind (auto-filter noise) + crackle
 *
 * All layers route through the ambience bus from SoundEngine.
 */

import * as Tone from "tone";
import { getCategoryBus, isAudioInitialized } from "./SoundEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BiomeId =
	| "rust_plains"
	| "scrap_hills"
	| "crystal_flats"
	| "deep_forge"
	| "storm_ridge";

interface BiomeLayer {
	/** Start all audio nodes. */
	start: () => void;
	/** Stop all audio nodes. */
	stop: () => void;
	/** Dispose all audio nodes. */
	dispose: () => void;
	/** Crossfade volume node for smooth transitions. */
	gain: Tone.Gain;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CROSSFADE_DURATION_S = 2.0; // seconds for biome transition
const FADE_OUT_DURATION_S = 1.5;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let activeBiome: BiomeId | null = null;
let activeLayer: BiomeLayer | null = null;
let incomingLayer: BiomeLayer | null = null;

// ---------------------------------------------------------------------------
// Biome layer factories
// ---------------------------------------------------------------------------

function createRustPlainsLayer(bus: Tone.Volume): BiomeLayer {
	// Industrial hum: sawtooth through low-pass
	const hum = new Tone.Oscillator({ frequency: 55, type: "sawtooth" });
	const humFilter = new Tone.Filter(120, "lowpass");
	const humLfo = new Tone.LFO({ frequency: 0.08, min: 50, max: 60 });
	const humVol = new Tone.Volume(-20);

	// Distant machinery: bandpass noise
	const machinery = new Tone.Noise("brown");
	const machineryFilter = new Tone.Filter({
		frequency: 400,
		type: "bandpass",
		Q: 0.8,
	});
	const machineryVol = new Tone.Volume(-28);

	const gain = new Tone.Gain(0);
	gain.connect(bus);

	humLfo.connect(hum.frequency);
	hum.connect(humFilter);
	humFilter.connect(humVol);
	humVol.connect(gain);

	machinery.connect(machineryFilter);
	machineryFilter.connect(machineryVol);
	machineryVol.connect(gain);

	return {
		gain,
		start: () => {
			humLfo.start();
			hum.start();
			machinery.start();
		},
		stop: () => {
			hum.stop();
			humLfo.stop();
			machinery.stop();
		},
		dispose: () => {
			hum.dispose();
			humFilter.dispose();
			humLfo.dispose();
			humVol.dispose();
			machinery.dispose();
			machineryFilter.dispose();
			machineryVol.dispose();
			gain.dispose();
		},
	};
}

function createScrapHillsLayer(bus: Tone.Volume): BiomeLayer {
	// Metallic wind: auto-filter noise sweeping
	const wind = new Tone.Noise("pink");
	const windFilter = new Tone.AutoFilter({
		frequency: 0.2,
		baseFrequency: 300,
		octaves: 2.5,
	});
	const windVol = new Tone.Volume(-18);

	// Metal debris resonance: narrow bandpass noise burst
	const debris = new Tone.Noise("white");
	const debrisFilter = new Tone.Filter({
		frequency: 1800,
		type: "bandpass",
		Q: 4,
	});
	const debrisLfo = new Tone.LFO({ frequency: 0.15, min: 0.0, max: 0.3 });
	const debrisGain = new Tone.Gain(0);
	const debrisVol = new Tone.Volume(-24);

	const gain = new Tone.Gain(0);
	gain.connect(bus);

	windFilter.start();
	wind.connect(windFilter);
	windFilter.connect(windVol);
	windVol.connect(gain);

	debrisLfo.connect(debrisGain.gain);
	debris.connect(debrisFilter);
	debrisFilter.connect(debrisGain);
	debrisGain.connect(debrisVol);
	debrisVol.connect(gain);

	return {
		gain,
		start: () => {
			wind.start();
			debris.start();
			debrisLfo.start();
		},
		stop: () => {
			wind.stop();
			debris.stop();
			debrisLfo.stop();
		},
		dispose: () => {
			wind.dispose();
			windFilter.dispose();
			windVol.dispose();
			debris.dispose();
			debrisFilter.dispose();
			debrisLfo.dispose();
			debrisGain.dispose();
			debrisVol.dispose();
			gain.dispose();
		},
	};
}

function createCrystalFlatsLayer(bus: Tone.Volume): BiomeLayer {
	// Crystalline drone: stacked sine harmonics
	const frequencies = [220, 330, 440, 550];
	const oscs = frequencies.map(
		(f) => new Tone.Oscillator({ frequency: f, type: "sine" }),
	);
	const oscVols = frequencies.map(
		(_, i) => new Tone.Volume(-20 - i * 3),
	);
	const reverb = new Tone.Reverb({ decay: 4, wet: 0.6 });

	// High shimmer: very high frequency filtered noise
	const shimmer = new Tone.Noise("white");
	const shimmerFilter = new Tone.Filter(4000, "highpass");
	const shimmerVol = new Tone.Volume(-32);

	const gain = new Tone.Gain(0);
	gain.connect(bus);

	for (let i = 0; i < oscs.length; i++) {
		oscs[i].connect(oscVols[i]);
		oscVols[i].connect(reverb);
	}
	reverb.connect(gain);

	shimmer.connect(shimmerFilter);
	shimmerFilter.connect(shimmerVol);
	shimmerVol.connect(gain);

	return {
		gain,
		start: () => {
			for (const osc of oscs) osc.start();
			shimmer.start();
		},
		stop: () => {
			for (const osc of oscs) osc.stop();
			shimmer.stop();
		},
		dispose: () => {
			for (const osc of oscs) osc.dispose();
			for (const vol of oscVols) vol.dispose();
			reverb.dispose();
			shimmer.dispose();
			shimmerFilter.dispose();
			shimmerVol.dispose();
			gain.dispose();
		},
	};
}

function createDeepForgeLayer(bus: Tone.Volume): BiomeLayer {
	// Sub-bass rumble: very low oscillator
	const sub = new Tone.Oscillator({ frequency: 28, type: "sawtooth" });
	const subFilter = new Tone.Filter(60, "lowpass");
	const subVol = new Tone.Volume(-12);

	// Forge sparks: random crackle via fast LFO-gated noise
	const sparks = new Tone.Noise("white");
	const sparkFilter = new Tone.Filter(3500, "highpass");
	const sparkLfo = new Tone.LFO({ frequency: 7, min: 0, max: 1, type: "square" });
	const sparkGain = new Tone.Gain(0);
	const sparkVol = new Tone.Volume(-22);

	const gain = new Tone.Gain(0);
	gain.connect(bus);

	sub.connect(subFilter);
	subFilter.connect(subVol);
	subVol.connect(gain);

	sparkLfo.connect(sparkGain.gain);
	sparks.connect(sparkFilter);
	sparkFilter.connect(sparkGain);
	sparkGain.connect(sparkVol);
	sparkVol.connect(gain);

	return {
		gain,
		start: () => {
			sub.start();
			sparks.start();
			sparkLfo.start();
		},
		stop: () => {
			sub.stop();
			sparks.stop();
			sparkLfo.stop();
		},
		dispose: () => {
			sub.dispose();
			subFilter.dispose();
			subVol.dispose();
			sparks.dispose();
			sparkFilter.dispose();
			sparkLfo.dispose();
			sparkGain.dispose();
			sparkVol.dispose();
			gain.dispose();
		},
	};
}

function createStormRidgeLayer(bus: Tone.Volume): BiomeLayer {
	// Howling wind: auto-filtered noise at high sweep rate
	const wind = new Tone.Noise("brown");
	const windFilter = new Tone.AutoFilter({
		frequency: 0.6,
		baseFrequency: 100,
		octaves: 3.5,
		depth: 0.9,
	});
	const windVol = new Tone.Volume(-14);

	// Electrical crackle: high-frequency gated noise
	const crackle = new Tone.Noise("white");
	const crackleFilter = new Tone.Filter(4500, "highpass");
	const crackleLfo = new Tone.LFO({ frequency: 12, min: 0, max: 1, type: "square" });
	const crackleGain = new Tone.Gain(0);
	const crackleVol = new Tone.Volume(-18);

	const gain = new Tone.Gain(0);
	gain.connect(bus);

	windFilter.start();
	wind.connect(windFilter);
	windFilter.connect(windVol);
	windVol.connect(gain);

	crackleLfo.connect(crackleGain.gain);
	crackle.connect(crackleFilter);
	crackleFilter.connect(crackleGain);
	crackleGain.connect(crackleVol);
	crackleVol.connect(gain);

	return {
		gain,
		start: () => {
			wind.start();
			crackle.start();
			crackleLfo.start();
		},
		stop: () => {
			wind.stop();
			crackle.stop();
			crackleLfo.stop();
		},
		dispose: () => {
			wind.dispose();
			windFilter.dispose();
			windVol.dispose();
			crackle.dispose();
			crackleFilter.dispose();
			crackleLfo.dispose();
			crackleGain.dispose();
			crackleVol.dispose();
			gain.dispose();
		},
	};
}

function createBiomeLayer(biome: BiomeId, bus: Tone.Volume): BiomeLayer {
	switch (biome) {
		case "rust_plains":
			return createRustPlainsLayer(bus);
		case "scrap_hills":
			return createScrapHillsLayer(bus);
		case "crystal_flats":
			return createCrystalFlatsLayer(bus);
		case "deep_forge":
			return createDeepForgeLayer(bus);
		case "storm_ridge":
			return createStormRidgeLayer(bus);
	}
}

// ---------------------------------------------------------------------------
// Crossfade helper
// ---------------------------------------------------------------------------

function fadeIn(layer: BiomeLayer, durationS: number): void {
	layer.gain.gain.rampTo(1, durationS);
}

function fadeOut(layer: BiomeLayer, durationS: number): void {
	layer.gain.gain.rampTo(0, durationS);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Transition to the ambient soundscape for the given biome.
 * Crossfades from the current biome over CROSSFADE_DURATION_S seconds.
 * If the biome is already active, this is a no-op.
 *
 * @param biome - The target biome identifier.
 */
export function setBiome(biome: BiomeId): void {
	if (!isAudioInitialized()) return;
	if (biome === activeBiome) return;

	const bus = getCategoryBus("ambience");
	if (!bus) return;

	// Fade out current layer
	if (activeLayer) {
		const outgoing = activeLayer;
		fadeOut(outgoing, FADE_OUT_DURATION_S);
		// Dispose after fade completes
		setTimeout(() => {
			outgoing.stop();
			outgoing.dispose();
		}, FADE_OUT_DURATION_S * 1000 + 100);
		activeLayer = null;
	}

	// Fade in new layer
	incomingLayer?.stop();
	incomingLayer?.dispose();

	const newLayer = createBiomeLayer(biome, bus);
	newLayer.start();
	newLayer.gain.gain.setValueAtTime(0, Tone.now());
	fadeIn(newLayer, CROSSFADE_DURATION_S);

	activeBiome = biome;
	activeLayer = newLayer;
	incomingLayer = null;
}

/**
 * Stop and dispose the active biome ambience.
 * Fades out over 1 second before disposal.
 */
export function stopBiomeAmbience(): void {
	if (activeLayer) {
		const layer = activeLayer;
		fadeOut(layer, 1);
		setTimeout(() => {
			layer.stop();
			layer.dispose();
		}, 1100);
		activeLayer = null;
	}
	activeBiome = null;
}

/**
 * Get the currently active biome id. Returns null if none is active.
 */
export function getActiveBiome(): BiomeId | null {
	return activeBiome;
}

/**
 * Check if a biome ambience is currently running.
 */
export function isBiomeAmbienceActive(): boolean {
	return activeLayer !== null;
}
