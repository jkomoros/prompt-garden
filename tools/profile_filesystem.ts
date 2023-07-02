import {
	Profile
} from '../src/profile.js';

import {
	LeafValue
} from '../src/types.js';

import * as fs from 'fs';

import inquirer from 'inquirer';


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
}