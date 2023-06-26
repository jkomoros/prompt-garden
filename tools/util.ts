import {
	Garden
} from '../src/garden.js';

import {
	EnvironmentData,
	LeafValue,
	LocalJSONFetcher,
	Prompter,
	environmentData
} from '../src/types.js';

import inquirer from 'inquirer';

import * as fs from 'fs';
import * as path from 'path';

const ENVIRONMENT_SAMPLE_PATH = 'environment.SECRET.json';
const ENVIRONMENT_PATH = 'environment.SECRET.json';
const SEEDS_DIRECTORY = 'seeds/';

export const localFetcher : LocalJSONFetcher = async (location : string) : Promise<unknown> => {
	const file = fs.readFileSync(location).toString();
	return JSON.parse(file);
};

export const localPrompter : Prompter = async (question : string, defaultValue : LeafValue) : Promise<string> => {
	const answers = await inquirer.prompt([{
		name: 'question',
		type: 'input',
		message: question,
		default: defaultValue
	}]);
	return answers.question;
};

export const loadEnvironment = (overrides? : EnvironmentData) : EnvironmentData => {
	//We use the sample file as a way to conveniently set defaults.
	const sampleData = fs.readFileSync(ENVIRONMENT_SAMPLE_PATH).toString();
	const sampleEnv = environmentData.parse(JSON.parse(sampleData));
	const secretData = fs.readFileSync(ENVIRONMENT_PATH).toString();
	const secretEnv = environmentData.parse(JSON.parse(secretData));
	if (!overrides) overrides = {};
	return {
		...sampleEnv,
		...secretEnv,
		...overrides
	};
};

export const loadLocalGarden = (overrides? : EnvironmentData) : Garden => {
	const env = loadEnvironment(overrides);
	const opts = {
		fetcher: localFetcher,
		prompter: localPrompter
	};
	const garden = new Garden(env, opts);
	for (const file of fs.readdirSync(SEEDS_DIRECTORY)) {
		if (!file.endsWith('.json')) continue;
		const filePath = path.join(SEEDS_DIRECTORY, file);
		const data = fs.readFileSync(filePath).toString();
		const json = JSON.parse(data);
		//TODO: typecheck. Also, why does this pass typechecking?
		garden.plantSeedPacket(filePath, json);
	}
	return garden;
};