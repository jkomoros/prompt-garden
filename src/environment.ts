import  {
    EnvironmentData
} from './types.js';

export class Environment {

    _data : EnvironmentData

    constructor (data : EnvironmentData) {
        this._data = data;
    }
}