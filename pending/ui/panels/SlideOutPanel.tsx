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
		<div
			style={{
				paddingBottom: 6,
				marginBottom: 8,
				borderBottom: "1px solid rgba(139, 230, 255, 0.1)",
			}}
		>
			<span
				style={{
					fontFamily: "monospace",
					fontSize: 9,
					letterSpacing: 2.5,
					color: "rgba(139, 230, 255, 0.6)",
					textTransform: "uppercase",
				}}
			>
				{label}
			</span>
		</div>
	);
}

export function SlideOutPanel({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth * 0.85);
	const wasOpen = useRef(false);
	const panelRef = useRef<HTMLDivElement>(null);
	const backdropRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open && !wasOpen.current) {
			if (panelRef.current) {
				panelRef.current.style.transform = `translateX(0)`;
				panelRef.current.style.transition =
					"transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
			}
			if (backdropRef.current) {
				backdropRef.current.style.opacity = String(BACKDROP_OPACITY);
				backdropRef.current.style.transition = "opacity 0.2s ease";
			}
		} else if (!open && wasOpen.current) {
			if (panelRef.current) {
				panelRef.current.style.transform = `translateX(${panelWidth}px)`;
				panelRef.current.style.transition =
					"transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
			}
			if (backdropRef.current) {
				backdropRef.current.style.opacity = "0";
				backdropRef.current.style.transition = "opacity 0.15s ease";
			}
		}
		wasOpen.current = open;
	}, [open, panelWidth]);

	if (!open && !wasOpen.current) return null;

	return (
		<div
			data-testid="slide-out-panel"
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 50,
				pointerEvents: open ? "auto" : "none",
			}}
		>
			{/* Backdrop */}
			<div
				ref={backdropRef}
				style={{
					position: "absolute",
					inset: 0,
					backgroundColor: "#000",
					opacity: 0,
				}}
				onClick={onClose}
				aria-label="Close panel"
			/>

			{/* Panel */}
			<div
				ref={panelRef}
				style={{
					position: "absolute",
					right: 0,
					top: 0,
					bottom: 0,
					width: panelWidth,
					backgroundColor: "rgba(8, 16, 23, 0.96)",
					borderLeft: "1px solid rgba(139, 230, 255, 0.15)",
					backdropFilter: "blur(16px)",
					transform: `translateX(${panelWidth}px)`,
				}}
			>
				{/* Close handle */}
				<button
					onClick={onClose}
					aria-label="Close detail panel"
					style={{
						position: "absolute",
						left: -28,
						top: "50%",
						transform: "translateY(-50%)",
						width: 28,
						height: 48,
						borderTopLeftRadius: 8,
						borderBottomLeftRadius: 8,
						backgroundColor: "rgba(8, 16, 23, 0.9)",
						border: "1px solid rgba(139, 230, 255, 0.15)",
						borderRight: "none",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
					}}
				>
					<ChevronRightIcon width={14} height={14} color="#8be6ff" />
				</button>

				<div
					style={{
						flex: 1,
						overflowY: "auto",
						height: "100%",
						padding: 16,
						paddingTop: 48,
						paddingBottom: 32,
						display: "flex",
						flexDirection: "column",
						gap: 20,
						boxSizing: "border-box",
					}}
				>
					{/* Minimap Section */}
					<div>
						<SectionHeader label="Sector Map" />
						<div style={{ display: "flex", justifyContent: "center" }}>
							<MinimapInline />
						</div>
					</div>

					{/* Resources Section */}
					<div>
						<SectionHeader label="Materials" />
						<ResourceBreakdownPanel />
					</div>

					{/* Unit Roster Section */}
					<div>
						<SectionHeader label="Unit Roster" />
						<UnitRosterPanel />
					</div>

					{/* Campaign Stats Section */}
					<div>
						<SectionHeader label="Campaign" />
						<CampaignStatsPanel />
					</div>
				</div>
			</div>
		</div>
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
		<div
			style={{
				width: "100%",
				borderRadius: 16,
				border: "1px solid rgba(255, 255, 255, 0.08)",
				backgroundColor: "rgba(8, 16, 23, 0.9)",
				padding: 8,
				boxSizing: "border-box",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 8,
				}}
			>
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 10,
						letterSpacing: 2,
						color: "rgba(255, 255, 255, 0.45)",
						textTransform: "uppercase",
					}}
				>
					Command Grid
				</span>
				<RadarIcon width={16} height={16} color="#89d9ff" />
			</div>

			<div
				style={{
					width: size,
					height: size,
					alignSelf: "center",
					margin: "0 auto",
					borderRadius: 14,
					border: "1px solid rgba(139, 230, 255, 0.12)",
					backgroundColor: "#04090d",
					overflow: "hidden",
					position: "relative",
				}}
			>
				<div
					style={{
						position: "absolute",
						top: "50%",
						left: 0,
						height: 1,
						width: "100%",
						backgroundColor: "rgba(139, 230, 255, 0.12)",
					}}
				/>
				<div
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
						<div
							key={identity.id}
							style={{
								position: "absolute",
								left: x - 3,
								top: y - 3,
								width: 6,
								height: 6,
								borderRadius: 3,
								border: "1px solid rgba(246, 197, 106, 0.7)",
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
						<div
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

				<div
					style={{
						position: "absolute",
						bottom: 4,
						left: 4,
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 4,
						borderRadius: 8,
						border: "1px solid rgba(255, 255, 255, 0.06)",
						backgroundColor: "rgba(0, 0, 0, 0.4)",
						paddingLeft: 6,
						paddingRight: 6,
						paddingTop: 3,
						paddingBottom: 3,
					}}
				>
					<MapIcon width={10} height={10} color="#89d9ff" />
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							letterSpacing: 1,
							color: "rgba(255, 255, 255, 0.45)",
							textTransform: "uppercase",
						}}
					>
						Network
					</span>
				</div>
			</div>
		</div>
	);
}
