/**
 * FPS combat system — raycasting weapon and enemy retaliation.
 *
 * When the player uses the "welder" tool, a ray is cast from the camera.
 * If it hits an enemy entity within range, a random functional component
 * on the enemy is damaged (using the same component-based damage model
 * as the top-down combat system).
 *
 * Enemies within melee range automatically retaliate against the
 * player-controlled bot.
 *
 * All tunables sourced from config/combat.json.
 */

import { config } from "../../config";
import type { UnitEntity } from "../ecs/types";
import { hasFunctionalComponent } from "../ecs/types";
import { destroyEntityById } from "../ecs/koota/bridge";
import { getActivePlayerBot, units } from "../ecs/koota/compat";
import { addResource } from "./resources";

// ---------------------------------------------------------------------------
// Constants (from config/combat.json)
// ---------------------------------------------------------------------------

const WELDER_RANGE = config.combat.fpsCombat.welderRange;
const WELDER_CONE_ANGLE = config.combat.fpsCombat.welderConeAngle;
const ENEMY_MELEE_RANGE = config.combat.fpsCombat.enemyMeleeRange;
const ENEMY_ATTACK_CHANCE = config.combat.fpsCombat.enemyAttackChancePerFrame;

// ---------------------------------------------------------------------------
// Hit result state (for HUD crosshair feedback)
// ---------------------------------------------------------------------------

interface HitResult {
	hit: boolean;
	timestamp: number;
}

let lastHitResult: HitResult = { hit: false, timestamp: 0 };

/**
 * Get the most recent hit/miss state for crosshair color feedback.
 * Result is only considered valid for ~200ms after the timestamp.
 */
export function getLastHitResult(): HitResult {
	return lastHitResult;
}

// ---------------------------------------------------------------------------
// Damage helpers (mirrors combat.ts logic)
// ---------------------------------------------------------------------------

function dealComponentDamage(target: UnitEntity): string | null {
	const functional = target.unit.components.filter((c) => c.functional);
	if (functional.length === 0) return null;

	const victim = functional[Math.floor(Math.random() * functional.length)];
	victim.functional = false;
	return victim.name;
}

function isDestroyed(entity: UnitEntity): boolean {
	return entity.unit.components.every((c) => !c.functional);
}

function destroyUnit(entity: UnitEntity) {
	const componentCount = entity.unit.components.length;
	addResource(
		"scrapMetal",
		Math.floor(componentCount * config.combat.salvageScrapMultiplier),
	);
	if (Math.random() < config.combat.salvageEWasteChance)
		addResource("eWaste", 1);
	destroyEntityById(entity.id);
}

// ---------------------------------------------------------------------------
// Player attack (welder raycast)
// ---------------------------------------------------------------------------

/**
 * Fire the welder tool. Call when the player performs a primary action
 * while the welder is equipped.
 *
 * Uses simple distance + angle check rather than a full Three.js raycast
 * to keep this system independent of the rendering layer.
 */
export function fireWelder(): void {
	const bot = getActivePlayerBot();
	if (!bot) return;

	if (!hasFunctionalComponent(bot.unit.components, "arms")) {
		lastHitResult = { hit: false, timestamp: performance.now() };
		return;
	}

	const yaw = bot.playerControlled.yaw;

	const fwdX = -Math.sin(yaw);
	const fwdZ = -Math.cos(yaw);

	let closestDist = WELDER_RANGE + 1;
	let closestTarget: UnitEntity | null = null;

	for (const entity of units) {
		if (entity.faction === "player") continue;
		if (!entity.unit.components.some((c) => c.functional)) continue;

		const dx = entity.worldPosition.x - bot.worldPosition.x;
		const dz = entity.worldPosition.z - bot.worldPosition.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist > WELDER_RANGE) continue;

		const dirX = dx / dist;
		const dirZ = dz / dist;
		const dot = dirX * fwdX + dirZ * fwdZ;

		if (dot < WELDER_CONE_ANGLE) continue;

		if (dist < closestDist) {
			closestDist = dist;
			closestTarget = entity;
		}
	}

	if (closestTarget) {
		const damaged = dealComponentDamage(closestTarget);
		if (damaged) {
			lastHitResult = { hit: true, timestamp: performance.now() };

			if (isDestroyed(closestTarget)) {
				destroyUnit(closestTarget);
			}
		} else {
			lastHitResult = { hit: false, timestamp: performance.now() };
		}
	} else {
		lastHitResult = { hit: false, timestamp: performance.now() };
	}
}

// ---------------------------------------------------------------------------
// Enemy retaliation (runs every frame)
// ---------------------------------------------------------------------------

/**
 * FPS combat system tick. Call once per frame (not per sim tick).
 *
 * Handles enemy retaliation against the player bot when enemies
 * are within melee range.
 */
export function fpsCombatSystem(_delta: number): void {
	const bot = getActivePlayerBot();
	if (!bot) return;

	const bx = bot.worldPosition.x;
	const bz = bot.worldPosition.z;

	for (const entity of units) {
		if (entity.faction === "player") continue;
		if (!entity.unit.components.some((c) => c.functional)) continue;

		const dx = entity.worldPosition.x - bx;
		const dz = entity.worldPosition.z - bz;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist > ENEMY_MELEE_RANGE) continue;

		if (Math.random() > ENEMY_ATTACK_CHANCE) continue;

		const functional = bot.unit.components.filter((c) => c.functional);
		if (functional.length === 0) continue;

		const victim = functional[Math.floor(Math.random() * functional.length)];
		victim.functional = false;

		if (entity.navigation) {
			entity.navigation.moving = false;
		}
	}
}
