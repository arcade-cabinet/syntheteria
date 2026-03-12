import type { BotUnitType } from "./types";

export type BotRadialCategoryId =
	| "move"
	| "combat"
	| "build"
	| "district"
	| "repair"
	| "fabricate"
	| "survey"
	| "system";

export interface BotCommandProfile {
	unitType: BotUnitType;
	allowedCategories: BotRadialCategoryId[];
	canMove: boolean;
	canPatrol: boolean;
	canAttack: boolean;
	canHack: boolean;
	canBuildRod: boolean;
	canBuildFabricator: boolean;
	canBuildRelay: boolean;
	canEstablishSubstation: boolean;
	canFortify: boolean;
	canRepair: boolean;
	canFabricate: boolean;
	canSurvey: boolean;
	preferredPreviewCategory: BotRadialCategoryId;
	roleBrief: string;
	tutorialPrompt: string;
	actionHighlights: string[];
}

const BOT_COMMAND_PROFILES: Record<BotUnitType, BotCommandProfile> = {
	maintenance_bot: {
		unitType: "maintenance_bot",
		allowedCategories: [
			"move",
			"combat",
			"build",
			"district",
			"survey",
			"system",
		],
		canMove: true,
		canPatrol: true,
		canAttack: false,
		canHack: true,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: true,
		canEstablishSubstation: false,
		canFortify: false,
		canRepair: true,
		canFabricate: false,
		canSurvey: true,
		preferredPreviewCategory: "survey",
		roleBrief:
			"Lead awakening chassis for close repair, survey passes, and early signal reclamation.",
		tutorialPrompt:
			"Use this chassis to inspect sectors, merge perception, and recover damaged systems before expanding.",
		actionHighlights: ["survey", "repair", "hack", "relay"],
	},
	utility_drone: {
		unitType: "utility_drone",
		allowedCategories: ["move", "build", "district", "survey", "system"],
		canMove: true,
		canPatrol: true,
		canAttack: false,
		canHack: false,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: true,
		canEstablishSubstation: false,
		canFortify: false,
		canRepair: false,
		canFabricate: false,
		canSurvey: true,
		preferredPreviewCategory: "build",
		roleBrief:
			"Fast relay-hauler for route stitching, cargo support, and lightweight sector reconnaissance.",
		tutorialPrompt:
			"Use this drone to extend operational reach, scout ahead, and prepare logistics corridors.",
		actionHighlights: ["move", "relay", "survey", "logistics"],
	},
	fabrication_unit: {
		unitType: "fabrication_unit",
		allowedCategories: ["fabricate", "district", "survey", "system"],
		canMove: false,
		canPatrol: false,
		canAttack: false,
		canHack: false,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: false,
		canEstablishSubstation: false,
		canFortify: false,
		canRepair: true,
		canFabricate: true,
		canSurvey: true,
		preferredPreviewCategory: "fabricate",
		roleBrief:
			"Industrial rig that anchors local fabrication throughput and heavy component conversion.",
		tutorialPrompt:
			"Stabilize this rig inside protected districts to fabricate replacements and sustain expansion.",
		actionHighlights: ["fabricate", "survey", "industrial support"],
	},
	feral_drone: {
		unitType: "feral_drone",
		allowedCategories: ["move", "combat", "survey", "system"],
		canMove: true,
		canPatrol: true,
		canAttack: true,
		canHack: false,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: false,
		canEstablishSubstation: false,
		canFortify: false,
		canRepair: false,
		canFabricate: false,
		canSurvey: true,
		preferredPreviewCategory: "combat",
		roleBrief:
			"Degraded hostile raider optimized for sudden pressure, scavenging, and unstable patrol loops.",
		tutorialPrompt:
			"Expect erratic aggression and use this chassis as a salvage and combat-behavior reference.",
		actionHighlights: ["attack", "patrol", "pressure"],
	},
	field_fighter: {
		unitType: "field_fighter",
		allowedCategories: ["move", "combat", "district", "survey", "system"],
		canMove: true,
		canPatrol: true,
		canAttack: true,
		canHack: false,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: false,
		canEstablishSubstation: false,
		canFortify: true,
		canRepair: false,
		canFabricate: false,
		canSurvey: true,
		preferredPreviewCategory: "combat",
		roleBrief:
			"Primary strike chassis for escort, breach pressure, and early combat dominance.",
		tutorialPrompt:
			"Keep this unit near vulnerable support frames and use it to contest hostile districts.",
		actionHighlights: ["attack", "fortify", "escort", "sector control"],
	},
	mecha_scout: {
		unitType: "mecha_scout",
		allowedCategories: [
			"move",
			"combat",
			"build",
			"district",
			"survey",
			"system",
		],
		canMove: true,
		canPatrol: true,
		canAttack: false,
		canHack: true,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: true,
		canEstablishSubstation: false,
		canFortify: false,
		canRepair: true,
		canFabricate: false,
		canSurvey: true,
		preferredPreviewCategory: "survey",
		roleBrief:
			"Long-range survey frame for broader map intelligence and relay-aware infiltration.",
		tutorialPrompt:
			"Push this chassis into uncertain sectors to widen campaign awareness without overcommitting heavier units.",
		actionHighlights: ["survey", "hack", "repair", "relay"],
	},
	mecha_trooper: {
		unitType: "mecha_trooper",
		allowedCategories: ["move", "combat", "district", "survey", "system"],
		canMove: true,
		canPatrol: true,
		canAttack: true,
		canHack: false,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: false,
		canEstablishSubstation: false,
		canFortify: true,
		canRepair: false,
		canFabricate: false,
		canSurvey: true,
		preferredPreviewCategory: "combat",
		roleBrief:
			"Storm-hardened trooper chassis tuned for sustained fights and intimidation pressure.",
		tutorialPrompt:
			"Use this platform when direct confrontation matters more than utility or expansion.",
		actionHighlights: ["attack", "fortify", "storm pressure"],
	},
	mecha_golem: {
		unitType: "mecha_golem",
		allowedCategories: [
			"move",
			"combat",
			"build",
			"district",
			"survey",
			"system",
		],
		canMove: true,
		canPatrol: true,
		canAttack: true,
		canHack: false,
		canBuildRod: true,
		canBuildFabricator: true,
		canBuildRelay: true,
		canEstablishSubstation: true,
		canFortify: true,
		canRepair: true,
		canFabricate: false,
		canSurvey: true,
		preferredPreviewCategory: "build",
		roleBrief:
			"Heavy engineer hull for substation establishment, structural hardening, and district capture.",
		tutorialPrompt:
			"Commit this chassis when you are ready to convert presence into permanent operational territory.",
		actionHighlights: ["substation", "relay", "rod", "fabricator", "fortify"],
	},
	quadruped_tank: {
		unitType: "quadruped_tank",
		allowedCategories: [
			"move",
			"combat",
			"build",
			"district",
			"survey",
			"system",
		],
		canMove: true,
		canPatrol: true,
		canAttack: true,
		canHack: false,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: true,
		canEstablishSubstation: false,
		canFortify: true,
		canRepair: false,
		canFabricate: false,
		canSurvey: true,
		preferredPreviewCategory: "combat",
		roleBrief:
			"Heavy sentry chassis for anchoring reclaimed space and punishing incursions.",
		tutorialPrompt:
			"Use this platform to hold substations and deny hostile advances through narrow sectors.",
		actionHighlights: ["attack", "fortify", "relay", "zone denial"],
	},
};

export function getBotCommandProfile(unitType: BotUnitType): BotCommandProfile {
	return BOT_COMMAND_PROFILES[unitType];
}

export function isBotCategoryAllowed(
	unitType: BotUnitType,
	categoryId: BotRadialCategoryId,
) {
	return BOT_COMMAND_PROFILES[unitType].allowedCategories.includes(categoryId);
}
