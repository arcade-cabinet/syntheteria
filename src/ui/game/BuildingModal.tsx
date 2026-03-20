/**
 * BuildingModal — per-building management panel.
 * Click any building -> shows its specific management UI.
 * Extends the GarageModal pattern to all building types.
 */

import type { World } from "koota";
import { useMemo } from "react";
import { BUILDING_DEFS } from "../../config/buildings";
import { Building, type BuildingType } from "../../traits";
import {
	AnalysisNodePanel,
	GenericBuildingPanel,
	MaintenancePanel,
	PowerPanel,
	RelayPanel,
	StoragePanel,
	SynthesizerPanel,
	TurretPanel,
} from "./building-panels";
import { GarageModal } from "./GarageModal";

interface BuildingModalProps {
	world: World;
	buildingEntityId: number | null;
	onClose: () => void;
}

export function BuildingModal({
	world,
	buildingEntityId,
	onClose,
}: BuildingModalProps) {
	const buildingData = useMemo(() => {
		if (buildingEntityId == null) return null;
		for (const e of world.query(Building)) {
			if (e.id() === buildingEntityId) {
				return e.get(Building);
			}
		}
		return null;
	}, [world, buildingEntityId]);

	if (buildingEntityId == null || !buildingData) return null;

	const { buildingType, factionId } = buildingData;
	const def = BUILDING_DEFS[buildingType];
	const displayName = def?.displayName ?? buildingType.replace(/_/g, " ");

	const panelProps = {
		world,
		entityId: buildingEntityId,
		buildingData: {
			buildingType: buildingData.buildingType as BuildingType,
			hp: buildingData.hp,
			maxHp: buildingData.maxHp,
			buildingTier: buildingData.buildingTier as 1 | 2 | 3,
			factionId: buildingData.factionId,
			tileX: buildingData.tileX,
			tileZ: buildingData.tileZ,
		},
	};

	if (buildingType === "motor_pool") {
		return (
			<GarageModal
				world={world}
				factionId={factionId || "player"}
				onClose={onClose}
			/>
		);
	}

	function renderPanel() {
		switch (buildingType) {
			case "synthesizer":
				return <SynthesizerPanel {...panelProps} />;
			case "analysis_node":
				return <AnalysisNodePanel {...panelProps} />;
			case "defense_turret":
				return <TurretPanel {...panelProps} />;
			case "storage_hub":
				return <StoragePanel {...panelProps} />;
			case "relay_tower":
				return <RelayPanel {...panelProps} />;
			case "maintenance_bay":
				return <MaintenancePanel {...panelProps} />;
			case "storm_transmitter":
			case "power_plant":
			case "solar_array":
			case "geothermal_tap":
			case "power_box":
				return <PowerPanel {...panelProps} />;
			default:
				return <GenericBuildingPanel {...panelProps} />;
		}
	}

	return (
		<div
			data-testid="building-modal"
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "rgba(2, 5, 10, 0.88)",
				zIndex: 50,
				pointerEvents: "auto",
			}}
			role="dialog"
			aria-label={`${displayName} Management`}
			aria-modal={true}
		>
			<div
				style={{
					width: "100%",
					maxWidth: 560,
					maxHeight: "88dvh",
					borderRadius: 20,
					border: "1px solid rgba(139, 230, 255, 0.18)",
					background: "rgba(7, 17, 27, 0.98)",
					boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				}}
			>
				{/* Header */}
				<div
					style={{
						flexShrink: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						borderBottom: "1px solid rgba(255,255,255,0.08)",
						background: "rgba(8, 23, 35, 0.96)",
						padding: "12px 20px",
					}}
				>
					<span
						style={{
							fontSize: 11,
							textTransform: "uppercase",
							letterSpacing: "0.28em",
							color: "#8be6ff",
						}}
					>
						{displayName}
					</span>
					<button
						type="button"
						onClick={onClose}
						data-testid="building-modal-close"
						style={{
							width: 32,
							height: 32,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: "50%",
							border: "1px solid rgba(255,255,255,0.12)",
							background: "rgba(255,255,255,0.05)",
							color: "rgba(255,255,255,0.5)",
							fontSize: 16,
							cursor: "pointer",
						}}
						aria-label="Close"
					>
						{"\u00D7"}
					</button>
				</div>

				{/* Body */}
				<div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
					{renderPanel()}
				</div>
			</div>
		</div>
	);
}
