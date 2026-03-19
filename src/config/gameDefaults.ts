/**
 * Game configuration constants.
 *
 * All tunables live here — never hardcode these values in system or rendering code.
 */

/** World-space metres per tile side. One tile = one texture repeat. */
export const TILE_SIZE_M = 2.0;

/** World Y offset per elevation level (bridge/tunnel height step). */
export const ELEVATION_STEP_M = 0.4;


/** Default difficulty setting. */
export const DEFAULT_DIFFICULTY = "normal" as const;

/** Units per second during robot move animation lerp. */
export const UNIT_MOVE_SPEED = 4.0;

/** Starting AP for the player faction. */
export const PLAYER_MAX_AP = 3;

/** Starting HP for the player sentinel bot. */
export const PLAYER_SENTINEL_HP = 10;

/** Emissive intensity for reachable-tile highlight. */
export const HIGHLIGHT_EMISSIVE = 0.6;

/** Emissive intensity for the currently selected tile. */
export const SELECT_EMISSIVE = 1.0;

/** Highlight tint color for reachable tiles. */
export const HIGHLIGHT_COLOR = 0x00ffaa;

/** How many tiles the player faction starts with visibility into. */
export const INITIAL_SCAN_RANGE = 14;

// ---------------------------------------------------------------------------
// Unit mesh dimensions
// ---------------------------------------------------------------------------

export const UNIT_WIDTH = 0.8;
export const UNIT_HEIGHT = 1.2;
export const UNIT_DEPTH = 0.8;

/** Emissive + tint color for the player faction unit meshes. */
export const PLAYER_UNIT_COLOR = 0x00ffaa;
/** Default tint for unrecognized AI faction units. */
export const DEFAULT_AI_UNIT_COLOR = 0xff4444;

// ---------------------------------------------------------------------------
// Faction colors — ONE source of truth (matches GAME_DESIGN.md)
// ---------------------------------------------------------------------------

export const FACTION_COLORS: Record<string, number> = {
	player: PLAYER_UNIT_COLOR,
	"": PLAYER_UNIT_COLOR,
	reclaimers: 0xff8844,       // Orange
	volt_collective: 0xffcc00,  // Yellow
	signal_choir: 0xaa44ff,     // Purple
	iron_creed: 0xff4444,       // Red
};

/** CSS-string versions for UI components. Derived from FACTION_COLORS. */
export const FACTION_COLORS_CSS: Record<string, string> = {
	player: "#8be6ff",
	"": "#8be6ff",
	reclaimers: "#ff8844",
	volt_collective: "#ffcc00",
	signal_choir: "#aa44ff",
	iron_creed: "#ff4444",
	static_remnants: "#cc4444",
	null_monks: "#aa44aa",
	lost_signal: "#44aa88",
};

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

/** Initial camera Y height above the board centre. */
export const CAMERA_Y = 35;
/** Initial camera Z offset (distance back). */
export const CAMERA_Z_OFFSET = 35 * 0.6;
/** Camera field-of-view in degrees. */
export const CAMERA_FOV = 45;

// ---------------------------------------------------------------------------
// New Game options
// ---------------------------------------------------------------------------


/** Valid difficulty options. */
export const DIFFICULTIES = ["easy", "normal", "hard"] as const;

// ---------------------------------------------------------------------------
// Territory
// ---------------------------------------------------------------------------

/** Manhattan-distance claim radius around a unit. */
export const TERRITORY_UNIT_RADIUS = 2;
/** Manhattan-distance claim radius around a building. */
export const TERRITORY_BUILDING_RADIUS = 4;

// ---------------------------------------------------------------------------
// Victory conditions
// ---------------------------------------------------------------------------

/** Domination: faction must control this percentage of total tiles. */
export const VICTORY_DOMINATION_PERCENT = 60;
/** Research: number of research labs required. */
export const VICTORY_RESEARCH_LABS = 3;
/** Research: tech points required (research labs generate 1/turn). */
export const VICTORY_RESEARCH_POINTS = 100;
/** Economic: total resources across all materials. */
export const VICTORY_ECONOMIC_TOTAL = 500;
/** Survival: number of turns to survive. */
export const VICTORY_SURVIVAL_TURNS = 200;

// ---------------------------------------------------------------------------
// Diplomacy
// ---------------------------------------------------------------------------

/** Turns without aggression before hostile drifts toward neutral. */
export const DIPLOMACY_PEACE_DRIFT_TURNS = 10;

/** Turns before Signal Choir backstabs an alliance. */
export const DIPLOMACY_BACKSTAB_DELAY = 15;

/** Standing value thresholds (range -100 to +100). */
export const STANDING_THRESHOLDS = {
	hostile: -50,
	unfriendly: -10,
	neutral: 10,
	cordial: 50,
	// >= 50 = allied
} as const;

/** Standing changes from gameplay events. */
export const STANDING_CHANGES = {
	unit_attacked: -20,
	building_destroyed: -15,
	hacking_detected: -12,
	territory_encroachment: -8,
	trade_rejected: -3,
	alliance_proposed: 3,
	trade_completed: 5,
	shared_enemy: 10,
} as const;

/** Standing display — labels and colors for each level. */
export const STANDING_DISPLAY = {
	hostile: { label: "Hostile", color: "#cc4444" },
	unfriendly: { label: "Unfriendly", color: "#ff8f8f" },
	neutral: { label: "Neutral", color: "#888888" },
	cordial: { label: "Cordial", color: "#f6c56a" },
	allied: { label: "Allied", color: "#7ee7cb" },
} as const;

/** Percentage of allied faction's harvest shared as trade income. */
export const TRADE_INCOME_SHARE_PERCENT = 15;

/** Penalty applied to all factions when breaking a trade agreement. */
export const BREAK_TRADE_PENALTY = -20;

/** Penalty applied to all factions when breaking an alliance. */
export const BREAK_ALLIANCE_PENALTY = -40;

/** Standing decay per turn (drifts toward 0). */
export const STANDING_DECAY_PER_TURN = 1;

// ---------------------------------------------------------------------------
// Endgame
// ---------------------------------------------------------------------------

/** Turn after which cult enters final assault mode (x5 spawn rate). */
export const CULT_FINAL_ASSAULT_TURN = 300;

/** Cult spawn rate multiplier during final assault. */
export const CULT_FINAL_ASSAULT_MULTIPLIER = 5;

/** Turns a faction must hold 80%+ territory for forced domination victory. */
export const FORCED_DOMINATION_HOLD_TURNS = 10;

/** Territory percentage required for forced domination victory. */
export const FORCED_DOMINATION_PERCENT = 80;

/** Turns required to complete the Wormhole Stabilizer project. */
export const WORMHOLE_PROJECT_TURNS = 20;
