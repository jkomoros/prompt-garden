import {
	LeafValue
} from './types.js';


export class Profile{

	async localFetch(_location : string) : Promise<unknown> {
		throw new Error('localFetch is not supported on this profile type');
	}

	async prompt(question: string, defaultValue: LeafValue): Promise<string> {
		return prompt(question, String(defaultValue)) || '';
	}

}