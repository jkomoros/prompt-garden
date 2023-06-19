import {
    Garden
} from '../src/garden.js';

import {
    EnvironmentData,
    environmentData
} from '../src/types.js';

import * as fs from 'fs';
import * as path from 'path';

const ENVIRONMENT_PATH = 'environment.SECRET.json';
const SEEDS_DIRECTORY = 'seeds/';

export const loadLocalGarden = async(overrides? : EnvironmentData) : Promise<Garden> => {
    const data = fs.readFileSync(ENVIRONMENT_PATH).toString();
    const env = environmentData.parse(JSON.parse(data));
    if (!overrides) overrides = {};
    const finalEnv = {
        ...env,
        ...overrides
    }
    const garden = new Garden(finalEnv);
    for (const file of fs.readdirSync(SEEDS_DIRECTORY)) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(SEEDS_DIRECTORY, file);
        const data = fs.readFileSync(filePath).toString();
        const json = JSON.parse(data);
        //TODO: typecheck. Also, why does this pass typechecking?
        garden.plantSeedPacket(filePath, json);
    }
    return garden;
}