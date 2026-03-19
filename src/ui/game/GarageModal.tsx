/**
 * GarageModal — two-step fabrication UI (Classification Matrix -> Configuration Protocol).
 *
 * DOM overlay on top of the persistent globe Canvas.
 * Step 1: Select robot class (CLASSIFICATION MATRIX)
 * Step 2: Select specialization track (CONFIGURATION PROTOCOL)
 *
 * Diegetic vocabulary: CLASSIFICATION MATRIX, CONFIGURATION PROTOCOL.
 */

import { useState, useMemo } from "react";
import type { World } from "koota";
import type { RobotClass } from "../../ecs/robots/types";
import { ROBOT_COSTS, queueFabrication, type QueueResult } from "../../ecs/systems/fabricationSystem";
import { getTracksForClass, type TrackEntry } from "../../ecs/robots/specializations/trackRegistry";
import { isTechResearched } from "../../ecs/systems/researchSystem";
import { Building, BotFabricator, Powered } from "../../ecs/traits/building";

// ─── Constants ───────────────────────────────────────────────────────────────

const FACTION_CLASSES: RobotClass[] = ["scout", "infantry", "cavalry", "ranged", "support", "worker"];

const CLASS_INFO: Record<RobotClass, { label: string; description: string }> = {
	scout: { label: "Scout", description: "Fast recon unit. High MP, low HP. Clears fog, maps terrain." },
	infantry: { label: "Infantry", description: "Frontline combatant. Balanced HP/attack. Holds ground." },
	cavalry: { label: "Cavalry", description: "Flanking striker. High MP, moderate attack. Hit and run." },
	ranged: { label: "Ranged", description: "Siege platform. High attack/defense, low MP. Engages at distance." },
	support: { label: "Support", description: "Force multiplier. Heals, boosts signals, calls reinforcements." },
	worker: { label: "Worker", description: "Economy backbone. Harvests resources, fabricates, builds structures." },
	cult_infantry: { label: "Cult Infantry", description: "" },
	cult_ranged: { label: "Cult Ranged", description: "" },
	cult_cavalry: { label: "Cult Cavalry", description: "" },
};

type GarageModalProps = {
	world: World;
	factionId: string;
	onClose: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function GarageModal({ world, factionId, onClose }: GarageModalProps) {
	const [selectedClass, setSelectedClass] = useState<RobotClass | null>(null);
	const [selectedTrack, setSelectedTrack] = useState<string>("");
	const [result, setResult] = useState<QueueResult | null>(null);

	// Find a powered motor pool for this faction
	const motorPool = useMemo(() => {
		for (const e of world.query(Building, BotFabricator, Powered)) {
			const b = e.get(Building);
			if (b && b.factionId === factionId) return e;
		}
		return null;
	}, [world, factionId]);

	const tracks = useMemo(() => {
		if (!selectedClass) return [];
		return getTracksForClass(selectedClass);
	}, [selectedClass]);

	// Check which tracks have their gate tech researched
	const unlockedTracks = useMemo(() => {
		const set = new Set<string>();
		for (const track of tracks) {
			if (isTechResearched(world, factionId, track.gateTechId)) {
				set.add(track.trackId);
			}
		}
		return set;
	}, [world, factionId, tracks]);

	// Check which tracks have v2 upgrade
	const v2Tracks = useMemo(() => {
		const set = new Set<string>();
		for (const track of tracks) {
			if (track.v2TechId && isTechResearched(world, factionId, track.v2TechId)) {
				set.add(track.trackId);
			}
		}
		return set;
	}, [world, factionId, tracks]);

	function handleFabricate() {
		if (!selectedClass || !motorPool) return;
		const trackVersion: 1 | 2 = selectedTrack && v2Tracks.has(selectedTrack) ? 2 : 1;
		const res = queueFabrication(world, motorPool, selectedClass, selectedTrack, trackVersion);
		setResult(res);
		if (res.ok) {
			// Reset after successful queue
			setTimeout(() => {
				setSelectedClass(null);
				setSelectedTrack("");
				setResult(null);
			}, 1200);
		}
	}

	function handleBack() {
		setSelectedClass(null);
		setSelectedTrack("");
		setResult(null);
	}

	const cost = selectedClass ? ROBOT_COSTS[selectedClass] : null;

	return (
		<div
			data-testid="garage-modal"
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
			aria-label="Garage — Fabrication Bay"
			aria-modal={true}
		>
			<div
				style={{
					width: "100%",
					maxWidth: 700,
					maxHeight: "92dvh",
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
						{selectedClass ? "Configuration Protocol" : "Classification Matrix"}
					</span>
					<button
						type="button"
						onClick={onClose}
						data-testid="garage-close-btn"
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
					{!motorPool && (
						<div
							style={{
								textAlign: "center",
								padding: 40,
								color: "rgba(255,255,255,0.4)",
								fontSize: 12,
							}}
						>
							No powered motor pool available. Build and power a motor pool to fabricate units.
						</div>
					)}

					{motorPool && !selectedClass && (
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
							{FACTION_CLASSES.map((cls) => {
								const info = CLASS_INFO[cls];
								const robotCost = ROBOT_COSTS[cls];
								const defaults = robotCost;
								return (
									<button
										key={cls}
										type="button"
										data-testid={`class-${cls}`}
										onClick={() => setSelectedClass(cls)}
										style={{
											display: "flex",
											flexDirection: "column",
											textAlign: "left",
											padding: "12px 14px",
											borderRadius: 10,
											border: "1px solid rgba(255,255,255,0.08)",
											background: "rgba(255,255,255,0.02)",
											cursor: "pointer",
											transition: "border-color 0.15s",
										}}
										onMouseEnter={(e) => {
											(e.currentTarget as HTMLElement).style.borderColor = "rgba(139, 230, 255, 0.45)";
										}}
										onMouseLeave={(e) => {
											(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
										}}
									>
										<span style={{ fontSize: 13, color: "#8be6ff", fontWeight: 600 }}>
											{info.label}
										</span>
										<span
											style={{
												fontSize: 9,
												color: "rgba(255,255,255,0.4)",
												marginTop: 4,
												lineHeight: "13px",
											}}
										>
											{info.description}
										</span>
										<div
											style={{
												display: "flex",
												gap: 8,
												marginTop: 8,
												fontSize: 9,
												color: "rgba(255,255,255,0.3)",
											}}
										>
											<span>{defaults.buildTime}t</span>
											<span>
												{Object.entries(robotCost.materials)
													.map(([m, a]) => `${m.replace(/_/g, " ")} ${a}`)
													.join(" / ")}
											</span>
										</div>
									</button>
								);
							})}
						</div>
					)}

					{motorPool && selectedClass && (
						<div>
							{/* Back button */}
							<button
								type="button"
								onClick={handleBack}
								style={{
									marginBottom: 16,
									padding: "4px 12px",
									background: "transparent",
									border: "1px solid rgba(255,255,255,0.12)",
									borderRadius: 4,
									color: "rgba(255,255,255,0.5)",
									fontSize: 10,
									cursor: "pointer",
									fontFamily: "inherit",
									letterSpacing: "0.1em",
								}}
							>
								BACK
							</button>

							{/* Selected class header */}
							<div
								style={{
									borderRadius: 10,
									border: "1px solid rgba(139, 230, 255, 0.2)",
									background: "rgba(139, 230, 255, 0.04)",
									padding: "12px 14px",
									marginBottom: 16,
								}}
							>
								<div style={{ fontSize: 14, color: "#8be6ff", fontWeight: 700 }}>
									{CLASS_INFO[selectedClass].label}
								</div>
								<div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
									{CLASS_INFO[selectedClass].description}
								</div>
								{cost && (
									<div
										style={{
											display: "flex",
											gap: 12,
											marginTop: 8,
											fontSize: 9,
											color: "rgba(255,255,255,0.35)",
										}}
									>
										<span>Build: {cost.buildTime} turns</span>
										<span>
											Cost:{" "}
											{Object.entries(cost.materials)
												.map(([m, a]) => `${m.replace(/_/g, " ")} ${a}`)
												.join(", ")}
										</span>
									</div>
								)}
							</div>

							{/* Track selection */}
							<div
								style={{
									fontSize: 10,
									textTransform: "uppercase",
									letterSpacing: "0.24em",
									color: "#90ddec",
									marginBottom: 10,
								}}
							>
								Specialization Track
							</div>

							{/* No specialization option */}
							<button
								type="button"
								data-testid="track-none"
								onClick={() => setSelectedTrack("")}
								style={{
									width: "100%",
									textAlign: "left",
									padding: "10px 14px",
									borderRadius: 10,
									border: `1px solid ${selectedTrack === "" ? "rgba(139, 230, 255, 0.45)" : "rgba(255,255,255,0.08)"}`,
									background: selectedTrack === "" ? "rgba(139, 230, 255, 0.07)" : "rgba(255,255,255,0.02)",
									cursor: "pointer",
									marginBottom: 8,
									fontFamily: "inherit",
								}}
							>
								<span style={{ fontSize: 11, color: "#8be6ff" }}>Unspecialized</span>
								<span
									style={{
										display: "block",
										fontSize: 9,
										color: "rgba(255,255,255,0.35)",
										marginTop: 2,
									}}
								>
									Base chassis. No track abilities. Can be deployed immediately.
								</span>
							</button>

							{tracks.map((track) => {
								const unlocked = unlockedTracks.has(track.trackId);
								const hasV2 = v2Tracks.has(track.trackId);
								const isSelected = selectedTrack === track.trackId;
								return (
									<button
										key={track.trackId}
										type="button"
										data-testid={`track-${track.trackId}`}
										onClick={() => {
											if (unlocked) setSelectedTrack(track.trackId);
										}}
										style={{
											width: "100%",
											textAlign: "left",
											padding: "10px 14px",
											borderRadius: 10,
											border: `1px solid ${isSelected ? "rgba(139, 230, 255, 0.45)" : "rgba(255,255,255,0.08)"}`,
											background: isSelected ? "rgba(139, 230, 255, 0.07)" : "rgba(255,255,255,0.02)",
											cursor: unlocked ? "pointer" : "default",
											opacity: unlocked ? 1 : 0.4,
											marginBottom: 8,
											fontFamily: "inherit",
										}}
									>
										<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
											<span style={{ fontSize: 11, color: "#8be6ff" }}>
												{track.label}
											</span>
											{hasV2 && (
												<span
													style={{
														fontSize: 8,
														color: "#b088d8",
														border: "1px solid rgba(176,136,216,0.4)",
														borderRadius: 3,
														padding: "1px 5px",
													}}
												>
													v2
												</span>
											)}
											{!unlocked && (
												<span
													style={{
														fontSize: 8,
														color: "rgba(255,255,255,0.3)",
														fontStyle: "italic",
													}}
												>
													Requires research
												</span>
											)}
										</div>
										<span
											style={{
												display: "block",
												fontSize: 9,
												color: "rgba(255,255,255,0.35)",
												marginTop: 2,
												lineHeight: "13px",
											}}
										>
											{track.description}
										</span>
									</button>
								);
							})}
						</div>
					)}

					{/* Result feedback */}
					{result && !result.ok && (
						<div
							style={{
								marginTop: 12,
								padding: "8px 12px",
								borderRadius: 6,
								border: "1px solid rgba(204, 68, 68, 0.3)",
								background: "rgba(204, 68, 68, 0.08)",
								fontSize: 10,
								color: "#cc6666",
							}}
						>
							Fabrication failed: {result.reason.replace(/_/g, " ")}
						</div>
					)}
					{result && result.ok && (
						<div
							style={{
								marginTop: 12,
								padding: "8px 12px",
								borderRadius: 6,
								border: "1px solid rgba(126, 231, 203, 0.3)",
								background: "rgba(126, 231, 203, 0.08)",
								fontSize: 10,
								color: "#7ee7cb",
							}}
						>
							Fabrication queued successfully.
						</div>
					)}
				</div>

				{/* Footer */}
				{motorPool && selectedClass && (
					<div
						style={{
							flexShrink: 0,
							borderTop: "1px solid rgba(255,255,255,0.08)",
							padding: "12px 20px",
							display: "flex",
							gap: 12,
						}}
					>
						<button
							type="button"
							data-testid="fabricate-btn"
							onClick={handleFabricate}
							style={{
								flex: 1,
								height: 40,
								borderRadius: 10,
								border: "1px solid rgba(139, 230, 255, 0.3)",
								background: "rgba(139, 230, 255, 0.08)",
								fontSize: 11,
								textTransform: "uppercase",
								letterSpacing: "0.22em",
								color: "#8be6ff",
								cursor: "pointer",
								fontFamily: "inherit",
							}}
						>
							Queue Fabrication
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
