/**
 * Module-level cinematic state — written by TitleScene's useFrame in Globe.tsx,
 * read by LightningEffect/StormClouds/Hypercane each frame.
 *
 * Separated into its own module to avoid circular imports between
 * ui/Globe.tsx and views/title/globe/*.
 */
export const cinematicState = {
	stormSpeed: 1,
	lightningFreq: 1,
	wormholeIntensity: 1,
};
