import  {
	EnvironmentData,
	KnownEnvironmentKey,
	KnownEnvironmentBooleanKey,
	KnownEnvironmentStringKey,
	Value,
	knownEnvironmentSecretKey,
	KnownEnvironmentSecretKey,
	MemoryID,
	StoreID,
	VarName,
	NAMESPACE_DELIMITER
} from './types.js';

export const isNamespaced = (input : MemoryID | StoreID | VarName) : boolean => {
	return input.includes(NAMESPACE_DELIMITER);
};

export class Environment {

	_data : EnvironmentData;

	constructor (data : EnvironmentData) {
		this._data = data;
	}
    
	_get(key : string | string[], defaultValue = '', allowSecret = false) : Value {
		if (typeof key == 'string') {
			key = [key];
		}
		for (const item of key) {
			if (knownEnvironmentSecretKey.safeParse(item).success && !allowSecret) throw new Error(`Couldn't get secret key ${item}`);
			if (this._data[item] !== undefined) return this._data[item];
		}
		return defaultValue;
	}

	clone(overrides : EnvironmentData) : Environment {
		return new Environment({
			...this._data,
			...overrides
		});
	}

	//gets the value of the given string, returning the first item in the list
	//to be set, and if none are set returning default.
	get(key : string | string[], defaultValue = '') : Value {
		return this._get(key, defaultValue, false);
	}

	//getKnownKey is like get but for explicitly known keys, allowing type
	//checking to detect errors. When you're using a known key, use this instead.
	getKnownKey(key : KnownEnvironmentKey | KnownEnvironmentKey[], defaultValue  = '') : Value {
		return this.get(key, defaultValue);
	}

	getKnownSecretKey(key : KnownEnvironmentSecretKey | KnownEnvironmentSecretKey[], defaultValue = '') : string {
		return String(this._get(key, defaultValue, true));
	}

	getKnownStringKey(key : KnownEnvironmentStringKey | KnownEnvironmentStringKey[], defaultValue = '') : string {
		return String(this.get(key, defaultValue));
	}

	getKnownBooleanKey(key : KnownEnvironmentBooleanKey | KnownEnvironmentBooleanKey[], defaultValue = '') : boolean {
		return Boolean(this.get(key, defaultValue));
	}
}