/**
 * Spatial audio system using Tone.js.
 *
 * Provides positional 3D audio for:
 * - Storm ambience (omnidirectional, intensity-modulated)
 * - Lightning strikes (positional, loud transients)
 * - Machinery hum (positional, near fabrication units/lightning rods)
 * - Combat sounds (positional impacts)
 * - UI feedback (non-positional clicks/beeps)
 *
 * The listener position is updated each frame to match the player bot.
 */

import * as Tone from "tone";

// Audio state
let initialized = false;
let masterVolume: Tone.Volume;

// Ambient layers
let stormNoise: Tone.Noise | null = null;
let stormFilter: Tone.AutoFilter | null = null;
let stormVolume: Tone.Volume | null = null;

/**
 * Initialize the audio system. Must be called from a user gesture (click/tap).
 */
export async function initAudio(): Promise<void> {
	if (initialized) return;

	await Tone.start();

	masterVolume = new Tone.Volume(-6).toDestination();

	// --- Storm ambience ---
	stormVolume = new Tone.Volume(-12).connect(masterVolume);
	stormFilter = new Tone.AutoFilter({
		frequency: 0.15,
		baseFrequency: 100,
		octaves: 3,
		depth: 0.8,
	})
		.connect(stormVolume)
		.start();
	stormNoise = new Tone.Noise("brown").connect(stormFilter);
	stormNoise.start();

	initialized = true;
}

/**
 * Update storm intensity — modulates the ambience volume and filter.
 */
export function updateStormIntensity(intensity: number): void {
	if (!stormVolume || !stormFilter) return;
	// Map intensity 0-1.5 to volume -20 to -6 dB
	stormVolume.volume.value = -20 + intensity * 10;
	stormFilter.frequency.value = 0.1 + intensity * 0.3;
}

/**
 * Play a lightning strike sound effect.
 */
export function playLightningStrike(): void {
	if (!initialized) return;

	// Synthetic thunder using noise burst + filter
	const noise = new Tone.Noise("white");
	const filter = new Tone.Filter(800, "lowpass");
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.01,
		decay: 0.3,
		sustain: 0.1,
		release: 1.5,
	});
	const vol = new Tone.Volume(-3).connect(masterVolume);

	noise.connect(filter);
	filter.connect(env);
	env.connect(vol);

	noise.start();
	env.triggerAttackRelease(0.8);

	// Cleanup after sound finishes
	setTimeout(() => {
		noise.stop();
		noise.dispose();
		filter.dispose();
		env.dispose();
		vol.dispose();
	}, 3000);
}

/**
 * Play a metallic impact sound (for combat).
 */
export function playMetalImpact(): void {
	if (!initialized) return;

	const synth = new Tone.MetalSynth({
		envelope: { attack: 0.001, decay: 0.2, release: 0.3 },
		harmonicity: 3.1,
		modulationIndex: 16,
		resonance: 2000,
		octaves: 1.5,
	}).connect(masterVolume);

	synth.volume.value = -12;
	synth.triggerAttackRelease("C2", 0.15);

	setTimeout(() => synth.dispose(), 1000);
}

/**
 * Play a UI feedback beep.
 */
export function playUIBeep(): void {
	if (!initialized) return;

	const synth = new Tone.Synth({
		oscillator: { type: "square" },
		envelope: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.05 },
	}).connect(masterVolume);

	synth.volume.value = -18;
	synth.triggerAttackRelease("C5", 0.03);

	setTimeout(() => synth.dispose(), 200);
}

/**
 * Play a machinery hum (looping, returns stop function).
 */
export function playMachineryHum(): (() => void) | null {
	if (!initialized) return null;

	const osc = new Tone.Oscillator({
		frequency: 60,
		type: "sawtooth",
	});
	const filter = new Tone.Filter(200, "lowpass");
	const vol = new Tone.Volume(-24).connect(masterVolume);

	osc.connect(filter);
	filter.connect(vol);
	osc.start();

	return () => {
		osc.stop();
		osc.dispose();
		filter.dispose();
		vol.dispose();
	};
}

/**
 * Clean up all audio resources.
 */
export function disposeAudio(): void {
	stormNoise?.stop();
	stormNoise?.dispose();
	stormFilter?.dispose();
	stormVolume?.dispose();
	masterVolume?.dispose();
	initialized = false;
}

export function isAudioInitialized(): boolean {
	return initialized;
}
