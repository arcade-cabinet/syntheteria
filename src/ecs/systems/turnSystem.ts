import type { World } from "koota";
import type { GeneratedBoard } from "../../board/types";
import { setCurrentTurn } from "../../ui/game/turnEvents";
import { Board } from "../traits/board";
import { Faction } from "../traits/faction";
import { UnitFaction, UnitStats } from "../traits/unit";
import { resolveAllMoves } from "./aiTurnSystem";
import { runYukaAiTurns } from "../../ai/yukaAiTurnSystem";
import { resolveAttacks } from "./attackSystem";
import { floorMiningSystem } from "./floorMiningSystem";
import { harvestSystem } from "./harvestSystem";
import { checkCultistSpawn, runCultPatrols, spreadCorruption } from "./cultistSystem";
import { runDiplomacy, shareAlliedFog } from "./diplomacySystem";
import { clearHighlights } from "./highlightSystem";
import { runFabrication } from "./fabricationSystem";
import { runPowerGrid } from "./powerSystem";
import { runRepairs } from "./repairSystem";
import { runResourceRenewal } from "./resourceRenewalSystem";
import { runSignalNetwork } from "./signalSystem";
import { runResearch } from "./researchSystem";
import { runSynthesis } from "./synthesisSystem";
import { runTurrets } from "./turretSystem";
import { runHackProgress } from "./hackingSystem";
import { type GameOutcome, checkVictoryConditions } from "./victorySystem";
import { tickWormholeProject } from "./wormholeProject";
import { recordTurnEnd } from "./campaignStats";
import { finalizeTurn } from "./turnEventLog";
import { tickCultMutations } from "./cultMutation";
import { checkAllFragmentProximity } from "./memoryFragments";
import { finalizeTurnDeltas } from "./resourceDeltaSystem";
import { runSpecializationPassives } from "./specializationSystem";

/** Last outcome computed by advanceTurn. */
let lastOutcome: GameOutcome = { result: "playing" };

export function advanceTurn(world: World, board: GeneratedBoard, opts?: { observerMode?: boolean }): void {
	// Phase 1: Resolve pending player attacks
	resolveAttacks(world);

	// Phase 2: AI faction turns (Yuka GOAP — move + queue attacks)
	runYukaAiTurns(world, board);

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

	// Phase 6: Check victory/defeat conditions
	lastOutcome = checkVictoryConditions(world, { observerMode: opts?.observerMode });
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
	floorMiningSystem(world);
	runPowerGrid(world);
	runResourceRenewal(world);
	// Signal network moved to phase 5.5 (after AP refresh) so AP penalty sticks
	runRepairs(world);
	runSynthesis(world);
	runResearch(world);
	runFabrication(world);
	runTurrets(world);
	runHackProgress(world);
	checkCultistSpawn(world, board, turn);
	runCultPatrols(world, board);
	spreadCorruption(world);
	tickCultMutations(world);
	runSpecializationPassives(world);
	tickWormholeProject(world);

	// Diplomacy: drift hostile→neutral, process backstabs
	const factionIds = getFactionIds(world);
	runDiplomacy(world, turn, factionIds);

	// Share fog of war from allied faction units
	shareAlliedFog(world, "player");

	// Check player unit proximity to undiscovered memory fragments
	checkAllFragmentProximity(world);

	// Track campaign statistics and finalize turn logs
	recordTurnEnd();
	finalizeTurn();
	finalizeTurnDeltas();
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
