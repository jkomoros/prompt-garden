import {
	Profile
} from '../src/profile.js';

import {
	z
} from 'zod';

import {
	StoreID,
	StoreKey,
	StoreValue,
	storeKey,
	storeValue
} from '../src/types.js';

import {
	Packets
} from './types.js';

const STORE_KEY_PREFIX = 'store_';

const localStorageKeys = () : string[] => {
	//localStorage has an Old Skool way of enumerating all keys
	const result : string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key === null) continue;
		result.push(key);
	}
	return result;
};

const storeApp = z.object({
	//This will help find storage format problems later
	version: z.literal(0),
	data: z.record(storeKey, storeValue)
});

type StoreApp = z.infer<typeof storeApp>;

//This profile knows how to load local packets from state.
export class ProfileApp extends Profile {

	_packets : Packets;

	_storeApps : {[name : StoreID] : StoreApp};

	constructor(packets : Packets) {
		super();
		this._packets = packets;
		//We lazy load this since the garden might be loaded and torn down
		//multiple times in quick succession, so loading and parsing each store
		//at boot would be prohibitively expensive for large profiles.
		this._storeApps = {};
	}

	_loadStore(store : StoreID) : [s : StoreApp, created : boolean] {
		let created = false;
		if (!this._storeApps[store]) {
			//Try loading from localStorage.
			const key = STORE_KEY_PREFIX + store;
			const rawValue = localStorage.getItem(key);
			if (rawValue === null) {
				//This is the first get.
				this._storeApps[store] = {
					version: 0,
					data: {}
				};
				created = true;
			} else {
				const json = JSON.parse(rawValue);
				const rec = storeApp.parse(json);
				this._storeApps[store] = rec;
			}
		}
		return [this._storeApps[store], created];
	}

	_saveStore(store : StoreID) : void {
		const rec = this._storeApps[store];
		if (!rec) throw new Error(`${store} was unexpectedly empty`);
		const key = STORE_KEY_PREFIX + store;
		const json = JSON.stringify(rec, null, '\t');
		localStorage.setItem(key, json);
	}

	override store(store: StoreID, key: StoreKey, value: StoreValue): void {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return super.store(store, key, value);
		}
		const [s] = this._loadStore(store);
		s.data[key] = value;
		this._saveStore(store);
	}

	override retrieve(store: StoreID, key: StoreKey): StoreValue | undefined {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return super.retrieve(store, key);
		}
		const [s] = this._loadStore(store);
		return s.data[key];
	}

	override delete(store: StoreID, key: StoreKey): boolean {
		if (this.garden?.environment.getKnownProtectedKey('mock')) {
			return super.delete(store, key);
		}
		const [s, created] = this._loadStore(store);
		if (created) return false;
		if (s.data[key] === undefined) return false;
		delete s.data[key];
		this._saveStore(store);
		return true;
	}

	override enumerateStores(): StoreID[] {
		const result : StoreID[] = [];
		for (const key of localStorageKeys()) {
			if (!key.startsWith(STORE_KEY_PREFIX)) continue;
			result.push(key.slice(STORE_KEY_PREFIX.length));
		}
		return result;
	}

	override async localFetch(location: string): Promise<string> {
		const packet = this._packets[location];
		if (!packet) return '';
		return JSON.stringify(packet, null, '\t');
	}
}