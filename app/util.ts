import {
	DottedObjectPath,
	ObjectPath,
	Packets
} from './types.js';

const PACKETS_LOCAL_STORAGE_KEY = 'packets';

export const fetchPacketsFromStorage = () : Packets  => {
	const rawObject = window.localStorage.getItem(PACKETS_LOCAL_STORAGE_KEY);
	if (!rawObject) return {};
	return JSON.parse(rawObject) as Packets;
};

export const storePacketsToStorage = (packets : Packets) => {
	window.localStorage.setItem(PACKETS_LOCAL_STORAGE_KEY, JSON.stringify(packets, null, '\t'));
};

export const unpackDottedPath = (path : DottedObjectPath) : ObjectPath => {
	return path.split('.').map(piece => isNaN(parseInt(piece)) ? piece : parseInt(piece));
};

type PropertyInput = Record<string, unknown> | unknown[];

export const getProperty = (obj : PropertyInput, path : ObjectPath) : unknown => {
	if (!obj || typeof obj != 'object') throw new Error('obj must be an object');
	const pathPart = path[0];
	const pathRest = path.slice(1);
	const isArray = Array.isArray(obj);
	const isNumber = typeof pathPart == 'number';
	if (isArray && !isNumber) throw new Error('Obj is array but path part is not number');
	if (!isArray && isNumber) throw new Error('Obj is not array but path part is number');
	const subObj = (obj as Record<string, unknown>)[pathPart];
	if (!subObj || typeof subObj != 'object') throw new Error('Sub-obj is not an object');
	if (path.length > 1) {
		return getProperty(subObj as Record<string, unknown>, pathRest);
	}
	return subObj;
};