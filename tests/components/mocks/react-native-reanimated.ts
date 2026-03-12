import type { ComponentType } from "react";
import { View } from "react-native";

type SharedValue<T> = {
	value: T;
};

function createAnimatedComponent<T>(Component: ComponentType<T>) {
	return Component;
}

function useSharedValue<T>(initialValue: T): SharedValue<T> {
	return { value: initialValue };
}

function useAnimatedStyle<T>(factory: () => T): T {
	return factory();
}

function withSpring<T>(value: T): T {
	return value;
}

function withTiming<T>(value: T): T {
	return value;
}

function withSequence<T>(...values: T[]): T {
	return values[values.length - 1];
}

function withRepeat<T>(
	value: T,
	_numberOfReps?: number,
	_reverse?: boolean,
): T {
	return value;
}

function withDelay<T>(_delayMs: number, value: T): T {
	return value;
}

const Animated = {
	createAnimatedComponent,
	View: createAnimatedComponent(View),
};

export default Animated;
export {
	createAnimatedComponent,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
};
