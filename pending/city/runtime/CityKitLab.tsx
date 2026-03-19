import { useMemo, useState } from "react";
import { HudButton } from "../../ui/components/HudButton";
import { HudPanel } from "../../ui/components/HudPanel";
import type { CityFamily, CityPlacementType } from "../config/types";
import {
	type CityKitLabFilterState,
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
		<button
			type="button"
			onClick={onPress}
			className={`min-h-[36px] flex items-center justify-center rounded-full border px-4 py-2 ${active ? "border-[#89d9ff]/70 bg-[#0f2b35]" : "border-white/10 bg-white/[0.03]"}`}
		>
			<span
				className={`font-mono text-[10px] uppercase tracking-[0.16em] ${active ? "text-[#dff7ff]" : "text-white/50"}`}
			>
				{label}
			</span>
		</button>
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
		<div
			className="rounded-[22px] border border-white/10 bg-[#071117]/88 p-3"
			style={{ width: cardWidth }}
		>
			<img
				src={model.previewAsset as string}
				alt={model.label}
				style={{
					width: "100%",
					height: cardWidth * 0.67,
					borderRadius: 14,
					objectFit: "contain",
				}}
			/>
			<span className="mt-3 block font-mono text-[11px] uppercase tracking-[0.12em] text-white/80">
				{model.label}
			</span>
			<span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#89d9ff]">
				{model.family} · {model.placementType}
			</span>
			<span className="mt-2 block font-mono text-[10px] leading-4 text-white/45">
				{formatCitySubcategoryLabel(model.subcategory)}
			</span>
			<span className="mt-1 block font-mono text-[10px] leading-4 text-white/40">
				{`bias: ${model.adjacencyBias.join(", ")}`}
			</span>
		</div>
	);
}

export function CityKitLab({
	initialFilterState,
	onClose,
}: {
	initialFilterState?: Partial<CityKitLabFilterState>;
	onClose: () => void;
}) {
	const vw = window.innerWidth;
	const defaultFilterState = useMemo(
		() => ({
			...createDefaultCityKitLabFilterState(),
			...initialFilterState,
		}),
		[initialFilterState],
	);
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
		directorySummaries,
		filterOptions: { familyFilters, placementFilters, subcategories },
		floorPresets,
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

	const padding = vw < 768 ? 14 : 20;
	const cardGap = vw < 768 ? 10 : 12;
	const availableWidth = vw - padding * 2;
	const columnsPerRow = vw < 480 ? 2 : vw < 768 ? 3 : 4;
	const cardWidth = Math.floor(
		(availableWidth - cardGap * (columnsPerRow - 1)) / columnsPerRow,
	);

	return (
		<div className="absolute inset-0 bg-[#020609]/92 pointer-events-auto overflow-y-auto">
			<div
				className="flex flex-col"
				style={{ padding, gap: vw < 768 ? 14 : 18 }}
			>
				<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
					<HudPanel
						title="City Kit Lab"
						eyebrow="Module Inspection Surface"
						variant="signal"
					>
						<span className="font-mono text-[11px] leading-5 text-white/55">
							Full city module inventory with rendered previews, family filters,
							and composite candidates. Curate placement rules, adjacency bias,
							and higher-order assemblies.
						</span>
					</HudPanel>
					<HudButton
						label="Close Lab"
						meta="return to simulation"
						onPress={onClose}
					/>
				</div>

				<HudPanel title="Filters" eyebrow="Catalog Lens" variant="signal">
					<div className="flex flex-col gap-3">
						<div className="flex flex-row flex-wrap gap-2">
							{familyFilters.map((value) => (
								<FilterChip
									key={value}
									active={family === value}
									label={value}
									onPress={() => setFamily(value)}
								/>
							))}
						</div>
						<div className="flex flex-row flex-wrap gap-2">
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
						</div>
						<div className="flex flex-row flex-wrap gap-2">
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
						</div>
					</div>
				</HudPanel>

				<HudPanel
					title={`Models · ${models.length}`}
					eyebrow="Rendered Previews"
					variant="signal"
				>
					<div className="flex flex-row flex-wrap" style={{ gap: cardGap }}>
						{models.map((model) => (
							<ModelCard key={model.id} model={model} cardWidth={cardWidth} />
						))}
					</div>
				</HudPanel>

				<HudPanel
					title="Composites"
					eyebrow="Assemblage Clusters"
					variant="signal"
				>
					<div className="flex flex-col gap-4">
						{composites.map((composite) => (
							<div
								key={composite.id}
								className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4"
							>
								<span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[#89d9ff]">
									{composite.label}
								</span>
								<span className="mt-2 block font-mono text-[11px] leading-5 text-white/55">
									{composite.gameplayRole}
								</span>
								<span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
									{composite.parts.map((part) => part.modelId).join(" · ")}
								</span>
							</div>
						))}
					</div>
				</HudPanel>

				<HudPanel
					title="Directory Semantics"
					eyebrow="Subdirectory Understanding"
					variant="signal"
				>
					<div className="flex flex-col gap-3">
						{directorySummaries.map((summary) => (
							<div
								key={summary.directory}
								className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4"
							>
								<span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[#89d9ff]">
									{summary.directory}
								</span>
								<span className="mt-2 block font-mono text-[11px] leading-5 text-white/55">
									Families: {summary.families.join(", ")}
								</span>
								<span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
									{`${summary.modelCount} models · passability ${summary.passabilityClasses.join(", ")}`}
								</span>
							</div>
						))}
					</div>
				</HudPanel>

				<HudPanel
					title="Floor Presets"
					eyebrow="Procedural Surface Strategy"
					variant="signal"
				>
					<div className="flex flex-col gap-3">
						{floorPresets.map((preset) => (
							<div
								key={preset.id}
								className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4"
							>
								<span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[#89d9ff]">
									{preset.label}
								</span>
								<span className="mt-2 block font-mono text-[11px] leading-5 text-white/55">
									{preset.useCases.join(" · ")}
								</span>
								<span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
									{`${preset.baseFamily} · ${preset.zoneAffinity.join(", ")}`}
								</span>
							</div>
						))}
					</div>
				</HudPanel>

				<HudPanel
					title="Scenario Fixtures"
					eyebrow="Deterministic Layout Seeds"
					variant="signal"
				>
					<div className="flex flex-col gap-3">
						{scenarios.map((scenario) => (
							<div
								key={scenario.id}
								className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4"
							>
								<span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[#89d9ff]">
									{scenario.label}
								</span>
								<span className="mt-2 block font-mono text-[11px] leading-5 text-white/55">
									{scenario.description}
								</span>
								<span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
									{`${scenario.placementCount} placements · ${scenario.grid}`}
								</span>
							</div>
						))}
					</div>
				</HudPanel>
			</div>
		</div>
	);
}
