import { getCitySiteViewModel } from "../world/citySiteActions";
import { enterCityInstance, returnToWorld } from "../world/cityTransition";
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
		cityStatus,
		cityStatusMeta,
		presentation,
	} = viewModel;

	return (
		<div className="absolute inset-0 bg-[#02050a]/72 pointer-events-auto">
			<div className="flex-1 overflow-y-auto">
				<div className="flex min-h-full items-center justify-center px-4 py-6">
					<div className="w-full max-w-[760px] overflow-hidden rounded-[24px] md:rounded-[30px] border border-[#8be6ff]/20 bg-[#06111a]/95 shadow-2xl">
						<div className="border-b border-white/8 bg-[#081723]/96 px-4 py-4 md:px-6 md:py-5">
							<span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff] block">
								{presentation.badge}
							</span>
							<span className="mt-2 font-mono text-[18px] md:text-[22px] uppercase tracking-[0.12em] text-[#edfaff] block">
								{context.name}
							</span>
							<p className="mt-2 font-mono text-[12px] leading-5 text-white/46 m-0 mt-2">
								{presentation.summary}
							</p>
						</div>

						<div className="gap-4 md:gap-5 px-4 py-4 md:px-6 md:py-6 flex flex-col">
							{/* Site Role + City State: stacked on mobile, side-by-side on md+ */}
							<div className="gap-4 md:flex-row flex flex-col">
								<div className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block">
										Site Role
									</span>
									<p className="mt-3 font-mono text-[12px] leading-5 text-white/58 m-0 mt-3">
										{presentation.role}
									</p>
								</div>
								<div className="md:flex-1 rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
									<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block">
										Site State
									</span>
									<span className="mt-3 font-mono text-[16px] uppercase tracking-[0.12em] text-[#dff6ff] block">
										{cityStatus}
									</span>
									<p className="mt-2 font-mono text-[11px] leading-5 text-white/46 m-0 mt-2">
										{cityStatusMeta}
									</p>
								</div>
							</div>

							<div className="rounded-[18px] md:rounded-[22px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
								<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] block">
									Action Flow
								</span>
								<p className="mt-3 font-mono text-[11px] leading-5 text-white/46 m-0 mt-3">
									{actionFlowSummary}
								</p>
							</div>
						</div>

						<div className="gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between border-t border-white/8 bg-[#061019]/96 px-4 py-4 md:px-6 md:py-5 flex flex-col">
							<div className="flex flex-row flex-wrap gap-3">
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
										meta="establish substation and claim site"
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
							</div>
							<HudButton
								label="Close"
								meta="dismiss interaction overlay"
								variant="secondary"
								testID="city-site-close"
								onPress={onClose}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
