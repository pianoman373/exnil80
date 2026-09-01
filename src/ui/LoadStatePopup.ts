import { Application } from './Application';
import { Notifier } from './Notifier';
import { PopupManager } from './PopupManager';
import { State } from './State';
import { element } from './UIFramework';

export class LoadStatePopup {
	public root: HTMLElement;

	constructor() {
		const text = element('textarea', {
			className: 'textbox_input',
			rows: 16,
			placeholder: 'paste state string here',
		});

		this.root = element('div', {
			className: 'load_state_popup',
			children: [
				element('h1', { textContent: 'Load State' }),
				text,
				element('div', {
					className: 'popup_button_row',
					children: [
						// element('button', {
						// 	textContent: 'Load (Legacy)',
						// 	onclick: async () => {
						// 		const result = await State.loadFromLegacyString(
						// 			text.value
						// 		);
						// 		text.value = '';
						// 		if (!result) {
						// 			Notifier.notify(
						// 				'Error: Invalid or corrupt state string'
						// 			);
						// 		} else {
						// 			PopupManager.close();
						// 			Application.loadUI();
						// 		}
						// 	},
						// }),
						element('button', {
							textContent: 'Load',
							onclick: async () => {
								const result = await State.loadFromString(
									text.value,
									true
								);
								text.value = '';
								if (!result) {
									Notifier.notify(
										'Error: Invalid or corrupt state string'
									);
								} else {
									PopupManager.close();
									Application.loadUI();
								}
							},
						}),
						element('button', {
							textContent: 'Close',
							onclick: () => {
								PopupManager.close();
							},
						}),
					],
				}),
			],
		});
	}
}
