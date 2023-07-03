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

const ensureFolder = (folderPath : string) : void => {
	const folders = folderPath.split(path.sep);

	let currentFolder = '';
	for (const folder of folders) {
		currentFolder = path.join(currentFolder, folder);
		if (!fs.existsSync(currentFolder)) {
			fs.mkdirSync(currentFolder);
		}
	}
};

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

	override log(message?: unknown, ...optionalParams: unknown[]): void {
		const garden = this.garden;
		if (garden) {
			const mock = garden.environment.getKnownBooleanKey('mock');
			if (!mock) {
				ensureFolder(this._profileDir);
				const logFile = path.join(this._profileDir, LOG_FILE);
				//TODO: better output style (e.g. timestamps, maybe JSON-LD),
				//and don't drop optionalParams.
				fs.appendFileSync(logFile, message + '\n');
			}
		}
		super.log(message, ...optionalParams);
	}
}