/**
 * Stub for Playwright CT. Avoids bundling react-native-reanimated (worklets, TurboModule).
 */
import type { ComponentType } from "react";

export const View = "div";
export const Text = "span";
export const createAnimatedComponent = <P extends object>(
	C: ComponentType<P>,
): ComponentType<P> => C;

export function useSharedValue<T>(init: T) {
	return { value: init };
}
export function useAnimatedStyle(_fn: () => object) {
	return {};
}
export function withSpring(to: number, _opt?: object) {
	return to;
}
export function withTiming(to: number, _opt?: object) {
	return to;
}
export function withRepeat(anim: number, _count?: number) {
	return anim;
}
export function withSequence(...args: number[]) {
	return args[0] ?? 0;
}
export const Easing = { linear: 0, bezier: () => 0 };

const Animated = { View: "div", Text: "span", createAnimatedComponent };
export default Animated;
