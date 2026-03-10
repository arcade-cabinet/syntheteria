/**
 * R3F component that manages the Tone.js audio system.
 *
 * - Initializes audio on first user interaction
 * - Updates storm intensity each frame from game state
 * - Listens for combat events and plays impact sounds
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { getSnapshot } from "../ecs/gameState";
import {
	disposeAudio,
	initAudio,
	isAudioInitialized,
	playMetalImpact,
	updateStormIntensity,
} from "./SpatialAudio";

export function AudioSystem() {
	const lastCombatCount = useRef(0);
	const initAttempted = useRef(false);

	// Initialize audio on first user click/tap (required by browsers)
	useEffect(() => {
		const handleInteraction = async () => {
			if (initAttempted.current) return;
			initAttempted.current = true;
			try {
				await initAudio();
				// Success — remove listeners so we don't re-init
				window.removeEventListener("click", handleInteraction);
				window.removeEventListener("touchstart", handleInteraction);
			} catch {
				// Audio init can fail silently — game works without it
				// Allow retry on next interaction
				initAttempted.current = false;
			}
		};

		window.addEventListener("click", handleInteraction);
		window.addEventListener("touchstart", handleInteraction);

		return () => {
			window.removeEventListener("click", handleInteraction);
			window.removeEventListener("touchstart", handleInteraction);
			disposeAudio();
		};
	}, []);

	// Per-frame audio updates
	useFrame(() => {
		if (!isAudioInitialized()) return;

		const snap = getSnapshot();

		// Update storm ambience intensity
		updateStormIntensity(snap.power.stormIntensity);

		// Play combat impact sounds for new events
		const currentCombatCount = snap.combatEvents.length;
		if (currentCombatCount > lastCombatCount.current) {
			playMetalImpact();
		}
		lastCombatCount.current = currentCombatCount;
	});

	return null;
}
