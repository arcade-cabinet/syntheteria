/**
 * FaithBar — HUD overlay for the Religious/Philosophical victory path.
 *
 * Only visible when the player faction has any faith accumulation (faith > 0)
 * or has placed at least one shrine. This keeps the HUD clean for players
 * not pursuing the faith path.
 *
 * Shows:
 *   - Faith fill bar (0 to faithRequired from victoryPaths.json)
 *   - Doctrine count (unlocked / required for enlightenment)
 *   - Enlightenment eligibility indicator
 *   - Shrines owned (mini dot count)
 *
 * Positioned at bottom-center, just above the ResourceBar breathing room.
 * Uses the religious path accent (#aa44ff) rather than faction color — this
 * is path UI, not faction UI.
 *
 * Subscribes to game state tick via useSyncExternalStore on gameState to
 * re-render each tick where faith changes.
 */

import { memo, useSyncExternalStore } from "react";
import victoryPathsConfig from "../../config/victoryPaths.json";
import { getSnapshot, subscribe } from "../ecs/gameState";
import {
	getEnlightenmentProgress,
	getFactionShrines,
} from "../systems/ideologySystem";
import { getLastPlayerFaction } from "../systems/newGameInit";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FAITH_COLOR = "#aa44ff";
const FAITH_COLOR_DIM = "#aa44ff44";
const FAITH_COLOR_GLOW = "#aa44ff22";
const FAITH_REQUIRED = victoryPathsConfig.victoryEnlightenment.faithRequired;
const DOCTRINES_REQUIRED =
	victoryPathsConfig.victoryEnlightenment.doctrinesUnlocked;

const MONO = "'Courier New', monospace";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FaithBar = memo(function FaithBar() {
	// Re-render on every game tick (faith changes during tick processing)
	useSyncExternalStore(subscribe, getSnapshot);

	const faction = getLastPlayerFaction();
	if (!faction) return null;

	const progress = getEnlightenmentProgress(faction);
	const shrines = getFactionShrines(faction);

	// Only show if the faction has begun accumulating faith or has shrines
	if (progress.faith <= 0 && shrines.length === 0) return null;

	const faithFill = Math.min(1, progress.faith / FAITH_REQUIRED);
	const faithPercent = Math.round(faithFill * 100);
	const doctrinesFill = Math.min(
		1,
		progress.doctrinesUnlocked / DOCTRINES_REQUIRED,
	);

	return (
		<div
			role="region"
			aria-label="Faith progress"
			style={{
				position: "absolute",
				bottom: `calc(52px + env(safe-area-inset-bottom, 0px))`,
				left: "50%",
				transform: "translateX(-50%)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "4px",
				background: "rgba(4, 0, 12, 0.80)",
				border: `1px solid ${FAITH_COLOR_DIM}`,
				borderRadius: "4px",
				padding: "6px 14px",
				pointerEvents: "none",
				minWidth: "180px",
				maxWidth: "240px",
			}}
		>
			{/* Header row: label + eligibility */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "baseline",
					width: "100%",
				}}
			>
				<span
					style={{
						fontFamily: MONO,
						fontSize: "8px",
						color: FAITH_COLOR_DIM,
						letterSpacing: "0.3em",
						textTransform: "uppercase",
					}}
				>
					Faith
				</span>
				{progress.isEligible ? (
					<span
						aria-label="Enlightenment condition met"
						style={{
							fontFamily: MONO,
							fontSize: "8px",
							color: FAITH_COLOR,
							letterSpacing: "0.2em",
							textShadow: `0 0 6px ${FAITH_COLOR}`,
						}}
					>
						ENLIGHTENED
					</span>
				) : (
					<span
						style={{
							fontFamily: MONO,
							fontSize: "8px",
							color: `${FAITH_COLOR}88`,
							letterSpacing: "0.1em",
						}}
					>
						{faithPercent}%
					</span>
				)}
			</div>

			{/* Faith fill bar */}
			<div
				role="progressbar"
				aria-valuenow={faithPercent}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={`Faith: ${faithPercent}% of enlightenment threshold`}
				style={{
					width: "100%",
					height: "3px",
					background: FAITH_COLOR_GLOW,
					borderRadius: "2px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: `${faithFill * 100}%`,
						height: "100%",
						background: progress.isEligible
							? FAITH_COLOR
							: `linear-gradient(90deg, ${FAITH_COLOR}88, ${FAITH_COLOR})`,
						borderRadius: "2px",
						transition: "width 0.5s ease-out",
						boxShadow: `0 0 4px ${FAITH_COLOR}66`,
					}}
				/>
			</div>

			{/* Doctrine progress + shrine count */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					width: "100%",
				}}
			>
				{/* Doctrine dots */}
				<div
					aria-label={`Doctrines: ${progress.doctrinesUnlocked} of ${DOCTRINES_REQUIRED}`}
					style={{
						display: "flex",
						gap: "3px",
						alignItems: "center",
					}}
				>
					<span
						style={{
							fontFamily: MONO,
							fontSize: "8px",
							color: `${FAITH_COLOR}66`,
							letterSpacing: "0.08em",
						}}
					>
						DOC
					</span>
					{Array.from({ length: Math.min(DOCTRINES_REQUIRED, 10) }).map(
						(_, i) => (
							<div
								key={i}
								aria-hidden="true"
								style={{
									width: "4px",
									height: "4px",
									borderRadius: "50%",
									background:
										i < progress.doctrinesUnlocked
											? FAITH_COLOR
											: `${FAITH_COLOR}22`,
									boxShadow:
										i < progress.doctrinesUnlocked
											? `0 0 3px ${FAITH_COLOR}`
											: "none",
								}}
							/>
						),
					)}
					{DOCTRINES_REQUIRED > 10 && (
						<span
							style={{
								fontFamily: MONO,
								fontSize: "8px",
								color: `${FAITH_COLOR}44`,
							}}
						>
							+{DOCTRINES_REQUIRED - 10}
						</span>
					)}
				</div>

				{/* Shrine count */}
				<div
					aria-label={`Shrines: ${shrines.length}`}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span
						style={{
							fontFamily: MONO,
							fontSize: "8px",
							color: `${FAITH_COLOR}66`,
							letterSpacing: "0.08em",
						}}
					>
						SHRINE
					</span>
					<span
						style={{
							fontFamily: MONO,
							fontSize: "9px",
							color:
								shrines.length > 0 ? `${FAITH_COLOR}cc` : `${FAITH_COLOR}33`,
						}}
					>
						{shrines.length}
					</span>
				</div>
			</div>

			{/* Grand Cathedral indicator — only when built */}
			{progress.grandCathedralBuilt && (
				<div
					aria-label="Grand Cathedral built"
					style={{
						fontFamily: MONO,
						fontSize: "7px",
						color: FAITH_COLOR,
						letterSpacing: "0.2em",
						textAlign: "center",
						textShadow: `0 0 4px ${FAITH_COLOR}`,
					}}
				>
					CATHEDRAL STANDS
				</div>
			)}

			{/* Doctrine bar fill (separate row, thinner) */}
			<div
				role="progressbar"
				aria-valuenow={Math.round(doctrinesFill * 100)}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={`Doctrine progress: ${progress.doctrinesUnlocked} of ${DOCTRINES_REQUIRED}`}
				style={{
					width: "100%",
					height: "2px",
					background: FAITH_COLOR_GLOW,
					borderRadius: "1px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: `${doctrinesFill * 100}%`,
						height: "100%",
						background: `${FAITH_COLOR}88`,
						borderRadius: "1px",
						transition: "width 0.5s ease-out",
					}}
				/>
			</div>
		</div>
	);
});
