/**
 * TechTreeOverlay — full 27-tech DAG visualization.
 *
 * DOM overlay on top of the persistent globe Canvas.
 * Reads tech data from techTreeDefs.ts, research state from researchSystem.
 * Tier layout: tier 1 at top, tier 5 at bottom.
 *
 * Diegetic vocabulary: RESEARCH PROTOCOLS.
 */

import type { World } from "koota";
import { useMemo, useState } from "react";
import { TECH_BY_ID, TECH_TREE, type TechDef } from "../../config/techTreeDefs";
import {
	cancelResearch,
	getAvailableTechs,
	getResearchState,
	queueResearch,
} from "../../systems";

type TechTreeOverlayProps = {
	world: World;
	factionId: string;
	onClose: () => void;
};

// ─── Layout constants ────────────────────────────────────────────────────────

const NODE_W = 170;
const NODE_H = 80;
const TIER_GAP_Y = 110;
const NODE_GAP_X = 16;

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Component ───────────────────────────────────────────────────────────────

export function TechTreeOverlay({
	world,
	factionId,
	onClose,
}: TechTreeOverlayProps) {
	const [, setTick] = useState(0);
	const refresh = () => setTick((t) => t + 1);

	const state = getResearchState(world, factionId);
	const researched = new Set(state?.researchedTechs ?? []);
	const currentTechId = state?.currentTechId ?? "";
	const progressPoints = state?.progressPoints ?? 0;
	const available = useMemo(() => {
		const avail = getAvailableTechs(world, factionId);
		return new Set(avail.map((t) => t.id));
	}, [world, factionId]);

	// Group techs by tier
	const tiers = useMemo(() => {
		const map = new Map<number, TechDef[]>();
		for (const tech of TECH_TREE) {
			const list = map.get(tech.tier) ?? [];
			list.push(tech);
			map.set(tech.tier, list);
		}
		return map;
	}, []);

	// Compute node positions for drawing prerequisite lines
	const nodePositions = useMemo(() => {
		const positions = new Map<string, { x: number; y: number }>();
		for (let tier = 1; tier <= 5; tier++) {
			const techs = tiers.get(tier) ?? [];
			const totalWidth =
				techs.length * NODE_W + (techs.length - 1) * NODE_GAP_X;
			const startX = -totalWidth / 2;
			const y = (tier - 1) * TIER_GAP_Y;
			for (let i = 0; i < techs.length; i++) {
				positions.set(techs[i]!.id, {
					x: startX + i * (NODE_W + NODE_GAP_X) + NODE_W / 2,
					y: y + NODE_H / 2,
				});
			}
		}
		return positions;
	}, [tiers]);

	// SVG viewport dimensions
	const svgWidth = 1200;
	const allY = [...nodePositions.values()].map((p) => p.y);
	const svgHeight = Math.max(...allY) + NODE_H + 40;
	const svgOffsetX = svgWidth / 2;

	function handleResearch(techId: string) {
		if (currentTechId) {
			cancelResearch(world, factionId);
		}
		queueResearch(world, factionId, techId);
		refresh();
	}

	function handleCancel() {
		cancelResearch(world, factionId);
		refresh();
	}

	return (
		<div
			data-testid="tech-tree-overlay"
			style={{
				position: "absolute",
				inset: 0,
				backgroundColor: "rgba(2, 5, 10, 0.92)",
				zIndex: 50,
				pointerEvents: "auto",
				display: "flex",
				flexDirection: "column",
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
					Research Protocols
				</span>
				{currentTechId && (
					<span
						style={{ fontSize: 10, color: "#b088d8", letterSpacing: "0.1em" }}
					>
						RESEARCHING: {TECH_BY_ID.get(currentTechId)?.name.toUpperCase()} (
						{progressPoints}/{TECH_BY_ID.get(currentTechId)?.turnsToResearch})
						<button
							type="button"
							onClick={handleCancel}
							style={{
								marginLeft: 12,
								padding: "2px 8px",
								background: "transparent",
								border: "1px solid rgba(255,100,100,0.3)",
								borderRadius: 3,
								color: "#cc6666",
								fontSize: 9,
								cursor: "pointer",
								fontFamily: "inherit",
							}}
						>
							CANCEL
						</button>
					</span>
				)}
				<button
					type="button"
					onClick={onClose}
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

			{/* Scrollable DAG */}
			<div style={{ flex: 1, overflow: "auto", padding: "20px 0" }}>
				<svg
					width={svgWidth}
					height={svgHeight}
					viewBox={`0 0 ${svgWidth} ${svgHeight}`}
					style={{ display: "block", margin: "0 auto" }}
				>
					{/* Prerequisite lines */}
					{TECH_TREE.map((tech) =>
						tech.prerequisites.map((prereqId) => {
							const from = nodePositions.get(prereqId);
							const to = nodePositions.get(tech.id);
							if (!from || !to) return null;
							const bothDone =
								researched.has(prereqId) && researched.has(tech.id);
							const fromDone = researched.has(prereqId);
							return (
								<line
									key={`${prereqId}-${tech.id}`}
									x1={from.x + svgOffsetX}
									y1={from.y + NODE_H / 2}
									x2={to.x + svgOffsetX}
									y2={to.y - NODE_H / 2}
									stroke={
										bothDone
											? "rgba(126, 231, 203, 0.5)"
											: fromDone
												? "rgba(139, 230, 255, 0.3)"
												: "rgba(255,255,255,0.08)"
									}
									strokeWidth={bothDone ? 2 : 1}
								/>
							);
						}),
					)}

					{/* Tech nodes */}
					{TECH_TREE.map((tech) => {
						const pos = nodePositions.get(tech.id);
						if (!pos) return null;

						const isDone = researched.has(tech.id);
						const isActive = currentTechId === tech.id;
						const isAvailable = available.has(tech.id) && !isDone && !isActive;
						const isLocked = !isDone && !isActive && !isAvailable;

						const borderColor = isDone
							? "rgba(126, 231, 203, 0.6)"
							: isActive
								? "rgba(176, 136, 216, 0.7)"
								: isAvailable
									? "rgba(139, 230, 255, 0.45)"
									: "rgba(255,255,255,0.08)";

						const bgColor = isDone
							? "rgba(126, 231, 203, 0.08)"
							: isActive
								? "rgba(176, 136, 216, 0.1)"
								: isAvailable
									? "rgba(139, 230, 255, 0.04)"
									: "rgba(8, 19, 26, 0.6)";

						const nx = pos.x + svgOffsetX - NODE_W / 2;
						const ny = pos.y - NODE_H / 2;

						return (
							<foreignObject
								key={tech.id}
								x={nx}
								y={ny}
								width={NODE_W}
								height={NODE_H}
							>
								<div
									data-testid={`tech-node-${tech.id}`}
									onClick={() => {
										if (isAvailable || isActive) handleResearch(tech.id);
									}}
									style={{
										width: NODE_W,
										height: NODE_H,
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: bgColor,
										padding: "6px 8px",
										cursor: isAvailable || isActive ? "pointer" : "default",
										opacity: isLocked ? 0.4 : 1,
										display: "flex",
										flexDirection: "column",
										justifyContent: "space-between",
										boxSizing: "border-box",
									}}
								>
									<div>
										<div
											style={{
												fontSize: 10,
												fontWeight: 600,
												color: isDone ? "#7ee7cb" : "#8be6ff",
												lineHeight: "13px",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{tech.name}
											{isDone && (
												<span
													style={{
														marginLeft: 6,
														fontSize: 8,
														color: "#7ee7cb",
													}}
												>
													DONE
												</span>
											)}
										</div>
										<div
											style={{
												fontSize: 8,
												color: "rgba(255,255,255,0.4)",
												marginTop: 2,
												lineHeight: "11px",
												overflow: "hidden",
												display: "-webkit-box",
												WebkitLineClamp: 2,
												WebkitBoxOrient: "vertical",
											}}
										>
											{tech.description}
										</div>
									</div>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
										}}
									>
										<span
											style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}
										>
											T{tech.tier} | {tech.turnsToResearch}t
										</span>
										{isActive && (
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 3,
												}}
											>
												<div
													style={{
														width: 40,
														height: 3,
														borderRadius: 2,
														background: "rgba(176,136,216,0.15)",
														overflow: "hidden",
													}}
												>
													<div
														style={{
															width: `${Math.min(100, (progressPoints / tech.turnsToResearch) * 100)}%`,
															height: "100%",
															background: "#b088d8",
															borderRadius: 2,
														}}
													/>
												</div>
												<span style={{ fontSize: 7, color: "#b088d8" }}>
													{progressPoints}/{tech.turnsToResearch}
												</span>
											</div>
										)}
									</div>
								</div>
							</foreignObject>
						);
					})}
				</svg>

				{/* Cost legend for selected/hovered tech */}
				<div
					style={{
						textAlign: "center",
						padding: "12px 20px",
						fontSize: 9,
						color: "rgba(255,255,255,0.3)",
					}}
				>
					Click an available tech to begin research. Only one tech at a time.
				</div>
			</div>
		</div>
	);
}
