/**
 * Tech tree panel — shows the faction tech tree as a node graph.
 *
 * Each node displays: name, cost, prerequisite lines, researched state.
 * Click to start research. Progress bar on active research.
 * Greyed out if prerequisites not met. Faction-colored highlights.
 *
 * Matches the terminal-green machine-vision aesthetic of the main HUD.
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import civilizationsData from "../../../config/civilizations.json";
import { getSnapshot, subscribe } from "../ecs/gameState.ts";
import { getEffectsForTech } from "../systems/techEffects.ts";
import {
	getAvailableTechs,
	getResearchProgress,
	getTechTree,
	isResearched,
	startResearch,
	type TechNode,
} from "../systems/techTree.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONO = "'Courier New', monospace";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 80;
const TIER_GAP_X = 180;
const NODE_GAP_Y = 96;
const PADDING = 24;

type CivData = Record<string, { name: string; color: string }>;
const civData = civilizationsData as CivData;

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

interface LayoutNode {
	tech: TechNode;
	x: number;
	y: number;
}

function layoutTechTree(tree: TechNode[]): LayoutNode[] {
	// Group by tier
	const tiers = new Map<number, TechNode[]>();
	for (const node of tree) {
		const existing = tiers.get(node.tier) ?? [];
		existing.push(node);
		tiers.set(node.tier, existing);
	}

	const layout: LayoutNode[] = [];

	for (const [tier, nodes] of tiers) {
		const x = PADDING + tier * TIER_GAP_X;
		const totalHeight = nodes.length * NODE_GAP_Y;
		const startY = PADDING + (totalHeight > 0 ? 0 : 0);

		for (let i = 0; i < nodes.length; i++) {
			layout.push({
				tech: nodes[i],
				x,
				y: startY + i * NODE_GAP_Y,
			});
		}
	}

	return layout;
}

// ---------------------------------------------------------------------------
// TechTreeNode component
// ---------------------------------------------------------------------------

function TechTreeNode({
	layoutNode,
	factionColor,
	isAvailable,
	isComplete,
	isActive,
	activeProgress,
	onClick,
}: {
	layoutNode: LayoutNode;
	factionId: string;
	factionColor: string;
	isAvailable: boolean;
	isComplete: boolean;
	isActive: boolean;
	activeProgress: number; // 0..1
	onClick: () => void;
}) {
	const { tech, x, y } = layoutNode;
	const effects = getEffectsForTech(tech.id);

	let borderColor = "#333";
	let bgColor = "rgba(20, 20, 20, 0.9)";
	let textColor = "#555";
	let cursor = "default";

	if (isComplete) {
		borderColor = factionColor;
		bgColor = `${factionColor}18`;
		textColor = factionColor;
	} else if (isActive) {
		borderColor = "#ffaa00";
		bgColor = "rgba(40, 30, 0, 0.9)";
		textColor = "#ffaa00";
	} else if (isAvailable) {
		borderColor = "#00ffaa66";
		bgColor = "rgba(0, 20, 10, 0.9)";
		textColor = "#00ffaa";
		cursor = "pointer";
	}

	return (
		<div
			onClick={isAvailable && !isActive ? onClick : undefined}
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: NODE_WIDTH,
				height: NODE_HEIGHT,
				background: bgColor,
				border: `1px solid ${borderColor}`,
				borderRadius: "6px",
				padding: "6px 8px",
				cursor,
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				overflow: "hidden",
				transition: "border-color 0.2s, background 0.2s",
			}}
		>
			{/* Name */}
			<div
				style={{
					fontSize: "11px",
					fontWeight: "bold",
					color: textColor,
					lineHeight: "1.2",
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
				}}
				title={tech.name}
			>
				{tech.name}
			</div>

			{/* Effects summary */}
			<div
				style={{
					fontSize: "8px",
					color: `${textColor}88`,
					lineHeight: "1.3",
					overflow: "hidden",
					maxHeight: "22px",
				}}
			>
				{effects
					.slice(0, 2)
					.map((e) =>
						e.type.startsWith("unlock_")
							? e.target.replace(/_/g, " ")
							: `+${(e.value * 100).toFixed(0)}% ${e.type.replace("bonus_", "").replace(/_/g, " ")}`,
					)
					.join(", ")}
			</div>

			{/* Cost / Status */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: "9px",
				}}
			>
				{isComplete ? (
					<span style={{ color: factionColor, fontWeight: "bold" }}>DONE</span>
				) : (
					<span style={{ color: `${textColor}88` }}>
						{tech.cost.cubes > 0 ? `${tech.cost.cubes} cubes` : "FREE"}
					</span>
				)}
				<span style={{ color: `${textColor}66`, fontSize: "8px" }}>
					T{tech.tier}
				</span>
			</div>

			{/* Progress bar for active research */}
			{isActive && (
				<div
					style={{
						position: "absolute",
						bottom: 0,
						left: 0,
						right: 0,
						height: "3px",
						background: "rgba(255, 170, 0, 0.15)",
					}}
				>
					<div
						style={{
							height: "100%",
							width: `${activeProgress * 100}%`,
							background: "#ffaa00",
							transition: "width 0.3s ease-out",
							boxShadow: "0 0 4px #ffaa0066",
						}}
					/>
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Prerequisite lines (SVG)
// ---------------------------------------------------------------------------

function PrerequisiteLines({
	layout,
	factionId,
	factionColor,
}: {
	layout: LayoutNode[];
	factionId: string;
	factionColor: string;
}) {
	const nodePositions = useMemo(() => {
		const map = new Map<string, { x: number; y: number }>();
		for (const n of layout) {
			map.set(n.tech.id, { x: n.x, y: n.y });
		}
		return map;
	}, [layout]);

	const lines: {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		complete: boolean;
	}[] = [];

	for (const node of layout) {
		for (const prereqId of node.tech.prerequisites) {
			const from = nodePositions.get(prereqId);
			const to = nodePositions.get(node.tech.id);
			if (!from || !to) continue;

			const complete =
				isResearched(factionId, prereqId) &&
				isResearched(factionId, node.tech.id);

			lines.push({
				x1: from.x + NODE_WIDTH,
				y1: from.y + NODE_HEIGHT / 2,
				x2: to.x,
				y2: to.y + NODE_HEIGHT / 2,
				complete,
			});
		}
	}

	// Compute SVG size from layout
	const maxX = layout.reduce(
		(max, n) => Math.max(max, n.x + NODE_WIDTH + PADDING),
		0,
	);
	const maxY = layout.reduce(
		(max, n) => Math.max(max, n.y + NODE_HEIGHT + PADDING),
		0,
	);

	return (
		<svg
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: maxX,
				height: maxY,
				pointerEvents: "none",
			}}
		>
			{lines.map((line, i) => (
				<line
					key={i}
					x1={line.x1}
					y1={line.y1}
					x2={line.x2}
					y2={line.y2}
					stroke={line.complete ? factionColor : "#333"}
					strokeWidth={line.complete ? 2 : 1}
					strokeDasharray={line.complete ? undefined : "4 4"}
					opacity={line.complete ? 0.6 : 0.3}
				/>
			))}
		</svg>
	);
}

// ---------------------------------------------------------------------------
// Main TechTreePanel
// ---------------------------------------------------------------------------

export function TechTreePanel({
	factionId = "reclaimers",
}: {
	factionId?: string;
}) {
	// Subscribe for reactivity on game ticks (research progress updates)
	useSyncExternalStore(subscribe, getSnapshot);
	const [open, setOpen] = useState(false);

	const factionColor = civData[factionId]?.color ?? "#00ffaa";
	const factionName = civData[factionId]?.name ?? factionId;

	const tree = getTechTree();
	const layout = layoutTechTree(tree);
	const available = new Set(getAvailableTechs(factionId).map((t) => t.id));
	const researchProgress = getResearchProgress(factionId);

	const handleStartResearch = useCallback(
		(techId: string) => {
			startResearch(factionId, techId);
		},
		[factionId],
	);

	// Compute SVG/content size
	const contentWidth = layout.reduce(
		(max, n) => Math.max(max, n.x + NODE_WIDTH + PADDING),
		0,
	);
	const contentHeight = layout.reduce(
		(max, n) => Math.max(max, n.y + NODE_HEIGHT + PADDING),
		0,
	);

	return (
		<div
			style={{
				position: "absolute",
				top: "calc(8px + var(--sat, 0px))",
				right: "calc(80px + var(--sar, 0px))",
				fontFamily: MONO,
				pointerEvents: "auto",
				zIndex: 20,
			}}
		>
			{/* Toggle button */}
			<button
				onClick={() => setOpen(!open)}
				style={{
					background: open ? `${factionColor}22` : "rgba(0, 0, 0, 0.75)",
					color: factionColor,
					border: `1px solid ${factionColor}66`,
					borderRadius: "6px",
					padding: "6px 12px",
					fontSize: "11px",
					fontFamily: MONO,
					cursor: "pointer",
					letterSpacing: "0.08em",
					minHeight: "36px",
				}}
			>
				TECH {open ? "[-]" : "[+]"}
			</button>

			{/* Panel */}
			{open && (
				<div
					style={{
						position: "absolute",
						top: "44px",
						right: 0,
						background: "rgba(0, 0, 0, 0.92)",
						border: `1px solid ${factionColor}33`,
						borderRadius: "8px",
						padding: "12px",
						width: "min(85vw, 780px)",
						maxHeight: "70vh",
						overflow: "auto",
					}}
				>
					{/* Header */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "12px",
							paddingBottom: "8px",
							borderBottom: `1px solid ${factionColor}22`,
						}}
					>
						<div>
							<span
								style={{
									color: factionColor,
									fontSize: "13px",
									fontWeight: "bold",
									letterSpacing: "0.1em",
								}}
							>
								{factionName.toUpperCase()} TECH TREE
							</span>
						</div>

						{/* Active research indicator */}
						{researchProgress && (
							<div
								style={{
									fontSize: "10px",
									color: "#ffaa00",
									textAlign: "right",
								}}
							>
								<div>
									RESEARCHING:{" "}
									{tree
										.find((n) => n.id === researchProgress.techId)
										?.name.toUpperCase() ?? researchProgress.techId}
								</div>
								<div style={{ color: "#ffaa0088" }}>
									{Math.floor(
										(researchProgress.progress / researchProgress.totalTime) *
											100,
									)}
									% ({researchProgress.progress}/{researchProgress.totalTime}t)
								</div>
							</div>
						)}
					</div>

					{/* Scrollable tech tree graph */}
					<div
						style={{
							position: "relative",
							width: contentWidth,
							height: contentHeight,
							minWidth: "100%",
						}}
					>
						<PrerequisiteLines
							layout={layout}
							factionId={factionId}
							factionColor={factionColor}
						/>

						{layout.map((ln) => {
							const complete = isResearched(factionId, ln.tech.id);
							const isActive = researchProgress?.techId === ln.tech.id;
							const isAvail = available.has(ln.tech.id);
							const progress = isActive
								? researchProgress!.progress / researchProgress!.totalTime
								: 0;

							return (
								<TechTreeNode
									key={ln.tech.id}
									layoutNode={ln}
									factionId={factionId}
									factionColor={factionColor}
									isAvailable={isAvail}
									isComplete={complete}
									isActive={isActive}
									activeProgress={progress}
									onClick={() => handleStartResearch(ln.tech.id)}
								/>
							);
						})}
					</div>

					{/* Legend */}
					<div
						style={{
							display: "flex",
							gap: "16px",
							marginTop: "12px",
							paddingTop: "8px",
							borderTop: `1px solid ${factionColor}11`,
							fontSize: "9px",
							color: "#555",
						}}
					>
						<span>
							<span
								style={{
									display: "inline-block",
									width: "8px",
									height: "8px",
									background: `${factionColor}33`,
									border: `1px solid ${factionColor}`,
									borderRadius: "2px",
									marginRight: "4px",
									verticalAlign: "middle",
								}}
							/>
							Researched
						</span>
						<span>
							<span
								style={{
									display: "inline-block",
									width: "8px",
									height: "8px",
									background: "rgba(0,20,10,0.9)",
									border: "1px solid #00ffaa66",
									borderRadius: "2px",
									marginRight: "4px",
									verticalAlign: "middle",
								}}
							/>
							Available
						</span>
						<span>
							<span
								style={{
									display: "inline-block",
									width: "8px",
									height: "8px",
									background: "rgba(40,30,0,0.9)",
									border: "1px solid #ffaa00",
									borderRadius: "2px",
									marginRight: "4px",
									verticalAlign: "middle",
								}}
							/>
							In Progress
						</span>
						<span>
							<span
								style={{
									display: "inline-block",
									width: "8px",
									height: "8px",
									background: "rgba(20,20,20,0.9)",
									border: "1px solid #333",
									borderRadius: "2px",
									marginRight: "4px",
									verticalAlign: "middle",
								}}
							/>
							Locked
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
