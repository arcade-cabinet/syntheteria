/**
 * FatalErrorModal — catches and surfaces all unhandled errors.
 *
 * WebGL shader failures, uncaught exceptions, unhandled promise rejections —
 * NOTHING gets buried in the console. If something breaks, the player sees
 * a full error modal with the message, stack trace, and source location.
 *
 * Also intercepts THREE.js WebGL program errors by monkey-patching
 * console.error to catch shader compilation failures that THREE reports
 * but doesn't throw.
 */

import {
	Component,
	type ErrorInfo,
	type ReactNode,
	useEffect,
	useState,
} from "react";

// ─── Global error state ──────────────────────────────────────────────────────

interface FatalError {
	message: string;
	stack: string;
	source: string;
	timestamp: number;
}

const errorListeners = new Set<(err: FatalError) => void>();

function broadcastError(err: FatalError) {
	for (const listener of errorListeners) {
		listener(err);
	}
}

/** Push a fatal error from anywhere (WebGL interceptor, error boundary, etc.) */
export function pushFatalError(
	message: string,
	stack?: string,
	source?: string,
) {
	broadcastError({
		message,
		stack: stack ?? new Error().stack ?? "(no stack)",
		source: source ?? "unknown",
		timestamp: Date.now(),
	});
}

// ─── WebGL / THREE.js error interceptor ──────────────────────────────────────

let interceptorInstalled = false;

function installWebGLInterceptor() {
	if (interceptorInstalled) return;
	interceptorInstalled = true;

	const originalError = console.error;
	console.error = (...args: unknown[]) => {
		originalError.apply(console, args);

		// Detect THREE.js shader compilation errors
		const first = String(args[0] ?? "");
		if (
			first.includes("WebGLProgram: Shader Error") ||
			first.includes("VALIDATE_STATUS false")
		) {
			const fullMessage = args
				.map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
				.join("\n");
			pushFatalError(
				"Shader compilation failed — the floor/sky renderer is broken.",
				fullMessage,
				"WebGL/THREE.ShaderMaterial",
			);
		}
	};

	// Catch unhandled promise rejections
	window.addEventListener("unhandledrejection", (event) => {
		const reason = event.reason;
		pushFatalError(
			reason?.message ?? String(reason),
			reason?.stack ?? "(no stack)",
			"unhandledrejection",
		);
	});

	// Catch uncaught errors
	window.addEventListener("error", (event) => {
		// Ignore benign browser/library errors
		if (event.message?.includes("ResizeObserver")) return;
		if (event.message?.includes("releasePointerCapture")) return;
		if (event.message?.includes("setPointerCapture")) return;
		pushFatalError(
			event.message ?? "Unknown error",
			event.error?.stack ?? `${event.filename}:${event.lineno}:${event.colno}`,
			"window.onerror",
		);
	});
}

// ─── React Error Boundary ────────────────────────────────────────────────────

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	error: FatalError | null;
}

export class FatalErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {
			error: {
				message: error.message,
				stack: error.stack ?? "(no stack)",
				source: "React ErrorBoundary",
				timestamp: Date.now(),
			},
		};
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		pushFatalError(
			error.message,
			`${error.stack}\n\nComponent stack:${info.componentStack}`,
			"React ErrorBoundary",
		);
	}

	render() {
		if (this.state.error) {
			return <FatalErrorOverlay error={this.state.error} />;
		}
		return this.props.children;
	}
}

// ─── Hook: subscribe to fatal errors ─────────────────────────────────────────

export function useFatalErrors(): FatalError | null {
	const [error, setError] = useState<FatalError | null>(null);

	useEffect(() => {
		installWebGLInterceptor();
		errorListeners.add(setError);
		return () => {
			errorListeners.delete(setError);
		};
	}, []);

	return error;
}

// ─── Modal overlay ───────────────────────────────────────────────────────────

function FatalErrorOverlay({ error }: { error: FatalError }) {
	return (
		<div
			data-testid="fatal-error-modal"
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 99999,
				background: "rgba(0, 0, 0, 0.92)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				color: "#cc4444",
				padding: 20,
			}}
		>
			<div
				style={{
					maxWidth: 720,
					maxHeight: "90vh",
					overflow: "auto",
					background: "#0a0a0e",
					border: "2px solid #cc4444",
					borderRadius: 8,
					padding: 24,
				}}
			>
				<h1
					style={{
						margin: "0 0 8px 0",
						fontSize: 18,
						letterSpacing: "0.1em",
						textTransform: "uppercase",
					}}
				>
					FATAL ERROR
				</h1>
				<p
					style={{
						margin: "0 0 4px 0",
						fontSize: 11,
						color: "#666",
					}}
				>
					Source: {error.source} |{" "}
					{new Date(error.timestamp).toLocaleTimeString()}
				</p>
				<p
					style={{
						margin: "0 0 16px 0",
						fontSize: 14,
						color: "#ffaaaa",
						lineHeight: 1.5,
					}}
				>
					{error.message}
				</p>
				<pre
					style={{
						margin: 0,
						fontSize: 11,
						color: "#888",
						whiteSpace: "pre-wrap",
						wordBreak: "break-all",
						lineHeight: 1.4,
						maxHeight: 400,
						overflow: "auto",
						background: "#050508",
						padding: 12,
						borderRadius: 4,
						border: "1px solid #222",
					}}
				>
					{error.stack}
				</pre>
				<button
					type="button"
					onClick={() => window.location.reload()}
					style={{
						marginTop: 16,
						padding: "10px 24px",
						background: "#cc4444",
						color: "#000",
						border: "none",
						borderRadius: 4,
						fontSize: 13,
						fontWeight: "bold",
						cursor: "pointer",
						letterSpacing: "0.1em",
						textTransform: "uppercase",
					}}
				>
					Reload Game
				</button>
			</div>
		</div>
	);
}

/**
 * FatalErrorGate — drop this at the app root.
 * Catches React errors via boundary + WebGL/global errors via interceptor.
 */
export function FatalErrorGate({ children }: { children: ReactNode }) {
	const globalError = useFatalErrors();

	if (globalError) {
		return <FatalErrorOverlay error={globalError} />;
	}

	return <FatalErrorBoundary>{children}</FatalErrorBoundary>;
}
