/**
 * NewGameModal — New Campaign setup screen.
 *
 * Collects world configuration before starting a new game:
 *   - Sector scale (fixed presets — Small / Standard / Large)
 *   - World seed (adj-adj-noun phrase, randomisable)
 *   - Difficulty, Sector Geography
 *   - Faction roles: Player / AI / Off (radio for player selection)
 *
 * Produces a NewGameConfig on submit.
 */

import { useRef, useState } from "react";
import { FACTION_DEFINITIONS } from "../../factions/definitions";
import { phraseToSeed, randomSeed, seedToPhrase } from "../../seed";
import {
	CLIMATE_PROFILE_SPECS,
	type ClimateProfile,
	DEFAULT_NEW_GAME_CONFIG,
	DIFFICULTY_LABELS,
	type Difficulty,
	type FactionSlot,
	type NewGameConfig,
	SECTOR_SCALE_SPECS,
	type SectorScale,
} from "../../world/config";

// ─── Types ───────────────────────────────────────────────────────────────────

export type { FactionSlot };

type NewGameModalProps = {
	onStart: (config: NewGameConfig) => void;
	onCancel: () => void;
};

// ─── Constants ───────────────────────────────────────────────────────────────

type FactionRole = "player" | "ai" | "off";

const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
	story: "Reduced pressure. Focus on the narrative.",
	standard: "Balanced challenge across all phases.",
	hard: "Aggressive factions, scarce resources.",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function NewGameModal({ onStart, onCancel }: NewGameModalProps) {
	const [sectorScale, setSectorScale] = useState<SectorScale>(
		DEFAULT_NEW_GAME_CONFIG.sectorScale,
	);
	const [seedPhrase, setSeedPhrase] = useState<string>(() =>
		seedToPhrase(randomSeed()),
	);
	const [difficulty, setDifficulty] = useState<Difficulty>(
		DEFAULT_NEW_GAME_CONFIG.difficulty,
	);
	const [climateProfile, setClimateProfile] = useState<ClimateProfile>(
		DEFAULT_NEW_GAME_CONFIG.climateProfile,
	);
	// Faction roles: each of the 4 factions can be player/ai/off
	const [factionRoles, setFactionRoles] = useState<Record<string, FactionRole>>(
		() => {
			const init: Record<string, FactionRole> = {};
			for (const slot of DEFAULT_NEW_GAME_CONFIG.factions) {
				init[slot.factionId] = slot.role;
			}
			return init;
		},
	);

	const cancelRef = useRef<HTMLButtonElement>(null);

	function handleReseed() {
		setSeedPhrase(seedToPhrase(randomSeed()));
	}

	/** Set a faction's role. If setting to "player", clear any other player selection. */
	function setRole(factionId: string, role: FactionRole) {
		setFactionRoles((prev) => {
			const next = { ...prev };
			if (role === "player") {
				// Only one faction can be player — clear others
				for (const key of Object.keys(next)) {
					if (next[key] === "player") next[key] = "ai";
				}
			}
			next[factionId] = role;
			return next;
		});
	}

	/** Toggle player radio: click to select, click again to deselect (observer mode). */
	function handlePlayerRadio(factionId: string) {
		const current = factionRoles[factionId];
		if (current === "player") {
			// Deselect — revert to AI (no human player)
			setRole(factionId, "ai");
		} else {
			// Select as player
			setRole(factionId, "player");
		}
	}

	/** Cycle non-player role: ai → off → ai */
	function handleRoleCycle(factionId: string) {
		const current = factionRoles[factionId];
		if (current === "player") return; // player radio handles this
		setRole(factionId, current === "ai" ? "off" : "ai");
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const worldSeed = phraseToSeed(seedPhrase.trim()) ?? randomSeed();

		const factions: FactionSlot[] = FACTION_DEFINITIONS.map((f) => ({
			factionId: f.id,
			role: factionRoles[f.id] ?? "ai",
		}));

		const config: NewGameConfig = {
			worldSeed,
			sectorScale,
			difficulty,
			climateProfile,
			stormProfile: DEFAULT_NEW_GAME_CONFIG.stormProfile,
			factions,
		};

		onStart(config);
	}

	const playerFactionId = Object.entries(factionRoles).find(
		([, r]) => r === "player",
	)?.[0];

	return (
		<div
			data-testid="new-game-modal"
			className="absolute inset-0 flex items-center justify-center"
			style={{
				backgroundColor: "rgba(2, 5, 10, 0.88)",
				zIndex: 20,
				pointerEvents: "auto",
			}}
			role="dialog"
			aria-label="Initialize Sector"
			aria-modal={true}
		>
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-[680px] max-h-[92dvh] rounded-[20px] border border-[#8be6ff]/18 bg-[#07111b]/98 shadow-2xl flex flex-col overflow-hidden"
				style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
			>
				{/* ── Header ──────────────────────────────────────────────── */}
				<div className="flex-shrink-0 flex items-center justify-between border-b border-white/8 bg-[#081723]/96 px-5 py-4">
					<span className="text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
						Initialize Sector
					</span>
					<button
						type="button"
						ref={cancelRef}
						onClick={onCancel}
						data-testid="cancel-btn"
						className="h-8 w-8 flex items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/50 hover:text-white/80"
						aria-label="Cancel"
					>
						<span className="text-[16px]">{"\u00D7"}</span>
					</button>
				</div>

				{/* ── Scrollable body ─────────────────────────────────────── */}
				<div className="flex-1 overflow-y-auto">
					<div className="px-5 py-5 flex flex-col gap-5">
						{/* ── Sector Scale ─────────────────────────────── */}
						<Section title="Sector Scale">
							<div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
								{(Object.keys(SECTOR_SCALE_SPECS) as SectorScale[]).map(
									(scale) => {
										const spec = SECTOR_SCALE_SPECS[scale];
										return (
											<OptionCard
												key={scale}
												testId={`scale-${scale}`}
												selected={sectorScale === scale}
												onClick={() => setSectorScale(scale)}
											>
												<span className="text-[13px] text-[#8be6ff] font-medium">
													{spec.label}
												</span>
												<span className="text-[10px] text-white/40 mt-0.5">
													{spec.width}&times;{spec.height}
												</span>
												<span className="text-[10px] text-white/36 mt-1 leading-4">
													{spec.description}
												</span>
											</OptionCard>
										);
									},
								)}
							</div>
						</Section>

						{/* ── World Seed ───────────────────────────────── */}
						<Section title="World Seed">
							<div className="flex gap-2 items-center">
								<input
									data-testid="seed-input"
									type="text"
									value={seedPhrase}
									onChange={(e) => setSeedPhrase(e.target.value)}
									className="flex-1 rounded-[10px] border border-white/12 bg-white/4 px-3 py-2 text-[12px] text-[#8be6ff] placeholder:text-white/24 outline-none focus:border-[#8be6ff]/40"
									spellCheck={false}
									autoComplete="off"
									aria-label="World seed phrase"
								/>
								<button
									data-testid="reseed-btn"
									type="button"
									onClick={handleReseed}
									className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-[10px] border border-white/12 bg-white/5 text-white/50 hover:text-[#8be6ff]"
									aria-label="Generate new seed"
									title="Randomise seed"
								>
									<span className="text-[14px]">{"\u21BB"}</span>
								</button>
							</div>
							<span className="text-[10px] text-white/30 mt-1 block">
								adj-adj-noun phrase &mdash; any text is accepted
							</span>
						</Section>

						{/* ── Difficulty ───────────────────────────────── */}
						<Section title="Difficulty">
							<div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
								{(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
									<OptionCard
										key={d}
										testId={`difficulty-${d}`}
										selected={difficulty === d}
										onClick={() => setDifficulty(d)}
									>
										<span className="text-[13px] text-[#8be6ff]">
											{DIFFICULTY_LABELS[d]}
										</span>
										<span className="text-[10px] text-white/36 mt-1 leading-4">
											{DIFFICULTY_DESCRIPTIONS[d]}
										</span>
									</OptionCard>
								))}
							</div>
						</Section>

						{/* ── Sector Geography ─────────────────────────── */}
						<Section title="Sector Geography">
							<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
								{(Object.keys(CLIMATE_PROFILE_SPECS) as ClimateProfile[]).map(
									(cp) => {
										const spec = CLIMATE_PROFILE_SPECS[cp];
										return (
											<OptionCard
												key={cp}
												testId={`climate-${cp}`}
												selected={climateProfile === cp}
												onClick={() => setClimateProfile(cp)}
												flex="1 1 40%"
											>
												<span className="text-[12px] text-[#8be6ff]">
													{spec.label}
												</span>
												<span className="text-[10px] text-white/36 mt-1 leading-4">
													{spec.description}
												</span>
											</OptionCard>
										);
									},
								)}
							</div>
						</Section>

						{/* ── Factions ─────────────────────────────────── */}
						<Section title="Factions">
							<div className="flex flex-col gap-2">
								{FACTION_DEFINITIONS.map((faction) => {
									const hex = `#${faction.color.toString(16).padStart(6, "0")}`;
									const role = factionRoles[faction.id] ?? "ai";
									const isPlayer = role === "player";
									const isOff = role === "off";

									return (
										<div
											key={faction.id}
											className="flex items-center gap-3 rounded-[10px] border px-3 py-2.5"
											style={{
												borderColor: isPlayer
													? `${hex}66`
													: isOff
														? "rgba(255,255,255,0.04)"
														: "rgba(255,255,255,0.08)",
												backgroundColor: isPlayer
													? `${hex}0d`
													: "rgba(8, 19, 26, 0.6)",
												opacity: isOff ? 0.45 : 1,
											}}
										>
											{/* Player radio */}
											<button
												type="button"
												onClick={() => handlePlayerRadio(faction.id)}
												data-testid={`faction-${faction.id}-player-radio`}
												className="h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
												style={{
													borderColor: isPlayer ? hex : "rgba(255,255,255,0.2)",
												}}
												aria-label={`Select ${faction.displayName} as player`}
												title="Click to play as this faction. Click again to deselect."
											>
												{isPlayer && (
													<span
														className="block h-2.5 w-2.5 rounded-full"
														style={{ backgroundColor: hex }}
													/>
												)}
											</button>

											{/* Color dot + name */}
											<span
												className="inline-block h-3 w-3 rounded-full flex-shrink-0"
												style={{ backgroundColor: hex }}
											/>
											<span className="flex-1 text-[11px] text-white/70">
												{faction.displayName}
											</span>

											{/* Role label */}
											<span className="text-[9px] uppercase tracking-[0.14em] text-white/35 w-12 text-right">
												{isPlayer ? "YOU" : role.toUpperCase()}
											</span>

											{/* AI/Off toggle (only for non-player factions) */}
											{!isPlayer && (
												<button
													type="button"
													onClick={() => handleRoleCycle(faction.id)}
													data-testid={`faction-${faction.id}-role`}
													className="h-7 px-2 rounded text-[9px] uppercase tracking-[0.12em] border transition-colors"
													style={{
														borderColor: isOff
															? "rgba(255,255,255,0.06)"
															: "rgba(255,255,255,0.12)",
														color: isOff
															? "rgba(255,255,255,0.2)"
															: "rgba(255,255,255,0.5)",
														backgroundColor: "transparent",
													}}
													title={
														isOff ? "Click to enable (AI)" : "Click to disable"
													}
												>
													{isOff ? "OFF" : "AI"}
												</button>
											)}
										</div>
									);
								})}
							</div>
							{!playerFactionId && (
								<span className="text-[10px] text-white/30 mt-2 block">
									No player selected &mdash; observer mode (cultists only)
								</span>
							)}
						</Section>
					</div>
				</div>

				{/* ── Footer ──────────────────────────────────────────────── */}
				<div className="flex-shrink-0 border-t border-white/8 px-5 py-4 flex gap-3">
					<button
						type="submit"
						data-testid="start-btn"
						className="flex-1 h-10 rounded-[10px] border border-[#8be6ff]/30 bg-[#8be6ff]/8 text-[11px] uppercase tracking-[0.22em] text-[#8be6ff] hover:bg-[#8be6ff]/14"
					>
						Initialize Sector
					</button>
				</div>
			</form>
		</div>
	);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-[14px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
			<span className="text-[10px] uppercase tracking-[0.24em] text-[#90ddec] mb-3 block">
				{title}
			</span>
			{children}
		</div>
	);
}

function OptionCard({
	children,
	selected,
	onClick,
	testId,
	flex,
}: {
	children: React.ReactNode;
	selected: boolean;
	onClick: () => void;
	testId?: string;
	flex?: string;
}) {
	return (
		<button
			type="button"
			data-testid={testId}
			onClick={onClick}
			className="flex flex-col text-left rounded-[10px] border px-3 py-2.5 transition-colors flex-1"
			style={{
				flex,
				borderColor: selected
					? "rgba(139, 230, 255, 0.45)"
					: "rgba(255,255,255,0.08)",
				backgroundColor: selected
					? "rgba(139, 230, 255, 0.07)"
					: "rgba(255,255,255,0.02)",
			}}
			aria-pressed={selected}
		>
			{children}
		</button>
	);
}
