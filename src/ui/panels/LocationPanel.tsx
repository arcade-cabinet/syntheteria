import { useState, useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { describeCityState } from "../../world/cityPresentation";
import { returnToWorld } from "../../world/cityTransition";
import { getActiveLocationContext } from "../../world/locationContext";
import { getActiveWorldSession } from "../../world/session";
import { CitySiteModal } from "../CitySiteModal";
import { HudButton } from "../components/HudButton";
import { HudPanel } from "../components/HudPanel";
import { MapIcon } from "../icons";

export function LocationPanel() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const [modalOpen, setModalOpen] = useState(false);
	const { activeCity, poi, presentation } = getActiveLocationContext({
		activeCityInstanceId: snap.activeCityInstanceId,
		activeScene: snap.activeScene,
		nearbyPoi: snap.nearbyPoi,
		session: getActiveWorldSession(),
	});

	if (snap.activeScene === "city") {
		if (!activeCity || !poi) {
			return null;
		}

		return (
			<>
				<View className="absolute bottom-52 md:bottom-6 left-4 right-4 md:left-auto md:right-[196px] md:w-[340px] pointer-events-auto">
					<HudPanel
						title={activeCity?.name ?? "City Instance"}
						eyebrow={presentation?.badge ?? "Interior Link"}
						variant="signal"
					>
						<Text className="font-mono text-[11px] leading-5 text-white/55">
							{presentation?.summary ??
								"Interior link active. City systems responding through the distributed relay."}
						</Text>
						<Text className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
							{describeCityState(activeCity?.state)}
						</Text>
						<View className="mt-4 flex-row gap-3">
							<HudButton
								label="Open City Brief"
								meta="review site role and actions"
								icon={<MapIcon width={16} height={16} color="#89d9ff" />}
								variant="secondary"
								testID="location-open-city-brief"
								onPress={() => setModalOpen(true)}
								className="flex-1"
							/>
							<HudButton
								label="Return"
								meta="restore world-map scene"
								variant="secondary"
								testID="location-return-world"
								onPress={returnToWorld}
								className="min-w-[112px]"
							/>
						</View>
					</HudPanel>
				</View>
				{modalOpen && (
					<CitySiteModal
						city={activeCity ?? null}
						context={{
							cityInstanceId: activeCity?.id ?? null,
							discovered: poi.discovered === 1,
							distance: 0,
							name: poi.name,
							poiId: poi.id,
							poiType: poi.type,
						}}
						mode="city"
						onClose={() => setModalOpen(false)}
					/>
				)}
			</>
		);
	}

	if (!snap.nearbyPoi || !poi) {
		return null;
	}
	const stateLabel = describeCityState(activeCity?.state);

	return (
		<>
			<View className="absolute bottom-6 right-[196px] w-[340px] pointer-events-auto">
				<HudPanel
					title={poi.name}
					eyebrow={presentation?.badge ?? "Nearby Point Of Interest"}
					variant="signal"
				>
					<Text className="font-mono text-[11px] leading-5 text-white/55">
						{presentation?.summary ??
							"Location within relay range. Site status and linked infrastructure are tracked in distributed memory."}
					</Text>
					<Text className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
						{stateLabel}
					</Text>
					<View className="mt-4">
						<HudButton
							label="Open Site Brief"
							meta="survey, found, or enter the linked city"
							icon={<MapIcon width={16} height={16} color="#89d9ff" />}
							variant="secondary"
							testID="location-open-site-brief"
							onPress={() => setModalOpen(true)}
						/>
					</View>
				</HudPanel>
			</View>
			{modalOpen && (
				<CitySiteModal
					city={activeCity ?? null}
					context={{
						cityInstanceId: activeCity?.id ?? null,
						discovered: poi.discovered === 1,
						distance: 0,
						name: poi.name,
						poiId: poi.id,
						poiType: poi.type,
					}}
					mode="world"
					onClose={() => setModalOpen(false)}
				/>
			)}
		</>
	);
}
