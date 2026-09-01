import { element } from './UIFramework';

export class PopupManager {
	private static popupElement?: HTMLElement;

	public static popup(contents: HTMLElement) {
		const backdrop = element('div', {
			className: 'popup_background',
			draggable: false,
			children: [
				element('div', {
					className: 'popup_window',
					children: [contents],
				}),
			],
			onclick: (ev) => {
				if (ev.target === this.popupElement) PopupManager.close();
				//console.log(ev.target);
			},
		});
		document.body.appendChild(backdrop);

		PopupManager.popupElement = backdrop;
	}

	public static close() {
		document.body.removeChild(PopupManager.popupElement!);
		PopupManager.popupElement = undefined;
	}
}
