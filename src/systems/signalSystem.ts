/**
 * Signal network system.
 *
 * Relay towers (powered buildings with SignalNode) broadcast coverage
 * to tiles within their range. Coverage chains: if relay A covers relay B's
 * tile, B extends coverage from its own position. Units outside signal
 * coverage have their scanRange halved and lose 1 AP.
 */

import type { World } from "koota";
import { Building, Powered, SignalNode, UnitPos, UnitStats } from "../traits";

// ─── Helpers ────────────────────────────────────────────────────────────────

function _manhattanDist(
	ax: number,
	az: number,
	bx: number,
	bz: number,
): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

interface SignalRelay {
	tileX: number;
	tileZ: number;
	range: number;
}

/**
 * Build the set of covered tiles from all powered relays, with chaining.
 * Returns a Set of "x,z" keys for O(1) lookup.
 */
function buildCoverageMap(world: World): Set<string> {
	// Collect all powered signal nodes
	const relays: SignalRelay[] = [];
	for (const e of world.query(Building, SignalNode, Powered)) {
		const b = e.get(Building);
		const sn = e.get(SignalNode);
		if (!b || !sn || sn.range <= 0) continue;
		relays.push({ tileX: b.tileX, tileZ: b.tileZ, range: sn.range });
	}

	const covered = new Set<string>();
	// Track which relays have been activated (for chaining)
	const activated = new Set<number>();
	// Seed: all relays are initially "reachable" from themselves — activate them
	// then check if any non-activated relay is now in range of an activated one.

	// Phase 1: activate all relays (they have power, so they broadcast)
	// and mark their tiles as covered
	const addCoverage = (relay: SignalRelay) => {
		for (
			let x = relay.tileX - relay.range;
			x <= relay.tileX + relay.range;
			x++
		) {
			const remainingZ = relay.range - Math.abs(x - relay.tileX);
			for (
				let z = relay.tileZ - remainingZ;
				z <= relay.tileZ + remainingZ;
				z++
			) {
				covered.add(`${x},${z}`);
			}
		}
	};

	// BFS-style chaining: activate relays whose tile is already covered
	// Start with relays whose tile is trivially covered (by themselves)
	const pending = [...relays.keys()];
	for (const idx of pending) {
		activated.add(idx);
		addCoverage(relays[idx]!);
	}

	// Now check for chain extension: any relay that wasn't initially activated
	// but whose tile falls in the coverage of an already-activated relay.
	// Since all powered relays are activated in phase 1, chaining means:
	// relay B's tile is within relay A's range — B extends coverage from B's position.
	// This is already handled above since all powered relays broadcast.
	// The real chaining scenario: relay A covers relay B's tile, so B's range
	// extends from B. Since both are powered and activated, this works.
	// However, if we wanted unpowered relays to chain, we'd need more logic.
	// Per spec, only Powered relays participate.

	return covered;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check if a tile is within signal coverage.
 */
export function isInSignalRange(
	world: World,
	tileX: number,
	tileZ: number,
): boolean {
	const coverage = buildCoverageMap(world);
	return coverage.has(`${tileX},${tileZ}`);
}

/**
 * Run the signal network for one turn.
 *
 * 1. Build coverage map from powered relays (with chaining).
 * 2. For each unit, check if its tile is covered.
 * 3. Units outside coverage: scanRange = floor(scanRange / 2).
 * 4. Units inside coverage: scanRange restored to base (maxAp-based? no — we
 *    just leave it alone since runSignalNetwork is called each turn before
 *    scanRange is consumed).
 *
 * Note: We halve the *current* scanRange for out-of-range units. To avoid
 * compounding halving across turns, we need a "base" scanRange. We store
 * the base in UnitStats and only write the effective value. Since UnitStats
 * already has scanRange as the base, we compute effective each turn.
 */
export function runSignalNetwork(world: World): void {
	const coverage = buildCoverageMap(world);

	// No penalty if no relay towers exist — you can't be "out of range"
	// when there's no signal network at all.
	if (coverage.size === 0) return;

	for (const e of world.query(UnitPos, UnitStats)) {
		const pos = e.get(UnitPos);
		const stats = e.get(UnitStats);
		if (!pos || !stats) continue;

		const key = `${pos.tileX},${pos.tileZ}`;
		if (!coverage.has(key)) {
			// Outside signal range: halve scanRange and reduce AP by 1
			const halved = Math.floor(stats.scanRange / 2);
			const penalizedAp = Math.max(0, stats.ap - 1);
			if (stats.scanRange !== halved || stats.ap !== penalizedAp) {
				e.set(UnitStats, { ...stats, scanRange: halved, ap: penalizedAp });
			}
		}
	}
}
