import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { phraseToSeed, randomSeed, seedToPhrase } from "../ecs/seed";
import {
	CLIMATE_PROFILE_SPECS,
	type ClimateProfile,
	createNewGameConfig,
	DIFFICULTY_LABELS,
	type Difficulty,
	SECTOR_SCALE_SPECS,
	type SectorScale,
	type NewGameConfig,
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
	const closeRef = useRef<View>(null);
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
			(closeRef.current as unknown as HTMLElement)?.focus?.();
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
		<View
			className="absolute inset-0 bg-[#010308]/88"
			role="dialog"
			aria-label="Campaign Initialization"
			aria-modal={true}
		>
			<ScrollView
				className="flex-1"
				contentContainerClassName="flex-grow items-center px-4 py-6 md:py-10"
			>
				<View className="w-full max-w-[1040px] overflow-hidden rounded-[24px] md:rounded-[30px] border border-[#8be6ff]/20 bg-[#06111a]/96 shadow-2xl">
					<View className="flex-row items-center justify-between border-b border-white/8 bg-[#081723]/96 px-4 py-4 md:px-6 md:py-5">
						<View className="flex-1">
							<Text className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
								Campaign Initialization
							</Text>
						</View>
						<Pressable
							ref={closeRef}
							onPress={onCancel}
							className="h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/5"
							accessibilityRole="button"
							accessibilityLabel="Close"
						>
							<Text className="font-mono text-[16px] text-white/60">×</Text>
						</Pressable>
					</View>

					<View className="gap-4 md:gap-5 px-4 py-4 md:px-6 md:py-6">
						<View className="rounded-[18px] md:rounded-[22px] border border-[#8be6ff]/16 bg-[#08131a]/80 px-4 py-4">
							<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
								World Seed
							</Text>
							<View className="mt-3 flex-row items-center gap-3">
								<View className="flex-1 overflow-hidden rounded-[18px] border border-[#7fe5ff]/24 bg-[#02070d]/80">
									<TextInput
										value={phraseInput}
										onChangeText={(value) => {
											setPhraseInput(value);
											setParseError(false);
										}}
										placeholder="hollow-bright-forge"
										placeholderTextColor="rgba(219,243,252,0.28)"
										autoCorrect={false}
										autoCapitalize="none"
										selectionColor="#7fe5ff"
										accessibilityLabel="World seed"
										className={`px-4 py-3 font-mono text-sm tracking-[0.14em] ${
											parseError ? "text-[#ffb0b0]" : "text-[#e6f6fb]"
										}`}
									/>
								</View>
								<Pressable
									onPress={() => {
										setPhraseInput(seedToPhrase(randomSeed()));
										setParseError(false);
									}}
									accessibilityRole="button"
									accessibilityLabel="Randomize world seed"
									className="min-h-[44px] items-center justify-center rounded-[18px] border border-[#7fe5ff]/24 bg-[#0b1822] px-4 py-3"
								>
									<Text className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8ed7e8]">
										Randomize
									</Text>
								</Pressable>
							</View>
							{parseError && (
								<Text className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffb0b0]">
									Use an `adj-adj-noun` seed or a raw integer.
								</Text>
							)}
						</View>

						{/* Map Size + Difficulty: stacked on mobile, side-by-side on md+ */}
						<View className="gap-4 md:flex-row md:gap-5">
							<View className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
								<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
									Sector Scale
								</Text>
								<View className="mt-3 gap-3" accessibilityRole="radiogroup" accessibilityLabel="Sector Scale">
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
								</View>
							</View>

							<View className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
								<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
									Difficulty
								</Text>
								<View className="mt-3 gap-3" accessibilityRole="radiogroup" accessibilityLabel="Difficulty">
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
								</View>
							</View>
						</View>

						{/* Climate + Storm: stacked on mobile, side-by-side on md+ */}
						<View className="gap-4 md:flex-row md:gap-5">
							<View className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
								<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
									Climate Pattern
								</Text>
								<View className="mt-3 gap-3" accessibilityRole="radiogroup" accessibilityLabel="Climate Pattern">
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
								</View>
							</View>

							<View className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
								<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
									Storm Intensity
								</Text>
								<View className="mt-3 gap-3" accessibilityRole="radiogroup" accessibilityLabel="Storm Intensity">
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
								</View>
							</View>
						</View>
					</View>

					</View>
			</ScrollView>

			{/* Sticky action footer — always visible regardless of scroll position */}
			<View className="border-t border-white/8 bg-[#061019]/98 px-4 py-3 md:px-6 md:py-4">
				<View className="mx-auto w-full max-w-[1040px] flex-row items-center justify-end gap-3">
					<ActionButton label="Cancel" tone="ghost" onPress={onCancel} />
					<ActionButton
						label="Generate World"
						tone="primary"
						onPress={confirm}
						testID="new-game-confirm"
					/>
				</View>
			</View>
		</View>
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
		<Pressable
			onPress={onPress}
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			className={`min-h-[52px] overflow-hidden rounded-[18px] border px-4 py-3 ${
				selected
					? "border-[#8be6ff]/60 bg-[#0c2d42] shadow-lg shadow-[#8be6ff]/8"
					: "border-white/10 bg-[#09131b]/70"
			}`}
		>
			<View className="flex-row items-start justify-between gap-3">
				<View className="flex-row items-center gap-2 flex-1">
					{/* Selection indicator */}
					<View
						className={`h-3 w-3 rounded-full border ${
							selected
								? "border-[#8be6ff] bg-[#8be6ff]"
								: "border-white/20 bg-transparent"
						}`}
					/>
					<View className="flex-1">
						<Text className={`font-mono text-[11px] uppercase tracking-[0.18em] ${
							selected ? "text-[#e4f8ff]" : "text-white/70"
						}`}>
							{label}
						</Text>
						<Text className="mt-2 font-mono text-[11px] leading-5 text-white/48">
							{description}
						</Text>
					</View>
				</View>
				<View
					className={`rounded-full border px-3 py-1 ${
						selected
							? "border-[#8be6ff]/50 bg-[#8be6ff]/18"
							: "border-white/10 bg-white/5"
					}`}
				>
					<Text className={`font-mono text-[9px] uppercase tracking-[0.18em] ${
						selected ? "text-[#b8edff]" : "text-[#8ed7e8]/60"
					}`}>
						{meta}
					</Text>
				</View>
			</View>
		</Pressable>
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
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={label}
			testID={testID}
			className={`min-h-[44px] flex-1 md:flex-none items-center justify-center rounded-[16px] border px-5 py-3 ${
				tone === "primary"
					? "border-[#8be6ff]/42 bg-[#103244]"
					: "border-white/10 bg-[#0a1118]"
			}`}
		>
			<Text
				className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
					tone === "primary" ? "text-[#def8ff]" : "text-white/68"
				}`}
			>
				{label}
			</Text>
		</Pressable>
	);
}
