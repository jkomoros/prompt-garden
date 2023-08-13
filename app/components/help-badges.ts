import { html, css } from 'lit';

import {
	WARNING_ICON,
	HELP_ICON,
} from './my-icons.js';

//if you use help, also print out helpStyles
export const help = (message : string, isAlert? : boolean) => {
	return html`<span class='help' title="${message}">${isAlert ? WARNING_ICON : HELP_ICON}</span>`;
};

export const HelpStyles =  css`
	.help {
		margin-left:0.4em;
	}

	.help svg {
		height:1.3em;
		width:1.3em;
		fill: var(--app-dark-text-color-subtle);
	}
`;