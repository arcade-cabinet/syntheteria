import type { UnitComponent } from "../ecs/traits";
import { getDefaultBotIdentity } from "./archetypes";
import type {
	BotDefinition,
	BotIdentityProfile,
	BotSpeechProfile,
	BotUnitType,
	HostileBotRole,
	PlayerBotRole,
} from "./types";

const BOT_DEFINITIONS: Record<BotUnitType, BotDefinition> = {
	// ─── Player Roles (6) ────────────────────────────────────────────────
	maintenance_bot: {
		unitType: "maintenance_bot",
		label: "Technician",
		description:
			"Awakening-era repair frame. Maintains, restores, and installs components on allied units.",
		model: "Companion-bot.glb",
		scale: 0.8,
		baseSpeed: 3,
		powerDemand: 0.5,
		movingPowerBonus: 0.3,
		archetypeId: "field_technician",
		defaultSpeechProfile: "mentor",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "biped_scout",
		navigationProfile: "sector_surface_standard",
		role: "technician",
		markScaling: "repair speed",
	},
	mecha_scout: {
		unitType: "mecha_scout",
		label: "Scout",
		description:
			"Fast recon chassis for exploration, survey, and storm gathering at higher Marks.",
		model: "ReconBot.glb",
		scale: 1.05,
		baseSpeed: 3.8,
		powerDemand: 0.7,
		movingPowerBonus: 0.32,
		archetypeId: "relay_hauler",
		defaultSpeechProfile: "scout",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "biped_scout",
		navigationProfile: "sector_surface_standard",
		role: "scout",
		markScaling: "vision radius",
	},
	field_fighter: {
		unitType: "field_fighter",
		label: "Striker",
		description:
			"Melee combat chassis for breakthroughs, escort, and overworld strike pressure.",
		model: "FieldFighter.glb",
		scale: 1.15,
		baseSpeed: 3.6,
		powerDemand: 0.8,
		movingPowerBonus: 0.35,
		archetypeId: "assault_strider",
		defaultSpeechProfile: "warden",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "heavy_ground",
		navigationProfile: "sector_surface_standard",
		role: "striker",
		markScaling: "melee damage",
	},
	fabrication_unit: {
		unitType: "fabrication_unit",
		label: "Fabricator",
		description:
			"Mobile builder and harvester. Constructs structures and strips the ecumenopolis for materials.",
		model: "Mecha01.glb",
		scale: 1.05,
		baseSpeed: 2.8,
		powerDemand: 0.6,
		movingPowerBonus: 0.2,
		archetypeId: "fabrication_rig",
		defaultSpeechProfile: "fabricator",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "heavy_ground",
		navigationProfile: "sector_surface_standard",
		role: "fabricator",
		markScaling: "build/harvest speed",
	},
	mecha_golem: {
		unitType: "mecha_golem",
		label: "Guardian",
		description:
			"Heavy defensive chassis for area denial, damage absorption, and settlement protection.",
		model: "MechaGolem.glb",
		scale: 1.35,
		baseSpeed: 2.6,
		powerDemand: 1.1,
		movingPowerBonus: 0.2,
		archetypeId: "defense_sentry",
		defaultSpeechProfile: "warden",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "heavy_ground",
		navigationProfile: "sector_surface_heavy",
		role: "guardian",
		markScaling: "damage reduction",
	},
	utility_drone: {
		unitType: "utility_drone",
		label: "Hauler",
		description:
			"Logistics drone for resource transport, supply chain automation, and route service.",
		model: "MobileStorageBot.glb",
		scale: 1.2,
		baseSpeed: 4,
		powerDemand: 0.5,
		movingPowerBonus: 0.3,
		archetypeId: "relay_hauler",
		defaultSpeechProfile: "quartermaster",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "aerial_support",
		navigationProfile: "sector_aerial",
		role: "hauler",
		markScaling: "cargo capacity",
	},
	// ─── Hostile Roles (3) — hackable into player service ────────────────
	feral_drone: {
		unitType: "feral_drone",
		label: "Cult Mech",
		description:
			"Fast swarm attacker controlled by cultists. When hacked, becomes a light melee specialist.",
		model: "Arachnoid.glb",
		scale: 1.5,
		baseSpeed: 3.5,
		powerDemand: 0,
		movingPowerBonus: 0,
		archetypeId: "feral_raider",
		defaultSpeechProfile: "feral",
		startingFaction: "feral",
		defaultAiRole: "hostile_machine",
		steeringProfile: "feral_quadruped",
		navigationProfile: "sector_surface_standard",
		role: "cult_mech",
		markScaling: "swarm damage",
	},
	mecha_trooper: {
		unitType: "mecha_trooper",
		label: "Rogue Sentinel",
		description:
			"Patrol and guard chassis for AI-controlled zones. When hacked, becomes a ranged combat unit.",
		model: "MechaTrooper.glb",
		scale: 1.2,
		baseSpeed: 3.4,
		powerDemand: 0.9,
		movingPowerBonus: 0.3,
		archetypeId: "cult_conduit",
		defaultSpeechProfile: "cult",
		startingFaction: "rogue",
		defaultAiRole: "hostile_machine",
		steeringProfile: "heavy_ground",
		navigationProfile: "sector_surface_standard",
		role: "rogue_sentinel",
		markScaling: "ranged damage",
	},
	quadruped_tank: {
		unitType: "quadruped_tank",
		label: "Siege Engine",
		description:
			"Heavy quadruped that attacks fortified positions. When hacked, deals massive structure damage.",
		model: "QuadrupedTank.glb",
		scale: 1.4,
		baseSpeed: 2.8,
		powerDemand: 1.2,
		movingPowerBonus: 0.18,
		archetypeId: "feral_raider",
		defaultSpeechProfile: "feral",
		startingFaction: "feral",
		defaultAiRole: "hostile_machine",
		steeringProfile: "heavy_ground",
		navigationProfile: "sector_surface_heavy",
		role: "siege_engine",
		markScaling: "siege damage",
	},
};

export const BOT_SPEECH_LABELS: Record<BotSpeechProfile, string> = {
	mentor: "Mentor Relay",
	scout: "Survey Relay",
	quartermaster: "Logistics Relay",
	fabricator: "Fabrication Relay",
	warden: "Defense Relay",
	feral: "Feral Noise",
	cult: "Cult Invocation",
};

export function getBotDefinition(unitType: BotUnitType) {
	return BOT_DEFINITIONS[unitType];
}

export function getAllBotDefinitions() {
	return Object.values(BOT_DEFINITIONS);
}

/** All 6 player-fabricable roles */
export const PLAYER_ROLES: PlayerBotRole[] = [
	"technician",
	"scout",
	"striker",
	"fabricator",
	"guardian",
	"hauler",
];

/** All 3 hostile (hackable) roles */
export const HOSTILE_ROLES: HostileBotRole[] = [
	"cult_mech",
	"rogue_sentinel",
	"siege_engine",
];

export function getPlayerBotDefinitions() {
	return Object.values(BOT_DEFINITIONS).filter((d) =>
		PLAYER_ROLES.includes(d.role as PlayerBotRole),
	);
}

export function getHostileBotDefinitions() {
	return Object.values(BOT_DEFINITIONS).filter((d) =>
		HOSTILE_ROLES.includes(d.role as HostileBotRole),
	);
}

export function getBotDefinitionByRole(
	role: PlayerBotRole | HostileBotRole,
): BotDefinition | undefined {
	return Object.values(BOT_DEFINITIONS).find((d) => d.role === role);
}

export function isPlayerRole(
	role: PlayerBotRole | HostileBotRole,
): role is PlayerBotRole {
	return PLAYER_ROLES.includes(role as PlayerBotRole);
}

export function createBotUnitState(args: {
	unitType: BotUnitType;
	displayName?: string;
	speed?: number;
	selected?: boolean;
	components: UnitComponent[];
	identity?: Partial<BotIdentityProfile>;
}) {
	const definition = getBotDefinition(args.unitType);
	const identity = {
		...getDefaultBotIdentity(args.unitType),
		...args.identity,
	};

	return {
		type: args.unitType,
		archetypeId: identity.archetypeId,
		markLevel: identity.markLevel,
		speechProfile: identity.speechProfile,
		displayName: args.displayName ?? definition.label,
		speed: args.speed ?? definition.baseSpeed,
		selected: args.selected ?? false,
		components: args.components,
	};
}
