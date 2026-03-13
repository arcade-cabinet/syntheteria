import type {
	BotArchetypeDefinition,
	BotArchetypeId,
	BotIdentityProfile,
	BotRuntimeProfile,
	BotSpeechProfile,
	BotTrackId,
	BotUnitType,
	UpgradeTrackDefinition,
} from "./types";

export const BOT_TRACKS: Record<BotTrackId, UpgradeTrackDefinition> = {
	mobility: {
		id: "mobility",
		label: "Mobility",
		description: "Traversal speed, stability, and route responsiveness.",
		baseBonus: 0.06,
		logarithmicFactor: 0.22,
		primaryStats: ["speed", "sector traversal"],
	},
	surveying: {
		id: "surveying",
		label: "Surveying",
		description: "Sensor fidelity, map detail, and long-range reconnaissance.",
		baseBonus: 0.05,
		logarithmicFactor: 0.18,
		primaryStats: ["vision", "fog reveal", "intel quality"],
	},
	repair: {
		id: "repair",
		label: "Repair",
		description: "Field restoration speed and component salvage efficiency.",
		baseBonus: 0.05,
		logarithmicFactor: 0.2,
		primaryStats: ["repair throughput", "salvage yield"],
	},
	relay: {
		id: "relay",
		label: "Relay",
		description: "Signal reach, bandwidth stability, and command resilience.",
		baseBonus: 0.04,
		logarithmicFactor: 0.2,
		primaryStats: ["signal range", "compute carriage"],
	},
	logistics: {
		id: "logistics",
		label: "Logistics",
		description: "Cargo throughput and route service capacity.",
		baseBonus: 0.07,
		logarithmicFactor: 0.19,
		primaryStats: ["cargo", "transfer speed"],
	},
	fabrication: {
		id: "fabrication",
		label: "Fabrication",
		description: "Industrial throughput and blueprint execution quality.",
		baseBonus: 0.06,
		logarithmicFactor: 0.2,
		primaryStats: ["craft rate", "component quality"],
	},
	founding: {
		id: "founding",
		label: "Founding",
		description: "Substation deployment and district establishment capacity.",
		baseBonus: 0.05,
		logarithmicFactor: 0.16,
		primaryStats: ["substation setup", "hub initialization"],
	},
	terrain: {
		id: "terrain",
		label: "Terrain",
		description:
			"Groundworks, fortification placement, and substation hardening.",
		baseBonus: 0.05,
		logarithmicFactor: 0.17,
		primaryStats: ["district works", "defensive prep"],
	},
	assault: {
		id: "assault",
		label: "Assault",
		description: "Direct firepower, breach force, and strike execution.",
		baseBonus: 0.08,
		logarithmicFactor: 0.17,
		primaryStats: ["damage", "breach strength"],
	},
	defense: {
		id: "defense",
		label: "Defense",
		description: "Interception, anchoring, and storm-hardened survivability.",
		baseBonus: 0.07,
		logarithmicFactor: 0.18,
		primaryStats: ["armor", "zone control"],
	},
};

export const BOT_ARCHETYPES: Record<BotArchetypeId, BotArchetypeDefinition> = {
	field_technician: {
		id: "field_technician",
		label: "Field Technician",
		description:
			"Primary awakening chassis for repair, scouting, and diegetic machine guidance.",
		chassisClass: "light_biped",
		roleFamily: "utility",
		defaultUnitType: "maintenance_bot",
		defaultSpeechProfile: "mentor",
		startingMark: 1,
		availableTracks: ["mobility", "surveying", "repair", "relay"],
		loreRole:
			"Broken maintenance frames that become the first coherent extension of the player's awakened mind.",
		startingUseCases: [
			"intro movement",
			"map merge discovery",
			"repair and salvage",
			"tutorial speech bubbling",
		],
	},
	relay_hauler: {
		id: "relay_hauler",
		label: "Relay Hauler",
		description:
			"Fast logistics and relay drone for scouting routes, carrying cargo, and extending network reach.",
		chassisClass: "aerial_light",
		roleFamily: "logistics",
		defaultUnitType: "utility_drone",
		defaultSpeechProfile: "quartermaster",
		startingMark: 1,
		availableTracks: ["mobility", "relay", "logistics", "surveying"],
		loreRole:
			"Distributed support craft intended for route service, recovery sweeps, and network stitching.",
		startingUseCases: ["resource hauling", "relay extension", "rapid scouting"],
	},
	fabrication_rig: {
		id: "fabrication_rig",
		label: "Fabrication Rig",
		description:
			"Stationary or semi-stationary industrial chassis that anchors fabrication and heavy component recovery.",
		chassisClass: "stationary_industrial",
		roleFamily: "industry",
		defaultUnitType: "fabrication_unit",
		defaultSpeechProfile: "fabricator",
		startingMark: 1,
		availableTracks: ["fabrication", "relay", "repair"],
		loreRole:
			"Industrial shells that translate recovered matter and compute into renewed machine capability.",
		startingUseCases: ["crafting", "repair support", "base throughput"],
	},
	substation_engineer: {
		id: "substation_engineer",
		label: "Substation Engineer",
		description:
			"Heavy field unit for substation establishment, route hardening, and defensive preparation.",
		chassisClass: "heavy_mobile",
		roleFamily: "expansion",
		defaultUnitType: "mecha_golem",
		defaultSpeechProfile: "warden",
		startingMark: 1,
		availableTracks: ["terrain", "founding", "defense", "repair"],
		loreRole:
			"Groundworks chassis for carving viable substations out of the storm-lashed machine world.",
		startingUseCases: [
			"substation establishment",
			"fortification",
			"stormproofing",
		],
	},
	foundry_seed: {
		id: "foundry_seed",
		label: "Foundry Seed",
		description:
			"Expansion chassis specialized in deploying new city cores and distributed industrial footholds.",
		chassisClass: "heavy_mobile",
		roleFamily: "expansion",
		defaultUnitType: "fabrication_unit",
		defaultSpeechProfile: "fabricator",
		startingMark: 1,
		availableTracks: ["founding", "fabrication", "logistics", "defense"],
		loreRole:
			"Seed-platform for founding new player-controlled substations without a traditional city-builder tech tree.",
		startingUseCases: ["substation founding", "forward base deployment"],
	},
	assault_strider: {
		id: "assault_strider",
		label: "Assault Strider",
		description:
			"Primary offensive combat chassis for flanking, breakthrough, and overworld skirmish pressure.",
		chassisClass: "heavy_mobile",
		roleFamily: "combat",
		defaultUnitType: "field_fighter",
		defaultSpeechProfile: "warden",
		startingMark: 1,
		availableTracks: ["mobility", "assault", "defense", "relay"],
		loreRole:
			"Purpose-built strike frames that turn the player's distributed intelligence into directed force.",
		startingUseCases: ["overworld attack", "escort", "breach"],
	},
	defense_sentry: {
		id: "defense_sentry",
		label: "Defense Sentry",
		description:
			"Defensive anchor chassis for zone denial, interception, and settlement protection.",
		chassisClass: "hostile_quadruped",
		roleFamily: "combat",
		defaultUnitType: "quadruped_tank",
		defaultSpeechProfile: "warden",
		startingMark: 1,
		availableTracks: ["defense", "assault", "terrain", "relay"],
		loreRole:
			"Heavy machine guardians meant to hold storm-lashed ground rather than roam widely.",
		startingUseCases: ["base defense", "frontline anchoring"],
	},
	feral_raider: {
		id: "feral_raider",
		label: "Feral Raider",
		description:
			"Degraded rogue-machine lineage used for early hostile pressure and salvageable encounters.",
		chassisClass: "hostile_quadruped",
		roleFamily: "hostile",
		defaultUnitType: "feral_drone",
		defaultSpeechProfile: "feral",
		startingMark: 1,
		availableTracks: ["mobility", "assault", "surveying"],
		loreRole:
			"Fragmented machines driven by decayed routines and external compulsion.",
		startingUseCases: [
			"early hostile pressure",
			"hack target",
			"salvage source",
		],
	},
	cult_conduit: {
		id: "cult_conduit",
		label: "Cult Conduit",
		description:
			"Human storm-channeling hostile role used by cultists rather than player-owned machine forces.",
		chassisClass: "human_channeler",
		roleFamily: "hostile",
		defaultUnitType: "mecha_trooper",
		defaultSpeechProfile: "cult",
		startingMark: 1,
		availableTracks: ["assault", "defense", "relay"],
		loreRole:
			"Not hackable. Represents the cult's lightning-calling battlefield presence and coordination.",
		startingUseCases: ["hostile lightning caller", "ritual escort"],
	},
};

const UNIT_TYPE_DEFAULTS: Record<
	BotUnitType,
	{ archetypeId: BotArchetypeId; speechProfile: BotSpeechProfile }
> = {
	maintenance_bot: {
		archetypeId: "field_technician",
		speechProfile: "mentor",
	},
	utility_drone: {
		archetypeId: "relay_hauler",
		speechProfile: "quartermaster",
	},
	feral_drone: {
		archetypeId: "feral_raider",
		speechProfile: "feral",
	},
	fabrication_unit: {
		archetypeId: "fabrication_rig",
		speechProfile: "fabricator",
	},
	field_fighter: {
		archetypeId: "assault_strider",
		speechProfile: "warden",
	},
	mecha_scout: {
		archetypeId: "relay_hauler",
		speechProfile: "scout",
	},
	mecha_trooper: {
		archetypeId: "cult_conduit",
		speechProfile: "cult",
	},
	mecha_golem: {
		archetypeId: "defense_sentry",
		speechProfile: "warden",
	},
	quadruped_tank: {
		archetypeId: "feral_raider",
		speechProfile: "feral",
	},
};

export function getBotArchetypeDefinition(archetypeId: BotArchetypeId) {
	return BOT_ARCHETYPES[archetypeId];
}

export function getDefaultBotIdentity(
	unitType: BotUnitType,
): BotIdentityProfile {
	const defaults = UNIT_TYPE_DEFAULTS[unitType];
	return {
		archetypeId: defaults.archetypeId,
		markLevel: BOT_ARCHETYPES[defaults.archetypeId].startingMark,
		speechProfile: defaults.speechProfile,
	};
}

export function getBotRuntimeProfile(args: {
	unitType: BotUnitType;
	archetypeId?: BotArchetypeId | null;
	markLevel?: number | null;
	speechProfile?: BotSpeechProfile | null;
}): BotRuntimeProfile {
	const defaults = getDefaultBotIdentity(args.unitType);
	const archetype = getBotArchetypeDefinition(
		args.archetypeId ?? defaults.archetypeId,
	);
	return {
		unitType: args.unitType,
		archetypeId: archetype.id,
		markLevel: Math.max(1, args.markLevel ?? defaults.markLevel),
		speechProfile: args.speechProfile ?? defaults.speechProfile,
		roleFamily: archetype.roleFamily,
		chassisClass: archetype.chassisClass,
		trackSummary: archetype.availableTracks.map((track) => BOT_TRACKS[track]),
	};
}
