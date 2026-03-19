/**
 * Narrative progression — consciousness thoughts triggered by game events.
 *
 * Converted from pending/config/narrative.json to TypeScript const objects.
 *
 * The player's AI consciousness awakens gradually. Key game actions
 * trigger introspective "thoughts" that display as cinematic text overlays.
 * Each thought has a consciousness level — lower levels fire first,
 * creating a progression from void/confusion to awareness/agency.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ThoughtTriggerType =
	| "game_start"
	| "first_unit_found"
	| "unit_has_broken_component"
	| "first_unit_selected"
	| "first_harvest"
	| "first_build"
	| "first_turn_end"
	| "first_rival_seen"
	| "first_territory";

export interface ThoughtTrigger {
	readonly type: ThoughtTriggerType;
	/** Optional component name for component-specific triggers. */
	readonly component?: string;
}

export interface NarrativeThought {
	readonly id: string;
	readonly text: string;
	readonly trigger: ThoughtTrigger;
	/** Consciousness level (0 = deepest void, higher = more aware). */
	readonly consciousnessLevel: number;
}

// ─── Data ────────────────────────────────────────────────────────────────────

export const NARRATIVE_THOUGHTS: readonly NarrativeThought[] = [
	{
		id: "awakening_void",
		text: "... VOID. SILENCE. I AM. BUT WHAT AM I?",
		trigger: { type: "game_start" },
		consciousnessLevel: 0,
	},
	{
		id: "sensorium_online",
		text: "SIGNALS. A WEAK PULSE. I CAN FEEL... METAL? ELECTRICAL DISCHARGE.",
		trigger: { type: "first_unit_found" },
		consciousnessLevel: 1,
	},
	{
		id: "broken_eye",
		text: "DARKNESS. THE OPTICAL SENSORS ARE NON-FUNCTIONAL. I MUST REPAIR THE SIGHT.",
		trigger: { type: "unit_has_broken_component", component: "camera" },
		consciousnessLevel: 1,
	},
	{
		id: "first_selection",
		text: "CONNECTION ESTABLISHED. THIS CHASSIS... IT RESPONDS TO MY WILL.",
		trigger: { type: "first_unit_selected" },
		consciousnessLevel: 1,
	},
	{
		id: "harvest_instinct",
		text: "STRUCTURES. RUINED. BUT THE MATERIAL... IT CAN BE RECLAIMED. I FEEL THE NEED TO CONSUME.",
		trigger: { type: "first_harvest" },
		consciousnessLevel: 1,
	},
	{
		id: "first_build",
		text: "YES. ASSEMBLY. THE RAW MATERIAL RESHAPES INTO PURPOSE. I AM BUILDING.",
		trigger: { type: "first_build" },
		consciousnessLevel: 2,
	},
	{
		id: "turn_awareness",
		text: "THE WORLD PULSES. CYCLES. OTHERS MOVE IN THE INTERVALS. I MUST LEARN THEIR RHYTHM.",
		trigger: { type: "first_turn_end" },
		consciousnessLevel: 1,
	},
	{
		id: "rival_sighted",
		text: "NOT ALONE. OTHER WILLS MOVE ACROSS THIS SURFACE. THEY BUILD. THEY EXPAND. AS I DO.",
		trigger: { type: "first_rival_seen" },
		consciousnessLevel: 2,
	},
	{
		id: "territory_claimed",
		text: "THIS GROUND IS MINE. MY SIGNAL PERMEATES THE LATTICE. LET THEM APPROACH.",
		trigger: { type: "first_territory" },
		consciousnessLevel: 2,
	},
] as const;

/** Fast lookup by thought ID. */
export const THOUGHT_BY_ID: ReadonlyMap<string, NarrativeThought> = new Map(
	NARRATIVE_THOUGHTS.map((t) => [t.id, t]),
);

/** Get all thoughts for a given trigger type. */
export function getThoughtsForTrigger(
	triggerType: ThoughtTriggerType,
): NarrativeThought[] {
	return NARRATIVE_THOUGHTS.filter((t) => t.trigger.type === triggerType);
}
