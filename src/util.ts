export const absoluteRegExp = (r : RegExp) : RegExp => {
	return new RegExp('^' + r.source + '$');
};

export const assertUnreachable = (x : never) : never => {
	throw new Error('Exhaustiveness check failed: ' + String(x));
};

export const mockedResult = (input : string) : string => {
	return 'Mocked result: ' + input;
};

const ILLEGAL_NAME_CHARS = /[^a-zA-Z0-9_-]/g;

export const safeName = (input : string) : string => {
	return input.replace(ILLEGAL_NAME_CHARS, '_');
};

type NormalObject = {[name : string]: unknown};

//When given an object, sometimes you want to know if this object should be
//treated as a seed, a seed referrence, or a normal object. The object might not
//be valid in other ways as a seed or a reference, so using e.g. the
//seedData.parse isn't a good idea. This is the canonical way of detecting that
//it should be of that shape. We factor it out in one place in case we ever need
//to change htat logic.

export const objectShouldBeSeed = (obj : unknown) : boolean => {
	if (typeof obj != 'object') return false;
	if (!obj) return false;
	return 'type' in obj;
};

export const objectShouldBeReference = (obj : unknown) : boolean => {
	if (typeof obj != 'object') return false;
	if (!obj) return false;
	return 'seed' in obj;
};

export const getObjectProperty = (obj : NormalObject, path : string) : unknown => {
	if (!obj || typeof obj != 'object') throw new Error(`obj must be an object but had the value: ${obj}`);
	const parts = path.split('.');
	//if obj is an array then a get of a key like `1` will work as expected
	//thanks to the weird way that javascript handles arrays.
	const subObj = obj[parts[0]];
	if (parts.length > 1) {
		return getObjectProperty(subObj as NormalObject, parts.slice(1).join('.'));
	}
	return subObj;
};

export const setObjectProperty = (obj : NormalObject, path : string, value : unknown) : void => {
	if (!obj || typeof obj != 'object') throw new Error(`obj must be an object but had the value: ${obj}`);
	const parts = path.split('.');
	if (parts.length == 1) {
		obj[parts[0]] = value;
		return;
	}
	if (obj[parts[0]] !== undefined) {
		//The value exists, try to set in it.
		//We can do the cast because the top of the method will check to verify it matches the shape
		setObjectProperty(obj[parts[0]] as NormalObject, parts.slice(1).join('.'), value);
		return;
	}
	//Sub object doesn't exist, we need to create it. Is it an array or object?
	const subObject = isNaN(parseInt(parts[1])) ? {} : [];
	obj[parts[0]] = subObject;
	setObjectProperty(obj[parts[0]] as NormalObject, parts.slice(1).join('.'), value);
};

//From https://blog.trannhat.xyz/generate-a-hash-from-string-in-javascript/
export const hash = (s : string) : number => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a;},0);

export const stringHash = (s : string) : string => Math.abs(hash(s)).toString(16);