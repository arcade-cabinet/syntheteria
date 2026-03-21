import type { World } from "koota";
import { runYukaAiTurns } from "../ai/yukaAiTurnSystem";
import type { GeneratedBoard } from "../board/types";
import { computeEpoch, getEpochEvent } from "../config";
import { BIOME_DEFS, TileBiome } from "../terrain";
import {
	Board,
	Faction,
	ResourcePool,
	Tile,
	UnitAttack,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../traits";
import { setCurrentTurn } from "../ui/game/turnEvents";
import { resolveAllMoves } from "./aiTurnSystem";
import { runAnalysisAcceleration } from "./analysisSystem";
import { resolveAttacks } from "./attackSystem";
import { biomeMiningSystem } from "./biomeMiningSystem";
import { runBuildingUpgrades } from "./buildingUpgradeSystem";
import { recordTurnEnd } from "./campaignStats";
import { fireELArrival } from "./cultEncounterTracker";
import {
	checkCultistSpawn,
	runCultPatrols,
	spreadCorruption,
} from "./cultistSystem";
import { tickCultMutations } from "./cultMutation";
import { runDiplomacy, shareAlliedFog } from "./diplomacySystem";
import { runFabrication } from "./fabricationSystem";
import { runHackProgress } from "./hackingSystem";
import { harvestSystem } from "./harvestSystem";
import { clearHighlights } from "./highlightSystem";
import { checkAllFragmentProximity } from "./memoryFragments";
import { runPOIDiscovery } from "./poiDiscoverySystem";
import { runPowerGrid } from "./powerSystem";
import { runRepairs } from "./repairSystem";
import { finalizeTurnDeltas } from "./resourceDeltaSystem";
import { runResourceRenewal } from "./resourceRenewalSystem";
import { addResources } from "./resourceSystem";
import { calculateFactionScore } from "./scoreSystem";
import { runSignalNetwork } from "./signalSystem";
import { runSpecializationPassives } from "./specializationSystem";
import { runSynthesis } from "./synthesisSystem";
import { pushToast } from "./toastNotifications";
import { finalizeTurn } from "./turnEventLog";
import { runTurrets } from "./turretSystem";
import { fireTutorialTooltip } from "./tutorialTooltips";
import { checkVictoryConditions, type GameOutcome } from "./victorySystem";
import { tickWormholeProject } from "./wormholeProject";

/** Last outcome computed by advanceTurn. */
let lastOutcome: GameOutcome = { result: "playing" };

/** Track which epoch events have already fired. */
const firedEpochEvents = new Set<number>();

/** Track the last observed epoch number. */
let lastEpochNumber = 1;

/** Reset epoch event state — call on new game or tests. */
export function _resetEpochEvents(): void {
	firedEpochEvents.clear();
	lastEpochNumber = 1;
}

export function advanceTurn(
	world: World,
	board: GeneratedBoard,
	opts?: { observerMode?: boolean },
): void {
	// Phase 1: Resolve pending player attacks
	resolveAttacks(world);

	// Phase 2: AI faction turns (Yuka GOAP — move + queue attacks)
	runYukaAiTurns(world, board);

	// DEBUG: count moves/attacks after AI decisions (before resolution)
	let _moveCount = 0;
	let _atkCount = 0;
	const _moveDests: string[] = [];
	for (const e of world.query(UnitMove)) {
		const m = e.get(UnitMove);
		if (m) {
			_moveCount++;
			_moveDests.push(`(${m.fromX},${m.fromZ})->(${m.toX},${m.toZ})`);
		}
	}
	for (const e of world.query(UnitAttack)) {
		if (e.get(UnitAttack)) _atkCount++;
	}
	if (_moveCount > 0 || _atkCount > 0) {
		const turn = getCurrentTurn(world);
		if (turn <= 20) {
			console.log(
				`[advTurn T${turn}] moves=${_moveCount} attacks=${_atkCount} dests=${_moveDests.slice(0, 5).join(" ")}`,
			);
		}
	}

	// Phase 2.5: Resolve AI attacks BEFORE moves — attacks were evaluated
	// against pre-move positions, so resolving them first prevents
	// "target out of range" spam from position drift.
	resolveAttacks(world);

	// Phase 2.7: Complete AI moves (render loop handles visual lerp)
	resolveAllMoves(world);

	// Phase 4: Environment phase (cultist spawning)
	runEnvironmentPhase(world, board);

	// Phase 5: New turn — refresh player AP, clear highlights, increment
	clearHighlights(world);
	refreshPlayerAp(world);

	// Phase 5.5: Signal penalty — reduce AP for units outside relay coverage.
	// Must run AFTER refreshPlayerAp so the -1 AP is not overwritten.
	runSignalNetwork(world);

	incrementTurn(world);

	// Phase 5.6: Epoch transition events
	checkEpochTransition(world);

	// Phase 5.7: Catchup mechanic — resource bonus for trailing factions
	applyCatchupBonus(world);

	// Phase 6: Check victory/defeat conditions
	lastOutcome = checkVictoryConditions(world, {
		observerMode: opts?.observerMode,
	});
}

export function getGameOutcome(): GameOutcome {
	return lastOutcome;
}

function refreshPlayerAp(world: World): void {
	for (const e of world.query(UnitStats, UnitFaction)) {
		const faction = e.get(UnitFaction);
		const stats = e.get(UnitStats);
		if (!faction || !stats) continue;
		if (faction.factionId === "player") {
			e.set(UnitStats, {
				...stats,
				ap: stats.maxAp,
				mp: stats.maxMp,
				movesUsed: 0,
				staged: false,
			});
		}
	}
}

function incrementTurn(world: World): void {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (!b) continue;
		e.set(Board, { ...b, turn: b.turn + 1 });
	}
}

function runEnvironmentPhase(world: World, board: GeneratedBoard): void {
	const turn = getCurrentTurn(world);
	setCurrentTurn(turn);
	harvestSystem(world);
	biomeMiningSystem(world);
	runPowerGrid(world);
	runResourceRenewal(world);
	// Signal network moved to phase 5.5 (after AP refresh) so AP penalty sticks
	runRepairs(world);
	runSynthesis(world);
	runFabrication(world);
	runBuildingUpgrades(world);
	runAnalysisAcceleration(world);
	runTurrets(world);
	runHackProgress(world);
	checkCultistSpawn(world, board, turn);
	runCultPatrols(world, board);
	spreadCorruption(world);
	tickCultMutations(world);
	runSpecializationPassives(world);
	tickWormholeProject(world);

	// Environmental terrain drain — desert heat, tundra cold
	runEnvironmentalDrain(world);

	// Diplomacy: drift hostile→neutral, process backstabs
	const factionIds = getFactionIds(world);
	runDiplomacy(world, turn, factionIds);

	// Share fog of war from allied faction units
	shareAlliedFog(world, "player");

	// Check player unit proximity to undiscovered memory fragments
	checkAllFragmentProximity(world);

	// POI discovery — check unit positions against undiscovered POIs
	runPOIDiscovery(world);

	// Track campaign statistics and finalize turn logs
	recordTurnEnd();
	finalizeTurn();
	finalizeTurnDeltas();
}

/**
 * Environmental terrain drain — units on hostile biomes (desert, tundra) lose HP each turn.
 * HP cannot drop below 1 from environmental drain alone.
 */
function runEnvironmentalDrain(world: World): void {
	for (const entity of world.query(UnitPos, UnitStats)) {
		const pos = entity.get(UnitPos);
		const stats = entity.get(UnitStats);
		if (!pos || !stats) continue;

		// Look up biome via TileBiome entities
		let drain = 0;
		for (const tileEntity of world.query(Tile, TileBiome)) {
			const tile = tileEntity.get(Tile);
			if (!tile || tile.x !== pos.tileX || tile.z !== pos.tileZ) continue;
			const biome = tileEntity.get(TileBiome);
			if (!biome) break;
			drain = BIOME_DEFS[biome.biomeType]?.environmentalDrain ?? 0;
			break;
		}

		if (drain > 0) {
			entity.set(UnitStats, { ...stats, hp: Math.max(1, stats.hp - drain) });
		}
	}
}

export function getCurrentTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}

/** Collect all unique faction IDs from Faction entities in the world. */
function getFactionIds(world: World): string[] {
	const ids: string[] = [];
	for (const e of world.query(Faction)) {
		const f = e.get(Faction);
		if (f?.id) ids.push(f.id);
	}
	return ids;
}

// ---------------------------------------------------------------------------
// Epoch transition events
// ---------------------------------------------------------------------------

const CATCHUP_THRESHOLD = 0.25;
const CATCHUP_BONUS_RATE = 0.1;

function checkEpochTransition(world: World): void {
	const turn = getCurrentTurn(world);
	const epoch = computeEpoch(1, turn);
	if (epoch.number !== lastEpochNumber && !firedEpochEvents.has(epoch.number)) {
		firedEpochEvents.add(epoch.number);
		lastEpochNumber = epoch.number;

		fireTutorialTooltip("first_epoch_change");

		if (epoch.number === 3) {
			fireELArrival(world);
		}

		const event = getEpochEvent(epoch.number);
		if (event) {
			pushToast("turn", event.title, event.toastMessage, 8000);
		}
	}
	lastEpochNumber = epoch.number;
}

// ---------------------------------------------------------------------------
// Catchup mechanic — resource income bonus for factions trailing in score
// ---------------------------------------------------------------------------

const CATCHUP_MATERIALS: readonly string[] = [
	"stone",
	"iron_ore",
	"coal",
	"sand",
	"timber",
];

function applyCatchupBonus(world: World): void {
	const factionScores: Array<{ id: string; score: number }> = [];
	for (const e of world.query(Faction)) {
		const f = e.get(Faction);
		if (!f) continue;
		const score = calculateFactionScore(world, f.id);
		factionScores.push({ id: f.id, score });
	}

	if (factionScores.length < 2) return;

	const leaderScore = Math.max(...factionScores.map((fs) => fs.score));
	if (leaderScore <= 0) return;

	for (const fs of factionScores) {
		if (fs.score >= leaderScore * CATCHUP_THRESHOLD) continue;

		for (const mat of CATCHUP_MATERIALS) {
			for (const e of world.query(ResourcePool, Faction)) {
				const f = e.get(Faction);
				if (!f || f.id !== fs.id) continue;
				const pool = e.get(ResourcePool);
				if (!pool) continue;
				const current = (pool[mat as keyof typeof pool] as number) || 0;
				const bonus = Math.max(1, Math.round(current * CATCHUP_BONUS_RATE));
				addResources(world, fs.id, mat as "stone", bonus);
				break;
			}
		}
	}
}
