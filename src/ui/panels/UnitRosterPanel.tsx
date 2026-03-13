/**
 * UnitRosterPanel — shows all player units with role icon, name,
 * Mark level, AP/MP, and current activity status.
 *
 * Clicking a unit centers the camera on it.
 */

import { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import { getBotDefinition } from "../../bots/definitions";
import type { BotArchetypeId, BotUnitType } from "../../bots/types";
import { Identity, Unit, WorldPosition } from "../../ecs/traits";
import { units } from "../../ecs/world";
import { subscribe, getSnapshot } from "../../ecs/gameState";
import {
	getTurnState,
	subscribeTurnState,
	type UnitTurnState,
} from "../../systems/turnSystem";
import {
	BoxIcon,
	EyeIcon,
	HammerIcon,
	ShieldIcon,
	SwordIcon,
	WrenchIcon,
} from "../icons";

// ─── Role Icon Mapping ──────────────────────────────────────────────────────

function getRoleFromArchetype(
	archetypeId: BotArchetypeId,
): "technician" | "scout" | "striker" | "fabricator" | "guardian" | "hauler" {
	switch (archetypeId) {
		case "field_technician":
			return "technician";
		case "relay_hauler":
			return "hauler";
		case "fabrication_rig":
			return "fabricator";
		case "substation_engineer":
			return "guardian";
		case "foundry_seed":
			return "fabricator";
		case "assault_strider":
			return "striker";
		case "defense_sentry":
			return "guardian";
		default:
			return "technician";
	}
}

const ROLE_ICONS: Record<
	string,
	{ icon: typeof WrenchIcon; color: string; label: string }
> = {
	technician: { icon: WrenchIcon, color: "#7ee7cb", label: "Tech" },
	scout: { icon: EyeIcon, color: "#89d9ff", label: "Scout" },
	striker: { icon: SwordIcon, color: "#ff8f8f", label: "Strike" },
	fabricator: { icon: HammerIcon, color: "#f6c56a", label: "Fab" },
	guardian: { icon: ShieldIcon, color: "#b088d8", label: "Guard" },
	hauler: { icon: BoxIcon, color: "#7ee7cb", label: "Haul" },
};

function toRoman(n: number): string {
	if (n <= 0 || n > 10) return String(n);
	const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
	return numerals[n - 1] ?? String(n);
}

function getActivity(unit: {
	selected: boolean;
	speed: number;
	type: BotUnitType;
}): string {
	if (unit.selected) return "SELECTED";
	if (unit.speed === 0) return "STATIONARY";
	return "IDLE";
}

// ─── Unit Row ────────────────────────────────────────────────────────────────

interface UnitRowData {
	id: string;
	displayName: string;
	archetypeId: BotArchetypeId;
	markLevel: number;
	componentCount: number;
	functionalCount: number;
	turnState: UnitTurnState | undefined;
	activity: string;
	position: { x: number; y: number; z: number };
}

function UnitRow({
	unit,
	onPress,
}: {
	unit: UnitRowData;
	onPress: (pos: { x: number; y: number; z: number }) => void;
}) {
	const role = getRoleFromArchetype(unit.archetypeId);
	const roleInfo = ROLE_ICONS[role] ?? ROLE_ICONS.technician;
	const IconComponent = roleInfo.icon;
	const apRemaining = unit.turnState?.actionPoints ?? 0;
	const mpRemaining = unit.turnState?.movementPoints ?? 0;
	const maxAp = unit.turnState?.maxActionPoints ?? 0;
	const maxMp = unit.turnState?.maxMovementPoints ?? 0;
	const isSpent = apRemaining === 0 && mpRemaining === 0;

	return (
		<Pressable
			onPress={() => onPress(unit.position)}
			testID={`roster-unit-${unit.id}`}
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				paddingVertical: 6,
				paddingHorizontal: 8,
				borderRadius: 8,
				backgroundColor: isSpent
					? "rgba(255, 255, 255, 0.03)"
					: "rgba(126, 231, 203, 0.05)",
				borderWidth: 1,
				borderColor: isSpent
					? "rgba(255, 255, 255, 0.06)"
					: "rgba(126, 231, 203, 0.12)",
				opacity: isSpent ? 0.6 : 1,
			}}
		>
			{/* Role icon */}
			<View
				style={{
					width: 32,
					height: 32,
					borderRadius: 10,
					borderWidth: 1,
					borderColor: `${roleInfo.color}33`,
					backgroundColor: `${roleInfo.color}12`,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<IconComponent width={16} height={16} color={roleInfo.color} />
			</View>

			{/* Name + Mark */}
			<View style={{ flex: 1, gap: 2 }}>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 11,
							letterSpacing: 0.5,
							color: "#dff6ff",
						}}
						numberOfLines={1}
					>
						{unit.displayName}
					</Text>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 9,
							color: roleInfo.color,
							letterSpacing: 1,
						}}
					>
						Mk{toRoman(unit.markLevel)}
					</Text>
				</View>
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 9,
						color: "rgba(255, 255, 255, 0.4)",
						letterSpacing: 1,
						textTransform: "uppercase",
					}}
				>
					{unit.activity}
				</Text>
			</View>

			{/* AP / MP */}
			<View style={{ alignItems: "flex-end", gap: 2 }}>
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 10,
						color: apRemaining > 0 ? "#8be6ff" : "rgba(255,255,255,0.25)",
						letterSpacing: 0.5,
					}}
				>
					AP {apRemaining}/{maxAp}
				</Text>
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 10,
						color: mpRemaining > 0 ? "#7ee7cb" : "rgba(255,255,255,0.25)",
						letterSpacing: 0.5,
					}}
				>
					MP {mpRemaining}/{maxMp}
				</Text>
			</View>
		</Pressable>
	);
}

// ─── Camera Control ──────────────────────────────────────────────────────────

let cameraFocusCallback:
	| ((pos: { x: number; y: number; z: number }) => void)
	| null = null;

export function setCameraFocusCallback(
	cb: ((pos: { x: number; y: number; z: number }) => void) | null,
) {
	cameraFocusCallback = cb;
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function UnitRosterPanel() {
	useSyncExternalStore(subscribe, getSnapshot);
	const turnState = useSyncExternalStore(subscribeTurnState, getTurnState);

	const playerUnits: UnitRowData[] = [];

	for (const entity of units) {
		const identity = entity.get(Identity);
		if (!identity || identity.faction !== "player") continue;

		const unit = entity.get(Unit);
		const wp = entity.get(WorldPosition);
		if (!unit || !wp) continue;

		playerUnits.push({
			id: identity.id,
			displayName: unit.displayName,
			archetypeId: unit.archetypeId,
			markLevel: unit.markLevel,
			componentCount: unit.components.length,
			functionalCount: unit.components.filter((c) => c.functional).length,
			turnState: turnState.unitStates.get(identity.id),
			activity: getActivity(unit),
			position: { x: wp.x, y: wp.y, z: wp.z },
		});
	}

	const handleUnitPress = (pos: { x: number; y: number; z: number }) => {
		if (cameraFocusCallback) {
			cameraFocusCallback(pos);
		}
	};

	if (playerUnits.length === 0) {
		return (
			<View style={{ paddingVertical: 12, alignItems: "center" }}>
				<Text
					style={{
						fontFamily: "monospace",
						fontSize: 10,
						color: "rgba(255, 255, 255, 0.3)",
						letterSpacing: 1,
						textTransform: "uppercase",
					}}
				>
					No units deployed
				</Text>
			</View>
		);
	}

	return (
		<View style={{ gap: 4 }}>
			{playerUnits.map((unit) => (
				<UnitRow key={unit.id} unit={unit} onPress={handleUnitPress} />
			))}
		</View>
	);
}
