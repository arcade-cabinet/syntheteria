import { initAudioEventIntegration } from "./audioEventIntegration";
import { initNotificationSystem } from "./notificationSystem";
import { initParticleEventIntegration } from "./particleEventIntegration";

/**
 * Registers all event bus subscribers.
 * Call once during init, after systems are registered.
 */
export function registerEventHandlers(): void {
	initNotificationSystem();
	initParticleEventIntegration();
	initAudioEventIntegration();
}
