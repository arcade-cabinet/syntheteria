/**
 * HarvestNotifications — 2D HUD overlay showing recent harvest yields.
 *
 * Renders floating notification cards for recently completed harvests.
 * Shows material gains with amber accent (harvest = infrastructure).
 * Auto-dismisses after 3 seconds (events expire in harvestEvents.ts).
 */

import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import {
	getHarvestYieldEvents,
	subscribeHarvestEvents,
} from "../../systems/harvestEvents";
import {
	HARVEST_RESOURCE_COLORS,
	HARVEST_RESOURCE_LABELS,
} from "../../systems/resourcePools";

function getSnapshotFn() {
	return getHarvestYieldEvents();
}

export function HarvestNotifications() {
	const events = useSyncExternalStore(subscribeHarvestEvents, getSnapshotFn);

	if (events.length === 0) return null;

	return (
		<View
			style={{
				position: "absolute",
				left: 16,
				bottom: 80,
				gap: 8,
				pointerEvents: "none",
			}}
		>
			{events.slice(0, 3).map((event) => (
				<View
					key={event.id}
					style={{
						minWidth: 200,
						borderRadius: 12,
						borderWidth: 1,
						borderColor: "rgba(246, 197, 106, 0.25)",
						backgroundColor: "rgba(12, 16, 20, 0.92)",
						paddingHorizontal: 14,
						paddingVertical: 10,
					}}
				>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 9,
							color: "#f6c56a",
							letterSpacing: 2,
							textTransform: "uppercase",
							marginBottom: 4,
						}}
					>
						Harvest Complete
					</Text>
					{event.yields.map((y) => (
						<View
							key={y.resource}
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: 6,
								marginTop: 2,
							}}
						>
							<View
								style={{
									width: 5,
									height: 5,
									borderRadius: 2.5,
									backgroundColor: HARVEST_RESOURCE_COLORS[y.resource],
								}}
							/>
							<Text
								style={{
									fontFamily: "monospace",
									fontSize: 11,
									color: "#89d9ff",
									fontWeight: "600",
								}}
							>
								+{y.amount}
							</Text>
							<Text
								style={{
									fontFamily: "monospace",
									fontSize: 10,
									color: "rgba(255, 255, 255, 0.5)",
									letterSpacing: 0.5,
									textTransform: "uppercase",
								}}
							>
								{HARVEST_RESOURCE_LABELS[y.resource]}
							</Text>
						</View>
					))}
				</View>
			))}
		</View>
	);
}
