/**
 * Tech Tree UI — Modal overlay showing research options, costs, and progress.
 *
 * Accessible from the hamburger/slide-out panel. Shows all techs organized
 * by tier, with current research progress and available/locked status.
 */

import { useSyncExternalStore } from "react";
import {
	Animated,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import { useEffect, useRef } from "react";
import {
	type TechDefinition,
	type TechStatus,
	getAllTechs,
	getFactionResearchState,
	getResearchProgress,
	getTechStatus,
	startResearch,
	cancelResearch,
	subscribeTechTree,
} from "../systems/techTree";
import { HARVEST_RESOURCE_COLORS, HARVEST_RESOURCE_LABELS } from "../systems/resourcePools";
import type { HarvestResource } from "../systems/resourcePools";

// ─── Tier Labels ─────────────────────────────────────────────────────────────

const TIER_LABELS: Record<number, string> = {
	1: "Foundation",
	2: "Advancement",
	3: "Specialization",
	4: "Mastery",
	5: "Transcendence",
};

const STATUS_COLORS: Record<TechStatus, string> = {
	completed: "#6ff3c8",
	researching: "#8be6ff",
	available: "#f6c56a",
	locked: "#555555",
	unavailable: "#333333",
};

const STATUS_LABELS: Record<TechStatus, string> = {
	completed: "Complete",
	researching: "Researching",
	available: "Available",
	locked: "Locked",
	unavailable: "Unavailable",
};

// ─── Stable snapshot getters (must not create new closures per render) ───────

function getPlayerResearchState() {
	return getFactionResearchState("player");
}

function getPlayerResearchProgress() {
	return getResearchProgress("player");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TechTreeModal({
	visible,
	onClose,
}: {
	visible: boolean;
	onClose: () => void;
}) {
	const { width: vw, height: vh } = useWindowDimensions();
	const fadeAnim = useRef(new Animated.Value(0)).current;

	const researchState = useSyncExternalStore(
		subscribeTechTree,
		getPlayerResearchState,
	);

	const progress = useSyncExternalStore(
		subscribeTechTree,
		getPlayerResearchProgress,
	);

	useEffect(() => {
		Animated.timing(fadeAnim, {
			toValue: visible ? 1 : 0,
			duration: 200,
			useNativeDriver: true,
		}).start();
	}, [visible, fadeAnim]);

	if (!visible) return null;

	const allTechs = getAllTechs();
	const tiers = new Map<number, TechDefinition[]>();
	for (const tech of allTechs) {
		const tier = tiers.get(tech.tier) ?? [];
		tier.push(tech);
		tiers.set(tech.tier, tier);
	}

	const sortedTiers = Array.from(tiers.entries()).sort(
		(a, b) => a[0] - b[0],
	);

	const panelWidth = Math.min(480, vw * 0.92);

	return (
		<Animated.View
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 60,
				opacity: fadeAnim,
				justifyContent: "center",
				alignItems: "center",
			}}
			pointerEvents={visible ? "auto" : "none"}
		>
			{/* Backdrop */}
			<Pressable
				style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)" }}
				onPress={onClose}
				accessibilityLabel="Close tech tree"
			/>

			{/* Panel */}
			<View
				style={{
					width: panelWidth,
					maxHeight: vh * 0.85,
					borderWidth: 1,
					borderColor: "rgba(139, 230, 255, 0.2)",
					borderRadius: 12,
					backgroundColor: "rgba(8, 16, 23, 0.96)",
					overflow: "hidden",
					...(Platform.OS === "web"
						? ({ backdropFilter: "blur(16px)" } as Record<string, string>)
						: {}),
				}}
			>
				{/* Header */}
				<View
					style={{
						paddingHorizontal: 20,
						paddingVertical: 16,
						borderBottomWidth: 1,
						borderBottomColor: "rgba(139, 230, 255, 0.1)",
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<View>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: 2.5,
								color: "rgba(139, 230, 255, 0.5)",
								textTransform: "uppercase",
							}}
						>
							Research
						</Text>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 18,
								fontWeight: "700",
								color: "#d0f4ff",
								letterSpacing: 1,
								marginTop: 2,
							}}
						>
							Tech Tree
						</Text>
					</View>

					{/* Active research indicator */}
					{researchState.activeResearch && (
						<View
							style={{
								borderWidth: 1,
								borderColor: "rgba(139, 230, 255, 0.3)",
								borderRadius: 6,
								paddingHorizontal: 10,
								paddingVertical: 6,
								backgroundColor: "rgba(139, 230, 255, 0.06)",
							}}
						>
							<Text
								style={{
									fontFamily: "monospace",
									fontSize: 8,
									letterSpacing: 1.5,
									color: "rgba(139, 230, 255, 0.6)",
									textTransform: "uppercase",
								}}
							>
								Progress
							</Text>
							<View
								style={{
									marginTop: 4,
									height: 3,
									borderRadius: 2,
									backgroundColor: "rgba(139, 230, 255, 0.15)",
									overflow: "hidden",
								}}
							>
								<View
									style={{
										height: "100%",
										width: `${Math.round(progress * 100)}%`,
										backgroundColor: "#8be6ff",
										borderRadius: 2,
									}}
								/>
							</View>
						</View>
					)}

					<Pressable
						onPress={onClose}
						accessibilityLabel="Close"
						accessibilityRole="button"
						style={{
							width: 36,
							height: 36,
							borderRadius: 6,
							borderWidth: 1,
							borderColor: "rgba(255,255,255,0.1)",
							backgroundColor: "rgba(255,255,255,0.04)",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Text style={{ color: "#8be6ff", fontSize: 16, fontFamily: "monospace" }}>
							x
						</Text>
					</Pressable>
				</View>

				{/* Tech list */}
				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 24 }}
					showsVerticalScrollIndicator={false}
				>
					{sortedTiers.map(([tier, techs]) => (
						<View key={tier}>
							<Text
								style={{
									fontFamily: "monospace",
									fontSize: 9,
									letterSpacing: 2,
									color: "rgba(139, 230, 255, 0.5)",
									textTransform: "uppercase",
									marginBottom: 8,
								}}
							>
								Tier {tier} — {TIER_LABELS[tier] ?? "Advanced"}
							</Text>

							<View style={{ gap: 8 }}>
								{techs.map((tech) => (
									<TechCard
										key={tech.id}
										tech={tech}
										status={getTechStatus("player", tech.id)}
										isActive={researchState.activeResearch === tech.id}
										turnsCompleted={
											researchState.activeResearch === tech.id
												? researchState.turnsCompleted
												: 0
										}
										hasActiveResearch={researchState.activeResearch !== null}
									/>
								))}
							</View>
						</View>
					))}
				</ScrollView>
			</View>
		</Animated.View>
	);
}

// ─── Tech Card ───────────────────────────────────────────────────────────────

function TechCard({
	tech,
	status,
	isActive,
	turnsCompleted,
	hasActiveResearch,
}: {
	tech: TechDefinition;
	status: TechStatus;
	isActive: boolean;
	turnsCompleted: number;
	hasActiveResearch: boolean;
}) {
	const statusColor = STATUS_COLORS[status];
	const canStart = status === "available" && !hasActiveResearch;

	const handlePress = () => {
		if (canStart) {
			startResearch("player", tech.id);
		} else if (isActive) {
			cancelResearch("player");
		}
	};

	return (
		<Pressable
			onPress={handlePress}
			disabled={status === "locked" || status === "unavailable" || status === "completed"}
			accessibilityLabel={`${tech.name}: ${STATUS_LABELS[status]}`}
			accessibilityRole="button"
			style={({ pressed }) => ({
				borderWidth: 1,
				borderColor: isActive
					? "rgba(139, 230, 255, 0.4)"
					: `${statusColor}33`,
				borderRadius: 8,
				backgroundColor: pressed
					? "rgba(255,255,255,0.05)"
					: isActive
						? "rgba(139, 230, 255, 0.06)"
						: "rgba(255,255,255,0.02)",
				padding: 12,
				opacity: status === "locked" || status === "unavailable" ? 0.5 : 1,
			})}
		>
			{/* Header row */}
			<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 13,
						fontWeight: "600",
						color: statusColor,
						letterSpacing: 0.5,
						flex: 1,
					}}
				>
					{tech.name}
				</Text>
				<View
					style={{
						borderRadius: 4,
						paddingHorizontal: 6,
						paddingVertical: 2,
						backgroundColor: `${statusColor}22`,
					}}
				>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							letterSpacing: 1.5,
							color: statusColor,
							textTransform: "uppercase",
						}}
					>
						{STATUS_LABELS[status]}
					</Text>
				</View>
			</View>

			{/* Description */}
			<Text
				style={{
					fontFamily: "monospace",
					fontSize: 11,
					color: "rgba(255,255,255,0.55)",
					marginTop: 6,
					lineHeight: 16,
				}}
			>
				{tech.description}
			</Text>

			{/* Cost + Duration */}
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
				{Object.entries(tech.cost).map(([resource, amount]) => {
					const color =
						HARVEST_RESOURCE_COLORS[resource as HarvestResource] ?? "#888";
					const label =
						HARVEST_RESOURCE_LABELS[resource as HarvestResource] ?? resource;
					return (
						<View
							key={resource}
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: 3,
								borderRadius: 4,
								paddingHorizontal: 5,
								paddingVertical: 2,
								backgroundColor: `${color}18`,
							}}
						>
							<View
								style={{
									width: 5,
									height: 5,
									borderRadius: 3,
									backgroundColor: color,
								}}
							/>
							<Text
								style={{
									fontFamily: "monospace",
									fontSize: 9,
									color: color,
									letterSpacing: 0.5,
								}}
							>
								{amount} {label}
							</Text>
						</View>
					);
				})}

				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: 3,
						borderRadius: 4,
						paddingHorizontal: 5,
						paddingVertical: 2,
						backgroundColor: "rgba(176, 136, 216, 0.12)",
					}}
				>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 9,
							color: "rgba(176, 136, 216, 0.7)",
							letterSpacing: 0.5,
						}}
					>
						{tech.turnsToResearch} turns
					</Text>
				</View>
			</View>

			{/* Progress bar (when actively researching) */}
			{isActive && (
				<View style={{ marginTop: 8 }}>
					<View
						style={{
							height: 4,
							borderRadius: 2,
							backgroundColor: "rgba(139, 230, 255, 0.15)",
							overflow: "hidden",
						}}
					>
						<View
							style={{
								height: "100%",
								width: `${Math.round((turnsCompleted / tech.turnsToResearch) * 100)}%`,
								backgroundColor: "#8be6ff",
								borderRadius: 2,
							}}
						/>
					</View>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							color: "rgba(139, 230, 255, 0.5)",
							marginTop: 3,
							textAlign: "right",
						}}
					>
						{turnsCompleted}/{tech.turnsToResearch} turns — tap to cancel
					</Text>
				</View>
			)}

			{/* Prerequisites */}
			{tech.prerequisites.length > 0 && status === "locked" && (
				<View style={{ marginTop: 6 }}>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							color: "rgba(255,255,255,0.3)",
							letterSpacing: 1,
							textTransform: "uppercase",
						}}
					>
						Requires: {tech.prerequisites.join(", ")}
					</Text>
				</View>
			)}
		</Pressable>
	);
}
