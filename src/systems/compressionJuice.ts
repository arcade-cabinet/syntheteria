/**
 * Compression juice system — the dramatic multi-sensory experience of
 * compressing powder into a physical cube.
 *
 * This is the game's SIGNATURE MOMENT. The design document says:
 *   "screen shakes, pressure gauges spike, and a physical cube of
 *    scrap metal ejects at your feet"
 *
 * Paper playtesting found this was just a timer. This system orchestrates
 * the full multi-sensory compression experience:
 *
 * Timeline (for a 3-second compression):
 *   0.0s — Hydraulic charge sound, gentle screen shake begins
 *   0.0-2.0s — Pressure builds (gauge 0→80%), shake intensifies
 *   2.0-2.8s — Critical zone (gauge 80→95%), steam particles, alarm pitch
 *   2.8-3.0s — SLAM! Max shake, flash, burst particles, clang sound
 *   3.0s+ — Cube ejects, bounce sound, relief
 *
 * This system outputs data for the rendering layer — it doesn't call
 * audio/particles directly. Instead it returns a CompressionFrame each
 * tick with all the feedback state.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Full compression experience state for one frame. */
export interface CompressionFrame {
	/** Whether compression is active */
	active: boolean;
	/** Overall progress (0-1) */
	progress: number;
	/** Current phase */
	phase: CompressionPhase;

	// -- Gauges --
	/** Pressure gauge value (0-1) */
	pressure: number;
	/** Temperature gauge value (0-1) */
	temperature: number;
	/** Danger zone flag (pressure > 0.8) */
	inDangerZone: boolean;

	// -- Screen effects --
	/** Screen shake intensity (0-1) */
	shakeIntensity: number;
	/** Screen shake frequency (Hz) */
	shakeFrequency: number;
	/** Screen flash intensity (0-1, spikes on slam) */
	flashIntensity: number;
	/** Screen flash color (hex) */
	flashColor: string;
	/** Screen vignette intensity (0-1, darkens edges) */
	vignetteIntensity: number;

	// -- Audio cues --
	/** Sound events to trigger this frame */
	soundEvents: string[];
	/** Pitch modifier for ongoing sounds (1.0 = normal) */
	pitchModifier: number;

	// -- Particle cues --
	/** Particle effects to emit this frame */
	particleEvents: string[];

	// -- HUD overlay --
	/** Whether to show the compression HUD overlay */
	showOverlay: boolean;
	/** Overlay color tint (shifts from blue → orange → red) */
	overlayColor: string;
	/** Text to display ("COMPRESSING...", "CRITICAL!", "EJECTING!") */
	statusText: string;
}

export type CompressionPhase =
	| "idle"
	| "charging"     // 0-20% — initial hydraulic charge
	| "building"     // 20-66% — pressure building steadily
	| "critical"     // 66-93% — danger zone, max feedback
	| "slam"         // 93-100% — the big moment
	| "eject"        // post-completion — cube pops out
	| "cooldown";    // brief recovery period

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Phase boundaries as fractions of total duration. */
const PHASE_THRESHOLDS = {
	charging: 0.0,
	building: 0.2,
	critical: 0.66,
	slam: 0.93,
} as const;

/** How long the eject phase lasts (seconds). */
const EJECT_DURATION = 0.5;
/** How long the cooldown phase lasts (seconds). */
const COOLDOWN_DURATION = 0.3;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

interface CompressionState {
	active: boolean;
	duration: number;
	elapsed: number;
	materialType: string;
	/** Time spent in post-completion phases */
	postElapsed: number;
	/** Whether the slam has fired */
	slamFired: boolean;
	/** Whether the eject has fired */
	ejectFired: boolean;
}

let state: CompressionState = {
	active: false,
	duration: 3.0,
	elapsed: 0,
	materialType: "scrap_iron",
	postElapsed: 0,
	slamFired: false,
	ejectFired: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Smooth interpolation (ease-in-out). */
function smoothstep(t: number): number {
	const clamped = Math.max(0, Math.min(1, t));
	return clamped * clamped * (3 - 2 * clamped);
}

/** Get overlay color based on progress (blue → orange → red). */
function getOverlayColor(progress: number): string {
	if (progress < 0.5) {
		// Blue to orange
		const t = progress / 0.5;
		const r = Math.round(30 + t * 225);
		const g = Math.round(100 + t * 50);
		const b = Math.round(200 - t * 180);
		return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
	}
	// Orange to red
	const t = (progress - 0.5) / 0.5;
	const r = Math.round(255);
	const g = Math.round(150 - t * 130);
	const b = Math.round(20 - t * 20);
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Get status text based on phase. */
function getStatusText(phase: CompressionPhase): string {
	switch (phase) {
		case "charging":
			return "CHARGING...";
		case "building":
			return "COMPRESSING...";
		case "critical":
			return "CRITICAL!";
		case "slam":
			return "EJECTING!";
		case "eject":
			return "CUBE READY";
		case "cooldown":
			return "";
		default:
			return "";
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Begin the compression experience.
 *
 * @param duration     - Total compression time in seconds
 * @param materialType - Material being compressed (affects color palette)
 * @returns true if started, false if already active
 */
export function startCompression(
	duration: number,
	materialType: string,
): boolean {
	if (state.active) return false;

	state = {
		active: true,
		duration: Math.max(0.5, duration),
		elapsed: 0,
		materialType,
		postElapsed: 0,
		slamFired: false,
		ejectFired: false,
	};

	return true;
}

/**
 * Update the compression experience for one frame.
 *
 * @param delta - Time elapsed in seconds
 * @returns CompressionFrame with all feedback data for this frame
 */
export function updateCompression(delta: number): CompressionFrame {
	const idle: CompressionFrame = {
		active: false,
		progress: 0,
		phase: "idle",
		pressure: 0,
		temperature: 0,
		inDangerZone: false,
		shakeIntensity: 0,
		shakeFrequency: 0,
		flashIntensity: 0,
		flashColor: "#ffffff",
		vignetteIntensity: 0,
		soundEvents: [],
		pitchModifier: 1.0,
		particleEvents: [],
		showOverlay: false,
		overlayColor: "#1e64c8",
		statusText: "",
	};

	if (!state.active) return idle;

	state.elapsed += delta;
	const progress = Math.min(1.0, state.elapsed / state.duration);

	// Determine phase
	let phase: CompressionPhase;
	if (progress >= 1.0) {
		// Post-completion — only count time after the completion threshold
		const overflowTime = state.elapsed - state.duration;
		if (!state.slamFired) {
			// First frame past completion: postElapsed = time past duration
			state.postElapsed = Math.max(0, overflowTime);
		} else {
			state.postElapsed += delta;
		}
		if (!state.slamFired) {
			phase = "slam";
		} else if (state.postElapsed < EJECT_DURATION) {
			phase = "eject";
		} else if (state.postElapsed < EJECT_DURATION + COOLDOWN_DURATION) {
			phase = "cooldown";
		} else {
			// Done!
			state.active = false;
			return { ...idle, phase: "idle" };
		}
	} else if (progress < PHASE_THRESHOLDS.building) {
		phase = "charging";
	} else if (progress < PHASE_THRESHOLDS.critical) {
		phase = "building";
	} else if (progress < PHASE_THRESHOLDS.slam) {
		phase = "critical";
	} else {
		phase = "slam";
	}

	// --- Calculate feedback per phase ---

	const soundEvents: string[] = [];
	const particleEvents: string[] = [];

	// Pressure: smooth ramp with acceleration in critical zone
	const pressure = phase === "slam" || phase === "eject"
		? 1.0
		: smoothstep(progress) * (phase === "critical" ? 1.1 : 1.0);

	// Temperature: lags pressure slightly
	const temperature = smoothstep(Math.max(0, progress - 0.1));

	const inDangerZone = pressure > 0.8;

	// Screen shake: gentle → intense → SLAM
	let shakeIntensity: number;
	let shakeFrequency: number;
	if (phase === "slam" && !state.slamFired) {
		shakeIntensity = 1.0;
		shakeFrequency = 25;
		state.slamFired = true;
		soundEvents.push("compression_slam");
		particleEvents.push("compression_slam_burst");
	} else if (phase === "eject") {
		shakeIntensity = 0.3 * (1 - state.postElapsed / EJECT_DURATION);
		shakeFrequency = 10;
		if (!state.ejectFired) {
			state.ejectFired = true;
			soundEvents.push("cube_eject_bounce");
			particleEvents.push("cube_spawn_burst");
		}
	} else if (phase === "cooldown") {
		shakeIntensity = 0;
		shakeFrequency = 0;
	} else {
		shakeIntensity = smoothstep(progress) * 0.6;
		shakeFrequency = 5 + progress * 15;
	}

	// Flash: spike on slam
	let flashIntensity = 0;
	let flashColor = "#ffffff";
	if (phase === "slam" && state.slamFired && state.postElapsed < 0.15) {
		flashIntensity = 1.0 - state.postElapsed / 0.15;
		flashColor = "#ffcc00";
	}

	// Vignette: increases with pressure
	const vignetteIntensity = smoothstep(progress) * 0.4;

	// Sound events for phase transitions
	if (phase === "charging" && state.elapsed < delta * 2) {
		soundEvents.push("compression_start");
	}
	if (phase === "critical" && !inDangerZone) {
		// First frame entering critical
		soundEvents.push("compression_warning");
	}

	// Particle events
	if (phase === "building" || phase === "critical") {
		particleEvents.push("compression_steam");
	}

	// Pitch modifier: rises with pressure
	const pitchModifier = 0.8 + progress * 0.6;

	return {
		active: true,
		progress: Math.min(1, progress),
		phase,
		pressure: Math.min(1, pressure),
		temperature: Math.min(1, temperature),
		inDangerZone,
		shakeIntensity,
		shakeFrequency,
		flashIntensity,
		flashColor,
		vignetteIntensity,
		soundEvents,
		pitchModifier,
		particleEvents,
		showOverlay: phase !== "cooldown",
		overlayColor: getOverlayColor(progress),
		statusText: getStatusText(phase),
	};
}

/**
 * Cancel the current compression experience.
 */
export function cancelCompression(): void {
	state.active = false;
}

/**
 * Check if compression is currently active.
 */
export function isCompressionActive(): boolean {
	return state.active;
}

/**
 * Get the current compression progress (0-1).
 */
export function getCompressionProgress(): number {
	if (!state.active) return 0;
	return Math.min(1, state.elapsed / state.duration);
}

/**
 * Get the current phase.
 */
export function getCompressionPhase(): CompressionPhase {
	if (!state.active) return "idle";
	const progress = state.elapsed / state.duration;
	if (progress >= 1.0) {
		if (!state.slamFired) return "slam";
		if (state.postElapsed < EJECT_DURATION) return "eject";
		return "cooldown";
	}
	if (progress < PHASE_THRESHOLDS.building) return "charging";
	if (progress < PHASE_THRESHOLDS.critical) return "building";
	if (progress < PHASE_THRESHOLDS.slam) return "critical";
	return "slam";
}

/**
 * Reset all state — for testing.
 */
export function reset(): void {
	state = {
		active: false,
		duration: 3.0,
		elapsed: 0,
		materialType: "scrap_iron",
		postElapsed: 0,
		slamFired: false,
		ejectFired: false,
	};
}
