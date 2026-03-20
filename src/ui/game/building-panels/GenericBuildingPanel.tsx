/**
 * GenericBuildingPanel — default panel for buildings without specialized UI.
 * Shows name, HP, tier, power delta, network status, and upgrade button.
 */

import type { World } from "koota";
import { BUILDING_DEFS, type BuildingDef } from "../../../config/buildings";
import {
	BUILDING_UNLOCK_CHAINS,
	type BuildingTierDef,
} from "../../../config/buildingUnlockDefs";
import {
	getBuildingUpgradeJob,
	isInSignalRange,
	startBuildingUpgrade,
} from "../../../systems";
import { Building, type BuildingType, Powered } from "../../../traits";

export interface GenericBuildingPanelProps {
	world: World;
	entityId: number;
	buildingData: {
		buildingType: BuildingType;
		hp: number;
		maxHp: number;
		buildingTier: 1 | 2 | 3;
		factionId: string;
		tileX: number;
		tileZ: number;
	};
}

export function GenericBuildingPanel({
	world,
	entityId,
	buildingData,
}: GenericBuildingPanelProps) {
	const { buildingType, hp, maxHp, buildingTier, tileX, tileZ } = buildingData;
	const def: BuildingDef | undefined = BUILDING_DEFS[buildingType];
	const displayName = def?.displayName ?? buildingType.replace(/_/g, " ");

	const powered = (() => {
		for (const e of world.query(Building, Powered)) {
			if (e.id() === entityId) return true;
		}
		return false;
	})();
	const inSignal = isInSignalRange(world, tileX, tileZ);
	const upgradeJob = getBuildingUpgradeJob(entityId);

	const chain =
		BUILDING_UNLOCK_CHAINS[buildingType as keyof typeof BUILDING_UNLOCK_CHAINS];
	const canUpgrade = buildingTier < 3 && chain != null && !upgradeJob;
	const nextTierDef: BuildingTierDef | undefined =
		chain?.tiers[(buildingTier + 1) as 2 | 3];

	const hpPct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;

	function handleUpgrade() {
		startBuildingUpgrade(world, entityId);
	}

	return (
		<div className="building-panel">
			<h3 style={headerStyle}>
				{displayName} — Tier {buildingTier}
			</h3>

			{/* HP bar */}
			<div style={statRowStyle}>
				<span style={labelStyle}>HP</span>
				<div style={barContainerStyle}>
					<div
						style={{
							...barFillStyle,
							width: `${hpPct}%`,
							background:
								hpPct > 50 ? "#7ee7cb" : hpPct > 25 ? "#e8c86a" : "#cc4444",
						}}
					/>
				</div>
				<span style={valueStyle}>
					{hp}/{maxHp}
				</span>
			</div>

			{/* Power */}
			<div style={statRowStyle}>
				<span style={labelStyle}>Power</span>
				<span style={{ ...valueStyle, color: powered ? "#7ee7cb" : "#cc6666" }}>
					{powered ? "ONLINE" : "OFFLINE"} (
					{(def?.powerDelta ?? 0 > 0) ? "+" : ""}
					{def?.powerDelta ?? 0})
				</span>
			</div>

			{/* Signal */}
			<div style={statRowStyle}>
				<span style={labelStyle}>Network</span>
				<span
					style={{
						...valueStyle,
						color: inSignal ? "#8be6ff" : "rgba(255,255,255,0.3)",
					}}
				>
					{inSignal ? "Connected" : "Disconnected"}
				</span>
			</div>

			{/* Upgrade */}
			{upgradeJob && (
				<div style={upgradeBarStyle}>
					Upgrading to Tier {upgradeJob.targetTier} —{" "}
					{upgradeJob.turnsRemaining} turns remaining
				</div>
			)}

			{canUpgrade && nextTierDef && (
				<button type="button" onClick={handleUpgrade} style={upgradeBtnStyle}>
					Upgrade to Tier {buildingTier + 1} ({nextTierDef.upgradeTurns}t)
				</button>
			)}
		</div>
	);
}

// ─── Shared panel styles ────────────────────────────────────────────────────

export const headerStyle: React.CSSProperties = {
	fontSize: 13,
	color: "#8be6ff",
	fontWeight: 700,
	margin: "0 0 12px",
};

export const statRowStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 8,
	marginBottom: 6,
	fontSize: 10,
};

export const labelStyle: React.CSSProperties = {
	color: "rgba(255,255,255,0.45)",
	width: 60,
	flexShrink: 0,
};

export const valueStyle: React.CSSProperties = {
	color: "rgba(255,255,255,0.7)",
};

export const barContainerStyle: React.CSSProperties = {
	flex: 1,
	height: 4,
	borderRadius: 2,
	background: "rgba(255,255,255,0.08)",
	overflow: "hidden",
};

export const barFillStyle: React.CSSProperties = {
	height: "100%",
	borderRadius: 2,
	transition: "width 0.2s",
};

export const upgradeBtnStyle: React.CSSProperties = {
	marginTop: 12,
	width: "100%",
	padding: "8px 12px",
	background: "rgba(139,230,255,0.08)",
	border: "1px solid rgba(139,230,255,0.3)",
	borderRadius: 6,
	color: "#8be6ff",
	fontSize: 10,
	cursor: "pointer",
	textTransform: "uppercase",
	letterSpacing: "0.15em",
	fontFamily: "inherit",
};

export const upgradeBarStyle: React.CSSProperties = {
	marginTop: 8,
	padding: "6px 10px",
	borderRadius: 4,
	background: "rgba(176,136,216,0.1)",
	border: "1px solid rgba(176,136,216,0.3)",
	fontSize: 9,
	color: "#b088d8",
};
