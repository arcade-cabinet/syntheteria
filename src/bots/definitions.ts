import type { UnitComponent } from "../ecs/traits";
import type {
	BotDefinition,
	BotIdentityProfile,
	BotSpeechProfile,
	BotUnitType,
} from "./types";
import { getDefaultBotIdentity } from "./archetypes";

const BOT_DEFINITIONS: Record<BotUnitType, BotDefinition> = {
	maintenance_bot: {
		unitType: "maintenance_bot",
		label: "Field Technician Chassis",
		description:
			"Awakening-era repair and scouting frame used for the player's first coherent actions.",
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
	},
	utility_drone: {
		unitType: "utility_drone",
		label: "Relay Hauler Drone",
		description:
			"Rapid logistics and relay chassis for hauling, scouting, and route service.",
		model: "ReconBot.glb",
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
	},
	fabrication_unit: {
		unitType: "fabrication_unit",
		label: "Fabrication Rig",
		description:
			"Industrial fabrication chassis that anchors local throughput and repair loops.",
		model: "MobileStorageBot.glb",
		scale: 1.8,
		baseSpeed: 0,
		powerDemand: 0,
		movingPowerBonus: 0,
		archetypeId: "fabrication_rig",
		defaultSpeechProfile: "fabricator",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "stationary",
		navigationProfile: "city_square_service",
	},
	feral_drone: {
		unitType: "feral_drone",
		label: "Feral Raider",
		description:
			"Degraded hostile quadruped used for early rogue-machine pressure and salvageable encounters.",
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
	},
	field_fighter: {
		unitType: "field_fighter",
		label: "Assault Strider",
		description:
			"Mobile combat chassis for breakthroughs, escort, and overworld strike tasks.",
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
	},
	mecha_scout: {
		unitType: "mecha_scout",
		label: "Survey Strider",
		description:
			"Advanced recon chassis for deeper map intelligence and faster contact discovery.",
		model: "Mecha01.glb",
		scale: 1.05,
		baseSpeed: 3.8,
		powerDemand: 0.7,
		movingPowerBonus: 0.32,
		archetypeId: "field_technician",
		defaultSpeechProfile: "scout",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "biped_scout",
		navigationProfile: "sector_surface_standard",
	},
	mecha_trooper: {
		unitType: "mecha_trooper",
		label: "Storm Trooper Chassis",
		description:
			"Combat-oriented biped that can serve either player strike roles or cult-controlled machine enforcement.",
		model: "MechaTrooper.glb",
		scale: 1.2,
		baseSpeed: 3.4,
		powerDemand: 0.9,
		movingPowerBonus: 0.3,
		archetypeId: "assault_strider",
		defaultSpeechProfile: "warden",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "heavy_ground",
		navigationProfile: "sector_surface_standard",
	},
	mecha_golem: {
		unitType: "mecha_golem",
		label: "Substation Engineer Hull",
		description:
			"Heavy groundworks chassis suited to substation deployment, reinforcement, and structural hardening.",
		model: "MechaGolem.glb",
		scale: 1.35,
		baseSpeed: 2.6,
		powerDemand: 1.1,
		movingPowerBonus: 0.2,
		archetypeId: "substation_engineer",
		defaultSpeechProfile: "warden",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "heavy_ground",
		navigationProfile: "sector_surface_heavy",
	},
	quadruped_tank: {
		unitType: "quadruped_tank",
		label: "Defense Sentry",
		description:
			"Heavy quadruped defensive chassis for base protection and line holding.",
		model: "QuadrupedTank.glb",
		scale: 1.4,
		baseSpeed: 2.8,
		powerDemand: 1.2,
		movingPowerBonus: 0.18,
		archetypeId: "defense_sentry",
		defaultSpeechProfile: "warden",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "heavy_ground",
		navigationProfile: "sector_surface_heavy",
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
