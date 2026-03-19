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
import { subscribe } from "../../ecs/gameState";
import {
	ADJACENCY_RULES,
	type AdjacencyBonus,
	BUILDING_COSTS,
	cancelPlacement,
	computeAdjacencyBonuses,
	getActivePlacement,
	getGhostPosition,
} from "../../systems/buildingPlacement";
import { getResources } from "../../systems/resources";

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

	const canAfford = costs.every((c) => (resources[c.type] ?? 0) >= c.amount);

	return (
		<div
			data-testid="placement-hud"
			style={{
				position: "absolute",
				bottom: 80,
				left: 0,
				right: 0,
				display: "flex",
				alignItems: "center",
				pointerEvents: "none",
			}}
		>
			<div
				style={{
					maxWidth: 360,
					width: "90%",
					borderRadius: 14,
					border: `1px solid ${ghost?.valid ? "rgba(111, 243, 200, 0.35)" : "rgba(255, 120, 120, 0.35)"}`,
					backgroundColor: "rgba(7, 17, 23, 0.94)",
					paddingLeft: 16,
					paddingRight: 16,
					paddingTop: 12,
					paddingBottom: 12,
					pointerEvents: "auto",
				}}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 8,
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: 8,
						}}
					>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: 2,
								color: "#f6c56a",
								textTransform: "uppercase",
							}}
						>
							Placing
						</span>
						<span
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
						</span>
					</div>

					{/* Cancel button */}
					<button
						data-testid="placement-cancel"
						onClick={cancelPlacement}
						aria-label="Cancel placement"
						style={{
							paddingLeft: 10,
							paddingRight: 10,
							paddingTop: 5,
							paddingBottom: 5,
							borderRadius: 6,
							border: "1px solid rgba(255, 120, 120, 0.25)",
							backgroundColor: "transparent",
							minHeight: 28,
							cursor: "pointer",
						}}
					>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: 1,
								color: "#ff9f9f",
								textTransform: "uppercase",
							}}
						>
							Cancel (Esc)
						</span>
					</button>
				</div>

				{/* Cost row */}
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						flexWrap: "wrap",
						gap: 8,
						marginBottom: 6,
					}}
				>
					{costs.map((c) => {
						const have = resources[c.type] ?? 0;
						const enough = have >= c.amount;
						return (
							<div
								key={c.type}
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
									gap: 4,
								}}
							>
								<div
									style={{
										width: 5,
										height: 5,
										borderRadius: 2.5,
										backgroundColor: enough ? "#6ff3c8" : "#ff8f8f",
										flexShrink: 0,
									}}
								/>
								<span
									style={{
										fontFamily: "monospace",
										fontSize: 10,
										color: enough ? "#d0f4ff" : "#ff8f8f",
									}}
								>
									{c.amount} {c.type.replace(/([A-Z])/g, " $1").trim()}
								</span>
							</div>
						);
					})}
				</div>

				{/* Validity status */}
				{ghost && (
					<span
						data-testid="placement-status"
						style={{
							display: "block",
							fontFamily: "monospace",
							fontSize: 10,
							letterSpacing: 1,
							color: ghost.valid && canAfford ? "#6ff3c8" : "#ff8f8f",
							textTransform: "uppercase",
							marginBottom: bonuses.length > 0 ? 8 : 0,
						}}
					>
						{!canAfford
							? "Insufficient resources"
							: ghost.valid
								? "Valid placement — click to confirm"
								: "Invalid position"}
					</span>
				)}

				{/* Adjacency bonuses */}
				{bonuses.length > 0 && (
					<div
						data-testid="adjacency-bonuses"
						style={{
							borderTop: "1px solid rgba(246, 197, 106, 0.15)",
							paddingTop: 8,
						}}
					>
						<span
							style={{
								display: "block",
								fontFamily: "monospace",
								fontSize: 8,
								letterSpacing: 2,
								color: "#f6c56a",
								textTransform: "uppercase",
								marginBottom: 4,
							}}
						>
							Adjacency Bonuses
						</span>
						{bonuses.map((b) => (
							<div
								key={b.sourceType}
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
									gap: 6,
									marginTop: 2,
								}}
							>
								<span
									style={{
										fontFamily: "monospace",
										fontSize: 11,
										color: "#6ff3c8",
										fontWeight: "600",
									}}
								>
									+{Math.round(b.factor * 100)}%
								</span>
								<span
									style={{
										fontFamily: "monospace",
										fontSize: 10,
										color: "rgba(255, 255, 255, 0.6)",
									}}
								>
									{b.label}
								</span>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
