import { element } from './UIFramework';

export class Notifier {
	static notificationElement?: HTMLElement = undefined;

	public static notify(text: string) {
		if (!this.notificationElement) {
			this.notificationElement = element('div', {
				className: 'notification hidden',
			});
			document.body.appendChild(this.notificationElement);
		}
		this.notificationElement.classList.toggle('hidden', false);
		this.notificationElement.textContent = text;

		window.setTimeout(() => {
			this.notificationElement!.classList.toggle('hidden', true);
		}, 1000.0);
	}
}
