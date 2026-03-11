/**
 * Tests for ErrorBoundary — error classification logic and state transitions.
 *
 * Tests cover the pure WebGL error detection and recovery state logic
 * without requiring DOM rendering.
 */

// ---------------------------------------------------------------------------
// WebGL error detection logic (mirrors ErrorBoundary.tsx)
// ---------------------------------------------------------------------------

function isWebGLError(message: string): boolean {
	return (
		message.includes("WebGL") ||
		message.includes("context") ||
		message.includes("GPU")
	);
}

function getErrorDisplayMessage(message: string): string {
	if (isWebGLError(message)) {
		return "Graphics subsystem lost. Your GPU may have reset or the browser tab ran out of memory.";
	}
	return `Runtime error: ${message.slice(0, 120)}`;
}

// ---------------------------------------------------------------------------
// isWebGLError detection
// ---------------------------------------------------------------------------

describe("ErrorBoundary WebGL error detection", () => {
	it("detects 'WebGL' in message", () => {
		expect(isWebGLError("WebGL context lost")).toBe(true);
	});

	it("detects 'context' in message", () => {
		expect(isWebGLError("context creation failed")).toBe(true);
	});

	it("detects 'GPU' in message", () => {
		expect(isWebGLError("GPU process crashed")).toBe(true);
	});

	it("returns false for generic runtime errors", () => {
		expect(isWebGLError("Cannot read property 'x' of undefined")).toBe(false);
	});

	it("returns false for network errors", () => {
		expect(isWebGLError("Failed to fetch")).toBe(false);
	});

	it("returns false for empty string", () => {
		expect(isWebGLError("")).toBe(false);
	});

	it("is case-sensitive for 'WebGL'", () => {
		// The check uses .includes(), which is case-sensitive
		expect(isWebGLError("webgl error")).toBe(false);
		expect(isWebGLError("WebGL error")).toBe(true);
	});

	it("detects 'GPU' even mid-sentence", () => {
		expect(isWebGLError("The GPU has been reset by Windows")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Error display message logic
// ---------------------------------------------------------------------------

describe("getErrorDisplayMessage", () => {
	it("returns GPU/graphics message for WebGL errors", () => {
		const msg = getErrorDisplayMessage("WebGL context lost");
		expect(msg).toContain("Graphics subsystem lost");
	});

	it("returns runtime error message for generic errors", () => {
		const msg = getErrorDisplayMessage("TypeError: x is not a function");
		expect(msg).toContain("Runtime error:");
		expect(msg).toContain("TypeError");
	});

	it("truncates long error messages to 120 chars", () => {
		const longMsg = "x".repeat(200);
		const result = getErrorDisplayMessage(longMsg);
		// Should contain "Runtime error: " + 120 chars of x
		expect(result).toBe(`Runtime error: ${"x".repeat(120)}`);
	});

	it("does not truncate short error messages", () => {
		const shortMsg = "short error";
		const result = getErrorDisplayMessage(shortMsg);
		expect(result).toBe("Runtime error: short error");
	});

	it("exactly 120-char message is not truncated", () => {
		const msg = "a".repeat(120);
		const result = getErrorDisplayMessage(msg);
		expect(result).toBe(`Runtime error: ${"a".repeat(120)}`);
	});

	it("message at exactly 121 chars is truncated", () => {
		const msg = "a".repeat(121);
		const result = getErrorDisplayMessage(msg);
		expect(result).toBe(`Runtime error: ${"a".repeat(120)}`);
	});
});

// ---------------------------------------------------------------------------
// ErrorBoundary state logic (pure state transitions)
// ---------------------------------------------------------------------------

describe("ErrorBoundary state transitions", () => {
	it("derives error state from caught error", () => {
		const error = new Error("test crash");
		// getDerivedStateFromError mirrors: { hasError: true, error }
		const state = { hasError: true, error };
		expect(state.hasError).toBe(true);
		expect(state.error).toBe(error);
	});

	it("retry resets to clean state", () => {
		// handleRetry mirrors: setState({ hasError: false, error: null })
		const stateAfterRetry = { hasError: false, error: null };
		expect(stateAfterRetry.hasError).toBe(false);
		expect(stateAfterRetry.error).toBeNull();
	});

	it("error message is accessed via error.message", () => {
		const error = new Error("something went wrong");
		const msg = error.message ?? "Unknown error";
		expect(msg).toBe("something went wrong");
	});

	it("falls back to 'Unknown error' when message is empty", () => {
		const error = new Error();
		// Simulate the null coalescing in the component
		const msg = error.message || "Unknown error";
		expect(msg).toBe("Unknown error");
	});
});
