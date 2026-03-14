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
 */

import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Text, View } from "react-native";
import {
	subscribeTurnEvents,
	type TurnEvent,
} from "../../systems/turnPhaseEvents";

// ─── Faction Display Names ──────────────────────────────────────────────────

const _FACTION_NAMES: Record<string, string> = {
	reclaimers: "Reclaimers",
	volt_collective: "Volt Collective",
	signal_choir: "Signal Choir",
	iron_creed: "Iron Creed",
};

const FACTION_COLORS: Record<string, string> = {
	reclaimers: "#f6c56a",
	volt_collective: "#8be6ff",
	signal_choir: "#b088d8",
	iron_creed: "#ff8f8f",
};

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
	const opacity = useRef(new Animated.Value(0)).current;
	const translateY = useRef(new Animated.Value(8)).current;

	useEffect(() => {
		Animated.sequence([
			// Fade in
			Animated.parallel([
				Animated.timing(opacity, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.timing(translateY, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
			]),
			// Hold
			Animated.delay(1200),
			// Fade out
			Animated.parallel([
				Animated.timing(opacity, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.timing(translateY, {
					toValue: -8,
					duration: 300,
					useNativeDriver: true,
				}),
			]),
		]).start(() => onDone());
	}, [opacity, translateY, onDone]);

	return (
		<Animated.View
			style={{
				opacity,
				transform: [{ translateY }],
				alignItems: "center",
				gap: 2,
			}}
		>
			<Text
				style={{
					fontFamily: "monospace",
					fontSize: 13,
					fontWeight: "700",
					letterSpacing: 4,
					color: label.color,
					textTransform: "uppercase",
					textShadowColor: `${label.color}44`,
					textShadowOffset: { width: 0, height: 0 },
					textShadowRadius: 12,
				}}
			>
				{label.text}
			</Text>
			{label.subtext && (
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 9,
						letterSpacing: 2,
						color: "rgba(255, 255, 255, 0.5)",
						textTransform: "uppercase",
					}}
				>
					{label.subtext}
				</Text>
			)}
		</Animated.View>
	);
}

// ─── Border Pulse ────────────────────────────────────────────────────────────

function BorderPulse({ active, color }: { active: boolean; color: string }) {
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (active) {
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: 0.6,
					duration: 150,
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 0,
					duration: 500,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [active, opacity]);

	if (!active) return null;

	return (
		<Animated.View
			pointerEvents="none"
			style={{
				position: "absolute",
				inset: 0,
				borderWidth: 2,
				borderColor: color,
				borderRadius: 0,
				opacity,
			}}
		/>
	);
}

// ─── Turn Counter Badge ──────────────────────────────────────────────────────

function TurnCounterBadge({ turnNumber }: { turnNumber: number }) {
	const scale = useRef(new Animated.Value(1)).current;
	const prevTurn = useRef(turnNumber);

	useEffect(() => {
		if (turnNumber !== prevTurn.current) {
			prevTurn.current = turnNumber;
			Animated.sequence([
				Animated.timing(scale, {
					toValue: 1.3,
					duration: 150,
					useNativeDriver: true,
				}),
				Animated.spring(scale, {
					toValue: 1,
					damping: 8,
					stiffness: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [turnNumber, scale]);

	return (
		<Animated.View
			style={{
				transform: [{ scale }],
				alignItems: "center",
			}}
		>
			<Text
				style={{
					fontFamily: "monospace",
					fontSize: 28,
					fontWeight: "700",
					color: "#d4b0ff",
					letterSpacing: 2,
					textShadowColor: "#b088d844",
					textShadowOffset: { width: 0, height: 0 },
					textShadowRadius: 16,
				}}
			>
				{turnNumber}
			</Text>
		</Animated.View>
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
		const unsub = subscribeTurnEvents((event: TurnEvent) => {
			if (event.type === "phase_change") {
				const { toPhase, activeFaction } = event;

				if (toPhase === "ai_faction" && activeFaction) {
					// Only show the first AI faction label, not all 4
					if (activeFaction === "reclaimers") {
						const color = FACTION_COLORS[activeFaction] ?? "#f6c56a";
						const id = nextLabelId++;
						setLabels((prev) => [
							...prev,
							{
								id,
								text: "AI Phase",
								color,
								subtext: "Rival factions acting",
							},
						]);
					}
				} else if (toPhase === "environment") {
					const id = nextLabelId++;
					setLabels((prev) => [
						...prev,
						{
							id,
							text: "Environment Phase",
							color: "#f6c56a",
							subtext: "Storm, incursions, fabrication",
						},
					]);
				} else if (toPhase === "player" && event.fromPhase === "environment") {
					// Returning to player after full turn cycle
					const id = nextLabelId++;
					setLabels((prev) => [
						...prev,
						{
							id,
							text: "Your Turn",
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
		<View
			pointerEvents="none"
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 40,
			}}
		>
			{/* Border pulse */}
			<BorderPulse active={pulseActive} color={pulseColor} />

			{/* Phase labels — centered, stacked */}
			<View
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top: "40%",
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
			</View>

			{/* Turn counter badge on new turn */}
			{showTurnCounter && turnNumber > 0 && (
				<View
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						top: "32%",
						alignItems: "center",
					}}
				>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 9,
							letterSpacing: 3,
							color: "rgba(176, 136, 216, 0.6)",
							textTransform: "uppercase",
							marginBottom: 4,
						}}
					>
						Turn
					</Text>
					<TurnCounterBadge turnNumber={turnNumber} />
				</View>
			)}
		</View>
	);
}
