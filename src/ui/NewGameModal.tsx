import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { phraseToSeed, randomSeed, seedToPhrase } from "../ecs/seed";
import {
	CLIMATE_PROFILE_SPECS,
	type ClimateProfile,
	createNewGameConfig,
	DIFFICULTY_LABELS,
	type Difficulty,
	MAP_SIZE_SPECS,
	type MapSize,
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
	const [phraseInput, setPhraseInput] = useState(() =>
		seedToPhrase(randomSeed()),
	);
	const [parseError, setParseError] = useState(false);
	const [mapSize, setMapSize] = useState<MapSize>("standard");
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
		setMapSize(nextConfig.mapSize);
		setDifficulty(nextConfig.difficulty);
		setClimateProfile(nextConfig.climateProfile);
		setStormProfile(nextConfig.stormProfile);
		setParseError(false);
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
			mapSize,
			difficulty,
			climateProfile,
			stormProfile,
		});
	};

	return (
		<View className="absolute inset-0 bg-[#02050a]/72">
			<View className="absolute inset-0 bg-[#0b1721]/28" />
			<ScrollView
				className="flex-1"
				contentContainerClassName="flex-grow items-center justify-center px-4 py-6 md:py-10"
			>
				<View className="w-full max-w-[1040px] overflow-hidden rounded-[24px] md:rounded-[30px] border border-[#8be6ff]/20 bg-[#06111a]/92 shadow-2xl">
					<View className="border-b border-white/8 bg-[#081723]/96 px-4 py-4 md:px-6 md:py-5">
						<Text className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
							Campaign Initialization
						</Text>
						<Text className="mt-2 font-mono text-[12px] md:text-[13px] leading-5 text-white/58">
							Define the seed, terrain scale, and atmospheric pressures that
							shape this world. Once committed, these parameters lock into the
							campaign archive and drive all terrain generation.
						</Text>
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
									Map Size
								</Text>
								<View className="mt-3 gap-3">
									{(
										Object.entries(MAP_SIZE_SPECS) as [
											MapSize,
											(typeof MAP_SIZE_SPECS)[MapSize],
										][]
									).map(([value, spec]) => (
										<OptionCard
											key={value}
											label={spec.label}
											description={spec.description}
											meta={`${spec.width} x ${spec.height} hexes`}
											selected={mapSize === value}
											onPress={() => setMapSize(value)}
										/>
									))}
								</View>
							</View>

							<View className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
								<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
									Difficulty
								</Text>
								<View className="mt-3 gap-3">
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
								<View className="mt-3 gap-3">
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
								<View className="mt-3 gap-3">
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

					<View className="gap-3 md:flex-row md:items-center md:justify-between border-t border-white/8 bg-[#061019]/96 px-4 py-4 md:px-6 md:py-5">
						<Text className="font-mono text-[11px] leading-5 text-white/42 md:max-w-[640px]">
							These parameters are irreversible once the world is generated.
							Terrain, relay anchors, and city seeds will be encoded into your
							campaign archive.
						</Text>
						<View className="flex-row gap-3">
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
			</ScrollView>
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
			className={`min-h-[52px] overflow-hidden rounded-[18px] border px-4 py-3 ${
				selected
					? "border-[#8be6ff]/52 bg-[#0e2430]"
					: "border-white/10 bg-[#09131b]/70"
			}`}
		>
			<View className="flex-row items-start justify-between gap-3">
				<View className="flex-1">
					<Text className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#e4f8ff]">
						{label}
					</Text>
					<Text className="mt-2 font-mono text-[11px] leading-5 text-white/48">
						{description}
					</Text>
				</View>
				<View
					className={`rounded-full border px-3 py-1 ${
						selected
							? "border-[#8be6ff]/45 bg-[#8be6ff]/12"
							: "border-white/10 bg-white/5"
					}`}
				>
					<Text className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8ed7e8]">
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
