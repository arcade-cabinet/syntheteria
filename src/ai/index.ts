/**
 * AI module — Yuka steering integration for bot movement and GOAP civilization AI.
 *
 * Re-exports everything needed by the rest of the game:
 *   - YukaManager: singleton entity manager + navmesh (tick from <YukaSystem />)
 *   - YukaSystem:  R3F component that drives the update loop
 *   - createBotVehicle: factory for Yuka Vehicle instances
 *   - attachBehaviors + helpers: steering behavior configuration
 *   - useBotSteering: React hook linking a Miniplex entity to a Vehicle
 *   - NavMeshBuilder: build/update Yuka NavMesh from world geometry
 *   - PathfindingSystem: high-level navmesh pathfinding API
 *   - NavMeshDebugRenderer: R3F debug visualization (toggle with ` key)
 *   - goap/*: GOAP-based civilization governor for NPC faction AI
 *   - PerceptionSystem: cone-of-sight vision with LOS occlusion
 *   - MemorySystem: persistent entity memory with confidence decay
 *   - ThreatAssessment: multi-factor threat evaluation for combat decisions
 *   - FormationPatterns: offset calculations for line/wedge/column/circle formations
 *   - FormationSystem: squad formation management with Yuka OffsetPursuit
 */

export {
	type BotType,
	type BotVehicleOptions,
	createBotVehicle,
} from "./BotVehicle.ts";
// BotBrain FSM → Yuka Vehicle steering bridge
export {
	applySteeringOutput,
	type BotBrainEntry,
	getBotBrain,
	getRegisteredBotCount,
	isBotBrainRegistered,
	registerBotBrain,
	resetBotBrainSystem,
	tickBotBrains,
	unregisterBotBrain,
} from "./BotBrainSystem.ts";
// Formation system
export {
	DEFAULT_SPACING,
	type FormationSpacing,
	FormationType,
	getOffsets,
	type Vec3Offset,
} from "./FormationPatterns.ts";
export {
	type CreateFormationOptions,
	changeFormationType,
	clearAllFormations,
	createFormation,
	dissolveFormation,
	type Formation,
	type FormationMember,
	getAllFormations,
	getFormation,
	removeMember,
	updateFormation,
} from "./FormationSystem.ts";
// GOAP civilization AI
export {
	CivGoal,
	CivilizationGovernor,
	type FactionSituation,
	type GOAPAction,
	type GoalState,
	type GoalWeights,
	planActions,
	type WorldState,
	WorldStateKey,
} from "./goap/index.ts";
export {
	clearAllMemories,
	clearBotMemory,
	getActiveMemoryCount,
	getMemories,
	getMemoryOf,
	getRecentThreats,
	hasMemoryOf,
	type MemoryRecord,
	updateMemory,
} from "./MemorySystem.ts";
export {
	buildNavMesh,
	gatherObstacles,
	getNavMeshCellSize,
	getNavMeshGridSize,
	type ObstacleRect,
	updateNavMeshObstacles,
} from "./NavMeshBuilder.ts";
export { NavMeshDebugRenderer } from "./NavMeshDebugRenderer.tsx";
export {
	createPathFollower,
	findPath,
	findPathGlobal,
	type PathFollowerHandle,
	type PathResult,
	requestPath,
} from "./PathfindingSystem.ts";
// Perception, memory, and threat assessment
export {
	addPerceptionObstacle,
	canSee,
	clearAllVisionCaches,
	clearVisionCache,
	getPerceptionObstacles,
	getVisibleEntities,
	initPerceptionObstacles,
} from "./PerceptionSystem.ts";
export {
	activateArrive,
	activateFlee,
	activateSeek,
	activateWander,
	attachBehaviors,
	type BotBehaviors,
	stopAll,
} from "./SteeringBehaviors.ts";
export {
	assessThreat,
	getHighestThreat,
	getThreatsAbove,
	hasThreatAboveThreshold,
	THREAT_THRESHOLD,
} from "./ThreatAssessment.ts";
export {
	type BotSteeringAPI,
	type UseBotSteeringOptions,
	useBotSteering,
} from "./useBotSteering.ts";
export { YukaManager } from "./YukaManager.ts";
export { YukaSystem } from "./YukaSystem.tsx";
