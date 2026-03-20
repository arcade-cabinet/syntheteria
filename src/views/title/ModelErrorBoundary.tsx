/**
 * ModelErrorBoundary — catches GLB/model load failures without crashing the game.
 *
 * Wraps individual model components so a 404'd GLB or corrupt file
 * logs a warning and renders nothing, instead of propagating to the
 * top-level FatalErrorBoundary and killing the entire scene.
 */

import { Component, type ReactNode } from "react";

interface Props {
	name?: string;
	children: ReactNode;
}

interface State {
	hasError: boolean;
}

export class ModelErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error) {
		console.warn(
			`[ModelErrorBoundary] Failed to load model${this.props.name ? ` "${this.props.name}"` : ""}: ${error.message}`,
		);
	}

	render() {
		if (this.state.hasError) return null;
		return this.props.children;
	}
}
