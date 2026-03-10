/**
 * Belt routing — manages connections between belts and between belts and machines.
 *
 * A belt's output can connect to:
 *   - Another belt's input (belt chain)
 *   - A machine's hopper port (delivery)
 *
 * A belt's input can receive from:
 *   - Another belt's output (belt chain)
 *
 * Module-level state pattern (same as other systems in this codebase).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BeltConnection {
	type: "belt" | "machine";
	targetId: string;
	/** Machine port name (only meaningful when type === "machine") */
	port?: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * For each belt, what its output connects TO.
 * Key = source belt id, Value = connection descriptor.
 */
const outputConnections: Map<string, BeltConnection> = new Map();

/**
 * For each belt, what feeds INTO its input.
 * Key = destination belt id, Value = connection descriptor.
 */
const inputConnections: Map<string, BeltConnection> = new Map();

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** Reset all routing state. Intended for tests. */
export function resetRouting(): void {
	outputConnections.clear();
	inputConnections.clear();
}

// ---------------------------------------------------------------------------
// Connection API
// ---------------------------------------------------------------------------

/**
 * Link the output of beltA to the input of beltB.
 * If beltA already has an output connection, it is replaced.
 * If beltB already has an input connection, it is replaced.
 */
export function connectBelts(beltA: string, beltB: string): void {
	// Remove any previous output connection from A
	disconnectOutput(beltA);
	// Remove any previous input connection to B
	disconnectInput(beltB);

	const conn: BeltConnection = { type: "belt", targetId: beltB };
	outputConnections.set(beltA, conn);
	inputConnections.set(beltB, { type: "belt", targetId: beltA });
}

/**
 * Link a belt's output to a machine's hopper port.
 */
export function connectBeltToMachine(
	beltId: string,
	machineId: string,
	port: string,
): void {
	disconnectOutput(beltId);
	outputConnections.set(beltId, {
		type: "machine",
		targetId: machineId,
		port,
	});
}

/**
 * Get what the belt's output is connected to (another belt or machine), or null.
 */
export function getConnectedOutput(
	beltId: string,
): BeltConnection | undefined {
	return outputConnections.get(beltId);
}

/**
 * Get what feeds into this belt's input, or null.
 */
export function getConnectedInput(beltId: string): BeltConnection | undefined {
	return inputConnections.get(beltId);
}

// ---------------------------------------------------------------------------
// Disconnect helpers
// ---------------------------------------------------------------------------

/**
 * Remove the output connection from a belt.
 * Also cleans up the corresponding input connection on the target if it was a belt.
 */
export function disconnectOutput(beltId: string): void {
	const existing = outputConnections.get(beltId);
	if (!existing) return;

	if (existing.type === "belt") {
		// Clean up the reverse link on the target belt
		const reverse = inputConnections.get(existing.targetId);
		if (reverse && reverse.targetId === beltId) {
			inputConnections.delete(existing.targetId);
		}
	}
	outputConnections.delete(beltId);
}

/**
 * Remove the input connection to a belt.
 * Also cleans up the corresponding output connection on the source belt.
 */
export function disconnectInput(beltId: string): void {
	const existing = inputConnections.get(beltId);
	if (!existing) return;

	if (existing.type === "belt") {
		const reverse = outputConnections.get(existing.targetId);
		if (reverse && reverse.type === "belt" && reverse.targetId === beltId) {
			outputConnections.delete(existing.targetId);
		}
	}
	inputConnections.delete(beltId);
}
