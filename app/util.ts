import {
	TypedObject
} from '../src/typed-object.js';

import {
	EnvironmentData,
	environmentData,
	emptySeedPacket,
	SeedData
} from '../src/types.js';

import {
	DottedObjectPath,
	ObjectPath,
	PacketType,
	Packets,
	PacketsBundle,
	packetType,
	packets,
	PacketName,
	WrappedPacket,
	StringTimestamp,
	CurrentSeedSelector
} from './types.js';

import {
	assertUnreachable
} from '../src/util.js';

const PACKETS_LOCAL_STORAGE_KEY = 'packets';
const ENVIRONMENT_LOCAL_STORAGE_KEY = 'environment';
const INITALIZED_LOCAL_STORAGE_KEY = 'initialized';

export const now = () : StringTimestamp => {
	const d = new Date();
	return d.toISOString();
};

export const emptyWrappedSeedPacket = () : WrappedPacket => {
	return {
		data: emptySeedPacket(),
		collapsed: false,
		lastUpdated: now()
	};
};

export const packetTypeEditable = (packetType : PacketType) : boolean => {
	switch(packetType) {
	case 'local':
		return true;
	case 'remote':
		return false;
	default:
		return assertUnreachable(packetType);
	}
};

export const getSeed = (bundle : PacketsBundle, selector : CurrentSeedSelector) : SeedData | undefined => {
	const packet = getPacket(bundle, selector.currentPacket, selector.currentPacketType);
	if (!packet) return undefined;
	return packet.data.seeds[selector.currentSeed];
};

export const getPacketsOfType = (bundle : PacketsBundle, packetType : PacketType) : Packets => {
	//TODO: can't this just be something like byType[packetType]?
	switch (packetType) {
	case 'local':
		return bundle.local;
	case 'remote':
		return bundle.remote;
	default:
		return assertUnreachable(packetType);
	}
};

export const getPacket = (bundle : PacketsBundle, name : PacketName, packetType : PacketType) : WrappedPacket => {
	const packets  = getPacketsOfType(bundle, packetType);
	return packets[name];
};

const packetStorageKeyForType = (packetType : PacketType) : string => {
	return PACKETS_LOCAL_STORAGE_KEY + '_' + packetType;
};

export const isFirstRun = () : boolean => {
	return window.localStorage.getItem(INITALIZED_LOCAL_STORAGE_KEY) ? false : true;
};

export const setFirstRunComplete = () => {
	window.localStorage.setItem(INITALIZED_LOCAL_STORAGE_KEY, 'true');
};

export const fetchPacketsFromStorage = (packetType : PacketType) : Packets  => {
	const rawObject = window.localStorage.getItem(packetStorageKeyForType(packetType));
	if (!rawObject) return {};
	const json = JSON.parse(rawObject);
	return packets.parse(json);
};

export const storePacketBundleToStorage = (bundle : PacketsBundle) => {
	for (const pType of TypedObject.keys(packetType.enum)) {
		storePacketsToStorage(pType, bundle[pType]);
	}
};

export const storePacketsToStorage = (packetType : PacketType, packets : Packets) => {
	window.localStorage.setItem(packetStorageKeyForType(packetType), JSON.stringify(packets, null, '\t'));
};

export const fetchEnvironmentFromStorage = () : EnvironmentData => {
	const rawObject = window.localStorage.getItem(ENVIRONMENT_LOCAL_STORAGE_KEY);
	if (!rawObject) return {};
	const json = JSON.parse(rawObject);
	return environmentData.parse(json);
};

export const storeEnvironmentToStorage = (environment : EnvironmentData) => {
	window.localStorage.setItem(ENVIRONMENT_LOCAL_STORAGE_KEY, JSON.stringify(environment, null, '\t'));
};

export const unpackDottedPath = (path : DottedObjectPath) : ObjectPath => {
	return path.split('.').map(piece => isNaN(parseInt(piece)) ? piece : parseInt(piece));
};

type PropertyInput = Record<string, unknown> | unknown[];

export const getProperty = (obj : PropertyInput, path : ObjectPath) : unknown => {
	//TODO: rationalize with src/util.ts getObjectProperty?
	if (!path || path.length === 0) return obj;
	if (!obj || typeof obj != 'object') throw new Error('obj must be an object');
	const pathPart = path[0];
	const pathRest = path.slice(1);
	const isArray = Array.isArray(obj);
	const isNumber = typeof pathPart == 'number';
	if (isArray && !isNumber) throw new Error('Obj is array but path part is not number');
	if (!isArray && isNumber) throw new Error('Obj is not array but path part is number');
	const subObj = (obj as Record<string, unknown>)[pathPart];
	if (path.length > 1) {
		if (!subObj || typeof subObj != 'object') throw new Error('Sub-obj is not an object');
		return getProperty(subObj as Record<string, unknown>, pathRest);
	}
	return subObj;
};

export const cloneAndSetProperty = <T extends PropertyInput>(obj : T, path : ObjectPath, value : unknown) : T => {
	//TODO: rationalize with src/util.ts/setObjectProperty
	//TODO: convince myself this cast works.
	if (!path || path.length === 0) return value as T;
	if (!obj || typeof obj != 'object') throw new Error('obj must be an object');
	const pathPart = path[0];
	const pathRest = path.slice(1);
	if (Array.isArray(obj)) {
		const result = [...obj] as unknown[];
		if (typeof pathPart != 'number') throw new Error('First part of path was not a number for an array');
		result[pathPart] = path.length > 1 ? cloneAndSetProperty(obj[pathPart] as PropertyInput, pathRest, value) : value;
		return result as T;
	}
	const result = {...obj} as Record<string, unknown>;
	if (typeof pathPart == 'number') throw new Error('First part of path was a number for an object');
	result[pathPart] = path.length > 1 ? cloneAndSetProperty(obj[pathPart] as PropertyInput, pathRest, value) : value;
	return result as T;
};

export const cloneAndDeleteProperty = <T extends PropertyInput>(obj : T, path : ObjectPath) : T => {
	//TODO: convince myself this cast is justified
	if (!path || path.length === 0) return {} as T;
	if (!obj || typeof obj != 'object') throw new Error('obj must be an object');
	const pathPart = path[0];
	const pathRest = path.slice(1);
	if (Array.isArray(obj)) {
		const result = [...obj] as unknown[];
		if (typeof pathPart != 'number') throw new Error('First part of path was not a number for an array');
		if (path.length > 1) {
			result[pathPart] = cloneAndDeleteProperty(obj[pathPart] as PropertyInput, pathRest);
		} else {
			delete result[pathPart];
		}
		return result as T;
	}
	const result = {...obj} as Record<string, unknown>;
	if (typeof pathPart == 'number') throw new Error('First part of path was a number for an object');
	if (path.length > 1) {
		result[pathPart] = cloneAndDeleteProperty(obj[pathPart] as PropertyInput, pathRest);
	} else {
		delete result[pathPart];
	}
	return result as T;
};

//Eyeballing the list of
//https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types
//that appear to not have keyboard shortcuts 
const NON_TEXTUAL_INPUT_TYPES : {[type : string] : true} = {
	'button': true,
	'checkbox': true,
	'color': true,
	'file': true,
	'hidden': true,
	'image': true,
	'radio': true,
	'range': true,
	'submit': true
};

//Returns true unless a control is focused that has text editing or other
//keyboard navigation.
export const keyboardShouldNavigate = () : boolean => {
	const ele = document.activeElement;
	if (ele instanceof HTMLInputElement) {
		if (NON_TEXTUAL_INPUT_TYPES[ele.type]) return true;
		return false;
	}
	if (ele instanceof HTMLTextAreaElement) {
		return false;
	}
	if (ele instanceof HTMLElement) {
		if (ele.isContentEditable) return false;
		return true;
	}
	return true;
};