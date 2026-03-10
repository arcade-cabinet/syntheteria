/**
 * Unit tests for belt routing — connection management between belts and machines.
 *
 * Tests cover:
 * - Belt-to-belt connections
 * - Belt-to-machine connections
 * - Output target tracking
 * - Delivery routing
 * - Edge cases: disconnected belts, circular routes, replacing connections
 */

import { afterEach, describe, expect, it } from "vitest";
import {
	connectBelts,
	connectBeltToMachine,
	disconnectInput,
	disconnectOutput,
	getConnectedInput,
	getConnectedOutput,
	resetRouting,
} from "../beltRouting";

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

afterEach(() => {
	resetRouting();
});

// ---------------------------------------------------------------------------
// connectBelts — belt-to-belt
// ---------------------------------------------------------------------------

describe("connectBelts", () => {
	it("creates a forward connection from belt A to belt B", () => {
		connectBelts("a", "b");

		const output = getConnectedOutput("a");
		expect(output).toBeDefined();
		expect(output!.type).toBe("belt");
		expect(output!.targetId).toBe("b");
	});

	it("creates a reverse input connection on belt B", () => {
		connectBelts("a", "b");

		const input = getConnectedInput("b");
		expect(input).toBeDefined();
		expect(input!.type).toBe("belt");
		expect(input!.targetId).toBe("a");
	});

	it("replaces existing output connection on belt A", () => {
		connectBelts("a", "b");
		connectBelts("a", "c");

		const output = getConnectedOutput("a");
		expect(output!.targetId).toBe("c");

		// Old target should have no input connection
		expect(getConnectedInput("b")).toBeUndefined();
	});

	it("replaces existing input connection on belt B", () => {
		connectBelts("a", "b");
		connectBelts("c", "b");

		const input = getConnectedInput("b");
		expect(input!.targetId).toBe("c");

		// Old source should have no output connection
		expect(getConnectedOutput("a")).toBeUndefined();
	});

	it("supports chaining three belts together", () => {
		connectBelts("a", "b");
		connectBelts("b", "c");

		expect(getConnectedOutput("a")!.targetId).toBe("b");
		expect(getConnectedOutput("b")!.targetId).toBe("c");

		expect(getConnectedInput("b")!.targetId).toBe("a");
		expect(getConnectedInput("c")!.targetId).toBe("b");
	});

	it("supports longer belt chains", () => {
		connectBelts("a", "b");
		connectBelts("b", "c");
		connectBelts("c", "d");
		connectBelts("d", "e");

		expect(getConnectedOutput("a")!.targetId).toBe("b");
		expect(getConnectedOutput("d")!.targetId).toBe("e");
		expect(getConnectedInput("e")!.targetId).toBe("d");
	});
});

// ---------------------------------------------------------------------------
// connectBeltToMachine
// ---------------------------------------------------------------------------

describe("connectBeltToMachine", () => {
	it("creates a machine connection with port name", () => {
		connectBeltToMachine("b1", "furnace1", "hopper");

		const output = getConnectedOutput("b1");
		expect(output).toBeDefined();
		expect(output!.type).toBe("machine");
		expect(output!.targetId).toBe("furnace1");
		expect(output!.port).toBe("hopper");
	});

	it("replaces existing belt output connection", () => {
		connectBelts("b1", "b2");
		connectBeltToMachine("b1", "furnace1", "input");

		const output = getConnectedOutput("b1");
		expect(output!.type).toBe("machine");
		expect(output!.targetId).toBe("furnace1");

		// b2 should have its input connection cleaned up
		expect(getConnectedInput("b2")).toBeUndefined();
	});

	it("replaces existing machine connection", () => {
		connectBeltToMachine("b1", "furnace1", "input");
		connectBeltToMachine("b1", "smelter1", "hopper");

		const output = getConnectedOutput("b1");
		expect(output!.type).toBe("machine");
		expect(output!.targetId).toBe("smelter1");
		expect(output!.port).toBe("hopper");
	});

	it("does not create an input connection on the machine", () => {
		connectBeltToMachine("b1", "furnace1", "hopper");

		// Machines are not tracked in inputConnections
		expect(getConnectedInput("furnace1")).toBeUndefined();
	});

	it("supports different ports on different belts to same machine", () => {
		connectBeltToMachine("b1", "furnace1", "hopper_left");
		connectBeltToMachine("b2", "furnace1", "hopper_right");

		expect(getConnectedOutput("b1")!.port).toBe("hopper_left");
		expect(getConnectedOutput("b2")!.port).toBe("hopper_right");
	});
});

// ---------------------------------------------------------------------------
// getConnectedOutput / getConnectedInput
// ---------------------------------------------------------------------------

describe("getConnectedOutput", () => {
	it("returns undefined for unconnected belt", () => {
		expect(getConnectedOutput("nonexistent")).toBeUndefined();
	});

	it("returns the belt connection after connecting belts", () => {
		connectBelts("a", "b");
		const conn = getConnectedOutput("a");
		expect(conn).toEqual({ type: "belt", targetId: "b" });
	});
});

describe("getConnectedInput", () => {
	it("returns undefined for unconnected belt", () => {
		expect(getConnectedInput("nonexistent")).toBeUndefined();
	});

	it("returns the source connection after connecting belts", () => {
		connectBelts("a", "b");
		const conn = getConnectedInput("b");
		expect(conn).toEqual({ type: "belt", targetId: "a" });
	});
});

// ---------------------------------------------------------------------------
// disconnectOutput
// ---------------------------------------------------------------------------

describe("disconnectOutput", () => {
	it("removes the output connection from a belt", () => {
		connectBelts("a", "b");
		disconnectOutput("a");

		expect(getConnectedOutput("a")).toBeUndefined();
	});

	it("also removes the corresponding input connection on the target belt", () => {
		connectBelts("a", "b");
		disconnectOutput("a");

		expect(getConnectedInput("b")).toBeUndefined();
	});

	it("is safe to call on belt with no output", () => {
		expect(() => disconnectOutput("nonexistent")).not.toThrow();
	});

	it("does not affect other connections in a chain", () => {
		connectBelts("a", "b");
		connectBelts("b", "c");

		disconnectOutput("a");

		// b -> c should still be intact
		expect(getConnectedOutput("b")!.targetId).toBe("c");
		expect(getConnectedInput("c")!.targetId).toBe("b");
	});

	it("removes machine connection without affecting inputConnections", () => {
		connectBeltToMachine("b1", "furnace1", "hopper");
		disconnectOutput("b1");

		expect(getConnectedOutput("b1")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// disconnectInput
// ---------------------------------------------------------------------------

describe("disconnectInput", () => {
	it("removes the input connection from a belt", () => {
		connectBelts("a", "b");
		disconnectInput("b");

		expect(getConnectedInput("b")).toBeUndefined();
	});

	it("also removes the corresponding output connection on the source belt", () => {
		connectBelts("a", "b");
		disconnectInput("b");

		expect(getConnectedOutput("a")).toBeUndefined();
	});

	it("is safe to call on belt with no input", () => {
		expect(() => disconnectInput("nonexistent")).not.toThrow();
	});

	it("does not affect other connections in a chain", () => {
		connectBelts("a", "b");
		connectBelts("b", "c");

		disconnectInput("c");

		// a -> b should still be intact
		expect(getConnectedOutput("a")!.targetId).toBe("b");
		expect(getConnectedInput("b")!.targetId).toBe("a");
	});
});

// ---------------------------------------------------------------------------
// resetRouting
// ---------------------------------------------------------------------------

describe("resetRouting", () => {
	it("clears all connections", () => {
		connectBelts("a", "b");
		connectBelts("c", "d");
		connectBeltToMachine("e", "furnace1", "input");

		resetRouting();

		expect(getConnectedOutput("a")).toBeUndefined();
		expect(getConnectedOutput("c")).toBeUndefined();
		expect(getConnectedOutput("e")).toBeUndefined();
		expect(getConnectedInput("b")).toBeUndefined();
		expect(getConnectedInput("d")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Delivery routing — tracing the full path
// ---------------------------------------------------------------------------

describe("delivery routing", () => {
	it("tracing a belt chain reaches the terminal belt", () => {
		connectBelts("a", "b");
		connectBelts("b", "c");

		// Walk the chain from "a" to the end
		let current = "a";
		const visited: string[] = [current];
		let next = getConnectedOutput(current);
		while (next && next.type === "belt") {
			current = next.targetId;
			visited.push(current);
			next = getConnectedOutput(current);
		}

		expect(visited).toEqual(["a", "b", "c"]);
		// c has no output, so next is undefined
		expect(next).toBeUndefined();
	});

	it("tracing a belt chain ending at a machine finds the machine", () => {
		connectBelts("a", "b");
		connectBelts("b", "c");
		connectBeltToMachine("c", "furnace1", "hopper");

		let current = "a";
		let next = getConnectedOutput(current);
		while (next && next.type === "belt") {
			current = next.targetId;
			next = getConnectedOutput(current);
		}

		expect(next).toBeDefined();
		expect(next!.type).toBe("machine");
		expect(next!.targetId).toBe("furnace1");
		expect(next!.port).toBe("hopper");
	});

	it("reversing from a belt finds the source through input connections", () => {
		connectBelts("a", "b");
		connectBelts("b", "c");

		// Trace backwards from "c"
		let current = "c";
		const visited: string[] = [current];
		let prev = getConnectedInput(current);
		while (prev && prev.type === "belt") {
			current = prev.targetId;
			visited.push(current);
			prev = getConnectedInput(current);
		}

		expect(visited).toEqual(["c", "b", "a"]);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("connecting a belt to itself is technically allowed (module does not prevent)", () => {
		// The routing module stores whatever IDs are given.
		// Higher-level code should prevent self-connections.
		connectBelts("a", "a");

		expect(getConnectedOutput("a")!.targetId).toBe("a");
		expect(getConnectedInput("a")!.targetId).toBe("a");
	});

	it("circular route between two belts", () => {
		connectBelts("a", "b");
		connectBelts("b", "a");

		expect(getConnectedOutput("a")!.targetId).toBe("b");
		expect(getConnectedOutput("b")!.targetId).toBe("a");
		expect(getConnectedInput("a")!.targetId).toBe("b");
		expect(getConnectedInput("b")!.targetId).toBe("a");
	});

	it("circular route detection — walking the chain can be bounded", () => {
		connectBelts("a", "b");
		connectBelts("b", "c");
		connectBelts("c", "a"); // circular

		// A bounded walk should detect the cycle
		const visited = new Set<string>();
		let current: string | undefined = "a";
		let isCyclic = false;

		while (current) {
			if (visited.has(current)) {
				isCyclic = true;
				break;
			}
			visited.add(current);
			const next = getConnectedOutput(current);
			current = next?.type === "belt" ? next.targetId : undefined;
		}

		expect(isCyclic).toBe(true);
		expect(visited.size).toBe(3);
	});

	it("disconnecting one side of a belt connection cleans up both sides", () => {
		connectBelts("a", "b");

		// Disconnect from either side should clean both
		disconnectOutput("a");

		expect(getConnectedOutput("a")).toBeUndefined();
		expect(getConnectedInput("b")).toBeUndefined();
	});

	it("reconnecting a belt in a chain properly cleans up old links", () => {
		connectBelts("a", "b");
		connectBelts("b", "c");

		// Now reroute: a -> c (skipping b)
		connectBelts("a", "c");

		expect(getConnectedOutput("a")!.targetId).toBe("c");
		// b's input from a should be cleaned up
		expect(getConnectedInput("b")).toBeUndefined();
		// c's input should now be from a (not b)
		expect(getConnectedInput("c")!.targetId).toBe("a");
		// b's output to c should be cleaned up (c's old input was from b)
		expect(getConnectedOutput("b")).toBeUndefined();
	});

	it("disconnecting output of machine connection does not touch inputConnections", () => {
		connectBeltToMachine("b1", "furnace1", "hopper");

		disconnectOutput("b1");

		// Machine never had an input connection record
		expect(getConnectedInput("furnace1")).toBeUndefined();
		expect(getConnectedOutput("b1")).toBeUndefined();
	});

	it("many independent belt pairs do not interfere", () => {
		connectBelts("a1", "a2");
		connectBelts("b1", "b2");
		connectBelts("c1", "c2");

		expect(getConnectedOutput("a1")!.targetId).toBe("a2");
		expect(getConnectedOutput("b1")!.targetId).toBe("b2");
		expect(getConnectedOutput("c1")!.targetId).toBe("c2");

		disconnectOutput("b1");

		// Only b1-b2 affected
		expect(getConnectedOutput("a1")!.targetId).toBe("a2");
		expect(getConnectedOutput("b1")).toBeUndefined();
		expect(getConnectedOutput("c1")!.targetId).toBe("c2");
	});
});
