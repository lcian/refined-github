import './hide-prs.css';

import delegate, {type DelegateEvent} from 'delegate-it';
import React from 'dom-chef';
import * as pageDetect from 'github-url-detection';
import EyeClosedIcon from 'octicons-plain-react/EyeClosed';
import EyeIcon from 'octicons-plain-react/Eye';
import {closestElementOptional} from 'select-dom';
import {StorageItem} from 'webext-storage';

import features from '../feature-manager.js';
import {getRepo} from '../github-helpers/index.js';
import {getIdentifiers} from '../helpers/feature-helpers.js';
import observe from '../helpers/selector-observer.js';

const hidePrs = getIdentifiers(import.meta.url);

const hiddenPRs = new StorageItem<string[]>('rgh-hidden-prs', {defaultValue: []});

const prTitleLinkSelectors = [
	'a.js-navigation-open[data-hovercard-type="pull_request"]', // Legacy view, PR list
	'a.js-navigation-open[data-hovercard-type="issue"]',        // Legacy view, issue list
	'li[role="listitem"] h3 a[data-hovercard-url*="/pull"]',    // React view, PR list
	'a[data-testid="issue-pr-title-link"]',                     // React view, issue list
] as const;

function getPrId(link: HTMLAnchorElement): string | undefined {
	const match = new URL(link.href).pathname.match(/\/(?:pull|issues)\/(\d+)/);
	const repo = getRepo()?.nameWithOwner;
	if (!match || !repo) return undefined;
	return `${repo}#${match[1]}`;
}

async function addHideButton(titleLink: HTMLAnchorElement): Promise<void> {
	const prId = getPrId(titleLink);
	if (!prId) return;

	const row = closestElementOptional(['.Box-row', 'li[role="listitem"]'], titleLink);
	if (!row) return;

	const hidden = await hiddenPRs.get();
	const isHidden = hidden.includes(prId);

	if (isHidden) {
		row.classList.add(hidePrs.class);
	}

	const button = (
		<button
			type="button"
			className={`rgh-hide-prs-button btn-link color-fg-muted p-0 mr-2 ${isHidden ? 'rgh-pr-hidden' : ''}`}
			title={isHidden ? 'Show this PR' : 'Hide this PR'}
			data-pr-id={prId}
		>
			{isHidden ? <EyeIcon /> : <EyeClosedIcon />}
		</button>
	) as HTMLButtonElement;

	const insertionPoint
		= row.querySelector('[data-testid="list-row-comments"]') // React view
		?? row.querySelector('a.Link--muted[aria-label*=" comment"]'); // Legacy view, with comments

	if (insertionPoint) {
		insertionPoint.before(button);
	} else {
		// Legacy view, no comments: append to the right-side container
		row.querySelector('.flex-shrink-0.text-right')?.append(button);
	}
}

async function toggleHidePR(event: DelegateEvent<MouseEvent, HTMLButtonElement>): Promise<void> {
	event.stopPropagation();
	const button = event.delegateTarget;
	const prId = button.dataset.prId;
	if (!prId) return;

	const row = closestElementOptional(['.Box-row', 'li[role="listitem"]'], button);
	if (!row) return;

	const hidden = await hiddenPRs.get();
	const isCurrentlyHidden = hidden.includes(prId);

	if (isCurrentlyHidden) {
		await hiddenPRs.set(hidden.filter(id => id !== prId));
		row.classList.remove(hidePrs.class);
		button.title = 'Hide this PR';
		button.classList.remove('rgh-pr-hidden');
		button.firstChild?.remove();
		button.append(<EyeClosedIcon />);
	} else {
		await hiddenPRs.set([...hidden, prId]);
		row.classList.add(hidePrs.class);
		button.title = 'Show this PR';
		button.classList.add('rgh-pr-hidden');
		button.firstChild?.remove();
		button.append(<EyeIcon />);
	}
}

async function init(signal: AbortSignal): Promise<void> {
	observe(prTitleLinkSelectors, addHideButton, {signal});
	delegate('.rgh-hide-prs-button', 'click', toggleHidePR, {signal});
}

void features.add(import.meta.url, {
	include: [
		pageDetect.isIssueOrPRList,
	],
	init,
});

/*

Test URLs

- PRs: https://github.com/refined-github/refined-github/pulls
- Issues: https://github.com/refined-github/refined-github/issues

*/
