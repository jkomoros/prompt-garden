
//TODO: provide different event types
type CalculationEvent = Record<string, never>;

export class Calculation {
	private _queue: Array<(value: CalculationEvent) => void> = [];
	private _values: CalculationEvent[] = [];
	private _closed = false;

	get closed() : boolean {
		return this._closed;
	}

	async *events(): AsyncGenerator<CalculationEvent, void, undefined> {
		while (!this._closed || this._values.length > 0) {
			if (this._values.length > 0) {
				const nextValue = this._values.shift();
				if (!nextValue) throw new Error('Unexpected no more item');
				yield nextValue;
			} else {
				await new Promise<void>((resolve) => {
					this._queue.push(() => {
						resolve();
					});
				});
			}
		}
	}

	push(value: CalculationEvent): void {
		if (this.closed) {
			throw new Error('MultiPromise is closed, cannot push new values');
		}

		if (this._queue.length > 0) {
			const next = this._queue.shift();
			if (!next) throw new Error('Unexpected no next');
			this._values.push(value);
			next(value);
		} else {
			this._values.push(value);
		}
	}

	close(): void {
		this._closed = true;
		while (this._queue.length > 0) {
			const next = this._queue.shift();
			if (!next) throw new Error('Unexpected no next');
			const value = this._values.shift();
			if (value === undefined) throw new Error('Unexpected no value');
			next(value);
		}
	}
}