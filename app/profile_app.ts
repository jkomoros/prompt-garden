import {
	ProfileBrowser
} from '../src/profile_browser.js';

import {
	Choice,
	LeafValue
} from '../src/types.js';

import {
	showConfirm,
	showPrompt
} from './actions/dialog.js';

import {
	store
} from './store.js';

export class ProfileApp extends ProfileBrowser {

	_promptResolve? : (input: string) => void;
	_promptReject? : () => void;

	_confirmResolve? : (input : boolean) => void;
	_confirmReject? : () => void;

	override prompt(question: string, defaultValue: LeafValue, choices? : Choice[]): Promise<string> {

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

	override confirm(question: string): Promise<boolean> {
		store.dispatch(showConfirm(question));

		return new Promise<boolean>((resolve, reject) => {
			this._confirmResolve = resolve;
			this._confirmReject = reject;
		});
	}

	provideConfirmResult(input : boolean) {
		if (!this._confirmResolve) throw new Error('No response active');
		this._confirmResolve(input);
		this._confirmResolve = undefined;
		this._confirmReject = undefined;
	}

	provideConfirmFailure() {
		if (!this._confirmReject) throw new Error('No response active');
		this._confirmReject();
		this._confirmResolve = undefined;
		this._confirmReject = undefined;
	}
}