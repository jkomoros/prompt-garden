import  {
    Environment,
    SeedData,
    SeedID
} from './types.js';

class Seed {

    _garden : Garden
    _id : SeedID
    _data : SeedData

    constructor(garden: Garden, id : SeedID, data : SeedData) {
        this._garden = garden;
        this._id = id;
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
        this._seeds[id] = new Seed(this, id, data);
    }

    //TODO: plantSeedPacket as well
}

