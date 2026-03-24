/**
 * React error boundary for the game.
 *
 * Dev: shows full error stack + context + reload button.
 * Prod: shows user-friendly message + reload button.
 * Always logs via logError() for the DebugOverlay / future reporting.
 */

import { Component, type ReactNode } from "react";
import { logError } from "../../errors";

const IS_DEV = import.meta.env.DEV;

interface Props {
	children: ReactNode;
}

interface State {
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		logError(error);
		console.error("ErrorBoundary caught:", error, info.componentStack);
	}

	handleReload = () => {
		window.location.reload();
	};

	render() {
		const { error } = this.state;
		if (!error) return this.props.children;

		return (
			<div
				style={{
					position: "fixed",
					inset: 0,
					background: "#0a0a0a",
					color: "#ff4444",
					fontFamily: "monospace",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					padding: 32,
					zIndex: 99999,
				}}
			>
				<h1 style={{ fontSize: 24, marginBottom: 16, color: "#ff6666" }}>
					{IS_DEV ? "Game Error" : "Something went wrong"}
				</h1>

				{IS_DEV && (
					<div
						style={{
							background: "#1a1a1a",
							border: "1px solid #ff4444",
							borderRadius: 4,
							padding: 16,
							maxWidth: 700,
							maxHeight: 400,
							overflow: "auto",
							marginBottom: 24,
							width: "100%",
						}}
					>
						<div
							style={{
								color: "#ff8888",
								fontSize: 14,
								marginBottom: 8,
								fontWeight: "bold",
							}}
						>
							{error.name}: {error.message}
						</div>
						<pre
							style={{
								color: "#aaa",
								fontSize: 11,
								lineHeight: "16px",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								margin: 0,
							}}
						>
							{error.stack}
						</pre>
					</div>
				)}

				{!IS_DEV && (
					<p
						style={{
							color: "#aaa",
							fontSize: 14,
							marginBottom: 24,
							textAlign: "center",
						}}
					>
						The game encountered an error and needs to restart.
					</p>
				)}

				<button
					type="button"
					onClick={this.handleReload}
					style={{
						background: "#ff4444",
						color: "#000",
						border: "none",
						borderRadius: 4,
						padding: "12px 32px",
						fontSize: 16,
						fontFamily: "monospace",
						cursor: "pointer",
						fontWeight: "bold",
					}}
				>
					Reload Game
				</button>
			</div>
		);
	}
}
