/**
 * Playwright E2E debug bridge.
 *
 * Exposes window.__syntheteria with inspection/mutation methods
 * for automated testing. Pure TS — no React.
 */

import type { WorldType } from "../create-world";
import type { GameOutcome } from "../systems";
import {
	computeTerritory,
	getCombatKills,
	getGameOutcome,
	getPlayerResources,
} from "../systems";
import {
	Building,
	Faction,
	ResourcePool,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
	UnitVisual,
} from "../traits";

// ─── Types ────────────────────────────────────────────────────────────────

interface UnitInfo {
	entityId: number;
	tileX: number;
	tileZ: number;
	factionId: string;
	hp: number;
	ap: number;
	modelId: string;
}

interface BuildingInfo {
	tileX: number;
	tileZ: number;
	factionId: string;
	buildingType: string;
}

interface FactionStats {
	factionId: string;
	unitCount: number;
	totalHp: number;
	buildingCount: number;
	territoryPercent: number;
	totalResources: number;
	combatKills: number;
}

export interface DebugBridge {
	phase: string;
	turn: number;
	playerAp: number;
	selectedUnitId: number | null;
	isObserverMode: boolean;
	observerSpeed: number;
	getWorld: () => WorldType | null;
	selectUnit: (entityId: number | null) => void;
	moveUnit: (entityId: number, toX: number, toZ: number) => void;
	endTurn: () => void;
	advanceNTurns: (n: number) => void;
	getUnits: () => UnitInfo[];
	getBuildings: () => BuildingInfo[];
	getTerritoryMap: () => Record<
		string,
		{ factionId: string; contested: boolean }
	>;
	setObserverSpeed: (speed: number) => void;
	getResources: () => Record<string, number> | null;
	getFactionStats: () => FactionStats[];
	getGameOutcome: () => GameOutcome;
}

declare global {
	interface Window {
		__syntheteria?: DebugBridge;
	}
}

// ─── Bridge factory ───────────────────────────────────────────────────────

export interface DebugBridgeContext {
	phase: string;
	turn: number;
	playerAp: number;
	selectedUnitId: number | null;
	isObserverMode: boolean;
	observerSpeed: number;
	getWorld: () => WorldType | null;
	selectUnit: (id: number | null) => void;
	endTurn: () => void;
	setObserverSpeed: (speed: number) => void;
	boardWidth: number;
	boardHeight: number;
}

export function installDebugBridge(ctx: DebugBridgeContext): void {
	const w = ctx.getWorld;
	window.__syntheteria = {
		phase: ctx.phase,
		turn: ctx.turn,
		playerAp: ctx.playerAp,
		selectedUnitId: ctx.selectedUnitId,
		isObserverMode: ctx.isObserverMode,
		observerSpeed: ctx.observerSpeed,
		getWorld: w,
		selectUnit: ctx.selectUnit,
		moveUnit: (entityId, toX, toZ) => {
			const world = w();
			if (!world) return;
			for (const e of world.query(UnitPos, UnitFaction)) {
				if (e.id() === entityId) {
					const pos = e.get(UnitPos);
					if (!pos) return;
					e.add(
						UnitMove({
							fromX: pos.tileX,
							fromZ: pos.tileZ,
							toX,
							toZ,
							progress: 0,
							mpCost: 1,
						}),
					);
					return;
				}
			}
		},
		endTurn: ctx.endTurn,
		advanceNTurns: (n) => {
			for (let i = 0; i < n; i++) ctx.endTurn();
		},
		getUnits: () => {
			const world = w();
			if (!world) return [];
			const units: UnitInfo[] = [];
			for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
				const pos = e.get(UnitPos);
				const fac = e.get(UnitFaction);
				const stats = e.get(UnitStats);
				const vis = e.has(UnitVisual) ? e.get(UnitVisual) : null;
				if (!pos || !fac || !stats) continue;
				units.push({
					entityId: e.id(),
					tileX: pos.tileX,
					tileZ: pos.tileZ,
					factionId: fac.factionId,
					hp: stats.hp,
					ap: stats.ap,
					modelId: vis?.modelId ?? "",
				});
			}
			return units;
		},
		getBuildings: () => {
			const world = w();
			if (!world) return [];
			const buildings: BuildingInfo[] = [];
			for (const e of world.query(Building)) {
				const b = e.get(Building);
				if (!b) continue;
				buildings.push({
					tileX: b.tileX,
					tileZ: b.tileZ,
					factionId: b.factionId,
					buildingType: b.buildingType,
				});
			}
			return buildings;
		},
		getTerritoryMap: () => {
			const world = w();
			if (!world) return {};
			const snap = computeTerritory(world, ctx.boardWidth, ctx.boardHeight);
			const out: Record<string, { factionId: string; contested: boolean }> = {};
			for (const [key, val] of snap.tiles) {
				out[key] = { factionId: val.factionId, contested: val.contested };
			}
			return out;
		},
		getResources: () => {
			const world = w();
			return world ? getPlayerResources(world) : null;
		},
		getFactionStats: () => {
			const world = w();
			if (!world) return [];
			const territory = computeTerritory(
				world,
				ctx.boardWidth,
				ctx.boardHeight,
			);
			const fMap = new Map<string, { units: number; hp: number }>();
			for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
				const fac = e.get(UnitFaction);
				const stats = e.get(UnitStats);
				if (!fac || !stats) continue;
				const cur = fMap.get(fac.factionId) ?? { units: 0, hp: 0 };
				cur.units++;
				cur.hp += stats.hp;
				fMap.set(fac.factionId, cur);
			}
			const bMap = new Map<string, number>();
			for (const e of world.query(Building)) {
				const b = e.get(Building);
				if (!b) continue;
				bMap.set(b.factionId, (bMap.get(b.factionId) ?? 0) + 1);
			}
			const rMap = new Map<string, number>();
			for (const e of world.query(ResourcePool, Faction)) {
				const f = e.get(Faction);
				const pool = e.get(ResourcePool);
				if (!f || !pool) continue;
				let total = 0;
				for (const val of Object.values(pool)) {
					if (typeof val === "number") total += val;
				}
				rMap.set(f.id, total);
			}
			const allFactions = new Set<string>();
			for (const k of fMap.keys()) allFactions.add(k);
			for (const k of bMap.keys()) allFactions.add(k);
			for (const k of territory.counts.keys()) allFactions.add(k);
			const killMap = getCombatKills();
			const result: FactionStats[] = [];
			for (const fid of allFactions) {
				const u = fMap.get(fid) ?? { units: 0, hp: 0 };
				result.push({
					factionId: fid,
					unitCount: u.units,
					totalHp: u.hp,
					buildingCount: bMap.get(fid) ?? 0,
					territoryPercent:
						territory.totalTiles > 0
							? ((territory.counts.get(fid) ?? 0) / territory.totalTiles) * 100
							: 0,
					totalResources: rMap.get(fid) ?? 0,
					combatKills: killMap.get(fid) ?? 0,
				});
			}
			return result;
		},
		getGameOutcome: () => getGameOutcome(),
		setObserverSpeed: ctx.setObserverSpeed,
	};
}
