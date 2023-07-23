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