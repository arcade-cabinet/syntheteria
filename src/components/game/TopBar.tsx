/**
 * TopBar — resource badges, game status, speed controls, clock/tick.
 *
 * Sits at the top of the game area as an absolute overlay.
 * All speed controls are clickable buttons (no keyboard required).
 */

import { useCallback, useState, useSyncExternalStore } from "react";
import { getMasterVolume, setMasterVolume } from "../../audio";
import { getTemperatureTier } from "../../config/humanEncounterDefs";
import {
	isPersistenceAvailable,
	listSaves,
	loadGame,
	saveGame,
} from "../../db/persistence";
import {
	getElapsedTicks,
	getGameConfig,
	getSnapshot,
	isPaused,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../../ecs/gameState";
import { world } from "../../ecs/world";
import { cn } from "../../lib/utils";

const SPEED_STEPS = [0.5, 1, 2, 4] as const;

// ─── Sub-components ─────────────────────────────────────────────────────────

function ResourceBadge({
	icon,
	label,
	value,
	colorClass,
}: {
	icon: string;
	label: string;
	value: number;
	colorClass: string;
}) {
	return (
		<span
			title={label}
			className={cn(
				"inline-flex items-center gap-1 rounded px-1.5 py-0.5",
				"bg-black/40 border border-current/20 text-[11px] sm:text-sm font-bold tracking-wide",
				colorClass,
			)}
		>
			<span className="text-[10px] sm:text-[11px] font-normal opacity-70">
				{icon}
			</span>
			<span>{value}</span>
		</span>
	);
}

function TemperatureGauge({ value }: { value: number }) {
	const tierDef = getTemperatureTier(value);
	const pct = Math.max(0, Math.min(100, value));

	return (
		<div
			className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-[13px]"
			title={tierDef.effect}
		>
			<span style={{ color: tierDef.color }} className="whitespace-nowrap">
				<span className="hidden sm:inline">HUMAN: </span>
				{tierDef.displayName.toUpperCase()}
			</span>
			<div className="w-[70px] h-2 bg-white/10 rounded overflow-hidden">
				<div
					className="h-full rounded transition-[width] duration-300"
					style={{ width: `${pct}%`, background: tierDef.color }}
				/>
			</div>
			<span style={{ color: tierDef.color }} className="text-xs">
				{value}
			</span>
		</div>
	);
}

function SpeedButton({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"min-w-[44px] min-h-[44px] md:min-w-[36px] md:min-h-[36px]",
				"flex items-center justify-center rounded",
				"border border-cyan-400 text-xs font-mono cursor-pointer",
				"transition-colors duration-150",
				active
					? "bg-cyan-400 text-slate-950"
					: "bg-transparent text-cyan-400 hover:bg-cyan-400/10",
			)}
		>
			{label}
		</button>
	);
}

function AudioControls() {
	const [muted, setMuted] = useState(false);
	const [volume, setVolume] = useState(() => getMasterVolume());

	const toggleMute = useCallback(() => {
		if (muted) {
			setMasterVolume(volume);
			setMuted(false);
		} else {
			setMasterVolume(0);
			setMuted(true);
		}
	}, [muted, volume]);

	const handleVolumeChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const v = Number.parseFloat(e.target.value);
			setVolume(v);
			setMasterVolume(v);
			if (v > 0) setMuted(false);
		},
		[],
	);

	return (
		<div className="flex items-center gap-1.5">
			<SpeedButton
				label={muted ? "MUTE" : "SND"}
				active={muted}
				onClick={toggleMute}
			/>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={muted ? 0 : volume}
				onChange={handleVolumeChange}
				className="w-[60px] accent-cyan-400 cursor-pointer"
				title={`Volume: ${Math.round((muted ? 0 : volume) * 100)}%`}
			/>
		</div>
	);
}

function SaveLoadControls() {
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<string | null>(null);

	const handleSave = useCallback(async () => {
		if (!isPersistenceAvailable()) {
			setStatus("DB unavailable");
			return;
		}
		setSaving(true);
		setStatus(null);
		try {
			const { seed, difficulty } = getGameConfig();
			const snap = getSnapshot();
			const result = await saveGame(
				world,
				seed,
				difficulty,
				getElapsedTicks(),
				snap.gameSpeed,
			);
			setStatus(result ? "Saved" : "Save failed");
		} catch (e) {
			console.error("[save] save failed:", e);
			setStatus("Save failed");
		} finally {
			setSaving(false);
			setTimeout(() => setStatus(null), 2000);
		}
	}, []);

	const handleLoad = useCallback(async () => {
		if (!isPersistenceAvailable()) {
			setStatus("DB unavailable");
			return;
		}
		setLoading(true);
		setStatus(null);
		try {
			const saves = await listSaves();
			if (saves.length === 0) {
				setStatus("No saves");
				return;
			}
			// Load the most recent save
			const latest = saves[0];
			const ok = await loadGame(world, latest.id);
			setStatus(ok ? "Loaded" : "Load failed");
		} catch (e) {
			console.error("[save] load failed:", e);
			setStatus("Load failed");
		} finally {
			setLoading(false);
			setTimeout(() => setStatus(null), 2000);
		}
	}, []);

	return (
		<div className="flex items-center gap-1.5">
			<SpeedButton
				label={saving ? "..." : "SAVE"}
				active={false}
				onClick={handleSave}
			/>
			<SpeedButton
				label={loading ? "..." : "LOAD"}
				active={false}
				onClick={handleLoad}
			/>
			{status && (
				<span className="text-[11px] text-cyan-400/70 whitespace-nowrap">
					{status}
				</span>
			)}
		</div>
	);
}

function stormColor(intensityPct: number): string {
	if (intensityPct > 90) return "text-amber-400";
	if (intensityPct > 70) return "text-cyan-400";
	return "text-cyan-400/40";
}

// ─── TopBar ─────────────────────────────────────────────────────────────────

export function TopBar() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<div className="flex flex-col pointer-events-auto font-mono text-cyan-400">
			{/* Row 1: Status + Speed */}
			<div
				className={cn(
					"flex justify-between items-center px-2 sm:px-4 py-2 sm:py-2.5",
					"bg-gradient-to-b from-black/85 via-black/40 to-transparent",
					"flex-wrap gap-y-1.5",
				)}
			>
				{/* Left: unit/building/fragment counts */}
				<div className="flex gap-3 sm:gap-5 text-[13px] sm:text-[15px] items-center font-bold tracking-wide">
					<span title="Player units">{snap.unitCount} UNITS</span>
					{snap.enemyCount > 0 && (
						<span className="text-red-500" title="Hostile units detected">
							{snap.enemyCount} HOSTILE
						</span>
					)}
					<span className="text-slate-400 text-xs" title="Tick">
						T{snap.tick}
					</span>
				</div>

				{/* Right: speed + pause + audio */}
				<div className="flex gap-1.5 items-center">
					{SPEED_STEPS.map((s) => (
						<SpeedButton
							key={s}
							label={`${s}x`}
							active={!snap.paused && snap.gameSpeed === s}
							onClick={() => {
								if (isPaused()) togglePause();
								setGameSpeed(s);
							}}
						/>
					))}
					<SpeedButton
						label={snap.paused ? "PLAY" : "PAUSE"}
						active={snap.paused}
						onClick={togglePause}
					/>
					<SaveLoadControls />
					<AudioControls />
				</div>
			</div>

			{/* Row 2: Resource badges + power + temperature */}
			<div className="flex flex-wrap items-center gap-1 sm:gap-1.5 px-2 sm:px-4 pb-2 sm:pb-2.5 text-sm text-cyan-400/80">
				<ResourceBadge
					icon="Fe"
					label="Scrap Metal"
					value={snap.resources.scrapMetal}
					colorClass="text-emerald-300"
				/>
				<ResourceBadge
					icon="Ci"
					label="Circuitry"
					value={snap.resources.circuitry}
					colorClass="text-sky-400"
				/>
				<ResourceBadge
					icon="Pw"
					label="Power Cells"
					value={snap.resources.powerCells}
					colorClass="text-amber-400"
				/>
				<ResourceBadge
					icon="Du"
					label="Durasteel"
					value={snap.resources.durasteel}
					colorClass="text-violet-400"
				/>
				<div className="w-2" />
				<span
					className={cn(
						"text-[11px] sm:text-[13px]",
						stormColor(snap.power.stormIntensity),
					)}
					title="Storm Intensity"
				>
					STORM {snap.power.stormIntensity}%
				</span>
				<span
					className={cn(
						"text-[11px] sm:text-[13px]",
						(() => {
							const gen = snap.power.totalGeneration;
							const demand = snap.power.totalDemand;
							if (demand === 0 || gen > demand) return "text-green-400";
							if (gen < demand * 0.9) return "text-red-400";
							return "text-yellow-400";
						})(),
					)}
					title="Power Generation / Demand"
				>
					PWR {snap.power.totalGeneration.toFixed(0)}/
					{snap.power.totalDemand.toFixed(0)}
				</span>
				<div className="w-2" />
				<TemperatureGauge value={snap.humanTemperature} />
			</div>
		</div>
	);
}
