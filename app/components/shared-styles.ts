import { css } from 'lit';

export const SharedStyles = css`
	:host {
		display: block;
		box-sizing: border-box;
	}

	[hidden] {
		display:none !important;
	}

	label, .label {
		font-size: 0.8em;
		color: var(--dark-gray-color);
		line-height: 1.1em;
	}

	summary label {
		font-weight:bold;
	}

	label.subtle {
		font-weight: normal;
	}

	details {
		color: var(--dark-gray-color);
	}

	.row {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		margin: 0.5em 0.5em;
	}

	.row label {
		margin-right: 0.5em;
	}
`;
