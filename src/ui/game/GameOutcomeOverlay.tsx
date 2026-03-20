import { useEffect, useState } from "react";
import { getCameraControls } from "../../camera";
import type { GameOutcome } from "../../systems";

type GameOutcomeOverlayProps = {
	outcome: GameOutcome;
	turn: number;
	onReturnToMenu: () => void;
};

const TITLES: Record<string, string> = {
	domination: "ALL RIVALS ELIMINATED",
	network_supremacy: "SIGNAL DOMINANCE ACHIEVED",
	reclamation: "ECUMENOPOLIS RECLAIMED",
	transcendence: "WORMHOLE STABILIZED",
	cult_eradication: "CULT THREAT NEUTRALIZED",
	score: "CYCLE LIMIT REACHED",
	elimination: "RELAY LOST",
};

const DESCRIPTIONS: Record<string, string> = {
	domination:
		"Every rival machine consciousness has been wiped from Syntheteria. The sector is yours alone.",
	network_supremacy:
		"Signal coverage blankets the ecumenopolis. Every tile hears your broadcast.",
	reclamation:
		"The planet's surface transforms under your directive. Roboforming is nearly complete.",
	transcendence:
		"The path is open. Spacetime bends to your signal. Transcendence achieved.",
	cult_eradication:
		"Every cult structure lies in ruins. The human remnant threat is ended.",
	score:
		"Cycle cap reached. Final tallies computed. The dominant faction prevails.",
	elimination: "All relay nodes destroyed. Signal propagation terminated.",
};

/**
 * Victory-specific color washes — each win path gets a distinct visual identity.
 * Returns [accentColor, radialGradientCenter, radialGradientEdge].
 */
function getOutcomeTheme(reason: string): {
	accent: string;
	washCenter: string;
	washEdge: string;
} {
	switch (reason) {
		case "domination":
			return {
				accent: "#ff9944",
				washCenter: "rgba(255,102,0,0.25)",
				washEdge: "rgba(3,3,8,0.92)",
			};
		case "network_supremacy":
			return {
				accent: "#44ddff",
				washCenter: "rgba(68,221,255,0.2)",
				washEdge: "rgba(3,3,8,0.92)",
			};
		case "reclamation":
			return {
				accent: "#7ee7cb",
				washCenter: "rgba(126,231,203,0.18)",
				washEdge: "rgba(3,3,8,0.92)",
			};
		case "transcendence":
			return {
				accent: "#cc88ff",
				washCenter: "rgba(160,80,255,0.35)",
				washEdge: "rgba(3,3,8,0.90)",
			};
		case "cult_eradication":
			return {
				accent: "#ffd700",
				washCenter: "rgba(255,215,0,0.2)",
				washEdge: "rgba(3,3,8,0.92)",
			};
		case "score":
			return {
				accent: "#ffffff",
				washCenter: "rgba(200,200,255,0.25)",
				washEdge: "rgba(3,3,8,0.92)",
			};
		case "elimination":
			return {
				accent: "#cc4444",
				washCenter: "rgba(204,0,0,0.3)",
				washEdge: "rgba(3,3,8,0.95)",
			};
		default:
			return {
				accent: "#7ee7cb",
				washCenter: "rgba(126,231,203,0.15)",
				washEdge: "rgba(3,3,8,0.92)",
			};
	}
}

export function GameOutcomeOverlay({
	outcome,
	turn,
	onReturnToMenu,
}: GameOutcomeOverlayProps) {
	const [fadeIn, setFadeIn] = useState(false);

	// Trigger camera zoom-out and fade-in animation on mount
	useEffect(() => {
		if (outcome.result === "playing") return;

		// Zoom camera out to max distance for cinematic wide shot
		const cam = getCameraControls();
		if (cam) cam.setZoom(100);

		// Fade in the overlay after a brief delay (let zoom begin first)
		const timer = setTimeout(() => setFadeIn(true), 300);
		return () => clearTimeout(timer);
	}, [outcome.result]);

	if (outcome.result === "playing") return null;

	const isVictory = outcome.result === "victory";
	const title = TITLES[outcome.reason] ?? outcome.reason;
	const description = DESCRIPTIONS[outcome.reason] ?? "";
	const theme = getOutcomeTheme(outcome.reason);

	return (
		<div
			data-testid="game-outcome-overlay"
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				background: `radial-gradient(ellipse at center, ${theme.washCenter} 0%, ${theme.washEdge} 70%)`,
				zIndex: 100,
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				opacity: fadeIn ? 1 : 0,
				transition: "opacity 1.5s ease-in",
			}}
		>
			{/* Victory type icon — simple text glyph */}
			<div
				style={{
					fontSize: 48,
					color: theme.accent,
					marginBottom: 16,
					opacity: 0.6,
					textShadow: `0 0 40px ${theme.accent}`,
				}}
			>
				{isVictory ? "\u2726" : "\u2715"}
			</div>
			<h1
				data-testid="outcome-title"
				style={{
					fontSize: 32,
					letterSpacing: "0.3em",
					color: theme.accent,
					margin: 0,
					textTransform: "uppercase",
					textShadow: `0 0 20px ${theme.accent}`,
				}}
			>
				{title}
			</h1>
			<p
				style={{
					fontSize: 14,
					color: "rgba(139,230,255,0.7)",
					marginTop: 16,
					letterSpacing: "0.1em",
					maxWidth: 400,
					textAlign: "center",
				}}
			>
				{description}
			</p>
			<p
				data-testid="outcome-turn"
				style={{
					fontSize: 12,
					color: "rgba(139,230,255,0.5)",
					marginTop: 8,
					letterSpacing: "0.15em",
				}}
			>
				CYCLE {turn}
			</p>
			<button
				type="button"
				data-testid="return-to-menu-btn"
				onClick={onReturnToMenu}
				style={{
					marginTop: 32,
					padding: "10px 28px",
					background: "transparent",
					border: `1px solid ${theme.accent}`,
					borderRadius: 4,
					color: theme.accent,
					fontFamily: "inherit",
					fontSize: 13,
					letterSpacing: "0.2em",
					textTransform: "uppercase",
					cursor: "pointer",
				}}
			>
				Disconnect
			</button>
		</div>
	);
}
