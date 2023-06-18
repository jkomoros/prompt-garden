import  {
    EnvironmentData, KnownEnvironmentKey
} from './types.js';

export class Environment {

    _data : EnvironmentData

    constructor (data : EnvironmentData) {
        this._data = data;
    }

    //gets the value of the given string, returning the first item in the list
    //to be set, and if none are set returning default.
    get(key : string | string[], defaultValue = '') : string {
        if (typeof key == 'string') {
            key = [key];
        }
        for (const item of key) {
            if (this._data[item] !== undefined) return this._data[item];
        }
        return defaultValue;
    }

    //getKnownKey is like get but for explicitly known keys, allowing type
    //checking to detect errors. When you're using a known key, use this instead.
    getKnownKey(key : KnownEnvironmentKey | KnownEnvironmentKey[], defaultValue  = '') : string {
        return this.get(key, defaultValue);
    }
}