/**
 * Stub for Playwright CT. Avoids bundling react-native-reanimated (worklets, TurboModule).
 */

import type { ComponentType } from "react";
import React from "react";

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

/** Flattens array styles so DOM elements don't receive arrays as style prop. */
function flattenStyle(
	style: object | object[] | undefined,
): React.CSSProperties {
	if (!style) return {};
	if (Array.isArray(style)) {
		return Object.assign({}, ...style.map((s) => flattenStyle(s)));
	}
	return style as React.CSSProperties;
}

function AnimatedView({
	style,
	...props
}: React.HTMLAttributes<HTMLDivElement> & { style?: object | object[] }) {
	return React.createElement("div", { ...props, style: flattenStyle(style) });
}

function AnimatedText({
	style,
	...props
}: React.HTMLAttributes<HTMLSpanElement> & { style?: object | object[] }) {
	return React.createElement("span", { ...props, style: flattenStyle(style) });
}

const Animated = {
	View: AnimatedView,
	Text: AnimatedText,
	createAnimatedComponent,
};
export default Animated;
