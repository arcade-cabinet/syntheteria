import { ScrollView, Text, View } from "react-native";
import { getCitySiteViewModel } from "../world/citySiteActions";
import { enterCityInstance, returnToWorld } from "../world/cityTransition";
import { executeDistrictOperation } from "../world/districtOperations";
import { foundCitySite, surveyCitySite } from "../world/poiActions";
import { setCitySiteModalOpen } from "../world/runtimeState";
import type { CityRuntimeSnapshot, NearbyPoiContext } from "../world/snapshots";
import { HudButton } from "./components/HudButton";

export function CitySiteModal({
	city,
	context,
	mode,
	onClose,
}: {
	city: CityRuntimeSnapshot | null;
	context: NearbyPoiContext;
	mode: "world" | "city";
	onClose: () => void;
}) {
	const viewModel = getCitySiteViewModel({ city, context, mode });
	const {
		actionFlowSummary,
		actions,
		capabilities,
		capabilitySummary,
		cityStatus,
		cityStatusMeta,
		operations,
		presentation,
		structures,
	} = viewModel;

	return (
		<View className="absolute inset-0 bg-[#02050a]/72 pointer-events-auto">
			<ScrollView
				className="flex-1"
				contentContainerClassName="flex-grow items-center justify-center px-4 py-6"
			>
				<View className="w-full max-w-[760px] overflow-hidden rounded-[24px] md:rounded-[30px] border border-[#8be6ff]/20 bg-[#06111a]/95 shadow-2xl">
					<View className="border-b border-white/8 bg-[#081723]/96 px-4 py-4 md:px-6 md:py-5">
						<Text className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
							{presentation.badge}
						</Text>
						<Text className="mt-2 font-mono text-[18px] md:text-[22px] uppercase tracking-[0.12em] text-[#edfaff]">
							{context.name}
						</Text>
						<Text className="mt-2 font-mono text-[12px] leading-5 text-white/46">
							{presentation.summary}
						</Text>
					</View>

					<View className="gap-4 md:gap-5 px-4 py-4 md:px-6 md:py-6">
						{/* Site Role + City State: stacked on mobile, side-by-side on md+ */}
						<View className="gap-4 md:flex-row">
							<View className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
								<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
									Site Role
								</Text>
								<Text className="mt-3 font-mono text-[12px] leading-5 text-white/58">
									{presentation.role}
								</Text>
							</View>
							<View className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
								<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
									City State
								</Text>
								<Text className="mt-3 font-mono text-[16px] uppercase tracking-[0.12em] text-[#dff6ff]">
									{cityStatus}
								</Text>
								<Text className="mt-2 font-mono text-[11px] leading-5 text-white/46">
									{cityStatusMeta}
								</Text>
							</View>
						</View>

						<View className="rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
							<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
								Action Flow
							</Text>
							<Text className="mt-3 font-mono text-[11px] leading-5 text-white/46">
								{actionFlowSummary}
							</Text>
						</View>

						<View className="rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
							<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
								District Structures
							</Text>
							<View className="mt-4 flex-row flex-wrap gap-2">
								{structures.map((structure) => (
									<View
										key={structure.id}
										className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"
									>
										<Text className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#dff6ff]">
											{structure.label}
										</Text>
										<Text className="mt-1 font-mono text-[10px] leading-4 text-white/38">
											{structure.status}
										</Text>
									</View>
								))}
							</View>
						</View>

						<View className="rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
							<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
								District Functions
							</Text>
							<Text className="mt-3 font-mono text-[11px] leading-5 text-white/46">
								{capabilitySummary}
							</Text>
							<View className="mt-4 flex-row flex-wrap gap-2">
								{capabilities.map((capability) => (
									<View
										key={capability.id}
										className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"
									>
										<Text className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#dff6ff]">
											{capability.label}
										</Text>
										<Text className="mt-1 font-mono text-[10px] leading-4 text-white/38">
											{capability.status}
										</Text>
									</View>
								))}
							</View>
						</View>

						<View className="rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
							<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec]">
								Operational Actions
							</Text>
							<View className="mt-4 gap-3">
								{operations.map((operation) => (
									<View
										key={operation.id}
										className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3"
									>
										<View className="flex-row items-center justify-between gap-3">
											<Text className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#dff6ff]">
												{operation.label}
											</Text>
											<Text className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/38">
												{operation.status}
											</Text>
										</View>
										<Text className="mt-2 font-mono text-[11px] leading-5 text-white/46">
											{operation.description}
										</Text>
										{operation.status === "available" ? (
											<View className="mt-3">
												<HudButton
													label={operation.label}
													meta="execute district operation"
													variant="secondary"
													testID={`city-site-operation-${operation.id}`}
													onPress={() => {
														executeDistrictOperation({
															cityInstanceId: city?.id ?? null,
															poiType: context.poiType,
															state: city?.state ?? "latent",
															operationId: operation.id,
														});
													}}
												/>
											</View>
										) : null}
									</View>
								))}
							</View>
						</View>
					</View>

					<View className="gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between border-t border-white/8 bg-[#061019]/96 px-4 py-4 md:px-6 md:py-5">
						<View className="flex-row flex-wrap gap-3">
							{actions.some((action) => action.id === "survey") && city && (
								<HudButton
									label={presentation.surveyLabel}
									meta="mark linked interior as surveyed"
									variant="secondary"
									testID="city-site-survey"
									onPress={() => {
										surveyCitySite(city.id);
										setCitySiteModalOpen(true, {
											...context,
											discovered: true,
										});
									}}
								/>
							)}
							{actions.some((action) => action.id === "found") && city && (
								<HudButton
									label={presentation.foundationLabel}
									meta="establish substation and claim district capability"
									testID="city-site-found"
									onPress={() => {
										foundCitySite(city.id);
										setCitySiteModalOpen(true, {
											...context,
											cityInstanceId: city.id,
											discovered: true,
										});
									}}
								/>
							)}
							{actions.some((action) => action.id === "enter") && city && (
								<HudButton
									label={presentation.enterLabel}
									meta="transition into linked city"
									variant="secondary"
									testID="city-site-enter"
									onPress={() => {
										enterCityInstance(city.id);
										onClose();
									}}
								/>
							)}
							{actions.some((action) => action.id === "return") && (
								<HudButton
									label="Return To World"
									meta="restore outdoor scene"
									variant="secondary"
									testID="city-site-return"
									onPress={() => {
										returnToWorld();
										onClose();
									}}
								/>
							)}
						</View>
						<HudButton
							label="Close"
							meta="dismiss interaction overlay"
							variant="secondary"
							testID="city-site-close"
							onPress={onClose}
						/>
					</View>
				</View>
			</ScrollView>
		</View>
	);
}
