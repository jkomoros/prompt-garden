import {
	INFO_BY_PROVIDER
} from './llm.js';

import {
	makeSeededRandom
} from './random.js';
import { TypedObject } from './typed-object.js';

import {
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
	NAMESPACE_DELIMITER,
	knownEnvironmentKey,
	Namespace,
	namespace as namespaceSchema,
	knownEnvironmentProtectedKey,
	KnownEnvironmentProtectedKey,
	RandomGenerator,
	ModelProvider,
	EmbeddingModelID,
	embeddingModelID,
	CompletionModelID,
	completionModelID,
} from './types.js';

const CHANGE_ME_SENTINEL = 'CHANGE_ME';

const isNamespaced = (input : MemoryID | StoreID | VarName) : boolean => {
	return input.includes(NAMESPACE_DELIMITER);
};

const getNamespacedID = <I extends MemoryID | StoreID | VarName>(input : I, namespace : Namespace) : I => {
	if (isNamespaced(input)) return input;
	if (!namespaceSchema.safeParse(namespace).success) throw new Error(`${namespace} was not a valid namespace`);
	return (namespace + NAMESPACE_DELIMITER + input) as I;
};

const getNamespacedVar = (input : VarName, namespace: Namespace) : VarName => {
	//If it's a known var, then no need for namespace
	if (knownEnvironmentKey.safeParse(input).success) return input;
	return getNamespacedID(input, namespace);
};

export class Environment {

	_data : EnvironmentData;
	_rnd : RandomGenerator;

	constructor (data : EnvironmentData, rnd : RandomGenerator = Math.random) {
		this._data = data;
		this._rnd = rnd;
	}

	random() : number {
		return this._rnd();
	}
    
	_get(key : string | string[], defaultValue : Value = null, allowSecret = false) : Value {
		if (typeof key == 'string') {
			key = [key];
		}
		for (const item of key) {
			if (knownEnvironmentSecretKey.safeParse(item).success && !allowSecret) throw new Error(`Couldn't get secret key ${item}`);
			if (knownEnvironmentProtectedKey.safeParse(item).success && !allowSecret) throw new Error(`Couldn't get protected key ${item}`);
			if (this._data[item] !== undefined) return this._data[item];
		}
		return defaultValue;
	}

	clone(overrides : EnvironmentData) : Environment {
		for (const [key, value] of Object.entries(overrides)) {
			if (knownEnvironmentProtectedKey.safeParse(key).success && value !== true) throw new Error(`Protected key ${key} may only be overriden to true`);
		}
		return new Environment({
			...this._data,
			...overrides
		}, this._rnd);
	}

	cloneWithSeed(seed : string) : Environment {
		return new Environment(this._data, makeSeededRandom(seed));
	}

	//gets the value of the given string, returning the first item in the list
	//to be set, and if none are set returning default.
	get(key : string | string[], defaultValue : Value = null) : Value {
		return this._get(key, defaultValue, false);
	}

	//getKnownKey is like get but for explicitly known keys, allowing type
	//checking to detect errors. When you're using a known key, use this instead.
	getKnownKey(key : KnownEnvironmentKey | KnownEnvironmentKey[], defaultValue : Value = null) : Value {
		return this.get(key, defaultValue);
	}

	getKnownSecretKey(key : KnownEnvironmentSecretKey | KnownEnvironmentSecretKey[], defaultValue : Value = null) : string {
		return String(this._get(key, defaultValue, true));
	}

	//A protected key is one who can only be read back by getKnownProtectedKey,
	//AND if it is ever set to a value via clone, it may only be set to true.
	//This is useful for things like `mock`, `disallow_remote`, etc, so that a
	//caller can neuter it and know that sub-seeds won't re-override it.
	getKnownProtectedKey(key : KnownEnvironmentProtectedKey | KnownEnvironmentProtectedKey[], defaultValue : Value = null) : boolean {
		return Boolean(this._get(key, defaultValue, true));
	}

	getKnownStringKey(key : KnownEnvironmentStringKey | KnownEnvironmentStringKey[], defaultValue : Value = null) : string {
		return String(this.get(key, defaultValue));
	}

	getKnownBooleanKey(key : KnownEnvironmentBooleanKey | KnownEnvironmentBooleanKey[], defaultValue : Value = null) : boolean {
		return Boolean(this.get(key, defaultValue));
	}

	getMemoryID(input : MemoryID) : MemoryID {
		const namespace = this.getKnownStringKey('namespace');
		return getNamespacedID(input, namespace);
	}

	getStoreID(input : StoreID) : StoreID {
		const namespace = this.getKnownStringKey('namespace');
		return getNamespacedID(input, namespace);
	}

	getVarName(input : VarName) : VarName {
		const namespace = this.getKnownStringKey('namespace');
		return getNamespacedVar(input, namespace);
	}

	getAPIKey(provider : ModelProvider, noThrow = false) : string {
		const providerInfo = INFO_BY_PROVIDER[provider];
		const result = this.getKnownSecretKey(providerInfo.apiKeyVar);
		if (result == CHANGE_ME_SENTINEL && !noThrow) throw new Error(`API key for ${provider} was not set`);
		return result;
	}

	getProvidersWithAPIKeys() : ModelProvider[] {
		const result : ModelProvider[] = [];
		for (const provider of TypedObject.keys(INFO_BY_PROVIDER)) {
			const key = this.getAPIKey(provider, true);
			if (key) result.push(provider);
		}
		return result;
	}

	getEmbeddingModel() : EmbeddingModelID {
		return embeddingModelID.parse(this.getKnownStringKey('embedding_model'));
	}

	getCompletionModel() : CompletionModelID {
		return completionModelID.parse(this.getKnownStringKey('completion_model'));
	}
}