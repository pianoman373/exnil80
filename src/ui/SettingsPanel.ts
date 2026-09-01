import { element } from './UIFramework';

export class SettingsPanel {
	public root: HTMLElement;

	constructor() {
		const simpleMode = element('div', {
			children: [
				element('input', {
					type: 'checkbox',
					checked: localStorage.getItem('simpleUI') == 'true',
					onclick: () => {
						const check = simpleMode.firstChild as HTMLInputElement;
						localStorage.setItem(
							'simpleUI',
							check.checked.toString()
						);
						if (check.checked) {
							document.body.className = 'simple';
						} else {
							document.body.className = '';
						}
					},
				}),
				element('label', {
					textContent: 'Simple UI',
				}),
			],
		});

		this.root = element('div', {
			className: 'settings_panel',
			children: [simpleMode],
		});
		return;
	}
}
