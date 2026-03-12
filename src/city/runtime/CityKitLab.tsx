import { useMemo, useState } from "react";
import {
	Image,
	Pressable,
	ScrollView,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { HudButton } from "../../ui/components/HudButton";
import { HudPanel } from "../../ui/components/HudPanel";
import type { CityFamily, CityPlacementType } from "../config/types";
import {
	createDefaultCityKitLabFilterState,
	formatCitySubcategoryLabel,
	getCityKitLabViewModel,
} from "./cityKitLabState";

function FilterChip({
	active,
	label,
	onPress,
}: {
	active: boolean;
	label: string;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			className={`min-h-[36px] items-center justify-center rounded-full border px-4 py-2 ${active ? "border-[#89d9ff]/70 bg-[#0f2b35]" : "border-white/10 bg-white/[0.03]"}`}
		>
			<Text
				className={`font-mono text-[10px] uppercase tracking-[0.16em] ${active ? "text-[#dff7ff]" : "text-white/50"}`}
			>
				{label}
			</Text>
		</Pressable>
	);
}

function ModelCard({
	model,
	cardWidth,
}: {
	model: ReturnType<typeof getCityKitLabViewModel>["models"][number];
	cardWidth: number;
}) {
	return (
		<View
			className="rounded-[22px] border border-white/10 bg-[#071117]/88 p-3"
			style={{ width: cardWidth }}
		>
			<Image
				source={model.previewAsset as never}
				resizeMode="contain"
				style={{ width: "100%", height: cardWidth * 0.67, borderRadius: 14 }}
			/>
			<Text className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white/80">
				{model.label}
			</Text>
			<Text className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#89d9ff]">
				{model.family} · {model.placementType}
			</Text>
			<Text className="mt-2 font-mono text-[10px] leading-4 text-white/45">
				{formatCitySubcategoryLabel(model.subcategory)}
			</Text>
			<Text className="mt-1 font-mono text-[10px] leading-4 text-white/40">
				{`bias: ${model.adjacencyBias.join(", ")}`}
			</Text>
		</View>
	);
}

export function CityKitLab({ onClose }: { onClose: () => void }) {
	const { width } = useWindowDimensions();
	const defaultFilterState = useMemo(createDefaultCityKitLabFilterState, []);
	const [family, setFamily] = useState<CityFamily | "all">(
		defaultFilterState.family,
	);
	const [placementType, setPlacementType] = useState<CityPlacementType | "all">(
		defaultFilterState.placementType,
	);
	const [subcategory, setSubcategory] = useState<string | "all">(
		defaultFilterState.subcategory,
	);
	const [compositableOnly, setCompositableOnly] = useState(
		defaultFilterState.compositableOnly,
	);
	const {
		composites,
		filterOptions: { familyFilters, placementFilters, subcategories },
		models,
		scenarios,
	} = useMemo(
		() =>
			getCityKitLabViewModel({
				compositableOnly,
				family,
				placementType,
				subcategory,
			}),
		[compositableOnly, family, placementType, subcategory],
	);

	const padding = width < 768 ? 14 : 20;
	const cardGap = width < 768 ? 10 : 12;
	const availableWidth = width - padding * 2;
	const columnsPerRow = width < 480 ? 2 : width < 768 ? 3 : 4;
	const cardWidth = Math.floor(
		(availableWidth - cardGap * (columnsPerRow - 1)) / columnsPerRow,
	);

	return (
		<View className="absolute inset-0 bg-[#020609]/92 pointer-events-auto">
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ padding, gap: width < 768 ? 14 : 18 }}
			>
				<View className="gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
					<HudPanel
						title="City Kit Lab"
						eyebrow="Module Inspection Surface"
						variant="signal"
					>
						<Text className="font-mono text-[11px] leading-5 text-white/55">
							Full city module inventory with rendered previews, family filters,
							and composite candidates. Curate placement rules, adjacency bias,
							and higher-order assemblies.
						</Text>
					</HudPanel>
					<HudButton
						label="Close Lab"
						meta="return to simulation"
						onPress={onClose}
					/>
				</View>

				<HudPanel title="Filters" eyebrow="Catalog Lens" variant="signal">
					<View className="gap-3">
						<View className="flex-row flex-wrap gap-2">
							{familyFilters.map((value) => (
								<FilterChip
									key={value}
									active={family === value}
									label={value}
									onPress={() => setFamily(value)}
								/>
							))}
						</View>
						<View className="flex-row flex-wrap gap-2">
							{placementFilters.map((value) => (
								<FilterChip
									key={value}
									active={placementType === value}
									label={value}
									onPress={() => setPlacementType(value)}
								/>
							))}
							<FilterChip
								active={compositableOnly}
								label="compositable"
								onPress={() => setCompositableOnly((current) => !current)}
							/>
						</View>
						<View className="flex-row flex-wrap gap-2">
							{subcategories.map((value) => (
								<FilterChip
									key={value}
									active={subcategory === value}
									label={
										value === "all"
											? "all-subdirs"
											: formatCitySubcategoryLabel(value)
									}
									onPress={() => setSubcategory(value)}
								/>
							))}
						</View>
					</View>
				</HudPanel>

				<HudPanel
					title={`Models · ${models.length}`}
					eyebrow="Rendered Previews"
					variant="signal"
				>
					<View className="flex-row flex-wrap" style={{ gap: cardGap }}>
						{models.map((model) => (
							<ModelCard key={model.id} model={model} cardWidth={cardWidth} />
						))}
					</View>
				</HudPanel>

				<HudPanel
					title="Composites"
					eyebrow="Assemblage Clusters"
					variant="signal"
				>
					<View className="gap-4">
						{composites.map((composite) => (
							<View
								key={composite.id}
								className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4"
							>
								<Text className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#89d9ff]">
									{composite.label}
								</Text>
								<Text className="mt-2 font-mono text-[11px] leading-5 text-white/55">
									{composite.gameplayRole}
								</Text>
								<Text className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
									{composite.parts.map((part) => part.modelId).join(" · ")}
								</Text>
							</View>
						))}
					</View>
				</HudPanel>

				<HudPanel
					title="Scenario Fixtures"
					eyebrow="Deterministic Layout Seeds"
					variant="signal"
				>
					<View className="gap-3">
						{scenarios.map((scenario) => (
							<View
								key={scenario.id}
								className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4"
							>
								<Text className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#89d9ff]">
									{scenario.label}
								</Text>
								<Text className="mt-2 font-mono text-[11px] leading-5 text-white/55">
									{scenario.description}
								</Text>
								<Text className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
									{`${scenario.placementCount} placements · ${scenario.grid}`}
								</Text>
							</View>
						))}
					</View>
				</HudPanel>
			</ScrollView>
		</View>
	);
}
