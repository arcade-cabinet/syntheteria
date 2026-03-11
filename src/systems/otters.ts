/**
 * Otter hologram system.
 *
 * Lore: The player is a robot dispatched by a home-planet AI on a colony
 * mission. That AI found Earth otters endearing and adopted an otter avatar
 * for its holographic communications. The holograms appear Star-Wars-style
 * (think R2-D2 projecting Princess Leia, but it's an otter giving you
 * crafting instructions and guidance).
 *
 * Holograms are stationary projections anchored to fixed world coordinates.
 * They do not wander — they shimmer in place with a looping idle animation.
 * The system ticks each hologram's idle animation timer so the renderer can
 * pick the correct frame.
 */

import { otters } from "../ecs/koota/compat";

export function otterSystem() {
	for (const entity of otters) {
		const o = entity.otter;

		// Holograms are always stationary projections — never physically moving.
		o.moving = false;

		// Tick the idle animation timer so the renderer can cycle frames.
		o.wanderTimer--;
		if (o.wanderTimer <= 0) {
			o.wanderTimer = 3 + Math.floor(Math.random() * 8);
		}
	}
}
