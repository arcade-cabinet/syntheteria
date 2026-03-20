/**
 * Pure logic for construction animation visual stages.
 *
 * 3 build stages based on progress percentage:
 * - foundation (0–33%): wireframe/outline, low opacity
 * - shell (34–66%): partial geometry, medium opacity, colored
 * - operational (67–100%): full model, full opacity
 *
 * Each stage has distinct visual properties.
 * Transitions are driven by build progress from buildingPlacement.ts.
 */

export type ConstructionStage = "foundation" | "shell" | "operational";

export interface ConstructionVisuals {
	stage: ConstructionStage;
	opacity: number;
	wireframe: boolean;
	color: number;
	emissiveIntensity: number;
	showSparks: boolean;
	showPowerOnFlash: boolean;
	scaleY: number;
}

/** Foundation stage: wireframe outline, transparent */
const FOUNDATION_COLOR = 0x00ffaa;

/** Shell stage: partial geometry, semi-opaque, construction yellow */
const SHELL_COLOR = 0xccaa44;

/** Operational stage: full color, powered look */
const OPERATIONAL_COLOR = 0x888888;

/** Power-on flash color */
export const POWER_ON_FLASH_COLOR = 0xaaddff;

/**
 * Determine the construction stage from build progress (0.0–1.0).
 */
export function getConstructionStage(progress: number): ConstructionStage {
	if (progress < 0.34) return "foundation";
	if (progress < 0.67) return "shell";
	return "operational";
}

/**
 * Get full visual properties for a given build progress.
 *
 * @param progress - Build progress 0.0 to 1.0
 * @param isActiveTick - Whether construction is actively progressing this tick
 * @param justCompleted - Whether the building just reached 1.0 this tick
 */
export function getConstructionVisuals(
	progress: number,
	isActiveTick: boolean,
	justCompleted: boolean,
): ConstructionVisuals {
	const clamped = Math.max(0, Math.min(1, progress));
	const stage = getConstructionStage(clamped);

	switch (stage) {
		case "foundation":
			return {
				stage: "foundation",
				opacity: 0.2 + clamped * 0.6,
				wireframe: true,
				color: FOUNDATION_COLOR,
				emissiveIntensity: 0.1,
				showSparks: isActiveTick,
				showPowerOnFlash: false,
				scaleY: 0.1 + clamped * 0.5,
			};
		case "shell":
			return {
				stage: "shell",
				opacity: 0.5 + (clamped - 0.34) * 1.0,
				wireframe: false,
				color: SHELL_COLOR,
				emissiveIntensity: 0.3,
				showSparks: isActiveTick,
				showPowerOnFlash: false,
				scaleY: 0.6 + (clamped - 0.34) * 0.6,
			};
		case "operational":
			return {
				stage: "operational",
				opacity: 1.0,
				wireframe: false,
				color: OPERATIONAL_COLOR,
				emissiveIntensity: 0.5,
				showSparks: false,
				showPowerOnFlash: justCompleted,
				scaleY: 1.0,
			};
	}
}

/**
 * Get spark particle intensity for active construction.
 * Returns a value 0.0–1.0 representing spark visual intensity.
 */
export function getSparkIntensity(progress: number): number {
	const clamped = Math.max(0, Math.min(1, progress));
	if (clamped >= 1.0) return 0;
	// More sparks during shell phase
	if (clamped >= 0.34 && clamped < 0.67) return 0.8;
	return 0.4;
}
