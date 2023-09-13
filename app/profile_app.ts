import {
	ProfileBrowser
} from '../src/profile_browser.js';

import {
	LeafValue
} from '../src/types.js';

import {
	showPrompt
} from './actions/dialog.js';

import {
	store
} from './store.js';

export class ProfileApp extends ProfileBrowser {

	_promptResolve? : (input: string) => void;
	_promptReject? : () => void;

	override prompt(question: string, defaultValue: LeafValue, choices? : string[]): Promise<string> {

		store.dispatch(showPrompt(question, String(defaultValue), choices));

		return new Promise<string>((resolve, reject) => {
			this._promptResolve = resolve;
			this._promptReject = reject;
		});
	}

	providePromptResult(input: string) {
		if (!this._promptResolve) throw new Error('No response active');
		this._promptResolve(input);
		this._promptResolve = undefined;
		this._promptReject = undefined;
	}

	providePromptFailure() {
		if (!this._promptReject) throw new Error('No response active');
		this._promptReject();
		this._promptResolve = undefined;
		this._promptReject = undefined;
	}
}