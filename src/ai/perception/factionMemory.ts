/**
 * FactionMemory — per-faction memory of enemy sightings.
 *
 * Uses Yuka's MemorySystem concepts but adapted for our turn-based ECS:
 * - Records store (factionId, entityId, tileX, tileZ, turn seen)
 * - Records decay after N turns (configurable memorySpan)
 * - AI makes decisions based on remembered state, not omniscient knowledge
 * - Fog of war is respected: only units within scanRange create/update records
 *
 * We don't use Yuka's MemorySystem directly because it's designed for
 * real-time (uses seconds/timeBecameVisible), and our game is turn-based.
 * Instead, we implement the same pattern with turn-based decay.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SightingRecord {
	/** The entity ID of the spotted unit. */
	entityId: number;
	/** Faction of the spotted unit. */
	factionId: string;
	/** Last known tile position. */
	tileX: number;
	tileZ: number;
	/** Turn number when last seen. */
	turnSeen: number;
	/** Whether the unit is currently visible (within scan range this turn). */
	currentlyVisible: boolean;
}

// ---------------------------------------------------------------------------
// FactionMemory
// ---------------------------------------------------------------------------

export class FactionMemory {
	/** How many turns a sighting remains valid after last seen. */
	memorySpan: number;

	/** Records keyed by entity ID. */
	private records = new Map<number, SightingRecord>();

	constructor(memorySpan = 5) {
		this.memorySpan = memorySpan;
	}

	/** Record or update a sighting. */
	recordSighting(
		entityId: number,
		factionId: string,
		tileX: number,
		tileZ: number,
		turn: number,
	): void {
		this.records.set(entityId, {
			entityId,
			factionId,
			tileX,
			tileZ,
			turnSeen: turn,
			currentlyVisible: true,
		});
	}

	/**
	 * Mark all records as not currently visible, then re-mark those
	 * that are seen this turn. Call this at the start of each turn's
	 * perception update before calling recordSighting for visible units.
	 */
	beginTurnUpdate(): void {
		for (const record of this.records.values()) {
			record.currentlyVisible = false;
		}
	}

	/** Remove records that are older than memorySpan turns. */
	pruneStale(currentTurn: number): void {
		for (const [id, record] of this.records) {
			if (currentTurn - record.turnSeen > this.memorySpan) {
				this.records.delete(id);
			}
		}
	}

	/** Remove a specific entity's record (e.g., when confirmed destroyed). */
	forgetEntity(entityId: number): void {
		this.records.delete(entityId);
	}

	/** Get a specific entity's sighting record, or undefined if not tracked. */
	getRecord(entityId: number): SightingRecord | undefined {
		return this.records.get(entityId);
	}

	/**
	 * Get all valid (not yet expired) sighting records.
	 * Includes both currently visible and remembered-but-not-visible.
	 */
	getValidRecords(currentTurn: number): SightingRecord[] {
		const result: SightingRecord[] = [];
		for (const record of this.records.values()) {
			if (currentTurn - record.turnSeen <= this.memorySpan) {
				result.push(record);
			}
		}
		return result;
	}

	/** Get only records for entities currently visible this turn. */
	getVisibleRecords(): SightingRecord[] {
		const result: SightingRecord[] = [];
		for (const record of this.records.values()) {
			if (record.currentlyVisible) {
				result.push(record);
			}
		}
		return result;
	}

	/** Get remembered-but-not-currently-visible records (stale intel). */
	getRememberedRecords(currentTurn: number): SightingRecord[] {
		const result: SightingRecord[] = [];
		for (const record of this.records.values()) {
			if (
				!record.currentlyVisible &&
				currentTurn - record.turnSeen <= this.memorySpan
			) {
				result.push(record);
			}
		}
		return result;
	}

	/** Total number of records (including stale). */
	get size(): number {
		return this.records.size;
	}

	/** Clear all records. */
	clear(): void {
		this.records.clear();
	}
}

// ---------------------------------------------------------------------------
// Registry — one FactionMemory per AI faction
// ---------------------------------------------------------------------------

const _memories = new Map<string, FactionMemory>();

export function getFactionMemory(factionId: string): FactionMemory {
	let mem = _memories.get(factionId);
	if (!mem) {
		mem = new FactionMemory();
		_memories.set(factionId, mem);
	}
	return mem;
}

export function resetAllFactionMemories(): void {
	_memories.clear();
}

/**
 * Update faction perception for a given turn.
 * For each AI unit, scan for enemies within scanRange and record sightings.
 */
export function updateFactionPerception(
	factionId: string,
	myUnits: Array<{ tileX: number; tileZ: number; scanRange: number }>,
	allEnemies: Array<{
		entityId: number;
		factionId: string;
		tileX: number;
		tileZ: number;
	}>,
	currentTurn: number,
): void {
	const memory = getFactionMemory(factionId);
	memory.beginTurnUpdate();

	for (const unit of myUnits) {
		for (const enemy of allEnemies) {
			const dist =
				Math.abs(unit.tileX - enemy.tileX) + Math.abs(unit.tileZ - enemy.tileZ);
			if (dist <= unit.scanRange) {
				memory.recordSighting(
					enemy.entityId,
					enemy.factionId,
					enemy.tileX,
					enemy.tileZ,
					currentTurn,
				);
			}
		}
	}

	memory.pruneStale(currentTurn);
}
