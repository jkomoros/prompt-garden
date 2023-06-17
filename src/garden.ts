import  {
    Environment,
    SeedData
} from './types.js';

class Seed {

    _data : SeedData

    constructor(data : SeedData) {
        this._data = data;
    }
}

export class Garden {
    _env : Environment
    _seeds : {[name : string] : Seed}

    constructor(environment : Environment) {
        this._env = environment;
        this._seeds = {};
    }

    plantSeed(name : string, data : SeedData) {
        this._seeds[name] = new Seed(data);
    }

    //TODO: plantSeedPacket as well
}

