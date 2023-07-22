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

export const getObjectProperty = (obj : {[name : string]: unknown}, path : string) : unknown => {
	if (!obj || typeof obj != 'object') throw new Error(`obj must be an object but had the value: ${obj}`);
	const parts = path.split('.');
	//if obj is an array then a get of a key like `1` will work as expected
	//thanks to the weird way that javascript handles arrays.
	const subObj = obj[parts[0]];
	if (subObj === undefined) throw new Error(`obj had no property ${parts[0]}`);
	if (parts.length > 1) {
		return getObjectProperty(subObj as {[name : string] : unknown}, parts.slice(1).join('.'));
	}
	return subObj;
};