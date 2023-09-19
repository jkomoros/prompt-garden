
export type UndoableState<T> = {
	current: number,
	//The most recent head is at 0.
	//Don't allow states to be empty
	versions: [T, ...T[]]
};

export const initialVersion = <T>(initialVersion : T): UndoableState<T> => {
	return {
		current: 0,
		versions: [initialVersion]
	};
};

export const currentVersion = <T>(undoState : UndoableState<T>) : T => {
	const subState = undoState.versions[undoState.current];
	if (subState === undefined) throw new Error('No such state');
	return subState;
};

export const mayUndo = <T>(undoState : UndoableState<T>) : boolean => {
	return undoState.current < (undoState.versions.length - 1);
};

export const mayRedo = <T>(undoState : UndoableState<T>) : boolean => {
	return undoState.current > 0;
};

export const undo = <T>(undoState : UndoableState<T>) : UndoableState<T> => {
	if (!mayUndo(undoState)) throw new Error('Not allowed to undo');
	return {
		...undoState,
		current: undoState.current + 1
	};
};

export const redo = <T>(undoState : UndoableState<T>): UndoableState<T> => {
	if (!mayRedo(undoState)) throw new Error('Not allowed to redo');
	return {
		...undoState,
		current: undoState.current - 1
	};
};

export const pushVersion = <T>(undoState : UndoableState<T>, state : T): UndoableState<T> => {
	//Lop off any states before the current one, since we're now doing a new history forward.
	const currentVersions = undoState.versions.slice(undoState.current);
	return {
		...undoState,
		current: 0,
		versions: [state, ...currentVersions]
	};
};