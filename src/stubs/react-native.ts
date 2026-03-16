/**
 * Stub for Vite build. Prevents bundling real react-native.
 * Phase 6 replaces RN UI with DOM; this keeps build from pulling in RN.
 */
import React from "react";

export const Platform = {
	OS: "web" as const,
	select: <T>(o: { web?: T; default: T }) => o.web ?? o.default,
};

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

/** Maps React Native `testID` prop to HTML `data-testid` and flattens array styles. */
export function View({
	testID,
	style,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	testID?: string;
	style?: object | object[];
}) {
	return React.createElement("div", {
		...props,
		"data-testid": testID,
		style: flattenStyle(style),
	});
}

/** Maps React Native `testID` prop to HTML `data-testid` and flattens array styles. */
export function Text({
	testID,
	style,
	...props
}: React.HTMLAttributes<HTMLSpanElement> & {
	testID?: string;
	style?: object | object[];
}) {
	return React.createElement("span", {
		...props,
		"data-testid": testID,
		style: flattenStyle(style),
	});
}

/** Maps React Native `testID` prop to HTML `data-testid` so Playwright getByTestId works. */
export function Pressable({
	testID,
	onPress,
	style,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	testID?: string;
	onPress?: () => void;
	style?: object | object[];
}) {
	return React.createElement("button", {
		...props,
		"data-testid": testID,
		style: flattenStyle(style),
		onClick:
			(props as React.ButtonHTMLAttributes<HTMLButtonElement>).onClick ??
			onPress,
	});
}
export const Touchable = Pressable;
export function ScrollView({
	testID,
	style,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	testID?: string;
	style?: object | object[];
}) {
	return React.createElement("div", {
		...props,
		"data-testid": testID,
		style: flattenStyle(style),
	});
}
export const TextInput = "input";
export const Image = "img";
export const StyleSheet = { create: (s: object) => s, absoluteFill: {} };
export const processColor = (color: unknown) =>
	typeof color === "number" ? color : 0;
export const findNodeHandle = (_ref: unknown) => null;
export const PixelRatio = { get: () => 1 };
/** Minimal Animated stub — prevents crashes from Animated.Value / Animated.timing in CT. */
class AnimatedValue {
	_value: number;
	constructor(init: number) {
		this._value = init;
	}
	setValue(val: number) {
		this._value = val;
	}
	addListener(_cb: (state: { value: number }) => void) {
		return "";
	}
	removeListener(_id: string) {}
	interpolate(_config: object) {
		return this;
	}
}
function AnimatedViewComponent({
	style,
	...props
}: React.HTMLAttributes<HTMLDivElement> & { style?: object | object[] }) {
	return React.createElement("div", { ...props, style: flattenStyle(style) });
}
function AnimatedTextComponent({
	style,
	...props
}: React.HTMLAttributes<HTMLSpanElement> & { style?: object | object[] }) {
	return React.createElement("span", { ...props, style: flattenStyle(style) });
}
const noopAnim = { start: (cb?: () => void) => cb?.() };
export const Animated = {
	View: AnimatedViewComponent,
	Text: AnimatedTextComponent,
	Value: AnimatedValue,
	ValueXY: class {
		constructor(init: { x: number; y: number }) {
			return init;
		}
	},
	timing: (_v: unknown, _cfg: unknown) => noopAnim,
	spring: (_v: unknown, _cfg: unknown) => noopAnim,
	sequence: (..._args: unknown[]) => noopAnim,
	parallel: (_args: unknown[]) => noopAnim,
	loop: (_anim: unknown) => noopAnim,
	event: () => () => {},
};
export const useWindowDimensions = () => ({ width: 1024, height: 768 });
export const PanResponder = {
	create: (_config: object) => ({
		panHandlers: {
			onStartShouldSetResponder: () => false,
			onMoveShouldSetResponder: () => false,
			onResponderGrant: () => {},
			onResponderMove: () => {},
			onResponderRelease: () => {},
		},
	}),
};
