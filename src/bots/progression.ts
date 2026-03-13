import { BOT_TRACKS, getBotArchetypeDefinition } from "./archetypes";
import { getBotDefinition } from "./definitions";
import type {
	BotArchetypeId,
	BotProgressionSummary,
	BotTrackId,
	BotUnitType,
	PlayerBotRole,
} from "./types";

/**
 * Canonical Mark multiplier table from BOT_AND_ECONOMY_REDESIGN.
 * Mark I = 1.0x, II = 1.8x, III = 3.0x, IV = 5.0x, V = 8.0x
 * Values beyond Mark V extrapolate logarithmically.
 */
const MARK_TABLE: number[] = [1.0, 1.0, 1.8, 3.0, 5.0, 8.0];

/**
 * Get the canonical Mark multiplier for a given Mark level.
 * Mark I (1) = 1.0x, Mark V (5) = 8.0x.
 * Beyond Mark V, extrapolates logarithmically.
 */
export function getCanonicalMarkMultiplier(markLevel: number): number {
	const safe = Math.max(1, markLevel);
	if (safe < MARK_TABLE.length) return MARK_TABLE[safe];
	// Extrapolate beyond Mark V: 8 * log2(level / 4)
	return 8.0 * Math.log2(safe / 4 + 1);
}

/** What each role's Mark multiplier scales */
export interface RoleMarkEffect {
	role: PlayerBotRole;
	markLevel: number;
	multiplier: number;
	stat: string;
	description: string;
}

/**
 * Resolve the Mark progression effect for a specific player role.
 * Returns what stat is multiplied and by how much.
 */
export function resolveRoleMarkEffect(
	role: PlayerBotRole,
	markLevel: number,
): RoleMarkEffect {
	const multiplier = getCanonicalMarkMultiplier(markLevel);
	const ROLE_STATS: Record<
		PlayerBotRole,
		{ stat: string; description: string }
	> = {
		technician: {
			stat: "repair speed",
			description: `Repair speed x${multiplier.toFixed(1)}`,
		},
		scout: {
			stat: "vision radius",
			description: `Vision radius x${multiplier.toFixed(1)}`,
		},
		striker: {
			stat: "melee damage",
			description: `Melee damage x${multiplier.toFixed(1)}`,
		},
		fabricator: {
			stat: "build/harvest speed",
			description: `Build/harvest speed x${multiplier.toFixed(1)}`,
		},
		guardian: {
			stat: "damage reduction",
			description: `Damage reduction x${multiplier.toFixed(1)}`,
		},
		hauler: {
			stat: "cargo capacity",
			description: `Cargo capacity x${multiplier.toFixed(1)}`,
		},
	};
	const info = ROLE_STATS[role];
	return { role, markLevel, multiplier, ...info };
}

/**
 * AP bonus from Mark level: +floor(log2(markLevel))
 */
export function getMarkAPBonus(markLevel: number): number {
	return Math.floor(Math.log2(Math.max(1, markLevel)));
}

/**
 * MP bonus from Mark level: +floor(log2(markLevel))
 */
export function getMarkMPBonus(markLevel: number): number {
	return Math.floor(Math.log2(Math.max(1, markLevel)));
}

export function resolveMarkMultiplier(markLevel: number, trackId: BotTrackId) {
	const track = BOT_TRACKS[trackId];
	const safeMark = Math.max(1, markLevel);
	return (
		1 + track.baseBonus + track.logarithmicFactor * Math.log2(safeMark + 1)
	);
}

export function resolveTrackLevel(markLevel: number, trackLevel?: number) {
	return Math.max(1, trackLevel ?? markLevel);
}

export function resolveTrackMultiplier(args: {
	markLevel: number;
	trackId: BotTrackId;
	trackLevel?: number;
}) {
	return resolveMarkMultiplier(
		resolveTrackLevel(args.markLevel, args.trackLevel),
		args.trackId,
	);
}

export function getAvailableTracksForArchetype(archetypeId: BotArchetypeId) {
	return getBotArchetypeDefinition(archetypeId).availableTracks.map(
		(trackId) => BOT_TRACKS[trackId],
	);
}

export function resolveBotSpeed(args: {
	unitType: BotUnitType;
	markLevel: number;
	trackLevels?: Partial<Record<BotTrackId, number>>;
}) {
	const definition = getBotDefinition(args.unitType);
	return Number(
		(
			definition.baseSpeed *
			resolveTrackMultiplier({
				markLevel: args.markLevel,
				trackId: "mobility",
				trackLevel: args.trackLevels?.mobility,
			})
		).toFixed(3),
	);
}

export function resolveUpgradePotential(args: {
	archetypeId: BotArchetypeId;
	markLevel: number;
}) {
	const availableTracks = getAvailableTracksForArchetype(args.archetypeId);
	return availableTracks.map((track) => ({
		id: track.id,
		label: track.label,
		nextMarkMultiplier: resolveMarkMultiplier(args.markLevel + 1, track.id),
	}));
}

export function resolveBotProgressionSummary(args: {
	unitType: BotUnitType;
	archetypeId: BotArchetypeId;
	markLevel: number;
	trackLevels?: Partial<Record<BotTrackId, number>>;
	focusTrackId?: BotTrackId | null;
}): BotProgressionSummary {
	const archetype = getBotArchetypeDefinition(args.archetypeId);
	const trackSummaries = archetype.availableTracks.map((trackId) => {
		const track = BOT_TRACKS[trackId];
		const currentLevel = resolveTrackLevel(
			args.markLevel,
			args.trackLevels?.[trackId],
		);
		return {
			id: trackId,
			label: track.label,
			currentLevel,
			currentMultiplier: resolveTrackMultiplier({
				markLevel: args.markLevel,
				trackId,
				trackLevel: currentLevel,
			}),
			nextLevelMultiplier: resolveTrackMultiplier({
				markLevel: args.markLevel,
				trackId,
				trackLevel: currentLevel + 1,
			}),
			primaryStats: track.primaryStats,
		};
	});

	const sortedByLevel = [...trackSummaries].sort((a, b) => {
		if (b.currentLevel !== a.currentLevel) {
			return b.currentLevel - a.currentLevel;
		}
		return b.currentMultiplier - a.currentMultiplier;
	});

	return {
		unitType: args.unitType,
		archetypeId: archetype.id,
		markLevel: Math.max(1, args.markLevel),
		focusTrackId:
			args.focusTrackId ??
			sortedByLevel[0]?.id ??
			archetype.availableTracks[0] ??
			"mobility",
		trackSummaries,
	};
}
