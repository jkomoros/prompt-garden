import {
    Garden
} from '../src/garden.js';

import {
    environmentData
} from '../src/types.js';

import * as fs from 'fs';
import * as path from 'path';

const ENVIRONMENT_PATH = 'environment.SECRET.json';
const SEEDS_DIRECTORY = 'seeds/';

export const loadLocalGarden = async() : Promise<Garden> => {
    const data = fs.readFileSync(ENVIRONMENT_PATH).toString();
    const env = environmentData.parse(JSON.parse(data));
    const garden = new Garden(env);
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

const main = async () => {
    const garden = await loadLocalGarden();
    //Select default seed
    const seed = garden.seed();
    const result = await seed.grow();
    console.log(result);
};

(async () => {
    await main()
})();
