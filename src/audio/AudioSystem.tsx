/**
 * R3F component that manages the Tone.js audio system.
 *
 * - Initializes audio on first user interaction
 * - Starts the AudioEventBridge to wire gameplay events to SFX
 * - Updates storm intensity each frame from game state
 */

import { useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { getSnapshot } from "../ecs/gameState";
import { disposeAudioBridge, initAudioBridge } from "./AudioEventBridge";
import {
	disposeAudio,
	initAudio,
	isAudioInitialized,
	updateStormIntensity,
} from "./SpatialAudio";

export function AudioSystem() {
	// Initialize audio on first user click/tap (required by browsers)
	useEffect(() => {
		const addListeners = () => {
			window.addEventListener("click", handleInteraction, { once: true });
			window.addEventListener("touchstart", handleInteraction, {
				once: true,
			});
		};

		const removeListeners = () => {
			window.removeEventListener("click", handleInteraction);
			window.removeEventListener("touchstart", handleInteraction);
		};

		const handleInteraction = async () => {
			// Remove the other listener (only one of click/touchstart fires)
			removeListeners();

			try {
				await initAudio();
				// Start the event bridge — subscribes to gameplay events
				initAudioBridge();
			} catch {
				// Audio init can fail silently — game works without it.
				// Re-register so the next user interaction retries.
				addListeners();
			}
		};

		addListeners();

		return () => {
			removeListeners();
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
