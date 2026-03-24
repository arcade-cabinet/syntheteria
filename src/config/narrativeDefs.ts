/**
 * Narrative dialogue definitions — intro sequence, phase transitions, victory.
 *
 * Each sequence is an array of DialogueFrame objects displayed one at a time
 * by the NarrativeOverlay with a typewriter text effect.
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
// Intro — plays on first New Game before gameplay starts
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
// Victory — triggered on cult leader defeat
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
	[VICTORY_SEQUENCE.id]: VICTORY_SEQUENCE,
};
