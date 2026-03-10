/**
 * ErrorBoundary — catches runtime crashes (WebGL context loss, WASM load
 * failure, etc.) and shows a recovery UI instead of a white screen.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, error: null };

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[Syntheteria] Crash:", error, info.componentStack);
	}

	handleReload = () => {
		window.location.reload();
	};

	handleRetry = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (!this.state.hasError) {
			return this.props.children;
		}

		const msg = this.state.error?.message ?? "Unknown error";
		const isWebGL =
			msg.includes("WebGL") ||
			msg.includes("context") ||
			msg.includes("GPU");

		return (
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "#000",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "'Courier New', monospace",
					color: "#00ffaa",
					padding: "24px",
					textAlign: "center",
				}}
			>
				<div
					style={{
						fontSize: "clamp(24px, 5vw, 36px)",
						fontWeight: "bold",
						letterSpacing: "0.2em",
						marginBottom: "16px",
						textShadow: "0 0 20px rgba(0,255,170,0.4)",
					}}
				>
					SYSTEM FAULT
				</div>

				<div
					style={{
						fontSize: "clamp(12px, 2.5vw, 14px)",
						color: "rgba(0,255,170,0.6)",
						maxWidth: "400px",
						lineHeight: 1.6,
						marginBottom: "24px",
					}}
				>
					{isWebGL
						? "Graphics subsystem lost. Your GPU may have reset or the browser tab ran out of memory."
						: `Runtime error: ${msg.slice(0, 120)}`}
				</div>

				<div style={{ display: "flex", gap: "12px" }}>
					<button
						onClick={this.handleRetry}
						style={{
							background: "transparent",
							border: "1px solid rgba(0,255,170,0.4)",
							borderRadius: "4px",
							color: "#00ffaa",
							fontFamily: "'Courier New', monospace",
							fontSize: "14px",
							padding: "10px 24px",
							cursor: "pointer",
							letterSpacing: "0.15em",
						}}
					>
						RETRY
					</button>
					<button
						onClick={this.handleReload}
						style={{
							background: "rgba(0,255,170,0.1)",
							border: "1px solid #00ffaa",
							borderRadius: "4px",
							color: "#00ffaa",
							fontFamily: "'Courier New', monospace",
							fontSize: "14px",
							padding: "10px 24px",
							cursor: "pointer",
							letterSpacing: "0.15em",
						}}
					>
						REBOOT
					</button>
				</div>
			</div>
		);
	}
}
