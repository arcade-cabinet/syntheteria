/**
 * R3F component that manages the Tone.js audio system.
 *
 * - Initializes audio on first user interaction
 * - Starts the AudioEventBridge to wire gameplay events to SFX
 * - Updates storm intensity each frame from game state
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { getSnapshot } from "../ecs/gameState";
import { disposeAudioBridge, initAudioBridge } from "./AudioEventBridge";
import {
	disposeAudio,
	initAudio,
	isAudioInitialized,
	updateStormIntensity,
} from "./SpatialAudio";

export function AudioSystem() {
	const initAttempted = useRef(false);

	// Initialize audio on first user click/tap (required by browsers)
	useEffect(() => {
		const handleInteraction = async () => {
			if (initAttempted.current) return;
			initAttempted.current = true;
			try {
				await initAudio();
				// Start the event bridge — subscribes to gameplay events
				initAudioBridge();
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
			disposeAudioBridge();
			disposeAudio();
		};
	}, []);

	// Per-frame audio updates
	useFrame(() => {
		if (!isAudioInitialized()) return;

		const snap = getSnapshot();

		// Update storm ambience intensity
		updateStormIntensity(snap.power.stormIntensity);

		// Combat events, resource scavenging, fabrication, enemy detection,
		// and lightning strikes are all handled by the AudioEventBridge
		// via game state subscriptions — no per-frame polling needed here.
	});

	return null;
}
