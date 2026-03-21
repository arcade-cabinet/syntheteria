/**
 * BuildingProgressionOverlay — replaces TechTreeOverlay.
 * Shows all building types as a grid of cards with unlock chains visualized.
 * Click a building → opens its modal.
 */

import type { World } from "koota";
import { useMemo } from "react";
import { BUILDING_DEFS } from "../../config/buildings";
import {
	BUILDING_UNLOCK_CHAINS,
	isBuildingUnlocked,
	STARTER_BUILDINGS,
} from "../../config/buildingUnlockDefs";
import { Building, type BuildingType } from "../../traits";

interface BuildingProgressionOverlayProps {
	world: World;
	factionId: string;
	onClose: () => void;
	onSelectBuilding?: (entityId: number) => void;
}

interface BuildingCard {
	type: BuildingType;
	displayName: string;
	unlocked: boolean;
	maxTierOwned: number;
	count: number;
	unlockedBy: string | null;
	unlocks: BuildingType[];
}

const ALL_BUILDING_TYPES: BuildingType[] = Object.keys(
	BUILDING_DEFS,
) as BuildingType[];

export function BuildingProgressionOverlay({
	world,
	factionId,
	onClose,
	onSelectBuilding,
}: BuildingProgressionOverlayProps) {
	const ownedBuildings = useMemo(() => {
		const map = new Map<BuildingType, number>();
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (!b || b.factionId !== factionId) continue;
			const existing = map.get(b.buildingType as BuildingType) ?? 0;
			map.set(
				b.buildingType as BuildingType,
				Math.max(existing, b.buildingTier),
			);
		}
		return map;
	}, [world, factionId]);

	const buildingCounts = useMemo(() => {
		const counts = new Map<BuildingType, number>();
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (!b || b.factionId !== factionId) continue;
			counts.set(
				b.buildingType as BuildingType,
				(counts.get(b.buildingType as BuildingType) ?? 0) + 1,
			);
		}
		return counts;
	}, [world, factionId]);

	const cards: BuildingCard[] = useMemo(() => {
		return ALL_BUILDING_TYPES.map((type) => {
			const def = BUILDING_DEFS[type];
			const unlocked = isBuildingUnlocked(type, ownedBuildings);
			const maxTierOwned = ownedBuildings.get(type) ?? 0;
			const count = buildingCounts.get(type) ?? 0;

			let unlockedBy: string | null = null;
			for (const [ownerType, chainDef] of Object.entries(
				BUILDING_UNLOCK_CHAINS,
			)) {
				if (!chainDef) continue;
				if (chainDef.unlocksAtTier2?.includes(type)) {
					unlockedBy = `${ownerType.replace(/_/g, " ")} T2`;
				}
				if (chainDef.unlocksAtTier3?.includes(type)) {
					unlockedBy = `${ownerType.replace(/_/g, " ")} T3`;
				}
			}

			const chain =
				BUILDING_UNLOCK_CHAINS[type as keyof typeof BUILDING_UNLOCK_CHAINS];
			const unlocks: BuildingType[] = [
				...(chain?.unlocksAtTier2 ?? []),
				...(chain?.unlocksAtTier3 ?? []),
			];

			return {
				type,
				displayName: def.displayName,
				unlocked,
				maxTierOwned,
				count,
				unlockedBy,
				unlocks,
			};
		});
	}, [ownedBuildings, buildingCounts]);

	const starterCards = cards.filter((c) =>
		(STARTER_BUILDINGS as readonly string[]).includes(c.type),
	);
	const alwaysAvailable = cards.filter(
		(c) =>
			!starterCards.includes(c) &&
			(c.type === "synthesizer" || c.type === "analysis_node"),
	);
	const unlockableCards = cards.filter(
		(c) => !starterCards.includes(c) && !alwaysAvailable.includes(c),
	);

	function handleCardClick(type: BuildingType) {
		if (!onSelectBuilding) return;
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b && b.buildingType === type && b.factionId === factionId) {
				onSelectBuilding(e.id());
				return;
			}
		}
	}

	return (
		<div
			data-testid="building-progression-overlay"
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
					Building Progression
				</span>
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

			{/* Body */}
			<div style={{ flex: 1, overflow: "auto", padding: 20 }}>
				<SectionTitle title="Starter Buildings" />
				<CardGrid cards={starterCards} onCardClick={handleCardClick} />

				<SectionTitle title="Core Buildings" />
				<CardGrid cards={alwaysAvailable} onCardClick={handleCardClick} />

				<SectionTitle title="Unlockable Buildings" />
				<CardGrid cards={unlockableCards} onCardClick={handleCardClick} />

				<div
					style={{
						textAlign: "center",
						padding: "16px 0",
						fontSize: 9,
						color: "rgba(255,255,255,0.25)",
					}}
				>
					Click an owned building to open its management panel. Upgrade
					buildings to unlock new types.
				</div>
			</div>
		</div>
	);
}

function SectionTitle({ title }: { title: string }) {
	return (
		<div
			style={{
				fontSize: 10,
				textTransform: "uppercase",
				letterSpacing: "0.2em",
				color: "#90ddec",
				margin: "16px 0 10px",
				borderBottom: "1px solid rgba(255,255,255,0.06)",
				paddingBottom: 6,
			}}
		>
			{title}
		</div>
	);
}

function CardGrid({
	cards,
	onCardClick,
}: {
	cards: BuildingCard[];
	onCardClick: (type: BuildingType) => void;
}) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
				gap: 10,
			}}
		>
			{cards.map((card) => (
				<BuildingCardView
					key={card.type}
					card={card}
					onClick={() => onCardClick(card.type)}
				/>
			))}
		</div>
	);
}

function BuildingCardView({
	card,
	onClick,
}: {
	card: BuildingCard;
	onClick: () => void;
}) {
	const { displayName, unlocked, maxTierOwned, count, unlockedBy, unlocks } =
		card;
	const isOwned = count > 0;

	const borderColor = isOwned
		? "rgba(126, 231, 203, 0.5)"
		: unlocked
			? "rgba(139, 230, 255, 0.3)"
			: "rgba(255,255,255,0.06)";

	const bgColor = isOwned
		? "rgba(126, 231, 203, 0.06)"
		: unlocked
			? "rgba(139, 230, 255, 0.03)"
			: "rgba(8, 19, 26, 0.5)";

	return (
		<div
			onClick={isOwned ? onClick : undefined}
			style={{
				padding: "10px 12px",
				borderRadius: 8,
				border: `1px solid ${borderColor}`,
				background: bgColor,
				opacity: unlocked ? 1 : 0.4,
				cursor: isOwned ? "pointer" : "default",
				transition: "border-color 0.15s",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span
					style={{
						fontSize: 11,
						color: isOwned ? "#7ee7cb" : "#8be6ff",
						fontWeight: 600,
					}}
				>
					{displayName}
				</span>
				{isOwned && (
					<span style={{ fontSize: 8, color: "#7ee7cb" }}>×{count}</span>
				)}
			</div>

			{/* Tier indicators */}
			<div style={{ display: "flex", gap: 3, marginTop: 6 }}>
				{[1, 2, 3].map((tier) => (
					<div
						key={tier}
						style={{
							width: 24,
							height: 4,
							borderRadius: 2,
							background:
								tier <= maxTierOwned ? "#7ee7cb" : "rgba(255,255,255,0.08)",
						}}
					/>
				))}
				<span
					style={{
						fontSize: 8,
						color: "rgba(255,255,255,0.35)",
						marginLeft: 4,
					}}
				>
					T{maxTierOwned || "—"}
				</span>
			</div>

			{/* Unlock info */}
			{!unlocked && unlockedBy && (
				<div
					style={{
						fontSize: 8,
						color: "rgba(255,255,255,0.3)",
						marginTop: 4,
						fontStyle: "italic",
					}}
				>
					Requires: {unlockedBy}
				</div>
			)}

			{/* What this unlocks */}
			{unlocks.length > 0 && (
				<div
					style={{ fontSize: 8, color: "rgba(139,230,255,0.4)", marginTop: 4 }}
				>
					Unlocks:{" "}
					{unlocks.map((t) => BUILDING_DEFS[t]?.displayName ?? t).join(", ")}
				</div>
			)}
		</div>
	);
}
