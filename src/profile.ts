import { Garden } from './garden.js';
import {
	LeafValue
} from './types.js';


export class Profile{

	_garden : Garden | undefined;

	set garden(val : Garden) {
		this._garden = val;
	}

	get garden() : Garden | undefined {
		return this._garden;
	}

	async localFetch(_location : string) : Promise<unknown> {
		throw new Error('localFetch is not supported on this profile type');
	}

	async prompt(question: string, defaultValue: LeafValue): Promise<string> {
		return prompt(question, String(defaultValue)) || '';
	}

}