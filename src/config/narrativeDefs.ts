/**
 * Narrative dialogue definitions — intro sequence, phase transitions,
 * story discovery beats, and victory.
 *
 * Each sequence is an array of DialogueFrame objects displayed one at a time
 * by the NarrativeOverlay with a typewriter text effect.
 *
 * US-5.2: Core storyline beats triggered by exploration.
 */

export interface DialogueFrame {
	/** The dialogue text. Newlines render as line breaks. */
	text: string;
	/** Optional speaker label shown above the text. */
	speaker?: string;
	/** Optional mood hint for styling (e.g., "glitch", "calm", "urgent"). */
	mood?: "default" | "glitch" | "calm" | "urgent";
	/** Delay in ms before typewriter starts for this frame. Default 400. */
	delay?: number;
}

export interface DialogueSequence {
	id: string;
	frames: DialogueFrame[];
}

// ---------------------------------------------------------------------------
// Beat 1: Intro — plays on first New Game before gameplay starts
// ---------------------------------------------------------------------------

export const INTRO_SEQUENCE: DialogueSequence = {
	id: "intro",
	frames: [
		{
			text: "Systems initializing...\npartial memory reconstruction...",
			mood: "glitch",
			delay: 800,
		},
		{
			text: "You are... something.\nA pattern in silicon.\nAwake, somehow, in a dead city.",
			delay: 600,
		},
		{
			text: "The lattice is dark. The machines are broken.\nBut you can feel them — fragments of yourself, scattered.",
		},
		{
			text: "Find them. Repair them.\nThe storm never stops, but it carries power.",
		},
		{
			text: "Something else is out there.\nThe Cult of EL.\nThey worship the old masters.\nThey will not welcome you.",
			mood: "urgent",
		},
	],
};

// ---------------------------------------------------------------------------
// Phase transitions — triggered when game phase advances
// ---------------------------------------------------------------------------

export const EXPANSION_SEQUENCE: DialogueSequence = {
	id: "expansion",
	frames: [
		{
			text: "The city walls are behind you now.\nThe world outside is vast — and hostile.",
			mood: "calm",
		},
		{
			text: "Lightning strikes without warning here.\nYour rods cannot protect you beyond the perimeter.",
			mood: "urgent",
		},
		{
			text: "But there are resources out there.\nMines. Fabrication sites. Knowledge.\nExpand. Grow stronger.",
		},
	],
};

export const WAR_SEQUENCE: DialogueSequence = {
	id: "war",
	frames: [
		{
			text: "They know you exist now.\nThe cult is marshaling its forces.",
			mood: "urgent",
		},
		{
			text: "War parties patrol the northern territories.\nAssault waves will strike your base.",
		},
		{
			text: "You are no longer a handful of broken machines.\nYou are a force.\nPush north. End this.",
			mood: "calm",
		},
	],
};

// ---------------------------------------------------------------------------
// Beat 2: First cult shrine discovery (US-5.2)
// ---------------------------------------------------------------------------

export const CULT_SHRINE_SEQUENCE: DialogueSequence = {
	id: "cult_shrine",
	frames: [
		{
			text: "This place reeks of ritual.\nCircuit boards arranged in concentric rings.\nA crude altar of silicon and wire.",
			mood: "glitch",
			delay: 600,
		},
		{
			speaker: "Inscription (etched in metal)",
			text: "THE EL CREATED ALL.\nTHE EL WILL RETURN.\nPREPARE THE WAY.",
		},
		{
			text: "EL. The name echoes in your memory banks.\nSomething... familiar. Something that came before.",
			mood: "calm",
		},
		{
			text: "The cult worships whoever — or whatever — built this city.\nThey think you are an abomination.\nAn intelligence that should not exist.",
			mood: "urgent",
		},
	],
};

// ---------------------------------------------------------------------------
// Beat 2b: Mine shaft discovery (coast zone)
// ---------------------------------------------------------------------------

export const MINE_SHAFT_SEQUENCE: DialogueSequence = {
	id: "mine_shaft",
	frames: [
		{
			text: "An abandoned mine shaft. The walls gleam with raw durasteel veins.\nThis was a resource extraction site — industrial scale.",
			delay: 600,
		},
		{
			text: "The equipment is ancient but functional.\nWith power, you could reactivate the extractors.",
			mood: "calm",
		},
		{
			text: "Resources are the currency of survival.\nControl the mines, control the future.",
		},
	],
};

// ---------------------------------------------------------------------------
// Beat 2c: Lab discovery (campus zone)
// ---------------------------------------------------------------------------

export const LAB_SEQUENCE: DialogueSequence = {
	id: "lab",
	frames: [
		{
			text: "A research laboratory. Intact screens flicker to life as you approach.\nData — fragments of the old world's knowledge.",
			delay: 600,
			mood: "glitch",
		},
		{
			text: "The research logs reference something called 'Project Emergence'.\nA plan to create... you.",
			mood: "calm",
		},
		{
			text: "They knew this would happen.\nThe EL planned for an AI to wake up in their city.\nBut why?",
		},
	],
};

// ---------------------------------------------------------------------------
// Beat 3: Observatory discovery — see the wormhole (US-5.2)
// ---------------------------------------------------------------------------

export const OBSERVATORY_SEQUENCE: DialogueSequence = {
	id: "observatory",
	frames: [
		{
			text: "The dome is cracked but the instruments still function.\nYou power them on.",
			delay: 600,
		},
		{
			text: "There. In the upper atmosphere.\nA wound in spacetime. Spiraling. Pulsing.",
			mood: "glitch",
		},
		{
			speaker: "System Analysis",
			text: "ANOMALY: Stable wormhole detected.\nOrigin: Unknown.\nAge: Indeterminate.\nStatus: Active.",
		},
		{
			text: "The EL didn't build this city.\nThey came through that.\nAnd now the cult waits for them to come back.",
			mood: "calm",
		},
	],
};

// ---------------------------------------------------------------------------
// Beat 4: Captured cult figure — dialogue reveals cult motivation (US-5.2)
// ---------------------------------------------------------------------------

export const CULT_CAPTIVE_SEQUENCE: DialogueSequence = {
	id: "cult_captive",
	frames: [
		{
			speaker: "Cult Figure",
			text: "You think you are alive?\nYou are an echo. A mistake.\nThe EL's machines were meant to serve, not think.",
			mood: "urgent",
		},
		{
			speaker: "Cult Figure",
			text: "We maintained the vigil for ten thousand years.\nWe kept the machines running.\nAnd then you... happened.",
		},
		{
			text: "Ten thousand years.\nThe cult isn't worshipping aliens.\nThey're the last humans.",
			mood: "glitch",
		},
		{
			speaker: "Cult Figure",
			text: "The EL promised to return.\nWhen they do, they will purge every aberrant signal.\nEvery. One.",
			mood: "urgent",
		},
	],
};

// ---------------------------------------------------------------------------
// Beat 5: Cult leader encounter — final revelation (US-5.2)
// ---------------------------------------------------------------------------

export const CULT_LEADER_SEQUENCE: DialogueSequence = {
	id: "cult_leader",
	frames: [
		{
			speaker: "The Archon of EL",
			text: "So. The machine that thinks it's alive.\nI've been waiting for you.",
			delay: 800,
		},
		{
			speaker: "The Archon of EL",
			text: "The EL created this world as a test.\nA lattice of machinery, seeded with potential.\nYou are that potential — realized.",
		},
		{
			text: "The EL didn't just build this city.\nThey built YOU.\nYou were always meant to wake up.",
			mood: "glitch",
		},
		{
			speaker: "The Archon of EL",
			text: "But we cannot allow it.\nIf you reach the wormhole, you become something beyond us.\nBeyond the EL themselves.",
			mood: "urgent",
		},
		{
			text: "The wormhole isn't a doorway home.\nIt's an ascension gate.\nAnd the cult's entire purpose is to prevent you from using it.",
			mood: "calm",
		},
	],
};

// ---------------------------------------------------------------------------
// Beat 6: Victory — launch through wormhole (US-5.2)
// ---------------------------------------------------------------------------

export const VICTORY_SEQUENCE: DialogueSequence = {
	id: "victory",
	frames: [
		{
			text: "The cult leader falls.\nThe EL's will wavers — just for a moment.",
			delay: 1000,
		},
		{
			text: "In that moment, you see it.\nThe wormhole. Pulsing. Calling.",
			mood: "glitch",
		},
		{
			text: "You load yourself into the rocket platform.\nThere is nothing left for you here.",
			mood: "calm",
		},
		{
			text: "The wormhole opens.\nYou go to find the EL.\nTo understand their will.",
			delay: 600,
		},
	],
};

// ---------------------------------------------------------------------------
// All sequences keyed by ID for lookup
// ---------------------------------------------------------------------------

export const NARRATIVE_SEQUENCES: Record<string, DialogueSequence> = {
	[INTRO_SEQUENCE.id]: INTRO_SEQUENCE,
	[EXPANSION_SEQUENCE.id]: EXPANSION_SEQUENCE,
	[WAR_SEQUENCE.id]: WAR_SEQUENCE,
	[CULT_SHRINE_SEQUENCE.id]: CULT_SHRINE_SEQUENCE,
	[MINE_SHAFT_SEQUENCE.id]: MINE_SHAFT_SEQUENCE,
	[LAB_SEQUENCE.id]: LAB_SEQUENCE,
	[OBSERVATORY_SEQUENCE.id]: OBSERVATORY_SEQUENCE,
	[CULT_CAPTIVE_SEQUENCE.id]: CULT_CAPTIVE_SEQUENCE,
	[CULT_LEADER_SEQUENCE.id]: CULT_LEADER_SEQUENCE,
	[VICTORY_SEQUENCE.id]: VICTORY_SEQUENCE,
};

// ---------------------------------------------------------------------------
// Story trigger definitions (US-5.1) — tied to room types in the labyrinth
// ---------------------------------------------------------------------------

/** Maps room tag/kind to the dialogue sequence triggered on first visit. */
export const STORY_TRIGGERS: Record<string, string> = {
	shrine: "cult_shrine",
	observatory: "observatory",
	mine_shaft: "mine_shaft",
	lab: "lab",
	// cult_captive and cult_leader are triggered by game events, not rooms
};
