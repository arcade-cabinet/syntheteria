/**
 * HDRI environment skybox and lighting for Syntheteria.
 *
 * Loads an EXR HDRI as both the background skybox and the scene's
 * environment lighting (image-based lighting / IBL). The active HDRI
 * preset is driven by the storm intensity from the power system —
 * heavier storms produce a more dramatic, darker sky.
 *
 * The component also modulates backgroundIntensity and environmentIntensity
 * in real-time based on storm fluctuations, so the sky pulses with the storm.
 */

import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { getStormIntensity } from "../systems/power";
import type { HdriPresetKey } from "./hdriConfig";
import {
	DEFAULT_HDRI,
	getHdriForStormIntensity,
	HDRI_PRESETS,
} from "./hdriConfig";

/** How often (in seconds) to re-evaluate which HDRI preset to use */
const PRESET_CHECK_INTERVAL = 5.0;

export function EnvironmentSetup() {
	const [activePreset, setActivePreset] = useState<HdriPresetKey>(DEFAULT_HDRI);
	const checkTimer = useRef(0);
	const bgIntensityRef = useRef(HDRI_PRESETS[DEFAULT_HDRI].backgroundIntensity);
	const envIntensityRef = useRef(
		HDRI_PRESETS[DEFAULT_HDRI].environmentIntensity,
	);

	// Re-evaluate preset periodically (not every frame — HDRI swap is expensive)
	useFrame((_, delta) => {
		const storm = getStormIntensity();

		// Smooth intensity modulation every frame
		const preset = HDRI_PRESETS[activePreset];
		const stormFactor = 0.8 + storm * 0.2; // 0.8-1.1 range
		const targetBg = preset.backgroundIntensity * stormFactor;
		const targetEnv = preset.environmentIntensity * stormFactor;

		// Lerp for smooth transitions
		bgIntensityRef.current += (targetBg - bgIntensityRef.current) * 0.05;
		envIntensityRef.current += (targetEnv - envIntensityRef.current) * 0.05;

		// Check if we should swap presets
		checkTimer.current += delta;
		if (checkTimer.current >= PRESET_CHECK_INTERVAL) {
			checkTimer.current = 0;
			const recommended = getHdriForStormIntensity(storm);
			if (recommended !== activePreset) {
				setActivePreset(recommended);
			}
		}
	});

	const preset = HDRI_PRESETS[activePreset];

	return (
		<Environment
			files={preset.file}
			background
			backgroundIntensity={bgIntensityRef.current}
			environmentIntensity={envIntensityRef.current}
		/>
	);
}
