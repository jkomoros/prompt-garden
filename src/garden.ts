import  {
    Environment,
    SeedData,
    SeedID
} from './types.js';

class Seed {

    _data : SeedData

    constructor(data : SeedData) {
        this._data = data;
    }
}

export class Garden {
    _env : Environment
    _seeds : {[id : SeedID] : Seed}

    constructor(environment : Environment) {
        this._env = environment;
        this._seeds = {};
    }

    plantSeed(id : SeedID, data : SeedData) {
        this._seeds[id] = new Seed(data);
    }

    //TODO: plantSeedPacket as well
}

