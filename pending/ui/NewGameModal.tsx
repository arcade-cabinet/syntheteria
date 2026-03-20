import { useEffect, useRef, useState } from "react";
import { phraseToSeed, randomSeed, seedToPhrase } from "../ecs/seed";
import {
	CLIMATE_PROFILE_SPECS,
	type ClimateProfile,
	createNewGameConfig,
	DIFFICULTY_LABELS,
	type Difficulty,
	type NewGameConfig,
	SECTOR_SCALE_SPECS,
	type SectorScale,
	STORM_PROFILE_SPECS,
	type StormProfile,
} from "../world/config";

export function NewGameModal({
	visible,
	initialConfig,
	onCancel,
	onConfirm,
}: {
	visible: boolean;
	initialConfig?: NewGameConfig;
	onCancel: () => void;
	onConfirm: (config: NewGameConfig) => void;
}) {
	const closeRef = useRef<HTMLButtonElement>(null);
	const [phraseInput, setPhraseInput] = useState(() =>
		seedToPhrase(randomSeed()),
	);
	const [parseError, setParseError] = useState(false);
	const [sectorScale, setSectorScale] = useState<SectorScale>("standard");
	const [difficulty, setDifficulty] = useState<Difficulty>("standard");
	const [climateProfile, setClimateProfile] =
		useState<ClimateProfile>("temperate");
	const [stormProfile, setStormProfile] = useState<StormProfile>("volatile");

	useEffect(() => {
		if (!visible) {
			return;
		}

		const nextConfig = initialConfig ?? createNewGameConfig(randomSeed());
		setPhraseInput(seedToPhrase(nextConfig.worldSeed));
		setSectorScale(nextConfig.sectorScale);
		setDifficulty(nextConfig.difficulty);
		setClimateProfile(nextConfig.climateProfile);
		setStormProfile(nextConfig.stormProfile);
		setParseError(false);

		// Auto-focus close button for keyboard users when dialog opens
		const timer = setTimeout(() => {
			closeRef.current?.focus();
		}, 80);
		return () => clearTimeout(timer);
	}, [initialConfig, visible]);

	if (!visible) {
		return null;
	}

	const confirm = () => {
		const seed = phraseToSeed(phraseInput);
		if (seed === null) {
			setParseError(true);
			return;
		}

		onConfirm({
			worldSeed: seed,
			sectorScale,
			difficulty,
			climateProfile,
			stormProfile,
		});
	};

	return (
		<div
			className="fixed inset-0 flex flex-col bg-[#010308]/88"
			role="dialog"
			aria-label="Campaign Initialization"
			aria-modal={true}
		>
			{/* Scrollable content area */}
			<div className="flex-1 overflow-y-auto">
				<div className="flex items-start justify-center px-4 py-6 md:py-10 min-h-full">
					<div className="w-full max-w-[1040px] overflow-hidden rounded-[24px] md:rounded-[30px] border border-[#8be6ff]/20 bg-[#06111a]/96 shadow-2xl">
						<div className="flex flex-row items-center justify-between border-b border-white/8 bg-[#081723]/96 px-4 py-4 md:px-6 md:py-5">
							<div className="flex-1">
								<span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
									Campaign Initialization
								</span>
							</div>
							<button
								ref={closeRef}
								onClick={onCancel}
								className="h-9 w-9 flex items-center justify-center rounded-full border border-white/12 bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7fe5ff]"
								aria-label="Close"
							>
								<span className="font-mono text-[16px] text-white/60">×</span>
							</button>
						</div>

						<div className="flex flex-col gap-4 md:gap-5 px-4 py-4 md:px-6 md:py-6">
							<div className="rounded-[18px] md:rounded-[22px] border border-[#8be6ff]/16 bg-[#08131a]/80 px-4 py-4">
								<span
									id="seed-label"
									className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block"
								>
									World Seed
								</span>
								<div className="mt-3 flex flex-row items-center gap-3">
									<div className="flex-1 overflow-hidden rounded-[18px] border border-[#7fe5ff]/24 bg-[#02070d]/80">
										<input
											value={phraseInput}
											onChange={(e) => {
												setPhraseInput(e.target.value);
												setParseError(false);
											}}
											placeholder="hollow-bright-forge"
											autoCorrect="off"
											autoCapitalize="none"
											aria-label="World seed"
											aria-labelledby="seed-label"
											className={`px-4 py-3 font-mono text-sm tracking-[0.14em] bg-transparent w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7fe5ff] ${
												parseError ? "text-[#ffb0b0]" : "text-[#e6f6fb]"
											}`}
										/>
									</div>
									<button
										onClick={() => {
											setPhraseInput(seedToPhrase(randomSeed()));
											setParseError(false);
										}}
										aria-label="Randomize world seed"
										className="min-h-[44px] flex items-center justify-center rounded-[18px] border border-[#7fe5ff]/24 bg-[#0b1822] px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7fe5ff]"
									>
										<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8ed7e8]">
											Randomize
										</span>
									</button>
								</div>
								{parseError && (
									<span className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffb0b0] block">
										Use an `adj-adj-noun` seed or a raw integer.
									</span>
								)}
							</div>

							{/* Map Size + Difficulty: stacked on mobile, side-by-side on md+ */}
							<div className="flex flex-col md:flex-row gap-4 md:gap-5">
								<div className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block">
										Sector Scale
									</span>
									<div
										className="mt-3 flex flex-col gap-3"
										role="radiogroup"
										aria-label="Sector Scale"
									>
										{(
											Object.entries(SECTOR_SCALE_SPECS) as [
												SectorScale,
												(typeof SECTOR_SCALE_SPECS)[SectorScale],
											][]
										).map(([value, spec]) => (
											<OptionCard
												key={value}
												label={spec.label}
												description={spec.description}
												meta={`${spec.width} x ${spec.height} sectors`}
												selected={sectorScale === value}
												onPress={() => setSectorScale(value)}
											/>
										))}
									</div>
								</div>

								<div className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block">
										Difficulty
									</span>
									<div
										className="mt-3 flex flex-col gap-3"
										role="radiogroup"
										aria-label="Difficulty"
									>
										{(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map(
											(value) => (
												<OptionCard
													key={value}
													label={DIFFICULTY_LABELS[value]}
													description={
														value === "story"
															? "Lower pressure, softer infrastructure risk."
															: value === "hard"
																? "Sharper scarcity, hostile pressure, harsher storms."
																: "Balanced intended progression."
													}
													meta={value.toUpperCase()}
													selected={difficulty === value}
													onPress={() => setDifficulty(value)}
												/>
											),
										)}
									</div>
								</div>
							</div>

							{/* Climate + Storm: stacked on mobile, side-by-side on md+ */}
							<div className="flex flex-col md:flex-row gap-4 md:gap-5">
								<div className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block">
										Climate Pattern
									</span>
									<div
										className="mt-3 flex flex-col gap-3"
										role="radiogroup"
										aria-label="Climate Pattern"
									>
										{(
											Object.entries(CLIMATE_PROFILE_SPECS) as [
												ClimateProfile,
												(typeof CLIMATE_PROFILE_SPECS)[ClimateProfile],
											][]
										).map(([value, spec]) => (
											<OptionCard
												key={value}
												label={spec.label}
												description={spec.description}
												meta={value.toUpperCase()}
												selected={climateProfile === value}
												onPress={() => setClimateProfile(value)}
											/>
										))}
									</div>
								</div>

								<div className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block">
										Storm Intensity
									</span>
									<div
										className="mt-3 flex flex-col gap-3"
										role="radiogroup"
										aria-label="Storm Intensity"
									>
										{(
											Object.entries(STORM_PROFILE_SPECS) as [
												StormProfile,
												(typeof STORM_PROFILE_SPECS)[StormProfile],
											][]
										).map(([value, spec]) => (
											<OptionCard
												key={value}
												label={spec.label}
												description={spec.description}
												meta={value.toUpperCase()}
												selected={stormProfile === value}
												onPress={() => setStormProfile(value)}
											/>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Sticky action footer — always visible regardless of scroll position */}
			<div className="flex-shrink-0 border-t border-white/8 bg-[#061019]/98 px-4 py-3 md:px-6 md:py-4">
				<div className="mx-auto w-full max-w-[1040px] flex flex-row items-center justify-end gap-3">
					<ActionButton label="Cancel" tone="ghost" onPress={onCancel} />
					<ActionButton
						label="Generate World"
						tone="primary"
						onPress={confirm}
						testID="new-game-confirm"
					/>
				</div>
			</div>
		</div>
	);
}

function OptionCard({
	label,
	description,
	meta,
	selected,
	onPress,
}: {
	label: string;
	description: string;
	meta: string;
	selected: boolean;
	onPress: () => void;
}) {
	return (
		<button
			onClick={onPress}
			role="radio"
			aria-checked={selected}
			aria-label={`${label}: ${description}`}
			className={`min-h-[52px] overflow-hidden rounded-[18px] border px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7fe5ff] w-full ${
				selected
					? "border-[#8be6ff]/60 bg-[#0c2d42] shadow-lg shadow-[#8be6ff]/8"
					: "border-white/10 bg-[#09131b]/70"
			}`}
		>
			<div className="flex flex-row items-start justify-between gap-3">
				<div className="flex flex-row items-center gap-2 flex-1">
					{/* Selection indicator */}
					<div
						className={`h-3 w-3 rounded-full border flex-shrink-0 ${
							selected
								? "border-[#8be6ff] bg-[#8be6ff]"
								: "border-white/20 bg-transparent"
						}`}
					/>
					<div className="flex-1">
						<span
							className={`font-mono text-[11px] uppercase tracking-[0.18em] block ${
								selected ? "text-[#e4f8ff]" : "text-white/70"
							}`}
						>
							{label}
						</span>
						<span className="mt-2 font-mono text-[11px] leading-5 text-white/48 block">
							{description}
						</span>
					</div>
				</div>
				<div
					className={`rounded-full border px-3 py-1 flex-shrink-0 ${
						selected
							? "border-[#8be6ff]/50 bg-[#8be6ff]/18"
							: "border-white/10 bg-white/5"
					}`}
				>
					<span
						className={`font-mono text-[9px] uppercase tracking-[0.18em] ${
							selected ? "text-[#b8edff]" : "text-[#8ed7e8]/60"
						}`}
					>
						{meta}
					</span>
				</div>
			</div>
		</button>
	);
}

function ActionButton({
	label,
	tone,
	onPress,
	testID,
}: {
	label: string;
	tone: "ghost" | "primary";
	onPress: () => void;
	testID?: string;
}) {
	return (
		<button
			onClick={onPress}
			aria-label={label}
			data-testid={testID}
			className={`min-h-[44px] flex-1 md:flex-none flex items-center justify-center rounded-[16px] border px-5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7fe5ff] ${
				tone === "primary"
					? "border-[#8be6ff]/42 bg-[#103244]"
					: "border-white/10 bg-[#0a1118]"
			}`}
		>
			<span
				className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
					tone === "primary" ? "text-[#def8ff]" : "text-white/68"
				}`}
			>
				{label}
			</span>
		</button>
	);
}
