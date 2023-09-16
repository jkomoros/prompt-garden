import {
	z
} from 'zod';

import {
	seedRefEquivalent
} from '../src/reference.js';

import {
	assertUnreachable
} from '../src/util.js';

import {
	SeedReference,
	Value,
	seedReference,
	value
} from './types.js';

const parentSeedReference = seedReference.extend({
	property: z.string()
});

const calculationEventSeedStart = z.object({
	type: z.literal('seed-start'),
	ref: seedReference,
	parent: z.optional(parentSeedReference)
});

const calculationEventSeedFinish = z.object({
	type: z.literal('seed-finish'),
	ref: seedReference,
	parent: z.optional(parentSeedReference),
	result: value
});

const calculationEventFinish = z.object({
	type: z.literal('finish'),
	result: value
});

export const calculationEvent = z.discriminatedUnion('type', [
	calculationEventSeedStart,
	calculationEventSeedFinish,
	calculationEventFinish
]);

export type CalculationEvent = z.infer<typeof calculationEvent>;

export class Calculation {
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

	get finished() : boolean {
		return this._closed;
	}

	get result() : Promise<Value> {
		return this._result;
	}
	
	async provideResultPromise(promise : Promise<Value>) {
		const result = await promise;
		this.push({
			type: 'finish',
			result
		});
		this._close();
		this._resultResolver(result);
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
		if (this.finished) {
			throw new Error('Calculation is finished, cannot push new values');
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

	_close(): void {
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

//TODO: do zod types (it's annoying because of recursion)
export type NestedCalculationEvent = {
	ref : SeedReference,
	children: Record<string, NestedCalculationEvent>,
	otherEvents: CalculationEvent[],
	result? : Value
}

const innerNestCalculationEvents = (events : CalculationEvent[]) : [result : NestedCalculationEvent, rest : CalculationEvent[]] => {
	const result : NestedCalculationEvent = {
		ref: {seed: ''},
		children: {},
		otherEvents: []
	};
	let started = false;
	let i = 0;
	while (i < events.length) {
		const event = events[i];
		const typ = event.type;
		switch(typ) {
		case 'seed-start':
			if (started) {
				if (!seedRefEquivalent(result.ref, event.parent)) throw new Error('We already started but didn\'t find us as parent');
				const prop = event.parent ? event.parent.property : '';
				const [inner, rest] = innerNestCalculationEvents(events.slice(i));
				//Start iteration over again with the rest
				events = rest;
				//i will be incermented before the top of the while lopp
				i = -1;
				result.children[prop] = inner;
			} else {
				result.ref = event.ref;
				started = true;
			}
			break;
		case 'seed-finish':
			if (!seedRefEquivalent(result.ref, event.ref)) throw new Error('Unexpected unmatched');
			result.result = event.result;
			return [result, events.slice(i + 1)];
		case 'finish':
			result.otherEvents.push(event);
			break;
		default:
			assertUnreachable(typ);
		}
		i++;
	}
	return [result, events.slice(i)];
};

/*

nestCalculationEvents scans through a stream of events to present a nested
demonstration of events.

It does not assume that the event stream is complete; it can be partial results.

*/
export const nestCalculationEvents = (events : CalculationEvent[]) : NestedCalculationEvent => {
	const [result] = innerNestCalculationEvents(events);
	//Drop any extra events on the floor.
	return result;
};