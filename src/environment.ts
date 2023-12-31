import { Calculation } from './calculation.js';
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
	modelProvider,
	environmentData,
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

//The value we return if you get a secret key not from getKnownSecretKey.
export const SECRET_KEY_VALUE = '~SECRET~';

export class Environment {

	_data : EnvironmentData;
	_rnd : RandomGenerator;
	_calculation? : Calculation;

	constructor (data : EnvironmentData, rnd : RandomGenerator = Math.random, calculation? : Calculation) {
		//Just be extra sure that the data is valid.
		this._data = environmentData.parse(data);
		this._rnd = rnd;
		this._calculation = calculation;
	}

	get calculation() : Calculation | undefined {
		return this._calculation;
	}

	random() : number {
		return this._rnd();
	}
    
	_get(key : string | string[], defaultValue : Value = null, allowSecret : boolean, allowProtected : boolean) : Value {
		if (typeof key == 'string') {
			key = [key];
		}
		for (const item of key) {
			if (knownEnvironmentSecretKey.safeParse(item).success && !allowSecret) {
				if (this._data[item] !== undefined) return SECRET_KEY_VALUE;
			}
			if (knownEnvironmentProtectedKey.safeParse(item).success && !allowProtected) throw new Error(`Couldn't get protected key ${item}`);
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
		}, this._rnd, this._calculation);
	}

	cloneWithSeed(seed : string) : Environment {
		return new Environment(this._data, makeSeededRandom(seed), this._calculation);
	}

	cloneWithCalculation(calculation : Calculation) : Environment {
		if (this._calculation) throw new Error('Calculation already existed on environment');
		return new Environment(this._data, this._rnd, calculation);
	}

	keys() : string[] {
		return Object.keys(this._data);
	}

	//gets the value of the given string, returning the first item in the list
	//to be set, and if none are set returning default.
	get(key : string | string[], defaultValue : Value = null) : Value {
		return this._get(key, defaultValue, false, false);
	}

	//get() but handles protected keys without throwing. NOT TO BE USED in untrusted contexts.
	getIncludingProtected(key : string | string[], defaultValue : Value = null) : Value {
		return this._get(key, defaultValue, false, true);
	}

	//getKnownKey is like get but for explicitly known keys, allowing type
	//checking to detect errors. When you're using a known key, use this instead.
	getKnownKey(key : KnownEnvironmentKey | KnownEnvironmentKey[], defaultValue : Value = null) : Value {
		return this.get(key, defaultValue);
	}

	getKnownSecretKey(key : KnownEnvironmentSecretKey | KnownEnvironmentSecretKey[], defaultValue : Value = null) : Value {
		return this._get(key, defaultValue, true, false);
	}

	//A protected key is one who can only be read back by getKnownProtectedKey,
	//AND if it is ever set to a value via clone, it may only be set to true.
	//This is useful for things like `mock`, `disallow_remote`, etc, so that a
	//caller can neuter it and know that sub-seeds won't re-override it.
	getKnownProtectedKey(key : KnownEnvironmentProtectedKey | KnownEnvironmentProtectedKey[], defaultValue : Value = null) : boolean {
		return Boolean(this._get(key, defaultValue,false, true));
	}

	getKnownStringKey(key : KnownEnvironmentStringKey | KnownEnvironmentStringKey[], defaultValue : Value = null) : string {
		const rawValue = this.get(key, defaultValue);
		//String(null) is 'null', but should be ''.
		return rawValue ? String(rawValue) : '';
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
		if (result == CHANGE_ME_SENTINEL) {
			if (!noThrow) throw new Error(`API key for ${provider} was not set`);
			return '';
		}
		if (!result) return '';
		return String(result);
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
		const raw = this.getKnownStringKey('embedding_model');
		if (raw) return embeddingModelID.parse(raw);

		const rawProvider = this.getKnownStringKey('default_model_provider');
		if (rawProvider) {
			const provider = modelProvider.parse(rawProvider);
			return INFO_BY_PROVIDER[provider].defaultEmbeddingModel;
		}

		const providers = this.getProvidersWithAPIKeys();
		if (providers.length === 0) throw new Error('No providers have API keys set');
		return INFO_BY_PROVIDER[providers[0]].defaultEmbeddingModel;
	}

	getCompletionModel() : CompletionModelID {
		const raw = this.getKnownStringKey('completion_model');
		if (raw) return completionModelID.parse(raw);

		const rawProvider = this.getKnownStringKey('default_model_provider');
		if (rawProvider) {
			const provider = modelProvider.parse(rawProvider);
			return INFO_BY_PROVIDER[provider].defaultCompletionModel;
		}

		const providers = this.getProvidersWithAPIKeys();
		if (providers.length === 0) throw new Error('No providers have API keys set');
		return INFO_BY_PROVIDER[providers[0]].defaultCompletionModel;
	}
}