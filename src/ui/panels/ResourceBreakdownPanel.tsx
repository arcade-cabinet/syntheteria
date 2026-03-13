/**
 * ResourceBreakdownPanel — full resource breakdown for the slide-out panel.
 *
 * Shows all resource types with current amounts AND per-turn deltas
 * (income/expenditure from the last completed turn).
 *
 * Uses the brand palette: amber for material labels, cyan for values,
 * green for income, red for expenditure.
 */

import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import {
	getResourceDeltas,
	subscribeResourceDeltas,
	type ResourceDelta,
} from "../../systems/resourceDeltas";
import type { ResourcePool } from "../../systems/resources";

interface MaterialRowProps {
	label: string;
	value: number;
	iconColor: string;
	delta: ResourceDelta | undefined;
}

function MaterialRow({ label, value, iconColor, delta }: MaterialRowProps) {
	const hasIncome = delta && delta.income > 0;
	const hasExpenditure = delta && delta.expenditure > 0;

	return (
		<View
			style={{
				flexDirection: "row",
				justifyContent: "space-between",
				alignItems: "center",
				paddingVertical: 3,
			}}
		>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: 6,
					flex: 1,
				}}
			>
				<View
					style={{
						width: 6,
						height: 6,
						borderRadius: 3,
						backgroundColor: iconColor,
					}}
				/>
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 10,
						color: "rgba(255, 255, 255, 0.55)",
						letterSpacing: 1,
						textTransform: "uppercase",
					}}
					numberOfLines={1}
				>
					{label}
				</Text>
			</View>

			{/* Delta indicators */}
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: 6,
				}}
			>
				{hasIncome && (
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 10,
							color: "#6ff3c8",
							fontWeight: "600",
							letterSpacing: 0.3,
						}}
					>
						+{delta.income}
					</Text>
				)}
				{hasExpenditure && (
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 10,
							color: "#ff8f8f",
							fontWeight: "600",
							letterSpacing: 0.3,
						}}
					>
						-{delta.expenditure}
					</Text>
				)}
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 11,
						color:
							value > 0
								? "#89d9ff"
								: "rgba(255, 255, 255, 0.25)",
						fontWeight: "600",
						letterSpacing: 0.5,
						minWidth: 28,
						textAlign: "right",
					}}
				>
					{value}
				</Text>
			</View>
		</View>
	);
}

function SectionHeader({ label }: { label: string }) {
	return (
		<Text
			style={{
				fontFamily: "monospace",
				fontSize: 9,
				color: "#f6c56a",
				letterSpacing: 1.5,
				textTransform: "uppercase",
				marginTop: 8,
				marginBottom: 2,
			}}
		>
			{label}
		</Text>
	);
}

/** Urban mining materials — the 8 harvest resource types */
const URBAN_MINING_ROWS: {
	key: keyof ResourcePool;
	label: string;
	iconColor: string;
}[] = [
	{ key: "ferrousScrap", label: "Ferrous Scrap", iconColor: "#c8a070" },
	{ key: "alloyStock", label: "Alloy Stock", iconColor: "#b0c4d8" },
	{ key: "polymerSalvage", label: "Polymer Salvage", iconColor: "#a0d080" },
	{ key: "conductorWire", label: "Conductor Wire", iconColor: "#f6c56a" },
	{ key: "electrolyte", label: "Electrolyte", iconColor: "#88a7ff" },
	{ key: "siliconWafer", label: "Silicon Wafer", iconColor: "#b088d8" },
	{ key: "stormCharge", label: "Storm Charge", iconColor: "#ff8f8f" },
	{ key: "elCrystal", label: "EL Crystal", iconColor: "#d4a0ff" },
];

/** Legacy scavenge resources */
const SCAVENGE_ROWS: {
	key: keyof ResourcePool;
	label: string;
	iconColor: string;
}[] = [
	{ key: "scrapMetal", label: "Scrap Metal", iconColor: "#a0a0a0" },
	{ key: "eWaste", label: "E-Waste", iconColor: "#89d9ff" },
	{ key: "intactComponents", label: "Components", iconColor: "#7ee7cb" },
];

export function ResourceBreakdownPanel() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const deltas = useSyncExternalStore(
		subscribeResourceDeltas,
		getResourceDeltas,
	);
	const res = snap.resources;

	return (
		<View style={{ gap: 1 }}>
			{deltas && (
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 8,
						color: "rgba(255, 255, 255, 0.3)",
						letterSpacing: 1,
						textTransform: "uppercase",
						marginBottom: 4,
					}}
				>
					Per-turn deltas shown
				</Text>
			)}
			<SectionHeader label="Urban Mining" />
			{URBAN_MINING_ROWS.map((mat) => (
				<MaterialRow
					key={mat.key}
					label={mat.label}
					value={(res[mat.key] as number) ?? 0}
					iconColor={mat.iconColor}
					delta={deltas?.[mat.key]}
				/>
			))}
			<SectionHeader label="Scavenge" />
			{SCAVENGE_ROWS.map((mat) => (
				<MaterialRow
					key={mat.key}
					label={mat.label}
					value={(res[mat.key] as number) ?? 0}
					iconColor={mat.iconColor}
					delta={deltas?.[mat.key]}
				/>
			))}
		</View>
	);
}
