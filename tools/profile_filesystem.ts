import {
	Profile
} from '../src/profile.js';

import {
	LeafValue
} from '../src/types.js';

import fs from 'fs';
import path from 'path';

import inquirer from 'inquirer';

const PROFILE_DIRECTORY = '.profiles/';

const LOG_FILE = 'console.log';

export class ProfileFilesystem extends Profile {

	override async localFetch(location : string) : Promise<unknown> {
		const file = fs.readFileSync(location).toString();
		return JSON.parse(file);
	}

	override async prompt(question: string, defaultValue: LeafValue): Promise<string> {
		const answers = await inquirer.prompt([{
			name: 'question',
			type: 'input',
			message: question,
			default: defaultValue
		}]);
		return answers.question;
	}

	get _profileDir() : string {
		const garden = this.garden;
		if (!garden) throw new Error('Garden not yet set');
		const profile = garden.environment.getKnownSecretKey('profile');
		if (!profile) throw new Error('Profile not set');
		return path.join(PROFILE_DIRECTORY, profile);
	}

	_ensureProfileDir() : void {
		if (!fs.existsSync(PROFILE_DIRECTORY)) {
			fs.mkdirSync(PROFILE_DIRECTORY);
		}
		const profilePath = this._profileDir;
		if (!fs.existsSync(profilePath)) {
			fs.mkdirSync(profilePath);
		}
	}

	override log(message?: unknown, ...optionalParams: unknown[]): void {
		const garden = this.garden;
		if (garden) {
			const mock = garden.environment.getKnownBooleanKey('mock');
			if (!mock) {
				this._ensureProfileDir();
				const logFile = path.join(this._profileDir, LOG_FILE);
				//TODO: better output style (e.g. timestamps, maybe JSON-LD),
				//and don't drop optionalParams.
				fs.appendFileSync(logFile, message + '\n');
			}
		}
		super.log(message, ...optionalParams);
	}
}