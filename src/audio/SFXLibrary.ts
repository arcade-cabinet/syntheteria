/**
 * SFX Library for Syntheteria — factory and combat sound effects.
 *
 * All sounds are procedurally generated via Tone.js synthesis.
 * Parameters are driven by config/audio.json sfx section.
 *
 * Sound palette:
 *   playFurnaceRoar        — looping furnace ambience (fire + sizzle)
 *   playHydraulicPress     — compression slam (low thud + pressure release)
 *   playMagneticHum        — grabber beam engagement (sine with vibrato)
 *   playBeltClank          — cube sliding onto belt
 *   playLaserShot          — combat projectile sweep
 *   playCombatImpact       — generic combat hit
 */

import * as Tone from "tone";
import audioConfig from "../../config/audio.json";
import { getCategoryBus, isAudioInitialized } from "./SoundEngine";

// ---------------------------------------------------------------------------
// Config shortcuts
// ---------------------------------------------------------------------------

const sfxCfg = audioConfig.sfx;

function sfxBus(): Tone.Volume | null {
	return getCategoryBus("sfx");
}

function ambienceBus(): Tone.Volume | null {
	return getCategoryBus("ambience");
}

// ---------------------------------------------------------------------------
// Furnace roar — looping layered synthesis
// ---------------------------------------------------------------------------

/**
 * Looping furnace ambience: brown-noise fire layer + sine sizzle tone.
 * Returns a stop function. Place near furnace machines.
 *
 * Routes through ambience bus (continuous background sound).
 */
export function playFurnaceRoar(): (() => void) | null {
	if (!isAudioInitialized()) return null;
	const bus = ambienceBus();
	if (!bus) return null;

	const cfg = sfxCfg.furnace;

	// Fire layer — filtered brown noise
	const fireNoise = new Tone.Noise("brown");
	const fireFilter = new Tone.Filter(cfg.noiseFilterFrequency, "lowpass");
	const fireVol = new Tone.Volume(cfg.volumeDb - 4);

	fireNoise.connect(fireFilter);
	fireFilter.connect(fireVol);
	fireVol.connect(bus);
	fireNoise.start();

	// Sizzle layer — low sine oscillator with slight tremolo
	const sizzle = new Tone.Oscillator({
		frequency: cfg.sizzleFrequency,
		type: "sine",
	});
	const sizzleLfo = new Tone.LFO({ frequency: 0.3, min: 0.4, max: 0.8 });
	const sizzleGain = new Tone.Gain(0.6);
	const sizzleVol = new Tone.Volume(cfg.volumeDb + 2);

	sizzleLfo.connect(sizzleGain.gain);
	sizzle.connect(sizzleGain);
	sizzleGain.connect(sizzleVol);
	sizzleVol.connect(bus);

	sizzleLfo.start();
	sizzle.start();

	return () => {
		fireNoise.stop();
		sizzle.stop();
		sizzleLfo.stop();
		fireNoise.dispose();
		fireFilter.dispose();
		fireVol.dispose();
		sizzle.dispose();
		sizzleLfo.dispose();
		sizzleGain.dispose();
		sizzleVol.dispose();
	};
}

// ---------------------------------------------------------------------------
// Hydraulic press — dramatic compression slam
// ---------------------------------------------------------------------------

/**
 * Heavy hydraulic compression event: slow pressure build (sine ramp down)
 * followed by a sharp slam (membrane synth + noise burst).
 * More dramatic than playCompression — used for the final cube eject moment.
 */
export function playHydraulicPress(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const cfg = sfxCfg.hydraulicPress;

	// Pressure build — low sine descending
	const pressOsc = new Tone.Oscillator({
		frequency: cfg.pressFrequency * 2,
		type: "sawtooth",
	});
	const pressEnv = new Tone.AmplitudeEnvelope({
		attack: 0.1,
		decay: cfg.releaseDecay,
		sustain: 0.3,
		release: 0.1,
	});
	const pressVol = new Tone.Volume(cfg.volumeDb + 4);
	pressVol.connect(bus);
	pressOsc.connect(pressEnv);
	pressEnv.connect(pressVol);
	pressOsc.start();
	pressOsc.frequency.linearRampTo(cfg.pressFrequency, cfg.releaseDecay);
	pressEnv.triggerAttackRelease(cfg.releaseDecay);

	// Slam — membrane synth hit at peak of press
	const slam = new Tone.MembraneSynth({
		pitchDecay: 0.08,
		octaves: 5,
		envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
	});
	const slamVol = new Tone.Volume(cfg.volumeDb);
	slamVol.connect(bus);
	slam.connect(slamVol);

	setTimeout(() => {
		slam.triggerAttackRelease("C1", 0.15);
	}, cfg.releaseDecay * 1000);

	// Noise burst at slam
	const noise = new Tone.Noise("white");
	const noiseFilter = new Tone.Filter(2000, "lowpass");
	const noiseEnv = new Tone.AmplitudeEnvelope({
		attack: 0.001,
		decay: 0.05,
		sustain: 0,
		release: 0.03,
	});
	const noiseVol = new Tone.Volume(cfg.volumeDb - 2);
	noiseVol.connect(bus);
	noise.connect(noiseFilter);
	noiseFilter.connect(noiseEnv);
	noiseEnv.connect(noiseVol);
	noise.start();

	setTimeout(() => {
		noiseEnv.triggerAttackRelease(0.04);
	}, cfg.releaseDecay * 1000);

	const cleanup = cfg.releaseDecay * 1000 + 800;
	setTimeout(() => {
		pressOsc.stop();
		noise.stop();
		pressOsc.dispose();
		pressEnv.dispose();
		pressVol.dispose();
		slam.dispose();
		slamVol.dispose();
		noise.dispose();
		noiseFilter.dispose();
		noiseEnv.dispose();
		noiseVol.dispose();
	}, cleanup);
}

// ---------------------------------------------------------------------------
// Magnetic hum — grabber tool
// ---------------------------------------------------------------------------

/**
 * Sine tone with vibrato simulating a magnetic grabber arm engaging.
 * Returns a stop function for looping while grabber is active.
 */
export function playMagneticHum(): (() => void) | null {
	if (!isAudioInitialized()) return null;
	const bus = sfxBus();
	if (!bus) return null;

	const cfg = sfxCfg.magneticHum;

	const osc = new Tone.Oscillator({
		frequency: cfg.frequency,
		type: "sine",
	});
	const vibrato = new Tone.LFO({
		frequency: cfg.vibratoRate,
		min: cfg.frequency - cfg.vibratoDepth,
		max: cfg.frequency + cfg.vibratoDepth,
	});
	const vol = new Tone.Volume(cfg.volumeDb);

	vibrato.connect(osc.frequency);
	osc.connect(vol);
	vol.connect(bus);

	vibrato.start();
	osc.start();

	return () => {
		osc.stop();
		vibrato.stop();
		osc.dispose();
		vibrato.dispose();
		vol.dispose();
	};
}

// ---------------------------------------------------------------------------
// Belt clank — cube slides onto belt
// ---------------------------------------------------------------------------

/**
 * Short metallic clank when a cube is placed on or transferred between belts.
 * Bright MetalSynth hit with fast decay.
 */
export function playBeltClank(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const cfg = sfxCfg.beltClank;

	const synth = new Tone.MetalSynth({
		envelope: { attack: 0.001, decay: cfg.decayMs / 1000, release: 0.04 },
		harmonicity: 3.5,
		modulationIndex: 12,
		resonance: 2500,
		octaves: 1.2,
	});
	const vol = new Tone.Volume(cfg.volumeDb);
	vol.connect(bus);
	synth.connect(vol);

	synth.triggerAttackRelease(cfg.frequency, 0.04);

	setTimeout(() => {
		synth.dispose();
		vol.dispose();
	}, 500);
}

// ---------------------------------------------------------------------------
// Laser shot — combat projectile
// ---------------------------------------------------------------------------

/**
 * Descending sine sweep — classic laser/energy weapon sound.
 * Frequency sweeps from high to low over duration.
 */
export function playLaserShot(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const cfg = sfxCfg.laserShot;

	const osc = new Tone.Oscillator({
		frequency: cfg.startFrequency,
		type: "sine",
	});
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.005,
		decay: cfg.duration,
		sustain: 0,
		release: 0.08,
	});
	const vol = new Tone.Volume(cfg.volumeDb);
	vol.connect(bus);

	osc.connect(env);
	env.connect(vol);

	osc.start();
	osc.frequency.linearRampTo(cfg.endFrequency, cfg.duration);
	env.triggerAttackRelease(cfg.duration);

	setTimeout(() => {
		osc.stop();
		osc.dispose();
		env.dispose();
		vol.dispose();
	}, 600);
}

// ---------------------------------------------------------------------------
// Combat impact — generic hit
// ---------------------------------------------------------------------------

/**
 * Noise burst through lowpass filter for generic combat impact.
 * Heavier than the SpatialAudio metalImpact — used for structural damage.
 */
export function playCombatImpact(): void {
	if (!isAudioInitialized()) return;
	const bus = sfxBus();
	if (!bus) return;

	const cfg = sfxCfg.combatImpact;

	const noise = new Tone.Noise("brown");
	const filter = new Tone.Filter(cfg.filterFrequency, "lowpass");
	const env = new Tone.AmplitudeEnvelope({
		attack: 0.002,
		decay: cfg.noiseDecay,
		sustain: 0.05,
		release: 0.12,
	});
	const dist = new Tone.Distortion(0.6);
	const vol = new Tone.Volume(cfg.volumeDb);
	vol.connect(bus);

	noise.connect(dist);
	dist.connect(filter);
	filter.connect(env);
	env.connect(vol);

	noise.start();
	env.triggerAttackRelease(cfg.noiseDecay + 0.1);

	setTimeout(() => {
		noise.stop();
		noise.dispose();
		dist.dispose();
		filter.dispose();
		env.dispose();
		vol.dispose();
	}, 600);
}
