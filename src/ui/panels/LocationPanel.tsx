import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { enterCityInstance, returnToWorld } from "../../world/cityTransition";
import { getActiveWorldSession } from "../../world/session";
import { HudButton } from "../components/HudButton";
import { HudPanel } from "../components/HudPanel";
import { MapIcon } from "../icons";

function describeCityState(state: string | undefined) {
	switch (state) {
		case "latent":
			return "Latent site";
		case "surveyed":
			return "Surveyed site";
		case "founded":
			return "Founded city";
		default:
			return "Unknown state";
	}
}

export function LocationPanel() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const session = getActiveWorldSession();

	if (snap.activeScene === "city") {
		return (
			<View className="absolute bottom-6 right-[196px] w-[320px] pointer-events-auto">
				<HudPanel
					title="City Instance"
					eyebrow="Interior Link"
					variant="default"
				>
					<Text className="font-mono text-[11px] leading-5 text-white/55">
						City interior runtime is active. This is the persistence-backed
						transition contract for future Quaternius assembly work.
					</Text>
					<View className="mt-4">
						<HudButton
							label="Return To World"
							meta="restore world-map scene"
							icon={<MapIcon width={16} height={16} color="#89d9ff" />}
							variant="secondary"
							onPress={returnToWorld}
						/>
					</View>
				</HudPanel>
			</View>
		);
	}

	if (!snap.nearbyPoiName || snap.activeCityInstanceId == null) {
		return null;
	}

	const activeCity = session?.cityInstances.find(
		(city) => city.id === snap.activeCityInstanceId,
	);
	const stateLabel = describeCityState(activeCity?.state);

	return (
		<View className="absolute bottom-6 right-[196px] w-[320px] pointer-events-auto">
			<HudPanel title={snap.nearbyPoiName} eyebrow="Nearby Point Of Interest">
				<Text className="font-mono text-[11px] leading-5 text-white/55">
					This location is within interaction range. City linkage, progression
					state, and transition context are persisted and resumed through the AI
					and world-session runtime.
				</Text>
				<Text className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
					{stateLabel}
				</Text>
				<View className="mt-4">
					<HudButton
						label={
							activeCity?.state === "founded" ? "Enter City" : "Survey Site"
						}
						meta={
							activeCity?.state === "founded"
								? "switch to city instance"
								: "open linked city runtime"
						}
						icon={<MapIcon width={16} height={16} color="#89d9ff" />}
						variant="secondary"
						onPress={() => enterCityInstance(snap.activeCityInstanceId!)}
					/>
				</View>
			</HudPanel>
		</View>
	);
}
