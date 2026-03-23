/**
 * Stub for Vite/CT build. Prevents bundling real react-native.
 * Subpaths (e.g. react-native/Libraries/Utilities/codegenNativeComponent) resolve under this dir.
 */
export const Platform = {
	OS: "web" as const,
	select: <T>(o: { web?: T; default: T }) => o.web ?? o.default,
};
export const View = "div";
export const Text = "span";
export const Pressable = "button";
export const Touchable = "button";
export const ScrollView = "div";
export const TextInput = "input";
export const Image = "img";
export const StyleSheet = { create: (s: object) => s, absoluteFill: {} };
export const processColor = (color: unknown) =>
	typeof color === "number" ? color : 0;
export const findNodeHandle = (_ref: unknown) => null;
export const PixelRatio = { get: () => 1 };
export const Animated = { View: "div", Text: "span" };
export const useWindowDimensions = () => ({ width: 1024, height: 768 });

export const PanResponder = {
	create: (config: object) => ({
		panHandlers: {
			onStartShouldSetResponder: () => false,
			onMoveShouldSetResponder: () => false,
			onResponderGrant: () => {},
			onResponderMove: () => {},
			onResponderRelease: () => {},
		},
	}),
};

/** Stub for react-native-reanimated and other libs that use TurboModules in CT. */
export const TurboModuleRegistry = {
	get: (_name: string) => null,
};
