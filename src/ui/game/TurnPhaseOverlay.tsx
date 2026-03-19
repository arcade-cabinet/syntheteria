/**
 * TurnPhaseOverlay — visual feedback during turn transitions.
 *
 * Shows:
 *   1. A brief border pulse when the player ends their turn
 *   2. Phase labels: "Player Phase" / "AI Phase: [faction]" / "Environment Phase" / "New Turn"
 *   3. Turn counter animation on new turn
 *
 * Each phase label appears for ~1.5 seconds then fades out.
 * The overlay is purely visual — it does not block interaction.
 *
 * Ported from pending/ui/panels/TurnPhaseOverlay.tsx — rewired to local turnPhaseEvents.
 */

import { useEffect, useRef, useState } from "react";
import { FACTION_COLORS_CSS } from "../../config/gameDefaults";
import {
	subscribeTurnPhaseEvents,
	type TurnEvent,
} from "./turnPhaseEvents";

// ─── Phase Label ─────────────────────────────────────────────────────────────

interface PhaseLabel {
	id: number;
	text: string;
	color: string;
	subtext?: string;
}

let nextLabelId = 0;

function PhaseLabelItem({
	label,
	onDone,
}: {
	label: PhaseLabel;
	onDone: () => void;
}) {
	const [opacity, setOpacity] = useState(0);
	const [translateY, setTranslateY] = useState(8);

	useEffect(() => {
		// Fade in
		const t1 = setTimeout(() => {
			setOpacity(1);
			setTranslateY(0);
		}, 16);
		// Fade out after hold
		const t2 = setTimeout(() => {
			setOpacity(0);
			setTranslateY(-8);
		}, 200 + 1200);
		// Remove after full animation
		const t3 = setTimeout(
			() => {
				onDone();
			},
			200 + 1200 + 300,
		);

		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			clearTimeout(t3);
		};
	}, [onDone]);

	return (
		<div
			style={{
				opacity,
				transform: `translateY(${translateY}px)`,
				transition: "opacity 200ms ease, transform 200ms ease",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 2,
			}}
		>
			<span
				style={{
					fontFamily: "monospace",
					fontSize: 13,
					fontWeight: "700",
					letterSpacing: 4,
					color: label.color,
					textTransform: "uppercase",
					textShadow: `0 0 12px ${label.color}44`,
				}}
			>
				{label.text}
			</span>
			{label.subtext && (
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 9,
						letterSpacing: 2,
						color: "rgba(255, 255, 255, 0.5)",
						textTransform: "uppercase",
					}}
				>
					{label.subtext}
				</span>
			)}
		</div>
	);
}

// ─── Border Pulse ────────────────────────────────────────────────────────────

function BorderPulse({ active, color }: { active: boolean; color: string }) {
	const [opacity, setOpacity] = useState(0);

	useEffect(() => {
		if (active) {
			setOpacity(0.6);
			const t = setTimeout(() => setOpacity(0), 150);
			return () => clearTimeout(t);
		}
	}, [active]);

	if (!active) return null;

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				borderWidth: 2,
				borderStyle: "solid",
				borderColor: color,
				borderRadius: 0,
				opacity,
				transition: "opacity 500ms ease",
				pointerEvents: "none",
			}}
		/>
	);
}

// ─── Turn Counter Badge ──────────────────────────────────────────────────────

function TurnCounterBadge({ turnNumber }: { turnNumber: number }) {
	const [scale, setScale] = useState(1);
	const prevTurn = useRef(turnNumber);

	useEffect(() => {
		if (turnNumber !== prevTurn.current) {
			prevTurn.current = turnNumber;
			setScale(1.3);
			const t = setTimeout(() => setScale(1), 150);
			return () => clearTimeout(t);
		}
	}, [turnNumber]);

	return (
		<div
			style={{
				transform: `scale(${scale})`,
				transition: "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
				display: "flex",
				alignItems: "center",
			}}
		>
			<span
				style={{
					fontFamily: "monospace",
					fontSize: 28,
					fontWeight: "700",
					color: "#d4b0ff",
					letterSpacing: 2,
					textShadow: "0 0 16px #b088d844",
				}}
			>
				{turnNumber}
			</span>
		</div>
	);
}

// ─── Main Overlay ────────────────────────────────────────────────────────────

export function TurnPhaseOverlay() {
	const [labels, setLabels] = useState<PhaseLabel[]>([]);
	const [pulseActive, setPulseActive] = useState(false);
	const [pulseColor, setPulseColor] = useState("#8be6ff");
	const [showTurnCounter, setShowTurnCounter] = useState(false);
	const [turnNumber, setTurnNumber] = useState(0);
	const turnCounterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const unsub = subscribeTurnPhaseEvents((event: TurnEvent) => {
			if (event.type === "phase_change") {
				const { toPhase, activeFaction } = event;

				if (toPhase === "ai_faction" && activeFaction) {
					// Only show the first AI faction label, not all 4
					if (activeFaction === "reclaimers") {
						const color = FACTION_COLORS_CSS[activeFaction] ?? "#f6c56a";
						const id = nextLabelId++;
						setLabels((prev) => [
							...prev,
							{
								id,
								text: "Rival Signal Phase",
								color,
								subtext: "Hostile processes executing",
							},
						]);
					}
				} else if (toPhase === "environment") {
					const id = nextLabelId++;
					setLabels((prev) => [
						...prev,
						{
							id,
							text: "Sector Phase",
							color: "#f6c56a",
							subtext: "Storm, incursions, fabrication",
						},
					]);
				} else if (toPhase === "player" && event.fromPhase === "environment") {
					// Returning to player after full cycle
					const id = nextLabelId++;
					setLabels((prev) => [
						...prev,
						{
							id,
							text: "Your Cycle",
							color: "#7ee7cb",
						},
					]);
				}

				// Border pulse on leaving player phase
				if (event.fromPhase === "player" && toPhase === "ai_faction") {
					setPulseColor("#8be6ff");
					setPulseActive(true);
					setTimeout(() => setPulseActive(false), 700);
				}
			}

			if (event.type === "new_turn") {
				setTurnNumber(event.turnNumber);
				setShowTurnCounter(true);
				if (turnCounterTimeout.current) {
					clearTimeout(turnCounterTimeout.current);
				}
				turnCounterTimeout.current = setTimeout(() => {
					setShowTurnCounter(false);
				}, 2000);
			}
		});

		return () => {
			unsub();
			if (turnCounterTimeout.current) {
				clearTimeout(turnCounterTimeout.current);
			}
		};
	}, []);

	const removeLabel = (id: number) => {
		setLabels((prev) => prev.filter((l) => l.id !== id));
	};

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 40,
				pointerEvents: "none",
			}}
		>
			{/* Border pulse */}
			<BorderPulse active={pulseActive} color={pulseColor} />

			{/* Phase labels — centered, stacked */}
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top: "40%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 8,
				}}
			>
				{labels.map((label) => (
					<PhaseLabelItem
						key={label.id}
						label={label}
						onDone={() => removeLabel(label.id)}
					/>
				))}
			</div>

			{/* Turn counter badge on new turn */}
			{showTurnCounter && turnNumber > 0 && (
				<div
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						top: "32%",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
					}}
				>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 9,
							letterSpacing: 3,
							color: "rgba(176, 136, 216, 0.6)",
							textTransform: "uppercase",
							marginBottom: 4,
						}}
					>
						Cycle
					</span>
					<TurnCounterBadge turnNumber={turnNumber} />
				</div>
			)}
		</div>
	);
}
