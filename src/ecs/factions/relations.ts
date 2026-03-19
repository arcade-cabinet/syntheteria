import type { World } from "koota";
import { STANDING_THRESHOLDS } from "../../config/gameDefaults";
import { FactionRelation } from "../traits/faction";

export type RelationType = "ally" | "neutral" | "hostile";

/** Derive the 3-state relation from a numeric standing value. */
export function relationFromStanding(standing: number): RelationType {
	if (standing <= STANDING_THRESHOLDS.hostile) return "hostile";
	if (standing >= STANDING_THRESHOLDS.cordial) return "ally";
	return "neutral";
}

/** Default standing values when forcing a relation state. */
function defaultStandingForRelation(relation: RelationType): number {
	switch (relation) {
		case "hostile":
			return -60;
		case "ally":
			return 60;
		case "neutral":
			return 0;
	}
}

export function setRelation(
	world: World,
	factionA: string,
	factionB: string,
	relation: RelationType,
): void {
	let found = false;
	for (const e of world.query(FactionRelation)) {
		const r = e.get(FactionRelation);
		if (!r) continue;
		if (
			(r.factionA === factionA && r.factionB === factionB) ||
			(r.factionA === factionB && r.factionB === factionA)
		) {
			// Keep standing if it already matches the relation's range, otherwise force it
			const standing =
				relationFromStanding(r.standing) === relation
					? r.standing
					: defaultStandingForRelation(relation);
			e.set(FactionRelation, { factionA, factionB, relation, standing });
			found = true;
			break;
		}
	}
	if (!found) {
		const standing = defaultStandingForRelation(relation);
		world.spawn(FactionRelation({ factionA, factionB, relation, standing }));
	}
}

export function getRelation(
	world: World,
	factionA: string,
	factionB: string,
): RelationType {
	for (const e of world.query(FactionRelation)) {
		const r = e.get(FactionRelation);
		if (!r) continue;
		if (
			(r.factionA === factionA && r.factionB === factionB) ||
			(r.factionA === factionB && r.factionB === factionA)
		) {
			return r.relation as RelationType;
		}
	}
	return "neutral";
}

export function isHostile(
	world: World,
	factionA: string,
	factionB: string,
): boolean {
	return getRelation(world, factionA, factionB) === "hostile";
}

/**
 * Get the numeric standing between two factions (-100 to +100).
 * Returns 0 if no relation entity exists.
 */
export function getStanding(
	world: World,
	factionA: string,
	factionB: string,
): number {
	if (factionA === factionB) return 100;
	for (const e of world.query(FactionRelation)) {
		const r = e.get(FactionRelation);
		if (!r) continue;
		if (
			(r.factionA === factionA && r.factionB === factionB) ||
			(r.factionA === factionB && r.factionB === factionA)
		) {
			return r.standing;
		}
	}
	return 0;
}

/**
 * Modify standing by delta, clamped to [-100, 100].
 * Also updates the derived relation state.
 */
export function modifyStanding(
	world: World,
	factionA: string,
	factionB: string,
	delta: number,
): void {
	if (factionA === factionB) return;
	for (const e of world.query(FactionRelation)) {
		const r = e.get(FactionRelation);
		if (!r) continue;
		if (
			(r.factionA === factionA && r.factionB === factionB) ||
			(r.factionA === factionB && r.factionB === factionA)
		) {
			const newStanding = Math.max(-100, Math.min(100, r.standing + delta));
			e.set(FactionRelation, {
				factionA: r.factionA,
				factionB: r.factionB,
				relation: relationFromStanding(newStanding),
				standing: newStanding,
			});
			return;
		}
	}
	// No entity yet — create one
	const standing = Math.max(-100, Math.min(100, delta));
	world.spawn(
		FactionRelation({
			factionA,
			factionB,
			relation: relationFromStanding(standing),
			standing,
		}),
	);
}

/**
 * Set standing to an exact value (for initialization or forced changes).
 * Also updates the derived relation state.
 */
export function setStanding(
	world: World,
	factionA: string,
	factionB: string,
	standing: number,
): void {
	if (factionA === factionB) return;
	const clamped = Math.max(-100, Math.min(100, standing));
	const relation = relationFromStanding(clamped);

	for (const e of world.query(FactionRelation)) {
		const r = e.get(FactionRelation);
		if (!r) continue;
		if (
			(r.factionA === factionA && r.factionB === factionB) ||
			(r.factionA === factionB && r.factionB === factionA)
		) {
			e.set(FactionRelation, {
				factionA: r.factionA,
				factionB: r.factionB,
				relation,
				standing: clamped,
			});
			return;
		}
	}
	world.spawn(
		FactionRelation({ factionA, factionB, relation, standing: clamped }),
	);
}
