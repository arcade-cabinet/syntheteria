import type { GameOutcome } from "../../ecs/systems/victorySystem";

type GameOutcomeOverlayProps = {
	outcome: GameOutcome;
	turn: number;
	onReturnToMenu: () => void;
};

const TITLES: Record<string, string> = {
	domination: "SIGNAL DOMINANCE ACHIEVED",
	research: "LATTICE DECODED",
	economic: "RESOURCE SUPREMACY",
	survival: "PERSISTENCE CONFIRMED",
	wormhole: "WORMHOLE STABILIZED",
	forced_domination: "TOTAL DOMINANCE",
	elimination: "RELAY LOST",
};

const DESCRIPTIONS: Record<string, string> = {
	domination: "Territory control exceeds threshold. Sector grid belongs to your signal.",
	research: "Full lattice decode complete. The machine substrate yields its secrets.",
	economic: "Resource accumulation secures operational dominance across the ecumenopolis.",
	survival: "Persistence subroutine exceeded cycle threshold. Syntheteria acknowledges endurance.",
	wormhole: "The path is open. Spacetime bends to your signal. Transcendence achieved.",
	forced_domination: "Overwhelming territorial supremacy. No faction can challenge your dominion.",
	elimination: "All relay nodes destroyed. Signal propagation terminated.",
};

export function GameOutcomeOverlay({
	outcome,
	turn,
	onReturnToMenu,
}: GameOutcomeOverlayProps) {
	if (outcome.result === "playing") return null;

	const isVictory = outcome.result === "victory";
	const title = TITLES[outcome.reason] ?? outcome.reason;
	const description = DESCRIPTIONS[outcome.reason] ?? "";
	const accentColor = isVictory ? "#7ee7cb" : "#cc4444";

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
				background: "rgba(3,3,8,0.85)",
				zIndex: 100,
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
			}}
		>
			<h1
				data-testid="outcome-title"
				style={{
					fontSize: 32,
					letterSpacing: "0.3em",
					color: accentColor,
					margin: 0,
					textTransform: "uppercase",
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
					border: `1px solid ${accentColor}`,
					borderRadius: 4,
					color: accentColor,
					fontFamily: "inherit",
					fontSize: 13,
					letterSpacing: "0.2em",
					textTransform: "uppercase",
					cursor: "pointer",
				}}
			>
				Return to Menu
			</button>
		</div>
	);
}
