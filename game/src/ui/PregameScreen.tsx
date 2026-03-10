/**
 * PregameScreen — full-screen pregame configuration overlay.
 *
 * Three tabs: Faction, Map, Opponents.
 * Matches the glitch/industrial aesthetic of the title screen.
 * "Start Game" button enabled once all settings are configured.
 *
 * Flow: title -> pregame -> narration -> playing
 */

import { useEffect, useState } from "react";
import { phraseToSeed } from "../ecs/seed";
import type { FactionId } from "./FactionSelect";
import { FactionSelect } from "./FactionSelect";
import type { MapSettings } from "./MapConfig";
import { DEFAULT_MAP_SETTINGS, MapConfig } from "./MapConfig";
import type { OpponentSlot } from "./OpponentConfig";
import { OpponentConfig } from "./OpponentConfig";

const MONO = "'Courier New', monospace";

type Tab = "faction" | "map" | "opponents";

export interface PregameConfig {
	faction: FactionId;
	mapSettings: MapSettings;
	opponents: OpponentSlot[];
}

interface PregameScreenProps {
	onStart: (config: PregameConfig) => void;
	onBack: () => void;
}

export function PregameScreen({ onStart, onBack }: PregameScreenProps) {
	const [activeTab, setActiveTab] = useState<Tab>("faction");
	const [faction, setFaction] = useState<FactionId>("reclaimers");
	const [mapSettings, setMapSettings] = useState<MapSettings>(
		DEFAULT_MAP_SETTINGS,
	);
	const [opponents, setOpponents] = useState<OpponentSlot[]>([
		{ faction: "volt_collective", difficulty: "normal" },
		{ faction: "signal_choir", difficulty: "normal" },
		{ faction: "iron_creed", difficulty: "normal" },
	]);
	const [fadeIn, setFadeIn] = useState(0);
	const [glitch, setGlitch] = useState(false);

	// Fade in on mount
	useEffect(() => {
		const t = setTimeout(() => setFadeIn(1), 50);
		return () => clearTimeout(t);
	}, []);

	// Periodic glitch effect on header
	useEffect(() => {
		const interval = setInterval(
			() => {
				setGlitch(true);
				setTimeout(() => setGlitch(false), 80 + Math.random() * 120);
			},
			4000 + Math.random() * 5000,
		);
		return () => clearInterval(interval);
	}, []);

	// Validate seed before starting
	const seedValid = phraseToSeed(mapSettings.seedPhrase) !== null;

	const handleStart = () => {
		if (!seedValid) return;
		onStart({ faction, mapSettings, opponents });
	};

	const tabs: { id: Tab; label: string }[] = [
		{ id: "faction", label: "FACTION" },
		{ id: "map", label: "MAP" },
		{ id: "opponents", label: "OPPONENTS" },
	];

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "#000",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				zIndex: 200,
				opacity: fadeIn,
				transition: "opacity 0.4s ease-in-out",
				overflow: "hidden",
			}}
		>
			{/* Scanline overlay */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,170,0.03) 2px, rgba(0,255,170,0.03) 4px)",
					pointerEvents: "none",
					zIndex: 1,
				}}
			/>

			{/* Content container */}
			<div
				style={{
					position: "relative",
					zIndex: 2,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					width: "min(960px, 94vw)",
					height: "100%",
					paddingTop: "max(20px, env(safe-area-inset-top, 20px))",
					paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
				}}
			>
				{/* Header */}
				<div
					style={{
						fontFamily: MONO,
						fontSize: "clamp(20px, 5vw, 32px)",
						fontWeight: "bold",
						letterSpacing: "0.2em",
						color: "#00ffaa",
						textShadow: glitch
							? "2px 0 #ff0044, -2px 0 #0044ff, 0 0 30px rgba(0,255,170,0.6)"
							: "0 0 30px rgba(0,255,170,0.3)",
						transform: glitch
							? `translate(${Math.random() * 3 - 1.5}px, ${Math.random() * 2 - 1}px)`
							: "none",
						userSelect: "none",
						marginBottom: "4px",
					}}
				>
					CONFIGURE
				</div>
				<div
					style={{
						fontFamily: MONO,
						fontSize: "10px",
						color: "#00ffaa44",
						letterSpacing: "0.4em",
						marginBottom: "16px",
					}}
				>
					INITIALIZE PARAMETERS
				</div>

				{/* Tab bar */}
				<div
					style={{
						display: "flex",
						gap: "4px",
						marginBottom: "16px",
						width: "100%",
						maxWidth: "480px",
					}}
				>
					{tabs.map((tab) => (
						<TabButton
							key={tab.id}
							label={tab.label}
							isActive={activeTab === tab.id}
							onClick={() => setActiveTab(tab.id)}
						/>
					))}
				</div>

				{/* Tab content — scrollable */}
				<div
					style={{
						flex: 1,
						width: "100%",
						overflowY: "auto",
						overflowX: "hidden",
						paddingBottom: "16px",
						// Custom scrollbar styling
						scrollbarWidth: "thin",
						scrollbarColor: "#00ffaa33 transparent",
					}}
				>
					{activeTab === "faction" && (
						<FactionSelect
							selected={faction}
							onSelect={setFaction}
						/>
					)}
					{activeTab === "map" && (
						<MapConfig
							settings={mapSettings}
							onChange={setMapSettings}
						/>
					)}
					{activeTab === "opponents" && (
						<OpponentConfig
							opponents={opponents}
							playerFaction={faction}
							onChange={setOpponents}
						/>
					)}
				</div>

				{/* Bottom actions */}
				<div
					style={{
						display: "flex",
						gap: "12px",
						width: "100%",
						maxWidth: "480px",
						marginTop: "8px",
					}}
				>
					<ActionButton
						label="BACK"
						onClick={onBack}
					/>
					<ActionButton
						label="START GAME"
						onClick={handleStart}
						primary
						disabled={!seedValid}
					/>
				</div>
			</div>
		</div>
	);
}

function TabButton({
	label,
	isActive,
	onClick,
}: {
	label: string;
	isActive: boolean;
	onClick: () => void;
}) {
	const [hovered, setHovered] = useState(false);

	return (
		<button
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				flex: 1,
				background: isActive
					? "rgba(0,255,170,0.1)"
					: hovered
						? "rgba(0,255,170,0.05)"
						: "transparent",
				border: "none",
				borderBottom: isActive
					? "2px solid #00ffaa"
					: "2px solid transparent",
				padding: "10px 0",
				cursor: "pointer",
				fontFamily: MONO,
				fontSize: "12px",
				letterSpacing: "0.15em",
				color: isActive ? "#00ffaa" : "#00ffaa66",
				transition: "all 0.15s ease",
				textShadow: isActive
					? "0 0 10px rgba(0,255,170,0.4)"
					: "none",
			}}
		>
			{label}
		</button>
	);
}

function ActionButton({
	label,
	onClick,
	primary,
	disabled,
}: {
	label: string;
	onClick: () => void;
	primary?: boolean;
	disabled?: boolean;
}) {
	const [hovered, setHovered] = useState(false);

	return (
		<button
			onClick={disabled ? undefined : onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			disabled={disabled}
			style={{
				flex: primary ? 2 : 1,
				background: disabled
					? "transparent"
					: hovered
						? "rgba(0,255,170,0.15)"
						: "transparent",
				color: disabled ? "rgba(0,255,170,0.25)" : "#00ffaa",
				border: disabled
					? "1px solid rgba(0,255,170,0.15)"
					: primary && hovered
						? "1px solid #00ffaa"
						: "1px solid rgba(0,255,170,0.4)",
				borderRadius: "4px",
				padding: "12px 0",
				fontSize: "clamp(13px, 3vw, 15px)",
				fontFamily: MONO,
				letterSpacing: "0.2em",
				cursor: disabled ? "default" : "pointer",
				transition: "all 0.2s ease",
				textShadow: disabled
					? "none"
					: hovered
						? "0 0 10px rgba(0,255,170,0.5)"
						: "none",
				boxShadow:
					primary && hovered && !disabled
						? "0 0 20px rgba(0,255,170,0.2), inset 0 0 20px rgba(0,255,170,0.05)"
						: "none",
				minHeight: "48px",
			}}
		>
			{primary && !disabled ? `[ ${label} ]` : label}
		</button>
	);
}
