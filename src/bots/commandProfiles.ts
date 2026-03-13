import type { BotUnitType } from "./types";

export type BotRadialCategoryId =
	| "move"
	| "combat"
	| "build"
	| "district"
	| "repair"
	| "fabricate"
	| "harvest"
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
	canHarvest: boolean;
	canSurvey: boolean;
	preferredPreviewCategory: BotRadialCategoryId;
	roleBrief: string;
	tutorialPrompt: string;
	actionHighlights: string[];
}

const BOT_COMMAND_PROFILES: Record<BotUnitType, BotCommandProfile> = {
	// ─── Player Roles (6) ────────────────────────────────────────────────
	maintenance_bot: {
		unitType: "maintenance_bot",
		allowedCategories: ["move", "repair", "survey", "system"],
		canMove: true,
		canPatrol: true,
		canAttack: false,
		canHack: false,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: false,
		canEstablishSubstation: false,
		canFortify: false,
		canRepair: true,
		canFabricate: false,
		canHarvest: false,
		canSurvey: true,
		preferredPreviewCategory: "repair",
		roleBrief:
			"Technician — repairs, maintains, and installs components on allied units.",
		tutorialPrompt:
			"Use this chassis to repair damaged units and keep your roster operational.",
		actionHighlights: ["repair", "maintain", "component install"],
	},
	mecha_scout: {
		unitType: "mecha_scout",
		allowedCategories: ["move", "survey", "district", "system"],
		canMove: true,
		canPatrol: true,
		canAttack: false,
		canHack: false,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: false,
		canEstablishSubstation: false,
		canFortify: false,
		canRepair: false,
		canFabricate: false,
		canHarvest: false,
		canSurvey: true,
		preferredPreviewCategory: "survey",
		roleBrief:
			"Scout — explores, surveys, and detects hidden resources. Storm gatherer at Mark II+.",
		tutorialPrompt:
			"Push this chassis deep into unknown sectors to reveal the map and locate resources.",
		actionHighlights: ["explore", "survey", "detect", "storm gather"],
	},
	field_fighter: {
		unitType: "field_fighter",
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
		canHarvest: false,
		canSurvey: true,
		preferredPreviewCategory: "combat",
		roleBrief:
			"Striker — melee combat specialist for breakthroughs and escort missions.",
		tutorialPrompt:
			"Use this unit to engage hostiles and protect your support units.",
		actionHighlights: ["attack", "breach", "escort"],
	},
	fabrication_unit: {
		unitType: "fabrication_unit",
		allowedCategories: [
			"move",
			"build",
			"fabricate",
			"harvest",
			"district",
			"survey",
			"system",
		],
		canMove: true,
		canPatrol: false,
		canAttack: false,
		canHack: false,
		canBuildRod: true,
		canBuildFabricator: true,
		canBuildRelay: true,
		canEstablishSubstation: true,
		canFortify: false,
		canRepair: false,
		canFabricate: true,
		canHarvest: true,
		canSurvey: true,
		preferredPreviewCategory: "build",
		roleBrief:
			"Fabricator — builds structures and harvests the ecumenopolis for materials.",
		tutorialPrompt:
			"Use this unit to harvest structures for materials and build new infrastructure.",
		actionHighlights: ["build", "harvest", "fabricate", "establish"],
	},
	mecha_golem: {
		unitType: "mecha_golem",
		allowedCategories: ["move", "combat", "survey", "system"],
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
		canHarvest: false,
		canSurvey: true,
		preferredPreviewCategory: "combat",
		roleBrief:
			"Guardian — heavy defensive unit for area denial and settlement protection.",
		tutorialPrompt:
			"Position this unit to protect your base and absorb incoming attacks.",
		actionHighlights: ["defend", "fortify", "taunt", "area denial"],
	},
	utility_drone: {
		unitType: "utility_drone",
		allowedCategories: ["move", "survey", "system"],
		canMove: true,
		canPatrol: true,
		canAttack: false,
		canHack: false,
		canBuildRod: false,
		canBuildFabricator: false,
		canBuildRelay: false,
		canEstablishSubstation: false,
		canFortify: false,
		canRepair: false,
		canFabricate: false,
		canHarvest: false,
		canSurvey: true,
		preferredPreviewCategory: "move",
		roleBrief:
			"Hauler — transports resources between structures and supply points.",
		tutorialPrompt:
			"Use this drone to move materials between harvest sites and your base.",
		actionHighlights: ["haul", "transport", "logistics", "supply"],
	},
	// ─── Hostile Roles (3) — hackable ────────────────────────────────────
	feral_drone: {
		unitType: "feral_drone",
		allowedCategories: ["move", "combat", "system"],
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
		canHarvest: false,
		canSurvey: false,
		preferredPreviewCategory: "combat",
		roleBrief:
			"Cult Mech — fast swarm attacker. When hacked, becomes a light melee specialist.",
		tutorialPrompt:
			"Hack this unit to convert it into a fast melee ally.",
		actionHighlights: ["attack", "swarm", "melee"],
	},
	mecha_trooper: {
		unitType: "mecha_trooper",
		allowedCategories: ["move", "combat", "system"],
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
		canHarvest: false,
		canSurvey: false,
		preferredPreviewCategory: "combat",
		roleBrief:
			"Rogue Sentinel — patrols AI zones. When hacked, becomes a ranged combat unit.",
		tutorialPrompt:
			"Hack this unit to gain ranged attack capability for your roster.",
		actionHighlights: ["attack", "patrol", "ranged"],
	},
	quadruped_tank: {
		unitType: "quadruped_tank",
		allowedCategories: ["move", "combat", "system"],
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
		canHarvest: false,
		canSurvey: false,
		preferredPreviewCategory: "combat",
		roleBrief:
			"Siege Engine — attacks fortified positions. Hackable for massive structure damage.",
		tutorialPrompt:
			"Hack this unit to gain siege capability against enemy structures.",
		actionHighlights: ["attack", "siege", "structure damage"],
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
