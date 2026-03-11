/**
 * Formation movement system — manages coordinated group movement.
 *
 * Formations allow multiple bots to move together maintaining relative
 * positions. Supports line, wedge, circle, and column formations.
 *
 * Formation leader sets the group destination; followers compute their
 * offset positions based on formation type and their slot index.
 *
 * Tunables sourced from config/botMovement.json.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormationType = "line" | "wedge" | "circle" | "column";

export interface FormationSlot {
	botId: string;
	/** Offset from leader in formation-local coordinates */
	offsetX: number;
	offsetZ: number;
	/** World target position (computed each tick) */
	targetX: number;
	targetZ: number;
}

export interface Formation {
	id: string;
	type: FormationType;
	leaderId: string;
	slots: FormationSlot[];
	/** Spacing between units */
	spacing: number;
	/** Formation facing angle (radians, 0 = +Z) */
	facing: number;
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const DEFAULT_SPACING = 3.0;

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const formations = new Map<string, Formation>();
/** Maps botId → formationId for quick lookup */
const botFormationMap = new Map<string, string>();
let nextFormationId = 0;

// ---------------------------------------------------------------------------
// Offset generators — compute slots for each formation type
// ---------------------------------------------------------------------------

function generateLineOffsets(
	count: number,
	spacing: number,
): { x: number; z: number }[] {
	const offsets: { x: number; z: number }[] = [];
	// Leader is at center, followers spread left/right
	for (let i = 0; i < count; i++) {
		const halfCount = Math.floor(count / 2);
		const x = (i - halfCount) * spacing;
		offsets.push({ x, z: 0 });
	}
	return offsets;
}

function generateWedgeOffsets(
	count: number,
	spacing: number,
): { x: number; z: number }[] {
	const offsets: { x: number; z: number }[] = [];
	// Leader at front (index 0), followers fan out behind
	offsets.push({ x: 0, z: 0 }); // leader
	for (let i = 1; i < count; i++) {
		const row = Math.ceil(i / 2);
		const side = i % 2 === 1 ? -1 : 1;
		offsets.push({
			x: side * row * spacing,
			z: -row * spacing,
		});
	}
	return offsets;
}

function generateCircleOffsets(
	count: number,
	spacing: number,
): { x: number; z: number }[] {
	const offsets: { x: number; z: number }[] = [];
	if (count <= 1) {
		offsets.push({ x: 0, z: 0 });
		return offsets;
	}
	const radius = (spacing * count) / (2 * Math.PI);
	for (let i = 0; i < count; i++) {
		const angle = (2 * Math.PI * i) / count;
		offsets.push({
			x: Math.cos(angle) * radius,
			z: Math.sin(angle) * radius,
		});
	}
	return offsets;
}

function generateColumnOffsets(
	count: number,
	spacing: number,
): { x: number; z: number }[] {
	const offsets: { x: number; z: number }[] = [];
	// Single file behind leader
	for (let i = 0; i < count; i++) {
		offsets.push({ x: 0, z: -i * spacing });
	}
	return offsets;
}

function generateOffsets(
	type: FormationType,
	count: number,
	spacing: number,
): { x: number; z: number }[] {
	switch (type) {
		case "line":
			return generateLineOffsets(count, spacing);
		case "wedge":
			return generateWedgeOffsets(count, spacing);
		case "circle":
			return generateCircleOffsets(count, spacing);
		case "column":
			return generateColumnOffsets(count, spacing);
	}
}

// ---------------------------------------------------------------------------
// Rotation helpers
// ---------------------------------------------------------------------------

function rotateOffset(
	offsetX: number,
	offsetZ: number,
	facing: number,
): { x: number; z: number } {
	const cos = Math.cos(facing);
	const sin = Math.sin(facing);
	return {
		x: offsetX * cos - offsetZ * sin,
		z: offsetX * sin + offsetZ * cos,
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a formation from a list of bot IDs.
 * The first bot in the list becomes the leader.
 * Returns the formation ID.
 */
export function createFormation(
	botIds: string[],
	type: FormationType = "line",
	spacing: number = DEFAULT_SPACING,
): string | null {
	if (botIds.length === 0) return null;

	// Remove bots from any existing formations
	for (const botId of botIds) {
		removeFromFormation(botId);
	}

	const id = `formation_${nextFormationId++}`;
	const offsets = generateOffsets(type, botIds.length, spacing);

	const slots: FormationSlot[] = botIds.map((botId, i) => ({
		botId,
		offsetX: offsets[i].x,
		offsetZ: offsets[i].z,
		targetX: 0,
		targetZ: 0,
	}));

	const formation: Formation = {
		id,
		type,
		leaderId: botIds[0],
		slots,
		spacing,
		facing: 0,
	};

	formations.set(id, formation);
	for (const botId of botIds) {
		botFormationMap.set(botId, id);
	}

	return id;
}

/**
 * Disband a formation.
 */
export function disbandFormation(formationId: string): void {
	const formation = formations.get(formationId);
	if (!formation) return;

	for (const slot of formation.slots) {
		botFormationMap.delete(slot.botId);
	}
	formations.delete(formationId);
}

/**
 * Remove a single bot from its formation.
 * If the leader is removed, the next bot becomes leader.
 * If only one bot remains, the formation is disbanded.
 */
export function removeFromFormation(botId: string): void {
	const formationId = botFormationMap.get(botId);
	if (!formationId) return;

	const formation = formations.get(formationId);
	if (!formation) {
		botFormationMap.delete(botId);
		return;
	}

	const idx = formation.slots.findIndex((s) => s.botId === botId);
	if (idx === -1) return;

	formation.slots.splice(idx, 1);
	botFormationMap.delete(botId);

	if (formation.slots.length <= 1) {
		disbandFormation(formationId);
		return;
	}

	// If leader was removed, promote next bot
	if (formation.leaderId === botId) {
		formation.leaderId = formation.slots[0].botId;
	}

	// Recalculate offsets
	const offsets = generateOffsets(
		formation.type,
		formation.slots.length,
		formation.spacing,
	);
	for (let i = 0; i < formation.slots.length; i++) {
		formation.slots[i].offsetX = offsets[i].x;
		formation.slots[i].offsetZ = offsets[i].z;
	}
}

/**
 * Update formation target positions based on leader position and facing.
 * Call this each tick after the leader's position is known.
 */
export function updateFormationTargets(
	formationId: string,
	leaderX: number,
	leaderZ: number,
	facing: number,
): void {
	const formation = formations.get(formationId);
	if (!formation) return;

	formation.facing = facing;

	for (const slot of formation.slots) {
		const rotated = rotateOffset(slot.offsetX, slot.offsetZ, facing);
		slot.targetX = leaderX + rotated.x;
		slot.targetZ = leaderZ + rotated.z;
	}
}

/**
 * Get the target position for a specific bot in its formation.
 * Returns null if the bot is not in a formation.
 */
export function getFormationTarget(
	botId: string,
): { x: number; z: number } | null {
	const formationId = botFormationMap.get(botId);
	if (!formationId) return null;

	const formation = formations.get(formationId);
	if (!formation) return null;

	const slot = formation.slots.find((s) => s.botId === botId);
	if (!slot) return null;

	return { x: slot.targetX, z: slot.targetZ };
}

/**
 * Get formation info for a bot, or null if not in a formation.
 */
export function getFormationForBot(botId: string): Formation | null {
	const formationId = botFormationMap.get(botId);
	if (!formationId) return null;
	return formations.get(formationId) ?? null;
}

/**
 * Check if a bot is the leader of its formation.
 */
export function isFormationLeader(botId: string): boolean {
	const formation = getFormationForBot(botId);
	return formation?.leaderId === botId;
}

/**
 * Change the formation type (reshapes offsets).
 */
export function changeFormationType(
	formationId: string,
	newType: FormationType,
): void {
	const formation = formations.get(formationId);
	if (!formation) return;

	formation.type = newType;
	const offsets = generateOffsets(
		newType,
		formation.slots.length,
		formation.spacing,
	);
	for (let i = 0; i < formation.slots.length; i++) {
		formation.slots[i].offsetX = offsets[i].x;
		formation.slots[i].offsetZ = offsets[i].z;
	}
}

/**
 * Get all active formations.
 */
export function getAllFormations(): Formation[] {
	return Array.from(formations.values());
}

/**
 * Reset all formation state. For tests and new-game initialization.
 */
export function resetFormations(): void {
	formations.clear();
	botFormationMap.clear();
	nextFormationId = 0;
}
