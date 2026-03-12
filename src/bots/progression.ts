import { BOT_TRACKS, getBotArchetypeDefinition } from "./archetypes";
import { getBotDefinition } from "./definitions";
import type {
	BotArchetypeId,
	BotProgressionSummary,
	BotTrackId,
	BotUnitType,
} from "./types";

export function resolveMarkMultiplier(markLevel: number, trackId: BotTrackId) {
	const track = BOT_TRACKS[trackId];
	const safeMark = Math.max(1, markLevel);
	return 1 + track.baseBonus + track.logarithmicFactor * Math.log2(safeMark + 1);
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
