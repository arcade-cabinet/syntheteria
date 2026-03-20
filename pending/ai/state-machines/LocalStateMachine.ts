export interface StateTransitionMap {
	[state: string]: readonly string[];
}

export class LocalStateMachine {
	private currentState: string;
	private readonly transitions: StateTransitionMap;

	constructor(initialState: string, transitions: StateTransitionMap) {
		this.currentState = initialState;
		this.transitions = transitions;
	}

	get state() {
		return this.currentState;
	}

	canTransition(nextState: string) {
		return this.transitions[this.currentState]?.includes(nextState) ?? false;
	}

	transition(nextState: string) {
		if (!this.canTransition(nextState)) {
			throw new Error(
				`Invalid transition from ${this.currentState} to ${nextState}.`,
			);
		}

		this.currentState = nextState;
	}
}
