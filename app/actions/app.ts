
import {
	UPDATE_PAGE,
	UPDATE_OFFLINE,
	ActionUpdatePage,
	ActionUpdateOffline
} from '../actions.js';

import {
	selectPage,
	selectPageExtra,
} from '../selectors.js';

import {
	Thunk
} from '../store.js';

//if silent is true, then just passively updates the URL to reflect what it should be.
export const navigatePathTo = (path : string, silent = false): Thunk<ActionUpdatePage> => (dispatch) => {
	//If we're already pointed there, no need to navigate
	if ('/' + path === window.location.pathname) return;
	//Don't replace search or hash if they exist. If htey don't exist, these
	//will be '', but if they do exist they will have the '?' and '#' prepended.
	path = path + window.location.search + window.location.hash;
	if (silent) {
		window.history.replaceState({}, '', path);
		return;
	}
	window.history.pushState({}, '', path);
	dispatch(navigate(path));
};

export const canonicalizePath = () : Thunk<ActionUpdatePage> => (dispatch ,getState) => {

	const state = getState();

	const page = selectPage(state);
	const pageExtra = selectPageExtra(state);

	const path = [page];
	
	path.push(pageExtra);

	dispatch(navigatePathTo(path.join('/'), true));
};

export const navigate = (path : string) : Thunk<ActionUpdatePage> => (dispatch) => {
	// Extract the page name from path.
	const page = path === '/' ? 'main' : path.slice(1);

	// Any other info you might want to extract from the path (like page type),
	// you can do here
	dispatch(loadPage(page));
};

const loadPage  = (location : string) : Thunk<ActionUpdatePage> => (dispatch) => {

	const pieces = location.split('/');

	let page = pieces[0];
	const pageExtra = pieces.length < 2 ? '' : pieces.slice(1).join('/');

	switch(page) {
	case 'main':
		import('../components/main-view.js');
		break;
	default:
		page = 'view404';
		import('../components/my-view404.js');
	}

	dispatch(updatePage(page, pageExtra));
};

const updatePage = (page : string, pageExtra : string) : ActionUpdatePage => {
	return {
		type: UPDATE_PAGE,
		page,
		pageExtra,
	};
};

export const updateOffline = (offline : boolean) : Thunk<ActionUpdateOffline> => (dispatch) => {
	dispatch({
		type: UPDATE_OFFLINE,
		offline
	});
};