import {
	Value
} from './types.js';

//TODO: provide different event types
type CalculationEvent = Record<string, never>;

export class Calculation {
	//TODO: do these accidentally get a shared array?
	private _queue: Array<(value: CalculationEvent) => void> = [];
	private _values: CalculationEvent[] = [];
	private _closed = false;
	private _result: Promise<Value>;
	//We can assert non-null because it's always provided in cnostructor, even
	//if typescript can't tell that automatically.
	private _resultResolver!: (value : Value) => void;

	constructor() {
		//We create our own promis so that we never have to check for an empty
		//promise on result.
		this._result = new Promise<Value>((resolve) => {
			this._resultResolver = resolve;
		});
	}

	get closed() : boolean {
		return this._closed;
	}

	get result() : Promise<Value> {
		return this._result;
	}
	
	async provideResultPromise(result : Promise<Value>) {
		this._resultResolver(await result);
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