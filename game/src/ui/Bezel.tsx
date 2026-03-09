/**
 * Bezel — frames the 3D gameplay viewport.
 *
 * The bezel pattern:
 * - TOP: informatics bar (resources, power, storm status) — sits above gameplay
 * - BOTTOM: controls strip (equipped tool, action buttons) — sits below gameplay
 * - The 3D Canvas fills the center viewport between top and bottom bezels
 * - Device notches land in the bezel area, not in gameplay
 * - On desktop the bezel is thinner; on mobile it's touchable
 *
 * Children are rendered inside the viewport area (the Canvas goes here).
 * HUD overlays (crosshair, etc.) layer on top of the viewport.
 */

import type { ReactNode } from "react";

const MONO = "'Courier New', monospace";
const BEZEL_BG = "rgba(4, 8, 6, 0.95)";
const BEZEL_BORDER = "#00ffaa22";
const TEXT_DIM = "#00ffaa66";
const TEXT_BRIGHT = "#00ffaa";

interface BezelProps {
	/** The 3D Canvas and overlays */
	children: ReactNode;
	/** Top bar informatics data */
	resources?: { scrapMetal: number; eWaste: number; intactComponents: number };
	power?: {
		totalGeneration: number;
		totalDemand: number;
		stormIntensity: number;
	};
	/** Current equipped tool name */
	equippedTool?: string;
	/** Bot name for status */
	botName?: string;
	/** Whether we're on a touch device */
	isMobile?: boolean;
}

export function Bezel({
	children,
	resources,
	power,
	equippedTool = "SCANNER",
	botName,
	isMobile = false,
}: BezelProps) {
	const topHeight = isMobile ? 44 : 32;
	const bottomHeight = isMobile ? 56 : 36;

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				background: "#000",
				fontFamily: MONO,
				touchAction: "none",
				overflow: "hidden",
			}}
		>
			{/* TOP BEZEL — informatics */}
			<TopBezel
				height={topHeight}
				resources={resources}
				power={power}
				botName={botName}
			/>

			{/* VIEWPORT — 3D canvas fills this */}
			<div
				style={{
					flex: 1,
					position: "relative",
					overflow: "hidden",
				}}
			>
				{children}
			</div>

			{/* BOTTOM BEZEL — controls */}
			<BottomBezel
				height={bottomHeight}
				equippedTool={equippedTool}
				isMobile={isMobile}
			/>
		</div>
	);
}

function TopBezel({
	height,
	resources,
	power,
	botName,
}: {
	height: number;
	resources?: BezelProps["resources"];
	power?: BezelProps["power"];
	botName?: string;
}) {
	const stormColor = power
		? power.stormIntensity > 1.1
			? "#ffaa00"
			: power.stormIntensity > 0.8
				? TEXT_BRIGHT
				: TEXT_DIM
		: TEXT_DIM;

	return (
		<div
			style={{
				height,
				background: BEZEL_BG,
				borderBottom: `1px solid ${BEZEL_BORDER}`,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding:
					"0 env(safe-area-inset-right, 12px) 0 env(safe-area-inset-left, 12px)",
				paddingTop: "env(safe-area-inset-top, 0px)",
				fontSize: "11px",
				color: TEXT_DIM,
				letterSpacing: "0.05em",
				gap: "12px",
				minHeight: height,
			}}
		>
			{/* Left — bot name */}
			<div
				style={{ color: TEXT_BRIGHT, fontWeight: "bold", whiteSpace: "nowrap" }}
			>
				{botName ?? "SYNTHETERIA"}
			</div>

			{/* Center — resources */}
			{resources && (
				<div style={{ display: "flex", gap: "14px", flexShrink: 0 }}>
					<span>SCRAP:{resources.scrapMetal}</span>
					<span>E-WASTE:{resources.eWaste}</span>
					<span>PARTS:{resources.intactComponents}</span>
				</div>
			)}

			{/* Right — power/storm */}
			{power && (
				<div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
					<span style={{ color: stormColor }}>
						STORM:{(power.stormIntensity * 100).toFixed(0)}%
					</span>
					<span>
						PWR:{power.totalGeneration.toFixed(0)}/
						{power.totalDemand.toFixed(0)}
					</span>
				</div>
			)}
		</div>
	);
}

function BottomBezel({
	height,
	equippedTool,
	isMobile,
}: {
	height: number;
	equippedTool: string;
	isMobile: boolean;
}) {
	return (
		<div
			style={{
				height,
				background: BEZEL_BG,
				borderTop: `1px solid ${BEZEL_BORDER}`,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding:
					"0 env(safe-area-inset-right, 12px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 12px)",
				gap: "16px",
				minHeight: height,
			}}
		>
			{/* Equipped tool indicator */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					color: TEXT_BRIGHT,
					fontSize: "12px",
					letterSpacing: "0.1em",
				}}
			>
				<div
					style={{
						width: "8px",
						height: "8px",
						background: TEXT_BRIGHT,
						borderRadius: "2px",
						boxShadow: `0 0 6px ${TEXT_BRIGHT}`,
					}}
				/>
				<span>{equippedTool}</span>
			</div>

			{/* Speed controls integrated into bottom bezel */}
			{!isMobile && (
				<div
					style={{
						position: "absolute",
						right: "16px",
						display: "flex",
						gap: "4px",
						fontSize: "10px",
					}}
				>
					<span style={{ color: TEXT_DIM }}>
						WASD move | MOUSE look | E interact | Q switch
					</span>
				</div>
			)}
		</div>
	);
}
