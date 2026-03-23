export interface ClockSnapshot {
	accumulator: number;
	deltaSeconds: number;
	fixedStepSeconds: number;
	tick: number;
}

export class AIClock {
	readonly fixedStepSeconds: number;
	private accumulator = 0;
	private tick = 0;

	constructor(fixedStepSeconds = 1 / 60) {
		this.fixedStepSeconds = fixedStepSeconds;
	}

	step(deltaSeconds: number): number {
		if (deltaSeconds < 0) {
			throw new Error("AIClock cannot step backwards.");
		}

		this.accumulator += deltaSeconds;
		let executed = 0;

		while (this.accumulator >= this.fixedStepSeconds) {
			this.accumulator -= this.fixedStepSeconds;
			this.tick++;
			executed++;
		}

		return executed;
	}

	reset() {
		this.accumulator = 0;
		this.tick = 0;
	}

	getSnapshot(deltaSeconds = 0): ClockSnapshot {
		return {
			accumulator: this.accumulator,
			deltaSeconds,
			fixedStepSeconds: this.fixedStepSeconds,
			tick: this.tick,
		};
	}
}
