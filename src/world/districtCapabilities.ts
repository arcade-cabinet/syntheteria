import type { CityInstanceState, WorldPoiType } from "./contracts";
import {
	type DistrictStructureViewModel,
	getDistrictStructures,
	summarizeDistrictStructures,
} from "./districtStructures";

export type DistrictCapabilityId =
	| "fabrication"
	| "storage"
	| "relay"
	| "substation"
	| "logistics"
	| "storm_capture"
	| "power_sink"
	| "defense"
	| "transit"
	| "archive"
	| "research"
	| "salvage"
	| "hostile_presence"
	| "gateway_access";

export interface DistrictCapabilityViewModel {
	id: DistrictCapabilityId;
	label: string;
	description: string;
	status: "online" | "latent" | "hostile" | "locked";
}

const CAPABILITY_TEXT: Record<
	DistrictCapabilityId,
	{
		label: string;
		descriptions: Record<DistrictCapabilityViewModel["status"], string>;
	}
> = {
	fabrication: {
		label: "Fabrication",
		descriptions: {
			online:
				"Industrial throughput is online for fabrication and structural recovery.",
			latent:
				"Industrial capacity can be restored after surveying and stabilizing the shell.",
			hostile: "Industrial machinery is under hostile control.",
			locked: "Fabrication access is unavailable.",
		},
	},
	storage: {
		label: "Storage",
		descriptions: {
			online:
				"Cargo and recovered parts can be staged here for sustained operations.",
			latent:
				"Storage vaults exist but need reclamation before they can stabilize throughput.",
			hostile: "Storage corridors are contested by hostile occupation.",
			locked: "Storage access is unavailable.",
		},
	},
	relay: {
		label: "Relay",
		descriptions: {
			online: "Signal relay coverage is active and extends command resilience.",
			latent:
				"Relay channels can be brought online once the site is reclaimed.",
			hostile: "Relay channels are corrupted by hostile presence.",
			locked: "Relay access is unavailable.",
		},
	},
	substation: {
		label: "Substation",
		descriptions: {
			online:
				"This district is anchored as an operational substation within the ecumenopolis.",
			latent:
				"Substation infrastructure is mapped but not yet stabilized for command use.",
			hostile: "The substation core is under hostile control.",
			locked: "Substation authority is unavailable.",
		},
	},
	logistics: {
		label: "Logistics",
		descriptions: {
			online:
				"Motor pools and transport spines can stage cargo, haulers, and district throughput.",
			latent:
				"Logistics lanes exist but need restoration before route service is reliable.",
			hostile: "Logistics corridors are contested by hostile pressure.",
			locked: "Logistics access is unavailable.",
		},
	},
	storm_capture: {
		label: "Storm Capture",
		descriptions: {
			online:
				"Collector hardware can absorb and route storm energy into local systems.",
			latent:
				"Collector hardware exists but remains disconnected from the district grid.",
			hostile:
				"Storm capture hardware is corrupted or unsafe under hostile control.",
			locked: "Storm capture remains unavailable.",
		},
	},
	power_sink: {
		label: "Power Sink",
		descriptions: {
			online:
				"Storm energy can be captured and grounded through this district.",
			latent:
				"Lightning capture infrastructure exists but is not stabilized yet.",
			hostile: "Storm hardware is unsafe under hostile control.",
			locked: "Power-sink infrastructure is unavailable.",
		},
	},
	defense: {
		label: "Defense",
		descriptions: {
			online:
				"The district can anchor fortifications and hardened defensive coverage.",
			latent: "Defense geometry can be prepared after basic reclamation.",
			hostile: "Defensive hardpoints are occupied by hostile forces.",
			locked: "Defense systems are unavailable.",
		},
	},
	transit: {
		label: "Transit",
		descriptions: {
			online:
				"This district supports route service, staging, and fast intra-sector movement.",
			latent: "Transit spines are present but still partially dormant.",
			hostile: "Transit routes are blocked or under hostile interception.",
			locked: "Transit access is unavailable.",
		},
	},
	archive: {
		label: "Archive",
		descriptions: {
			online:
				"Archive stacks are readable and support recall, mapping, and memory recovery.",
			latent:
				"Archive stacks can be restored after survey and interior stabilization.",
			hostile: "Archive stacks are inaccessible under hostile presence.",
			locked: "Archive systems are unavailable.",
		},
	},
	research: {
		label: "Research",
		descriptions: {
			online:
				"Instrumentation and compute-rich spaces are active for technical advancement.",
			latent: "Research suites remain sealed until the district is reclaimed.",
			hostile: "Research spaces are compromised by hostile occupation.",
			locked: "Research access is unavailable.",
		},
	},
	salvage: {
		label: "Salvage",
		descriptions: {
			online:
				"Recovered materials can be extracted and staged from this district.",
			latent: "Salvage routes are present but not yet secured.",
			hostile: "Salvage corridors are dangerous under hostile presence.",
			locked: "Salvage access is unavailable.",
		},
	},
	hostile_presence: {
		label: "Hostile Presence",
		descriptions: {
			online:
				"The district is actively contested by the Cult or rogue machine forces.",
			latent: "Hostile pressure is expected but not yet active.",
			hostile: "Hostile pressure defines this district.",
			locked: "Hostile access is not currently modeled.",
		},
	},
	gateway_access: {
		label: "Gateway Access",
		descriptions: {
			online:
				"Gateway routing is active and can support late-campaign transition paths.",
			latent: "Gateway infrastructure exists but is not yet unlocked.",
			hostile: "Gateway access is contested.",
			locked: "Gateway routing remains locked until later progression.",
		},
	},
};

function capabilityStatusFromStructures(
	capabilityId: DistrictCapabilityId,
	structures: DistrictStructureViewModel[],
	defaultState: CityInstanceState,
): DistrictCapabilityViewModel["status"] {
	const matchingStructures = structures.filter((structure) =>
		structure.capabilities.includes(capabilityId),
	);
	if (matchingStructures.some((structure) => structure.status === "hostile")) {
		return "hostile";
	}
	if (matchingStructures.some((structure) => structure.status === "locked")) {
		return "locked";
	}
	if (matchingStructures.some((structure) => structure.status === "online")) {
		return "online";
	}
	return defaultState === "founded" ? "online" : "latent";
}

export function getDistrictCapabilities(args: {
	poiType: WorldPoiType;
	state: CityInstanceState;
	structures?: DistrictStructureViewModel[];
}): DistrictCapabilityViewModel[] {
	const { poiType, state } = args;
	const structures =
		args.structures ?? getDistrictStructures({ poiType, state });
	const capabilityIds = Array.from(
		new Set(
			structures
				.flatMap((structure) => structure.capabilities)
				.filter(
					(capabilityId): capabilityId is DistrictCapabilityId =>
						capabilityId in CAPABILITY_TEXT,
				),
		),
	);

	return capabilityIds.map((id) => {
		const status = capabilityStatusFromStructures(id, structures, state);
		const text = CAPABILITY_TEXT[id];
		return {
			id,
			label: text.label,
			description: text.descriptions[status],
			status,
		};
	});
}

export function summarizeDistrictCapabilities(
	capabilities: DistrictCapabilityViewModel[],
	structures?: DistrictStructureViewModel[],
) {
	const online = capabilities.filter(
		(capability) => capability.status === "online",
	);
	const latent = capabilities.filter(
		(capability) => capability.status === "latent",
	);
	const hostile = capabilities.filter(
		(capability) => capability.status === "hostile",
	);
	const locked = capabilities.filter(
		(capability) => capability.status === "locked",
	);
	const structureSummary = structures
		? `${summarizeDistrictStructures(structures)} `
		: "";

	if (hostile.length > 0) {
		return `${structureSummary}Hostile systems dominate this district. Reclamation is blocked until combat pressure is resolved.`;
	}

	if (locked.length > 0 && online.length === 0) {
		return `${structureSummary}This district is mapped into the campaign but remains mechanically locked for later progression.`;
	}

	if (online.length > 0) {
		return `${structureSummary}Online district functions: ${online
			.map((capability) => capability.label)
			.join(", ")}.`;
	}

	return `${structureSummary}Latent district functions detected: ${latent
		.map((capability) => capability.label)
		.join(
			", ",
		)}. Survey and reclamation will determine which structures come online first.`;
}
