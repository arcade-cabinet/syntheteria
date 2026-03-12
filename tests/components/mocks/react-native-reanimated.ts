import type { ComponentType } from "react";

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

function withDelay<T>(_delayMs: number, value: T): T {
	return value;
}

const Animated = {
	createAnimatedComponent,
};

export default Animated;
export {
	createAnimatedComponent,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withSpring,
	withTiming,
};
