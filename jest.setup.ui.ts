/**
 * Jest setup for UI (RNTL) tests only.
 * Uses jest-expo preset; no SQLite db required for component rendering.
 */

jest.mock("tone", () => ({
	context: {},
	getContext: () => ({}),
	setContext: () => {},
	start: () => Promise.resolve(),
	Transport: { start: () => {}, stop: () => {} },
}));

jest.mock("react-native-reanimated", () => {
	const mockReact = require("react");
	const mockRN = jest.requireActual("react-native");
	const mockWrap = (Comp: unknown) => {
		const Base = Comp ?? mockRN.View;
		const AnimatedComp = (props: unknown) =>
			mockReact.createElement(Base, props);
		(AnimatedComp as { displayName?: string }).displayName =
			"Animated(" +
			((Base as { displayName?: string }).displayName ?? "Component") +
			")";
		return AnimatedComp;
	};
	const mockAnimatedView = mockWrap(mockRN.View);
	const mockAnimatedText = mockWrap(mockRN.Text);
	return {
		__esModule: true,
		default: {
			createAnimatedComponent: mockWrap,
			View: mockAnimatedView,
			Text: mockAnimatedText,
		},
		useSharedValue: (v: number) => ({ value: v }),
		withSpring: (v: number) => v,
		withTiming: (v: number) => v,
		withRepeat: (v: number) => v,
		withSequence: (..._args: number[]) => 0,
		Easing: { linear: 0 },
		useAnimatedStyle: () => ({}),
		useAnimatedProps: () => ({}),
		runOnJS: (fn: () => void) => fn,
	};
});
