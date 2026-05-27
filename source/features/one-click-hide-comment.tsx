import delegate, {type DelegateEvent} from 'delegate-it';
import React from 'dom-chef';
import * as pageDetect from 'github-url-detection';
import EyeClosedIcon from 'octicons-plain-react/EyeClosed';
import {$, $optional, closestElement} from 'select-dom';

import features from '../feature-manager.js';
import observe from '../helpers/selector-observer.js';

const formSelector = [
	'form[action$="/minimize-comment"]',
	'form[action$="/minimize"]', // Review thread comments
] as const;

function addHideAsSpamButton(pencilButton: HTMLButtonElement): void {
	const comment = closestElement('.unminimized-comment', pencilButton);

	// Only add button if hide form exists (i.e. user has permission to hide the comment)
	if (!$optional(formSelector, comment)) {
		return;
	}

	pencilButton.before(
		<button
			type="button"
			role="menuitem"
			className="timeline-comment-action btn-link rgh-one-click-hide-comment"
			aria-label="Hide comment as spam"
			title="Hide as spam"
		>
			<EyeClosedIcon />
		</button>,
	);
}

function hideAsSpam(event: DelegateEvent<MouseEvent, HTMLButtonElement>): void {
	const comment = closestElement('.unminimized-comment', event.delegateTarget);
	const hideForm = $(formSelector, comment);

	// Submit the form with classifier=spam by appending a temporary submit button.
	// `formNoValidate` bypasses the browser's HTML5 validation (the `classifier` select
	// has `required` and would fail validation when hidden).
	const submitButton = document.createElement('button');
	submitButton.type = 'submit';
	submitButton.name = 'classifier';
	submitButton.value = 'spam';
	submitButton.hidden = true;
	submitButton.formNoValidate = true;
	hideForm.append(submitButton);
	submitButton.click();
	submitButton.remove();
}

function init(signal: AbortSignal): void {
	// Observe the quick-edit pencil button so our icon is always inserted before it
	observe('.rgh-quick-comment-edit-button', addHideAsSpamButton, {signal});
	delegate('.rgh-one-click-hide-comment', 'click', hideAsSpam, {signal});
}

void features.add(import.meta.url, {
	asLongAs: [
		pageDetect.isLoggedIn,
	],
	include: [
		pageDetect.hasComments,
	],
	init,
});

/*

Test URLs:

- https://github.com/refined-github/sandbox/pull/47

*/
