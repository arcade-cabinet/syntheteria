/**
 * Tech Tree UI — Modal overlay showing research options, costs, and progress.
 *
 * Accessible from the hamburger/slide-out panel. Shows all techs organized
 * by tier, with current research progress and available/locked status.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { HarvestResource } from "../systems/resourcePools";
import {
	HARVEST_RESOURCE_COLORS,
	HARVEST_RESOURCE_LABELS,
} from "../systems/resourcePools";
import {
	cancelResearch,
	getAllTechs,
	getFactionResearchState,
	getResearchProgress,
	getTechStatus,
	startResearch,
	subscribeTechTree,
	type TechDefinition,
	type TechStatus,
} from "../systems/techTree";

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
	const fadeRef = useRef<HTMLDivElement>(null);

	const researchState = useSyncExternalStore(
		subscribeTechTree,
		getPlayerResearchState,
	);

	const progress = useSyncExternalStore(
		subscribeTechTree,
		getPlayerResearchProgress,
	);

	useEffect(() => {
		if (!fadeRef.current) return;
		fadeRef.current.style.transition = "opacity 200ms";
		fadeRef.current.style.opacity = visible ? "1" : "0";
	}, [visible]);

	if (!visible) return null;

	const allTechs = getAllTechs();
	const tiers = new Map<number, TechDefinition[]>();
	for (const tech of allTechs) {
		const tier = tiers.get(tech.tier) ?? [];
		tier.push(tech);
		tiers.set(tech.tier, tier);
	}

	const sortedTiers = Array.from(tiers.entries()).sort((a, b) => a[0] - b[0]);

	return (
		<div
			ref={fadeRef}
			className="fixed inset-0 z-[60] flex items-center justify-center"
			style={{ pointerEvents: visible ? "auto" : "none" }}
		>
			{/* Backdrop */}
			<button
				type="button"
				className="absolute inset-0 bg-black/60"
				onClick={onClose}
				aria-label="Close tech tree"
				style={{ border: "none", cursor: "default" }}
			/>

			{/* Panel */}
			<div
				className="relative w-full mx-4 rounded-xl overflow-hidden flex flex-col"
				style={{
					maxWidth: 480,
					maxHeight: "85vh",
					border: "1px solid rgba(139, 230, 255, 0.2)",
					backgroundColor: "rgba(8, 16, 23, 0.96)",
					backdropFilter: "blur(16px)",
				}}
			>
				{/* Header */}
				<div
					className="flex flex-row justify-between items-center px-5 py-4"
					style={{ borderBottom: "1px solid rgba(139, 230, 255, 0.1)" }}
				>
					<div>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 9,
								letterSpacing: "2.5px",
								color: "rgba(139, 230, 255, 0.5)",
								textTransform: "uppercase",
								display: "block",
							}}
						>
							Research
						</span>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: 18,
								fontWeight: 700,
								color: "#d0f4ff",
								letterSpacing: "1px",
								marginTop: 2,
								display: "block",
							}}
						>
							Tech Tree
						</span>
					</div>

					{/* Active research indicator */}
					{researchState.activeResearch && (
						<div
							style={{
								border: "1px solid rgba(139, 230, 255, 0.3)",
								borderRadius: 6,
								paddingLeft: 10,
								paddingRight: 10,
								paddingTop: 6,
								paddingBottom: 6,
								backgroundColor: "rgba(139, 230, 255, 0.06)",
							}}
						>
							<span
								style={{
									fontFamily: "monospace",
									fontSize: 8,
									letterSpacing: "1.5px",
									color: "rgba(139, 230, 255, 0.6)",
									textTransform: "uppercase",
									display: "block",
								}}
							>
								Progress
							</span>
							<div
								style={{
									marginTop: 4,
									height: 3,
									borderRadius: 2,
									backgroundColor: "rgba(139, 230, 255, 0.15)",
									overflow: "hidden",
								}}
							>
								<div
									style={{
										height: "100%",
										width: `${Math.round(progress * 100)}%`,
										backgroundColor: "#8be6ff",
										borderRadius: 2,
									}}
								/>
							</div>
						</div>
					)}

					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						style={{
							width: 36,
							height: 36,
							borderRadius: 6,
							border: "1px solid rgba(255,255,255,0.1)",
							backgroundColor: "rgba(255,255,255,0.04)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: "pointer",
						}}
					>
						<span
							style={{
								color: "#8be6ff",
								fontSize: 16,
								fontFamily: "monospace",
							}}
						>
							x
						</span>
					</button>
				</div>

				{/* Tech list */}
				<div
					className="overflow-y-auto flex-1"
					style={{
						padding: 16,
						paddingBottom: 24,
						display: "flex",
						flexDirection: "column",
						gap: 20,
					}}
				>
					{sortedTiers.map(([tier, techs]) => (
						<div key={tier}>
							<span
								style={{
									fontFamily: "monospace",
									fontSize: 9,
									letterSpacing: "2px",
									color: "rgba(139, 230, 255, 0.5)",
									textTransform: "uppercase",
									display: "block",
									marginBottom: 8,
								}}
							>
								Tier {tier} — {TIER_LABELS[tier] ?? "Advanced"}
							</span>

							<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
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
	const isDisabled =
		status === "locked" || status === "unavailable" || status === "completed";

	const handleClick = () => {
		if (canStart) {
			startResearch("player", tech.id);
		} else if (isActive) {
			cancelResearch("player");
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={isDisabled}
			aria-label={`${tech.name}: ${STATUS_LABELS[status]}`}
			style={{
				display: "block",
				width: "100%",
				textAlign: "left",
				border: `1px solid ${isActive ? "rgba(139, 230, 255, 0.4)" : `${statusColor}33`}`,
				borderRadius: 8,
				backgroundColor: isActive
					? "rgba(139, 230, 255, 0.06)"
					: "rgba(255,255,255,0.02)",
				padding: 12,
				opacity: status === "locked" || status === "unavailable" ? 0.5 : 1,
				cursor: isDisabled ? "not-allowed" : "pointer",
			}}
		>
			{/* Header row */}
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span
					style={{
						fontFamily: "monospace",
						fontSize: 13,
						fontWeight: 600,
						color: statusColor,
						letterSpacing: "0.5px",
						flex: 1,
					}}
				>
					{tech.name}
				</span>
				<div
					style={{
						borderRadius: 4,
						paddingLeft: 6,
						paddingRight: 6,
						paddingTop: 2,
						paddingBottom: 2,
						backgroundColor: `${statusColor}22`,
					}}
				>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							letterSpacing: "1.5px",
							color: statusColor,
							textTransform: "uppercase",
						}}
					>
						{STATUS_LABELS[status]}
					</span>
				</div>
			</div>

			{/* Description */}
			<p
				style={{
					fontFamily: "monospace",
					fontSize: 11,
					color: "rgba(255,255,255,0.55)",
					marginTop: 6,
					lineHeight: "16px",
					margin: "6px 0 0 0",
				}}
			>
				{tech.description}
			</p>

			{/* Cost + Duration */}
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					flexWrap: "wrap",
					gap: 6,
					marginTop: 8,
				}}
			>
				{Object.entries(tech.cost).map(([resource, amount]) => {
					const color =
						HARVEST_RESOURCE_COLORS[resource as HarvestResource] ?? "#888";
					const label =
						HARVEST_RESOURCE_LABELS[resource as HarvestResource] ?? resource;
					return (
						<div
							key={resource}
							style={{
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								gap: 3,
								borderRadius: 4,
								paddingLeft: 5,
								paddingRight: 5,
								paddingTop: 2,
								paddingBottom: 2,
								backgroundColor: `${color}18`,
							}}
						>
							<div
								style={{
									width: 5,
									height: 5,
									borderRadius: 3,
									backgroundColor: color,
									flexShrink: 0,
								}}
							/>
							<span
								style={{
									fontFamily: "monospace",
									fontSize: 9,
									color: color,
									letterSpacing: "0.5px",
								}}
							>
								{amount} {label}
							</span>
						</div>
					);
				})}

				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 3,
						borderRadius: 4,
						paddingLeft: 5,
						paddingRight: 5,
						paddingTop: 2,
						paddingBottom: 2,
						backgroundColor: "rgba(176, 136, 216, 0.12)",
					}}
				>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 9,
							color: "rgba(176, 136, 216, 0.7)",
							letterSpacing: "0.5px",
						}}
					>
						{tech.turnsToResearch} turns
					</span>
				</div>
			</div>

			{/* Progress bar (when actively researching) */}
			{isActive && (
				<div style={{ marginTop: 8 }}>
					<div
						style={{
							height: 4,
							borderRadius: 2,
							backgroundColor: "rgba(139, 230, 255, 0.15)",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								height: "100%",
								width: `${Math.round((turnsCompleted / tech.turnsToResearch) * 100)}%`,
								backgroundColor: "#8be6ff",
								borderRadius: 2,
							}}
						/>
					</div>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							color: "rgba(139, 230, 255, 0.5)",
							marginTop: 3,
							display: "block",
							textAlign: "right",
						}}
					>
						{turnsCompleted}/{tech.turnsToResearch} turns — tap to cancel
					</span>
				</div>
			)}

			{/* Prerequisites */}
			{tech.prerequisites.length > 0 && status === "locked" && (
				<div style={{ marginTop: 6 }}>
					<span
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							color: "rgba(255,255,255,0.3)",
							letterSpacing: "1px",
							textTransform: "uppercase",
						}}
					>
						Requires: {tech.prerequisites.join(", ")}
					</span>
				</div>
			)}
		</button>
	);
}
