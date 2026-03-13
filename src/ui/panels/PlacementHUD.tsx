/**
 * PlacementHUD — 2D overlay shown during building placement mode.
 *
 * Shows:
 *   - Building type being placed
 *   - Valid/invalid status
 *   - Resource cost
 *   - Adjacency bonus indicators when near strategic placements
 *   - Cancel instruction
 *
 * Uses data from buildingPlacement.ts system.
 */

import { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import {
	ADJACENCY_RULES,
	BUILDING_COSTS,
	cancelPlacement,
	computeAdjacencyBonuses,
	getActivePlacement,
	getGhostPosition,
	type AdjacencyBonus,
} from "../../systems/buildingPlacement";
import { getResources } from "../../systems/resources";
import { subscribe } from "../../ecs/gameState";

function getPlacementType() {
	return getActivePlacement();
}

export function PlacementHUD() {
	const type = useSyncExternalStore(subscribe, getPlacementType);

	if (!type) return null;

	const ghost = getGhostPosition();
	const resources = getResources();
	const costs = BUILDING_COSTS[type] ?? [];
	const hasRules = ADJACENCY_RULES[type] !== undefined;

	// Compute adjacency bonuses if ghost is positioned
	let bonuses: AdjacencyBonus[] = [];
	if (ghost && hasRules) {
		bonuses = computeAdjacencyBonuses(type, ghost.x, ghost.z);
	}

	const canAfford = costs.every(
		(c) => (resources[c.type] ?? 0) >= c.amount,
	);

	return (
		<View
			testID="placement-hud"
			style={{
				position: "absolute",
				bottom: 80,
				left: 0,
				right: 0,
				alignItems: "center",
				pointerEvents: "box-none",
			}}
		>
			<View
				style={{
					maxWidth: 360,
					width: "90%",
					borderRadius: 14,
					borderWidth: 1,
					borderColor: ghost?.valid
						? "rgba(111, 243, 200, 0.35)"
						: "rgba(255, 120, 120, 0.35)",
					backgroundColor: "rgba(7, 17, 23, 0.94)",
					paddingHorizontal: 16,
					paddingVertical: 12,
					pointerEvents: "auto",
				}}
			>
				{/* Header */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 8,
					}}
				>
					<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: 2,
								color: "#f6c56a",
								textTransform: "uppercase",
							}}
						>
							Placing
						</Text>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 13,
								fontWeight: "700",
								color: "#ffe9b0",
								textTransform: "uppercase",
								letterSpacing: 1,
							}}
						>
							{type.replace(/_/g, " ")}
						</Text>
					</View>

					{/* Cancel button */}
					<Pressable
						testID="placement-cancel"
						onPress={cancelPlacement}
						accessibilityLabel="Cancel placement"
						accessibilityRole="button"
						style={({ pressed }) => ({
							paddingHorizontal: 10,
							paddingVertical: 5,
							borderRadius: 6,
							borderWidth: 1,
							borderColor: pressed
								? "rgba(255, 120, 120, 0.5)"
								: "rgba(255, 120, 120, 0.25)",
							backgroundColor: pressed
								? "rgba(255, 120, 120, 0.1)"
								: "transparent",
							minHeight: 28,
							justifyContent: "center",
						})}
					>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: 1,
								color: "#ff9f9f",
								textTransform: "uppercase",
							}}
						>
							Cancel (Esc)
						</Text>
					</Pressable>
				</View>

				{/* Cost row */}
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
					{costs.map((c) => {
						const have = resources[c.type] ?? 0;
						const enough = have >= c.amount;
						return (
							<View
								key={c.type}
								style={{
									flexDirection: "row",
									alignItems: "center",
									gap: 4,
								}}
							>
								<View
									style={{
										width: 5,
										height: 5,
										borderRadius: 2.5,
										backgroundColor: enough ? "#6ff3c8" : "#ff8f8f",
									}}
								/>
								<Text
									style={{
										fontFamily: "monospace",
										fontSize: 10,
										color: enough ? "#d0f4ff" : "#ff8f8f",
									}}
								>
									{c.amount} {c.type.replace(/([A-Z])/g, " $1").trim()}
								</Text>
							</View>
						);
					})}
				</View>

				{/* Validity status */}
				{ghost && (
					<Text
						testID="placement-status"
						style={{
							fontFamily: "monospace",
							fontSize: 10,
							letterSpacing: 1,
							color: ghost.valid && canAfford
								? "#6ff3c8"
								: "#ff8f8f",
							textTransform: "uppercase",
							marginBottom: bonuses.length > 0 ? 8 : 0,
						}}
					>
						{!canAfford
							? "Insufficient resources"
							: ghost.valid
								? "Valid placement — click to confirm"
								: "Invalid position"}
					</Text>
				)}

				{/* Adjacency bonuses */}
				{bonuses.length > 0 && (
					<View
						testID="adjacency-bonuses"
						style={{
							borderTopWidth: 1,
							borderTopColor: "rgba(246, 197, 106, 0.15)",
							paddingTop: 8,
						}}
					>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 8,
								letterSpacing: 2,
								color: "#f6c56a",
								textTransform: "uppercase",
								marginBottom: 4,
							}}
						>
							Adjacency Bonuses
						</Text>
						{bonuses.map((b) => (
							<View
								key={b.sourceType}
								style={{
									flexDirection: "row",
									alignItems: "center",
									gap: 6,
									marginTop: 2,
								}}
							>
								<Text
									style={{
										fontFamily: "monospace",
										fontSize: 11,
										color: "#6ff3c8",
										fontWeight: "600",
									}}
								>
									+{Math.round(b.factor * 100)}%
								</Text>
								<Text
									style={{
										fontFamily: "monospace",
										fontSize: 10,
										color: "rgba(255, 255, 255, 0.6)",
									}}
								>
									{b.label}
								</Text>
							</View>
						))}
					</View>
				)}
			</View>
		</View>
	);
}
