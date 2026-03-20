/**
 * @package lib/particles
 *
 * Visual effect event bus + particle pool (renderer-agnostic).
 */

export type { EffectEvent, EffectType } from "./effectEvents";
export {
	clearEffects,
	drainEffects,
	getEffectQueueLength,
	pushEffect,
} from "./effectEvents";
export type { ParticleConfig } from "./ParticlePool";
export { ParticlePool } from "./ParticlePool";
