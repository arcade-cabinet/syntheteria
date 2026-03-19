/**
 * EntityTooltip — floating stat card near hovered/tap-held entities.
 *
 * Renders unit, building, or structure stats in a compact tooltip.
 * Clamped to viewport edges so it never overlaps screen boundaries.
 *
 * Visual style: dark translucent panel with cyan border, matching HudPanel.
 */

import { useSyncExternalStore } from "react";
import {
	getTooltipState,
	subscribeTooltip,
	type TooltipData,
} from "../../systems/tooltipSystem";

const TOOLTIP_WIDTH = 220;
const TOOLTIP_PADDING = 8;

function StatRow({
	label,
	value,
	color,
}: {
	label: string;
	value: string;
	color?: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				justifyContent: "space-between",
				marginTop: 2,
			}}
		>
			<span
				style={{
					fontFamily: "monospace",
					fontSize: 9,
					color: "rgba(255, 255, 255, 0.5)",
					letterSpacing: 1,
					textTransform: "uppercase",
				}}
			>
				{label}
			</span>
			<span
				style={{
					fontFamily: "monospace",
					fontSize: 10,
					color: color ?? "#d0f4ff",
					fontWeight: "600",
				}}
			>
				{value}
			</span>
		</div>
	);
}

function UnitStats({ data }: { data: TooltipData }) {
	const hpColor =
		data.hpCurrent / Math.max(data.hpMax, 1) > 0.5
			? "#6ff3c8"
			: data.hpCurrent / Math.max(data.hpMax, 1) > 0.25
				? "#f6c56a"
				: "#ff8f8f";

	return (
		<>
			{data.archetype && (
				<StatRow label="Role" value={data.archetype.replace(/_/g, " ")} />
			)}
			{data.markLevel > 0 && (
				<StatRow label="Mark" value={`Mk.${data.markLevel}`} color="#d4b0ff" />
			)}
			{data.hpMax > 0 && (
				<StatRow
					label="HP"
					value={`${data.hpCurrent}/${data.hpMax}`}
					color={hpColor}
				/>
			)}
			{data.turnState && (
				<>
					<StatRow
						label="AP"
						value={`${data.turnState.actionPoints}/${data.turnState.maxActionPoints}`}
						color={
							data.turnState.actionPoints > 0
								? "#8be6ff"
								: "rgba(255,255,255,0.3)"
						}
					/>
					<StatRow
						label="MP"
						value={`${data.turnState.movementPoints}/${data.turnState.maxMovementPoints}`}
						color={
							data.turnState.movementPoints > 0
								? "#8be6ff"
								: "rgba(255,255,255,0.3)"
						}
					/>
				</>
			)}
			{data.currentAction && (
				<StatRow label="Action" value={data.currentAction} color="#f6c56a" />
			)}
			{data.markLevel > 0 && (
				<div style={{ marginTop: 4 }}>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							justifyContent: "space-between",
							marginBottom: 2,
						}}
					>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								color: "rgba(255, 255, 255, 0.5)",
								letterSpacing: 1,
								textTransform: "uppercase",
							}}
						>
							XP
						</span>
						{data.upgradeEligible && (
							<span
								style={{
									fontFamily: "monospace",
									fontSize: 9,
									color: "#f6c56a",
									letterSpacing: 1,
									fontWeight: "700",
									textTransform: "uppercase",
								}}
							>
								UPGRADE READY
							</span>
						)}
					</div>
					<div
						style={{
							height: 4,
							borderRadius: 2,
							backgroundColor: "rgba(255, 255, 255, 0.1)",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								height: "100%",
								borderRadius: 2,
								width: `${Math.round(data.xpProgress * 100)}%`,
								backgroundColor: data.upgradeEligible
									? "#f6c56a"
									: "rgba(139, 230, 255, 0.6)",
							}}
						/>
					</div>
				</div>
			)}
		</>
	);
}

function BuildingStats({ data }: { data: TooltipData }) {
	return (
		<>
			{data.buildingType && (
				<StatRow label="Type" value={data.buildingType.replace(/_/g, " ")} />
			)}
			{data.constructionStage && (
				<StatRow label="Stage" value={data.constructionStage} color="#f6c56a" />
			)}
			<StatRow
				label="Power"
				value={data.powered ? "Online" : "Offline"}
				color={data.powered ? "#6ff3c8" : "#ff8f8f"}
			/>
			{data.buildingOutput && (
				<StatRow label="Output" value={data.buildingOutput} color="#8be6ff" />
			)}
		</>
	);
}

function StructureStats({ data }: { data: TooltipData }) {
	return (
		<>
			{data.harvestableResources.length > 0 && (
				<StatRow
					label="Resources"
					value={data.harvestableResources
						.map((r) => r.replace(/_/g, " "))
						.join(", ")}
					color="#f6c56a"
				/>
			)}
		</>
	);
}

export function EntityTooltip() {
	const data = useSyncExternalStore(subscribeTooltip, getTooltipState);
	const vw = window.innerWidth;
	const vh = window.innerHeight;

	if (!data.visible || !data.kind) return null;

	// Clamp position to viewport
	const offsetX = 16;
	const offsetY = -8;
	let x = data.screenX + offsetX;
	let y = data.screenY + offsetY;

	// Right edge clamp
	if (x + TOOLTIP_WIDTH + TOOLTIP_PADDING > vw) {
		x = data.screenX - TOOLTIP_WIDTH - offsetX;
	}
	// Left edge clamp
	if (x < TOOLTIP_PADDING) {
		x = TOOLTIP_PADDING;
	}
	// Bottom edge clamp (estimate tooltip height ~120px)
	if (y + 120 > vh) {
		y = vh - 130;
	}
	// Top edge clamp
	if (y < TOOLTIP_PADDING) {
		y = TOOLTIP_PADDING;
	}

	const kindLabel =
		data.kind === "unit"
			? "Unit"
			: data.kind === "building"
				? "Building"
				: "Structure";

	const kindColor =
		data.kind === "unit"
			? "#8be6ff"
			: data.kind === "building"
				? "#f6c56a"
				: "#6ff3c8";

	return (
		<div
			data-testid="entity-tooltip"
			style={{
				pointerEvents: "none",
				position: "absolute",
				left: x,
				top: y,
				width: TOOLTIP_WIDTH,
				borderRadius: 12,
				borderWidth: 1,
				border: `1px solid ${kindColor}40`,
				backgroundColor: "rgba(7, 17, 23, 0.94)",
				paddingLeft: 12,
				paddingRight: 12,
				paddingTop: 8,
				paddingBottom: 8,
				zIndex: 70,
			}}
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 6,
					marginBottom: 4,
				}}
			>
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 8,
						letterSpacing: 2,
						color: kindColor,
						textTransform: "uppercase",
					}}
				>
					{kindLabel}
				</span>
				{data.faction && data.faction !== "player" && (
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							letterSpacing: 1,
							color: "rgba(255, 120, 120, 0.7)",
							textTransform: "uppercase",
						}}
					>
						{data.faction}
					</span>
				)}
			</div>

			{/* Name */}
			<span
				style={{
					display: "block",
					fontFamily: "monospace",
					fontSize: 12,
					fontWeight: "700",
					color: "#e0f0ff",
					textTransform: "uppercase",
					letterSpacing: 1,
					marginBottom: 4,
				}}
			>
				{data.name}
			</span>

			{/* Stats by kind */}
			{data.kind === "unit" && <UnitStats data={data} />}
			{data.kind === "building" && <BuildingStats data={data} />}
			{data.kind === "structure" && <StructureStats data={data} />}
		</div>
	);
}
