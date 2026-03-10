/**
 * Factory-specific sound effects using Tone.js.
 *
 * Provides synthesized audio for belt motors, drills, processor hums,
 * hacking interference, footsteps, belt item transfers, and cultist
 * lightning. Each looping sound returns a stop function for cleanup.
 *
 * All nodes connect through a local volume node to Tone.Destination,
 * matching the pattern used by SpatialAudio.ts.
 */

import * as Tone from "tone";

// Shared volume for all factory sounds — matches masterVolume level in SpatialAudio
const factoryVolume = new Tone.Volume(-6).toDestination();

// ---------------------------------------------------------------------------
// Belt motor — looping mechanical hum
// ---------------------------------------------------------------------------

/**
 * Low-frequency sawtooth (40Hz) layered with filtered noise for motor texture.
 * Returns a stop function to clean up all nodes.
 */
export function playBeltMotor(): (() => void) | null {
	if (Tone.getContext().state !== "running") return null;

	const osc = new Tone.Oscillator({ frequency: 40, type: "sawtooth" });
	const oscFilter = new Tone.Filter(120, "lowpass");
	const oscVol = new Tone.Volume(-18);

	const noise = new Tone.Noise("brown");
	const noiseFilter = new Tone.Filter(200, "bandpass");
	const noiseVol = new Tone.Volume(-22);

	osc.connect(oscFilter);
	oscFilter.connect(oscVol);
	oscVol.connect(factoryVolume);

	noise.connect(noiseFilter);
	noiseFilter.connect(noiseVol);
	noiseVol.connect(factoryVolume);

	osc.start();
	noise.start();

	return () => {
		osc.stop();
		noise.stop();
		osc.dispose();
		oscFilter.dispose();
		oscVol.dispose();
		noise.dispose();
		noiseFilter.dispose();
		noiseVol.dispose();
	};
}

// ---------------------------------------------------------------------------
// Drill sound — looping with LFO modulation
// ---------------------------------------------------------------------------

/**
 * Higher frequency oscillator (200Hz) with LFO modulation for drill rotation.
 * Returns a stop function.
 */
export function playDrillSound(): (() => void) | null {
	if (Tone.getContext().state !== "running") return null;

	const osc = new Tone.Oscillator({ frequency: 200, type: "sawtooth" });
	const lfo = new Tone.LFO({ frequency: 8, min: 150, max: 250 });
	const filter = new Tone.Filter(600, "lowpass");
	const vol = new Tone.Volume(-14);

	lfo.connect(osc.frequency);
	osc.connect(filter);
	filter.connect(vol);
	vol.connect(factoryVolume);

	lfo.start();
	osc.start();

	return () => {
		osc.stop();
		lfo.stop();
		osc.dispose();
		lfo.dispose();
		filter.dispose();
		vol.dispose();
	};
}

// ---------------------------------------------------------------------------
// Processor hum — per-type variations
// ---------------------------------------------------------------------------

/**
 * Different hum per processor type:
 * - smelter:   deep rumble (30Hz oscillator + brown noise)
 * - refiner:   high whine (800Hz sine with slight vibrato)
 * - separator: rhythmic pulse (60Hz with tremolo LFO)
 *
 * Returns a stop function.
 */
export function playProcessorHum(
	type: "smelter" | "refiner" | "separator" = "smelter",
): (() => void) | null {
	if (Tone.getContext().state !== "running") return null;

	const vol = new Tone.Volume(-16);
	vol.connect(factoryVolume);

	const disposables: Tone.ToneAudioNode[] = [vol];

	if (type === "smelter") {
		const osc = new Tone.Oscillator({ frequency: 30, type: "sawtooth" });
		const filter = new Tone.Filter(80, "lowpass");
		const noise = new Tone.Noise("brown");
		const noiseFilter = new Tone.Filter(100, "lowpass");
		const noiseVol = new Tone.Volume(-20);

		osc.connect(filter);
		filter.connect(vol);
		noise.connect(noiseFilter);
		noiseFilter.connect(noiseVol);
		noiseVol.connect(vol);

		osc.start();
		noise.start();
		disposables.push(osc, filter, noise, noiseFilter, noiseVol);

		return () => {
			osc.stop();
			noise.stop();
			for (const node of disposables) node.dispose();
		};
	}

	if (type === "refiner") {
		const osc = new Tone.Oscillator({ frequency: 800, type: "sine" });
		const vibrato = new Tone.LFO({ frequency: 5, min: 780, max: 820 });
		const filter = new Tone.Filter(1200, "lowpass");

		vibrato.connect(osc.frequency);
		osc.connect(filter);
		filter.connect(vol);

		vibrato.start();
		osc.start();
		disposables.push(osc, vibrato, filter);

		return () => {
			osc.stop();
			vibrato.stop();
			for (const node of disposables) node.dispose();
		};
	}

	// separator — rhythmic pulse
	const osc = new Tone.Oscillator({ frequency: 60, type: "square" });
	const tremolo = new Tone.LFO({ frequency: 3, min: 0, max: 1 });
	const gain = new Tone.Gain(0);
	const filter = new Tone.Filter(150, "lowpass");

	tremolo.connect(gain.gain);
	osc.connect(gain);
	gain.connect(filter);
	filter.connect(vol);

	tremolo.start();
	osc.start();
	disposables.push(osc, tremolo, gain, filter);

	return () => {
		osc.stop();
		tremolo.stop();
		for (const node of disposables) node.dispose();
	};
}

// ---------------------------------------------------------------------------
// Hacking noise — digital interference
// ---------------------------------------------------------------------------

/**
 * Bitcrushed noise with rapid pitch sweeps for digital interference.
 * Returns a stop function.
 */
export function playHackingNoise(): (() => void) | null {
	if (Tone.getContext().state !== "running") return null;

	const noise = new Tone.Noise("white");
	const crusher = new Tone.BitCrusher(4);
	const sweepOsc = new Tone.Oscillator({ frequency: 100, type: "sawtooth" });
	const sweepLfo = new Tone.LFO({ frequency: 12, min: 60, max: 2000 });
	const filter = new Tone.Filter(1000, "bandpass");
	const vol = new Tone.Volume(-12);

	sweepLfo.connect(filter.frequency);
	noise.connect(crusher);
	crusher.connect(filter);
	sweepOsc.connect(filter);
	filter.connect(vol);
	vol.connect(factoryVolume);

	noise.start();
	sweepOsc.start();
	sweepLfo.start();

	return () => {
		noise.stop();
		sweepOsc.stop();
		sweepLfo.stop();
		noise.dispose();
		crusher.dispose();
		sweepOsc.dispose();
		sweepLfo.dispose();
		filter.dispose();
		vol.dispose();
	};
}

// ---------------------------------------------------------------------------
// Footstep — one-shot metallic
// ---------------------------------------------------------------------------

/**
 * Short noise burst through a bandpass filter (~2kHz) with slight
 * randomization each call for variation.
 */
export function playFootstep(): void {
	if (Tone.getContext().state !== "running") return;

	const noise = new Tone.Noise("white");
	const filter = new Tone.Filter({
		frequency: 1800 + Math.random() * 400,
		type: "bandpass",
		Q: 4,
	});
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.003,
		decay: 0.06,
		sustain: 0,
		release: 0.04,
	});
	const vol = new Tone.Volume(-15 + Math.random() * 3);

	noise.connect(filter);
	filter.connect(env);
	env.connect(vol);
	vol.connect(factoryVolume);

	noise.start();
	env.triggerAttackRelease(0.05);

	setTimeout(() => {
		noise.stop();
		noise.dispose();
		filter.dispose();
		env.dispose();
		vol.dispose();
	}, 300);
}

// ---------------------------------------------------------------------------
// Belt item transfer — short clunk
// ---------------------------------------------------------------------------

/**
 * Brief impact noise when an item transfers between belts.
 */
export function playBeltItem(): void {
	if (Tone.getContext().state !== "running") return;

	const synth = new Tone.MetalSynth({
		envelope: { attack: 0.001, decay: 0.08, release: 0.05 },
		harmonicity: 2,
		modulationIndex: 8,
		resonance: 3000,
		octaves: 0.5,
	});
	const vol = new Tone.Volume(-18);

	synth.connect(vol);
	vol.connect(factoryVolume);

	synth.triggerAttackRelease("C3", 0.04);

	setTimeout(() => {
		synth.dispose();
		vol.dispose();
	}, 400);
}

// ---------------------------------------------------------------------------
// Cultist lightning — dramatic electrical discharge
// ---------------------------------------------------------------------------

/**
 * White noise burst with descending pitch sweep and reverb tail.
 * Louder and longer than regular lightning from SpatialAudio.
 */
export function playCultistLightning(): void {
	if (Tone.getContext().state !== "running") return;

	// Main noise burst
	const noise = new Tone.Noise("white");
	const noiseFilter = new Tone.Filter(2000, "lowpass");
	const noiseEnv = new Tone.AmplitudeEnvelope({
		attack: 0.005,
		decay: 0.4,
		sustain: 0.15,
		release: 2.0,
	});

	// Descending pitch sweep
	const sweepOsc = new Tone.Oscillator({ frequency: 3000, type: "sine" });
	const sweepEnv = new Tone.AmplitudeEnvelope({
		attack: 0.005,
		decay: 0.3,
		sustain: 0.05,
		release: 0.8,
	});

	// Reverb tail
	const reverb = new Tone.Reverb({ decay: 3, wet: 0.6 });
	const vol = new Tone.Volume(0);

	noise.connect(noiseFilter);
	noiseFilter.connect(noiseEnv);
	noiseEnv.connect(reverb);

	sweepOsc.connect(sweepEnv);
	sweepEnv.connect(reverb);

	reverb.connect(vol);
	vol.connect(factoryVolume);

	noise.start();
	sweepOsc.start();
	noiseEnv.triggerAttackRelease(1.2);
	sweepEnv.triggerAttackRelease(0.6);

	// Descending pitch sweep over 600ms
	sweepOsc.frequency.linearRampTo(200, 0.6);

	// Cleanup after sound fully decays
	setTimeout(() => {
		noise.stop();
		sweepOsc.stop();
		noise.dispose();
		noiseFilter.dispose();
		noiseEnv.dispose();
		sweepOsc.dispose();
		sweepEnv.dispose();
		reverb.dispose();
		vol.dispose();
	}, 5000);
}
