import { Text, View } from "react-native";

export function LoadingOverlay({ label }: { label: string }) {
	return (
		<View className="absolute inset-0 items-center justify-center bg-[#02050a]/82 px-6">
			<View className="w-full max-w-[560px] rounded-[28px] border border-[#8be6ff]/20 bg-[#07111b]/94 px-6 py-6 shadow-2xl">
				<Text className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
					World Generation
				</Text>
				<Text className="mt-3 font-mono text-[20px] uppercase tracking-[0.12em] text-[#edfaff]">
					{label}
				</Text>
				<Text className="mt-3 font-mono text-[12px] leading-5 text-white/44">
					Persisting world topology, terrain tiles, points of interest, and city
					seeds into the active save database before hydrating the runtime
					scene.
				</Text>
				<View className="mt-5 h-2 overflow-hidden rounded-full border border-[#8be6ff]/18 bg-[#061018]">
					<View className="h-full w-2/3 bg-[#7fe5ff]" />
				</View>
			</View>
		</View>
	);
}
