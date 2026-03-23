/**
 * SlideOutPanel — slides from the right edge of the screen when the
 * hamburger menu button is pressed. Contains:
 *   1. Minimap (tactical overview)
 *   2. Resource breakdown (all material types)
 *   3. Unit roster (all player units with role/AP/MP)
 *   4. Campaign stats (turns, structures, exploration)
 *
 * Dismissible by pressing the hamburger again or tapping the backdrop.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
	Animated,
	Platform,
	Pressable,
	ScrollView,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { Identity, WorldPosition } from "../../ecs/traits";
import { buildings, units } from "../../ecs/world";
import { getWorldHalfExtents } from "../../world/sectorCoordinates";
import { ChevronRightIcon, MapIcon, RadarIcon } from "../icons";
import { CampaignStatsPanel } from "./CampaignStatsPanel";
import { ResourceBreakdownPanel } from "./ResourceBreakdownPanel";
import { UnitRosterPanel } from "./UnitRosterPanel";

const PANEL_WIDTH = 320;
const BACKDROP_OPACITY = 0.4;

function SectionHeader({ label }: { label: string }) {
	return (
		<View
			style={{
				paddingBottom: 6,
				marginBottom: 8,
				borderBottomWidth: 1,
				borderBottomColor: "rgba(139, 230, 255, 0.1)",
			}}
		>
			<Text
				style={{
					fontFamily: "monospace",
					fontSize: 9,
					letterSpacing: 2.5,
					color: "rgba(139, 230, 255, 0.6)",
					textTransform: "uppercase",
				}}
			>
				{label}
			</Text>
		</View>
	);
}

export function SlideOutPanel({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const { width: vw } = useWindowDimensions();
	const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
	const backdropAnim = useRef(new Animated.Value(0)).current;
	const wasOpen = useRef(false);

	const panelWidth = Math.min(PANEL_WIDTH, vw * 0.85);

	useEffect(() => {
		if (open && !wasOpen.current) {
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					damping: 22,
					stiffness: 220,
					useNativeDriver: true,
				}),
				Animated.timing(backdropAnim, {
					toValue: BACKDROP_OPACITY,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		} else if (!open && wasOpen.current) {
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: panelWidth,
					damping: 22,
					stiffness: 260,
					useNativeDriver: true,
				}),
				Animated.timing(backdropAnim, {
					toValue: 0,
					duration: 150,
					useNativeDriver: true,
				}),
			]).start();
		}
		wasOpen.current = open;
	}, [open, slideAnim, backdropAnim, panelWidth]);

	if (!open && !wasOpen.current) return null;

	return (
		<View
			testID="slide-out-panel"
			style={{ position: "absolute", inset: 0, zIndex: 50 }}
			pointerEvents={open ? "auto" : "box-none"}
		>
			{/* Backdrop */}
			<Animated.View
				style={{
					position: "absolute",
					inset: 0,
					backgroundColor: "#000",
					opacity: backdropAnim,
				}}
			>
				<Pressable
					style={{ flex: 1 }}
					onPress={onClose}
					accessibilityLabel="Close panel"
				/>
			</Animated.View>

			{/* Panel */}
			<Animated.View
				style={{
					position: "absolute",
					right: 0,
					top: 0,
					bottom: 0,
					width: panelWidth,
					backgroundColor: "rgba(8, 16, 23, 0.96)",
					borderLeftWidth: 1,
					borderLeftColor: "rgba(139, 230, 255, 0.15)",
					transform: [{ translateX: slideAnim }],
					...(Platform.OS === "web"
						? ({ backdropFilter: "blur(16px)" } as Record<string, string>)
						: {}),
				}}
			>
				{/* Close handle */}
				<Pressable
					onPress={onClose}
					accessibilityLabel="Close detail panel"
					style={{
						position: "absolute",
						left: -28,
						top: "50%",
						width: 28,
						height: 48,
						borderTopLeftRadius: 8,
						borderBottomLeftRadius: 8,
						backgroundColor: "rgba(8, 16, 23, 0.9)",
						borderWidth: 1,
						borderRightWidth: 0,
						borderColor: "rgba(139, 230, 255, 0.15)",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<ChevronRightIcon width={14} height={14} color="#8be6ff" />
				</Pressable>

				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={{
						padding: 16,
						paddingTop: 48,
						paddingBottom: 32,
						gap: 20,
					}}
					showsVerticalScrollIndicator={false}
				>
					{/* Minimap Section */}
					<View>
						<SectionHeader label="Sector Map" />
						<View style={{ alignItems: "center" }}>
							<MinimapInline />
						</View>
					</View>

					{/* Resources Section */}
					<View>
						<SectionHeader label="Materials" />
						<ResourceBreakdownPanel />
					</View>

					{/* Unit Roster Section */}
					<View>
						<SectionHeader label="Unit Roster" />
						<UnitRosterPanel />
					</View>

					{/* Campaign Stats Section */}
					<View>
						<SectionHeader label="Campaign" />
						<CampaignStatsPanel />
					</View>
				</ScrollView>
			</Animated.View>
		</View>
	);
}

/**
 * Inline minimap for the slide-out panel.
 * Replicates Minimap rendering without absolute positioning.
 */
function MinimapInline() {
	useSyncExternalStore(subscribe, getSnapshot);
	const size = 154;
	const half = size / 2;
	const { x: worldHalfX, z: worldHalfZ } = getWorldHalfExtents();
	const scale = (size * 0.45) / Math.max(worldHalfX, worldHalfZ, 1);

	return (
		<View
			style={{
				width: "100%",
				borderRadius: 16,
				borderWidth: 1,
				borderColor: "rgba(255, 255, 255, 0.08)",
				backgroundColor: "rgba(8, 16, 23, 0.9)",
				padding: 8,
			}}
		>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 8,
				}}
			>
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 10,
						letterSpacing: 2,
						color: "rgba(255, 255, 255, 0.45)",
						textTransform: "uppercase",
					}}
				>
					Command Grid
				</Text>
				<RadarIcon width={16} height={16} color="#89d9ff" />
			</View>

			<View
				style={{
					width: size,
					height: size,
					alignSelf: "center",
					borderRadius: 14,
					borderWidth: 1,
					borderColor: "rgba(139, 230, 255, 0.12)",
					backgroundColor: "#04090d",
					overflow: "hidden",
				}}
			>
				<View
					style={{
						position: "absolute",
						top: "50%",
						left: 0,
						height: 1,
						width: "100%",
						backgroundColor: "rgba(139, 230, 255, 0.12)",
					}}
				/>
				<View
					style={{
						position: "absolute",
						left: "50%",
						top: 0,
						width: 1,
						height: "100%",
						backgroundColor: "rgba(139, 230, 255, 0.12)",
					}}
				/>

				{Array.from(buildings).map((entity) => {
					const wp = entity.get(WorldPosition);
					const identity = entity.get(Identity);
					if (!wp || !identity) return null;
					const x = half + wp.x * scale;
					const y = half + wp.z * scale;
					return (
						<View
							key={identity.id}
							style={{
								position: "absolute",
								left: x - 3,
								top: y - 3,
								width: 6,
								height: 6,
								borderRadius: 3,
								borderWidth: 1,
								borderColor: "rgba(246, 197, 106, 0.7)",
								backgroundColor: "#f6c56a",
							}}
						/>
					);
				})}

				{Array.from(units).map((entity) => {
					const wp = entity.get(WorldPosition);
					const identity = entity.get(Identity);
					if (!wp || !identity) return null;
					const isEnemy = identity.faction !== "player";
					const x = half + wp.x * scale;
					const y = half + wp.z * scale;
					return (
						<View
							key={identity.id}
							style={{
								position: "absolute",
								left: x - 2.5,
								top: y - 2.5,
								width: 5,
								height: 5,
								borderRadius: 2.5,
								backgroundColor: isEnemy ? "#ff8f8f" : "#6ff3c8",
							}}
						/>
					);
				})}

				<View
					style={{
						position: "absolute",
						bottom: 4,
						left: 4,
						flexDirection: "row",
						alignItems: "center",
						gap: 4,
						borderRadius: 8,
						borderWidth: 1,
						borderColor: "rgba(255, 255, 255, 0.06)",
						backgroundColor: "rgba(0, 0, 0, 0.4)",
						paddingHorizontal: 6,
						paddingVertical: 3,
					}}
				>
					<MapIcon width={10} height={10} color="#89d9ff" />
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							letterSpacing: 1,
							color: "rgba(255, 255, 255, 0.45)",
							textTransform: "uppercase",
						}}
					>
						Network
					</Text>
				</View>
			</View>
		</View>
	);
}
