/**
 * PregameScreen — "COLONY MISSION BRIEFING" full-screen configuration overlay.
 *
 * Colonization model: each faction is a colony dispatched by a home planet
 * patron AI. Tabs renamed to match the framing from GDD-010:
 *   PATRON (faction selection) | MAP | RIVALS (opponents) | SETTINGS
 *
 * Industrial mechanical aesthetic: amber-chrome, NOT terminal green.
 * Flow: title -> pregame -> loading -> playing
 */

import { useEffect, useState } from "react";
import { phraseToSeed } from "../ecs/seed";
import type { FactionId } from "./FactionSelect";
import { FactionSelect } from "./FactionSelect";
import type { MapSettings } from "./MapConfig";
import { DEFAULT_MAP_SETTINGS, MapConfig } from "./MapConfig";
import type { OpponentSlot } from "./OpponentConfig";
import { OpponentConfig } from "./OpponentConfig";

// ---------------------------------------------------------------------------
// Design tokens — shared with TitleScreen
// ---------------------------------------------------------------------------

import { FONT_MONO, menu } from "./designTokens";

const MONO = FONT_MONO;
const COLOR_ACCENT = menu.accent;
const COLOR_ACCENT_DIM = menu.accentDim;
const COLOR_ACCENT_MUTED = menu.accentMuted;
const COLOR_CHROME = menu.chrome;
const BG_INSET = menu.bgInset;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "patron" | "map" | "rivals" | "settings";

export interface PregameConfig {
	faction: FactionId;
	mapSettings: MapSettings;
	opponents: OpponentSlot[];
}

interface PregameScreenProps {
	onStart: (config: PregameConfig) => void;
	onBack: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PregameScreen({ onStart, onBack }: PregameScreenProps) {
	const [activeTab, setActiveTab] = useState<Tab>("patron");
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

	// Periodic glitch on header
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

	const seedValid = phraseToSeed(mapSettings.seedPhrase) !== null;

	const handleStart = () => {
		if (!seedValid) return;
		onStart({ faction, mapSettings, opponents });
	};

	const tabs: { id: Tab; label: string }[] = [
		{ id: "patron", label: "PATRON" },
		{ id: "map", label: "MAP" },
		{ id: "rivals", label: "RIVALS" },
		{ id: "settings", label: "SETTINGS" },
	];

	return (
		<div
			role="main"
			aria-label="Colony Mission Briefing"
			style={{
				position: "absolute",
				inset: 0,
				background: "#05070a",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				zIndex: 200,
				opacity: fadeIn,
				transition: "opacity 0.4s ease-in-out",
				overflow: "hidden",
			}}
		>
			{/* Background: rivet dot grid */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage:
						"radial-gradient(circle, rgba(232,160,32,0.04) 1px, transparent 1px)",
					backgroundSize: "40px 40px",
					pointerEvents: "none",
				}}
			/>
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse 90% 80% at 50% 30%, transparent 50%, rgba(0,0,0,0.6) 100%)",
					pointerEvents: "none",
				}}
			/>

			{/* Top edge rule */}
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: "3px",
					background: `linear-gradient(90deg, transparent 0%, ${COLOR_ACCENT} 20%, ${COLOR_CHROME} 50%, ${COLOR_ACCENT} 80%, transparent 100%)`,
				}}
			/>

			{/* Content container */}
			<div
				style={{
					position: "relative",
					zIndex: 1,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					width: "min(960px, 94vw)",
					height: "100%",
					paddingTop: `max(20px, calc(env(safe-area-inset-top, 0px) + 20px))`,
					paddingBottom: `max(20px, calc(env(safe-area-inset-bottom, 0px) + 20px))`,
				}}
			>
				{/* Header */}
				<div
					style={{
						fontFamily: MONO,
						fontSize: "clamp(9px, 1.8vw, 11px)",
						color: COLOR_ACCENT_DIM,
						letterSpacing: "0.5em",
						marginBottom: "8px",
						textAlign: "center",
						textTransform: "uppercase",
					}}
				>
					// COLONY MISSION BRIEFING //
				</div>

				<div
					style={{
						width: "clamp(180px, 55vw, 520px)",
						height: "1px",
						background: `linear-gradient(90deg, transparent, ${COLOR_ACCENT_MUTED}, ${COLOR_CHROME}, ${COLOR_ACCENT_MUTED}, transparent)`,
						marginBottom: "12px",
					}}
				/>

				<h1
					style={{
						fontFamily: MONO,
						fontSize: "clamp(18px, 4.5vw, 28px)",
						fontWeight: "bold",
						letterSpacing: "0.2em",
						color: COLOR_ACCENT,
						textShadow: glitch
							? `3px 0 #cc3322, -3px 0 #0044cc, 0 0 24px rgba(232,160,32,0.5)`
							: `0 0 20px rgba(232,160,32,0.3)`,
						transform: glitch
							? `translate(${Math.random() * 3 - 1.5}px, ${Math.random() * 2 - 1}px)`
							: "none",
						userSelect: "none",
						marginBottom: "4px",
					}}
				>
					MISSION CONFIGURATION
				</h1>

				<div
					style={{
						fontFamily: MONO,
						fontSize: "10px",
						color: `rgba(184,196,204,0.4)`,
						letterSpacing: "0.35em",
						marginBottom: "20px",
					}}
				>
					SELECT PATRON — CONFIGURE DEPLOYMENT — DESIGNATE RIVALS
				</div>

				{/* Tab bar */}
				<div
					role="tablist"
					aria-label="Mission configuration tabs"
					style={{
						display: "flex",
						gap: "2px",
						marginBottom: "16px",
						width: "100%",
						maxWidth: "520px",
						background: BG_INSET,
						border: `1px solid ${COLOR_ACCENT_MUTED}`,
						borderRadius: "4px",
						padding: "3px",
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
					role="tabpanel"
					style={{
						flex: 1,
						width: "100%",
						overflowY: "auto",
						overflowX: "hidden",
						paddingBottom: "16px",
						scrollbarWidth: "thin",
						scrollbarColor: `${COLOR_ACCENT_MUTED} transparent`,
					}}
				>
					{activeTab === "patron" && (
						<FactionSelect selected={faction} onSelect={setFaction} />
					)}
					{activeTab === "map" && (
						<MapConfig settings={mapSettings} onChange={setMapSettings} />
					)}
					{activeTab === "rivals" && (
						<OpponentConfig
							opponents={opponents}
							playerFaction={faction}
							onChange={setOpponents}
						/>
					)}
					{activeTab === "settings" && <SettingsPlaceholder />}
				</div>

				{/* Bottom actions */}
				<div
					style={{
						display: "flex",
						gap: "10px",
						width: "100%",
						maxWidth: "520px",
						marginTop: "8px",
					}}
				>
					<ActionButton
						label="ABORT MISSION"
						onClick={onBack}
						aria-label="Return to title screen"
					/>
					<ActionButton
						label="LAUNCH COLONY"
						onClick={handleStart}
						primary
						disabled={!seedValid}
						aria-label={
							seedValid
								? "Launch colony mission"
								: "Mission seed is invalid — cannot launch"
						}
					/>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Settings placeholder (will be built in task #51)
// ---------------------------------------------------------------------------

function SettingsPlaceholder() {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "40px 20px",
				fontFamily: MONO,
				color: COLOR_ACCENT_DIM,
				textAlign: "center",
				gap: "12px",
			}}
		>
			<div style={{ fontSize: "13px", letterSpacing: "0.15em" }}>
				SETTINGS
			</div>
			<div
				style={{
					fontSize: "11px",
					color: `rgba(184,196,204,0.3)`,
					letterSpacing: "0.1em",
				}}
			>
				Graphics, audio, and control settings will appear here.
			</div>
			<div
				style={{
					fontSize: "10px",
					color: COLOR_ACCENT_MUTED,
					letterSpacing: "0.15em",
				}}
			>
				// COMING SOON //
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

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
			role="tab"
			aria-selected={isActive}
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				flex: 1,
				background: isActive
					? `rgba(232,160,32,0.12)`
					: hovered
						? `rgba(232,160,32,0.05)`
						: "transparent",
				border: "none",
				borderBottom: isActive
					? `2px solid ${COLOR_ACCENT}`
					: "2px solid transparent",
				borderRadius: "3px",
				padding: "8px 0",
				cursor: "pointer",
				fontFamily: MONO,
				fontSize: "clamp(10px, 2.5vw, 12px)",
				letterSpacing: "0.15em",
				color: isActive ? COLOR_ACCENT : `rgba(184,196,204,0.5)`,
				transition: "all 0.15s ease",
				textShadow: isActive ? `0 0 8px rgba(232,160,32,0.4)` : "none",
				minHeight: "36px",
			}}
		>
			{label}
		</button>
	);
}

// ---------------------------------------------------------------------------
// Action button
// ---------------------------------------------------------------------------

function ActionButton({
	label,
	onClick,
	primary,
	disabled,
	"aria-label": ariaLabel,
}: {
	label: string;
	onClick: () => void;
	primary?: boolean;
	disabled?: boolean;
	"aria-label"?: string;
}) {
	const [hovered, setHovered] = useState(false);

	const bg = disabled
		? "transparent"
		: hovered
			? primary
				? `rgba(232,160,32,0.14)`
				: `rgba(184,196,204,0.06)`
			: "transparent";

	const borderColor = disabled
		? COLOR_ACCENT_MUTED
		: hovered
			? primary
				? COLOR_ACCENT
				: `rgba(184,196,204,0.45)`
			: primary
				? COLOR_ACCENT_MUTED
				: `rgba(184,196,204,0.2)`;

	const textColor = disabled
		? `rgba(232,160,32,0.18)`
		: primary
			? COLOR_ACCENT
			: COLOR_CHROME;

	return (
		<button
			onClick={disabled ? undefined : onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			disabled={disabled}
			aria-label={ariaLabel}
			style={{
				flex: primary ? 2 : 1,
				background: bg,
				color: textColor,
				border: `1px solid ${borderColor}`,
				borderRadius: "3px",
				padding: "12px 0",
				fontSize: "clamp(12px, 3vw, 14px)",
				fontFamily: MONO,
				letterSpacing: "0.2em",
				cursor: disabled ? "default" : "pointer",
				transition: "all 0.15s ease",
				textShadow:
					!disabled && hovered && primary
						? `0 0 12px rgba(232,160,32,0.5)`
						: "none",
				boxShadow:
					primary && hovered && !disabled
						? `0 0 16px rgba(232,160,32,0.15), inset 0 0 16px rgba(232,160,32,0.04)`
						: "none",
				minHeight: "48px",
			}}
		>
			{primary && !disabled ? `[ ${label} ]` : label}
		</button>
	);
}
