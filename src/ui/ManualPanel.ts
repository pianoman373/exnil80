import { element } from './UIFramework';

export class ManualPanel {
	public root: HTMLElement;

	constructor() {
		this.root = element('iframe', {
			src: 'manual.pdf',
			width: '100%',
			height: '99.5%',
			style: {
				overflow: 'hidden',
			},
		});
	}
}
