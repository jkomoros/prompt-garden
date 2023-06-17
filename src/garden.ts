import  {
    Environment
} from './types.js';

export class Garden {
    _env : Environment

    constructor(environment : Environment) {
        this._env = environment;
    }
}