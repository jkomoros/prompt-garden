import {
	Garden
} from '../src/garden.js';

import {
	EnvironmentData,
	environmentData
} from '../src/types.js';

import {
	ProfileFilesystem
} from './profile_filesystem.js';

import * as fs from 'fs';
import * as path from 'path';

const ENVIRONMENT_SAMPLE_PATH = 'environment.SAMPLE.json';
const ENVIRONMENT_PATH = 'environment.SECRET.json';
const SEEDS_DIRECTORY = 'seeds/';

export const ensureFolder = (folderPath : string) : void => {
	const folders = folderPath.split(path.sep);

	let currentFolder = '';
	for (const folder of folders) {
		currentFolder = path.join(currentFolder, folder);
		if (!fs.existsSync(currentFolder)) {
			fs.mkdirSync(currentFolder);
		}
	}
};

export const loadEnvironment = (overrides? : EnvironmentData) : EnvironmentData => {
	//We use the sample file as a way to conveniently set defaults.
	const sampleData = fs.readFileSync(ENVIRONMENT_SAMPLE_PATH).toString();
	//We'll parse to schema at the end, because the sample might be CHANGEME but
	//what we care about is it parses at the end.
	const sampleEnv = JSON.parse(sampleData) as EnvironmentData;
	const secretData = fs.readFileSync(ENVIRONMENT_PATH).toString();
	const secretEnv = JSON.parse(secretData) as EnvironmentData;
	if (!overrides) overrides = {};
	return environmentData.parse({
		...sampleEnv,
		...secretEnv,
		...overrides
	});
};

export const loadLocalGarden = (overrides? : EnvironmentData) : [garden: Garden, warnings: Error[] | null] => {
	const env = loadEnvironment(overrides);
	const profile = new ProfileFilesystem();
	const garden = new Garden(env, profile);
	const warnings : Error[] = [];
	for (const file of fs.readdirSync(SEEDS_DIRECTORY)) {
		if (!file.endsWith('.json')) continue;
		const filePath = path.join(SEEDS_DIRECTORY, file);
		const data = fs.readFileSync(filePath).toString();
		const json = JSON.parse(data);
		//TODO: typecheck. Also, why does this pass typechecking?
		const localWarnings = garden.plantSeedPacket(filePath, json);
		if (localWarnings) warnings.push(...localWarnings);
	}
	return [garden, warnings.length ? warnings : null];
};