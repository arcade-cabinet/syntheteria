/**
 * Unified damage model — calculates final damage with armor, resistances,
 * damage types, critical hits, and environmental modifiers.
 *
 * All combat in Syntheteria flows through this system. Weapons, turrets,
 * storms, hazards, and acid rain all use calculateDamage() to determine
 * the final damage applied.
 *
 * Damage types: kinetic, energy, hacking, environmental, acid, electromagnetic
 * Armor reduces kinetic damage, shields reduce energy, firewalls reduce hacking.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DamageType =
	| "kinetic"
	| "energy"
	| "hacking"
	| "environmental"
	| "acid"
	| "electromagnetic";

export interface DamageSource {
	baseDamage: number;
	type: DamageType;
	critChance?: number; // 0-1
	critMultiplier?: number; // default 2.0
	armorPenetration?: number; // 0-1, ignores this fraction of armor
	isSplash?: boolean;
	splashFalloff?: number; // damage multiplier at edge of splash (0-1)
}

export interface DamageTarget {
	armor: number; // reduces kinetic
	shield: number; // reduces energy
	firewall: number; // reduces hacking
	environmentalResist: number; // 0-1, fraction of environmental damage resisted
	acidResist: number; // 0-1
	emResist: number; // 0-1
}

export interface DamageResult {
	finalDamage: number;
	damageType: DamageType;
	wasCritical: boolean;
	damageReduced: number; // how much was mitigated
	overkill: number; // damage beyond 0 HP (for death effects)
}

export interface EnvironmentModifiers {
	globalDamageMultiplier?: number; // weather/event bonus
	typeBonuses?: Partial<Record<DamageType, number>>; // multipliers per type
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CRIT_MULTIPLIER = 2.0;
const MIN_DAMAGE = 0;
const ARMOR_REDUCTION_PER_POINT = 0.5; // each armor point reduces kinetic by 0.5

// ---------------------------------------------------------------------------
// RNG
// ---------------------------------------------------------------------------

let randomFn: () => number = Math.random;

/**
 * Set the random function for deterministic testing.
 */
export function setRandomFn(fn: () => number): void {
	randomFn = fn;
}

// ---------------------------------------------------------------------------
// Damage calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the final damage dealt to a target.
 */
export function calculateDamage(
	source: DamageSource,
	target: DamageTarget,
	envMods?: EnvironmentModifiers,
	currentHp?: number,
): DamageResult {
	let damage = source.baseDamage;
	let wasCritical = false;

	// Critical hit check
	const critChance = source.critChance ?? 0;
	if (critChance > 0 && randomFn() < critChance) {
		damage *= source.critMultiplier ?? DEFAULT_CRIT_MULTIPLIER;
		wasCritical = true;
	}

	// Apply environment modifiers
	if (envMods) {
		damage *= envMods.globalDamageMultiplier ?? 1;
		const typeBonus = envMods.typeBonuses?.[source.type] ?? 1;
		damage *= typeBonus;
	}

	// Apply resistances based on damage type
	const preMitigationDamage = damage;
	damage = applyResistance(damage, source, target);

	const damageReduced = Math.max(0, preMitigationDamage - damage);
	const finalDamage = Math.max(MIN_DAMAGE, Math.round(damage * 100) / 100);

	// Overkill
	const overkill =
		currentHp !== undefined
			? Math.max(0, finalDamage - currentHp)
			: 0;

	return {
		finalDamage,
		damageType: source.type,
		wasCritical,
		damageReduced: Math.round(damageReduced * 100) / 100,
		overkill: Math.round(overkill * 100) / 100,
	};
}

function applyResistance(
	damage: number,
	source: DamageSource,
	target: DamageTarget,
): number {
	switch (source.type) {
		case "kinetic": {
			const effectiveArmor =
				target.armor * (1 - (source.armorPenetration ?? 0));
			const reduction = effectiveArmor * ARMOR_REDUCTION_PER_POINT;
			return Math.max(0, damage - reduction);
		}
		case "energy": {
			const shieldReduction = target.shield * ARMOR_REDUCTION_PER_POINT;
			return Math.max(0, damage - shieldReduction);
		}
		case "hacking": {
			const firewallReduction =
				target.firewall * ARMOR_REDUCTION_PER_POINT;
			return Math.max(0, damage - firewallReduction);
		}
		case "environmental":
			return damage * (1 - target.environmentalResist);
		case "acid":
			return damage * (1 - target.acidResist);
		case "electromagnetic":
			return damage * (1 - target.emResist);
		default:
			return damage;
	}
}

/**
 * Calculate splash damage at a distance from the impact point.
 */
export function calculateSplashDamage(
	source: DamageSource,
	distance: number,
	maxRadius: number,
): number {
	if (distance >= maxRadius) return 0;
	if (distance <= 0) return source.baseDamage;

	const falloff = source.splashFalloff ?? 0.2;
	const t = distance / maxRadius; // 0 at center, 1 at edge
	const multiplier = 1 - t * (1 - falloff); // linear falloff
	return Math.max(0, source.baseDamage * multiplier);
}

/**
 * Calculate effective DPS (damage per second) for a weapon.
 */
export function calculateDPS(
	baseDamage: number,
	attackSpeed: number,
	critChance: number,
	critMultiplier: number,
): number {
	const expectedCritBonus = critChance * (critMultiplier - 1);
	return baseDamage * attackSpeed * (1 + expectedCritBonus);
}

// ---------------------------------------------------------------------------
// Armor helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the effective HP given base HP and armor.
 * Higher armor means more effective HP against kinetic damage.
 */
export function effectiveHP(
	baseHP: number,
	armor: number,
	damageType: DamageType = "kinetic",
): number {
	if (damageType !== "kinetic") return baseHP;
	const reductionPerHit = armor * ARMOR_REDUCTION_PER_POINT;
	if (reductionPerHit >= 1) {
		// Each hit does at most (avgDamage - reduction) damage
		// Simplified: effective HP multiplier
		return baseHP * (1 + armor * 0.1);
	}
	return baseHP;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetDamageModel(): void {
	randomFn = Math.random;
}
