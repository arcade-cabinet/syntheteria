/**
 * @package systems
 *
 * ALL Koota systems for Syntheteria — one per file, pure functions accepting `world: World`.
 */

// --- AI & Turn Flow ---
export { resolveAllMoves, runAiTurns } from "./aiTurnSystem";
// --- Analysis (building upgrade acceleration) ---
export {
	analysisAcceleration,
	runAnalysisAcceleration,
} from "./analysisSystem";
export type {
	FactionResourceData,
	TurnSnapshotData,
} from "./analyticsCollector";
// --- Analytics & Campaign Stats ---
export {
	collectCampaignStats,
	collectFactionResources,
	collectTurnSnapshot,
} from "./analyticsCollector";
// --- Combat ---
export { resolveAttacks } from "./attackSystem";
export { biomeMiningSystem, startBiomeMining } from "./biomeMiningSystem";
// --- Building ---
export { placeStarterBuildings } from "./buildingPlacement";
export type { BuildingUpgradeJob } from "./buildingUpgradeSystem";
export {
	canUpgradeBuilding,
	clearBuildingUpgradeJobs,
	getBuildingUpgradeJob,
	runBuildingUpgrades,
	startBuildingUpgrade,
} from "./buildingUpgradeSystem";
export {
	_resetBuildSystem,
	cancelBuildPlacement,
	confirmBuildPlacement,
	getPendingBuildType,
	isInBuildPlacementMode,
	startBuildPlacement,
} from "./buildSystem";
export type { CampaignStats } from "./campaignStats";
export {
	getCampaignStats,
	getCombatKills,
	recordBuildingDestroyed,
	recordCellDiscovered,
	recordCombatEngagement,
	recordCombatKill,
	recordCultistDestroyed,
	recordIncursionSurvived,
	recordLightningStrike,
	recordMaterialGathered,
	recordStructureBuilt,
	recordStructureHarvested,
	recordTurnEnd,
	recordUnitBuilt,
	recordUnitHacked,
	recordUnitLost,
	rehydrateCampaignStats,
	resetCampaignStats,
	serializeCampaignStats,
	setCampaignStats,
	subscribeCampaignStats,
	updateTerritorySize,
} from "./campaignStats";
export type {
	EscalationStage,
	SectBias,
	StormCultistParams,
} from "./cultistSystem";
// --- Cult ---
export {
	_reset as _resetCultist,
	_resetCultEncounters,
	checkCultistSpawn,
	cleanupDestroyedStructures,
	fireCultEncounter,
	fireELArrival,
	fireHumanEncounter,
	getAltarZones,
	getBreachZones,
	getCorruptedTiles,
	getEscalationStage,
	getPOIPositions,
	getStormCultistParams,
	hasELArrivalFired,
	hasFiredEncounter,
	hasFiredHumanEncounter,
	initBreachZones,
	initCultPOIs,
	runCultPatrols,
	SECT_BIASES,
	spreadCorruption,
} from "./cultistSystem";
export {
	computeTier,
	getMutationXPMultiplier,
	TIER_1_BUFFS,
	TIER_2_ABILITIES,
	tickCultMutations,
} from "./cultMutation";
export type {
	DiplomacyEvent,
	DiplomacyPersonality,
	StandingLevel,
	TradeIncome,
} from "./diplomacySystem";
// --- Diplomacy ---
export {
	_resetDiplomacy,
	applyBreakPenalty,
	applyDiplomacyEvent,
	calculateTradeIncome,
	declareWar,
	getDiplomacyPersonality,
	getRecentDiplomacyEvents,
	getStandingDisplay,
	getStandingLevel,
	isAlly,
	proposeAlliance,
	recordAggression,
	runDiplomacy,
	shareAlliedFog,
	subscribeDiplomacy,
} from "./diplomacySystem";
export type { RobotRoleFamily, XPActionType } from "./experienceSystem";
// --- Experience & Upgrade ---
export {
	applyMarkUpgrade,
	awardXP,
	BASE_XP,
	CLASS_ROLE,
	calculateXPForAction,
	getMarkThreshold,
	getXPForNextMark,
	getXPProgress,
	isRoleAligned,
	OFF_ROLE_MULTIPLIER,
	ROLE_ACTIONS,
	recordHarvest,
	recordKill,
	resetAllXP,
} from "./experienceSystem";
export type { QueueResult, RobotCost } from "./fabricationSystem";
// --- Fabrication ---
export {
	FabricationJob,
	queueFabrication,
	ROBOT_COSTS,
	runFabrication,
} from "./fabricationSystem";
// --- Fog of War ---
export { revealFog } from "./fogRevealSystem";
export type {
	HackType,
	StartHackResult,
	StartUnitHackResult,
} from "./hackingSystem";
// --- Hacking ---
export {
	cancelHack,
	HackProgress,
	runHackProgress,
	startHack,
	startUnitHack,
} from "./hackingSystem";
export type { HackedBotRole } from "./hackingTypes";
export {
	getHackedBotRole,
	HACKING_AP_COST,
	HACKING_BASE_DIFFICULTY,
	HACKING_RANGE,
} from "./hackingTypes";
// --- Harvesting & Mining ---
export { harvestSystem, startHarvest } from "./harvestSystem";
// --- Highlight ---
export {
	clearHighlights,
	highlightPlacementTile,
	highlightReachableTiles,
} from "./highlightSystem";
export type { FragmentDefinition, PlacedFragment } from "./memoryFragments";
// --- Memory Fragments ---
export {
	checkAllFragmentProximity,
	checkProximity,
	FRAGMENT_CONFIG,
	getAllFragmentDefinitions,
	getFragmentDefinition,
	getFragmentProgress,
	getGlowColor,
	getGlowIntensity,
	getInteractionRadius,
	getPlacedFragments,
	getReadFragments,
	isDiscovered,
	isRead,
	placeFragment,
	placeFragmentsInWorld,
	readFragment,
	resetMemoryFragments,
	subscribeMemoryFragments,
} from "./memoryFragments";
// --- Movement ---
export { movementSystem } from "./movementSystem";
export type { ActivePOIBonus } from "./poiDiscoverySystem";
// --- POI ---
export {
	_resetPOIDiscovery,
	getActivePOIBonuses,
	hasActiveBonus,
	runPOIDiscovery,
	tickPOIBonuses,
} from "./poiDiscoverySystem";
export { placePOIs } from "./poiPlacement";
// --- Population ---
export {
	BASE_POP_CAP,
	canSpawnUnit,
	getPopCap,
	getPopulation,
	POP_PER_OUTPOST,
	POP_PER_POWER_PLANT,
} from "./populationSystem";
// --- Power ---
export { isPowered, runPowerGrid } from "./powerSystem";
// --- Repair ---
export { runRepairs } from "./repairSystem";
export type { QueueResearchResult } from "./researchSystem";
// --- Research ---
export {
	cancelResearch,
	countResearchLabs,
	getAvailableTechs,
	getResearchState,
	getTechEffectValue,
	hasTechEffect,
	isTechResearched,
	queueResearch,
	ResearchState,
	runResearch,
} from "./researchSystem";
export type { ResourceDelta, ResourceDeltaMap } from "./resourceDeltaSystem";
// --- Resources ---
export {
	finalizeTurnDeltas,
	getResourceDeltas,
	resetResourceDeltas,
	subscribeResourceDeltas,
	trackExpenditure,
	trackIncome,
} from "./resourceDeltaSystem";
export { RENEWAL_YIELDS, runResourceRenewal } from "./resourceRenewalSystem";
export {
	addResources,
	canAfford,
	getPlayerResources,
	spendResources,
} from "./resourceSystem";
// --- Salvage ---
export { placeSalvageProps, TERRAIN_SALVAGE } from "./salvagePlacement";
// --- Score ---
export {
	_resetScoreSystem,
	calculateFactionScore,
	getCultStructuresDestroyed,
	recordCultStructureDestroyed,
} from "./scoreSystem";
// --- Signal ---
export { isInSignalRange, runSignalNetwork } from "./signalSystem";
// --- Specialization ---
export { runSpecializationPassives } from "./specializationSystem";
export type { ActiveSpeech } from "./speechBubbleStore";
// --- Speech ---
export {
	clearAllSpeech,
	getActiveSpeech,
	getSpeechSnapshot,
	subscribeSpeech,
	triggerSpeech,
} from "./speechBubbleStore";
export {
	triggerCombatSpeech,
	triggerContextSpeech,
	triggerDiscoverySpeech,
	triggerEventSpeech,
	triggerHarvestSpeech,
} from "./speechTriggers";
export type { FusionRecipe } from "./synthesisSystem";
// --- Synthesis ---
export {
	FUSION_RECIPES,
	queueSynthesis,
	runSynthesis,
	SynthesisQueue,
} from "./synthesisSystem";
export type { TerritorySnapshot, TileTerritory } from "./territorySystem";
// --- Territory ---
export {
	computeTerritory,
	getTerritoryPercent,
} from "./territorySystem";
export type { Toast, ToastCategory } from "./toastNotifications";
// --- Toast Notifications ---
export {
	_resetToasts,
	dismissAllToasts,
	dismissToast,
	getMutedCategories,
	getVisibleToasts,
	isCategoryMuted,
	muteCategory,
	pushToast,
	subscribeToasts,
	unmuteCategory,
} from "./toastNotifications";
export type { TurnEvent, TurnEventType, TurnLog } from "./turnEventLog";
// --- Turn Event Log ---
export {
	finalizeTurn,
	getCompletedTurnLogs,
	getCurrentTurnEvents,
	getCurrentTurnNumber,
	getTurnLog,
	logTurnEvent,
	rehydrateTurnEventLog,
	resetTurnEventLog,
} from "./turnEventLog";
export type {
	CombatResult,
	ResourceChange,
	RivalMilestone,
	TurnSummaryData,
} from "./turnSummary";
// --- Turn Summary ---
export {
	clearTurnSummary,
	collectTurnSummary,
	getRivalMilestones,
	getTurnSummary,
	resetTurnSummary,
	subscribeTurnSummary,
} from "./turnSummary";
export {
	_resetEpochEvents,
	advanceTurn,
	getCurrentTurn,
	getGameOutcome,
} from "./turnSystem";
// --- Turret ---
export { runTurrets } from "./turretSystem";
export type { TutorialState, TutorialStep } from "./tutorialSystem";
// --- Tutorial ---
export {
	_resetTutorial,
	completeCurrentStep,
	getAllSteps,
	getCurrentStep,
	getTutorialState,
	isStepCompleted,
	skipTutorial,
	subscribeTutorial,
} from "./tutorialSystem";
export type { TooltipTrigger } from "./tutorialTooltips";
// --- Tutorial Tooltips (organic contextual hints) ---
export {
	fireTutorialTooltip,
	getAllTooltipDefs,
	hasTooltipFired,
	resetTutorialTooltips,
} from "./tutorialTooltips";
export type { UpgradeResult } from "./upgradeSystem";
export {
	applyMark,
	getMaxTier,
	hasMark,
	parseMarks,
} from "./upgradeSystem";
export type {
	GameOutcome,
	VictoryProgress,
	VictoryResult,
	VictoryType,
} from "./victorySystem";
// --- Victory ---
export {
	_resetVictory,
	checkVictoryConditions,
	getVictoryProgress,
} from "./victorySystem";
export type {
	WormholeProjectState,
	WormholeTickResult,
} from "./wormholeProject";
// --- Wormhole Project ---
export {
	_resetWormholeProject,
	canStartWormholeProject,
	getWormholeProjectState,
	isValidWormholePlacement,
	onWormholeStabilizerPlaced,
	tickWormholeProject,
} from "./wormholeProject";
