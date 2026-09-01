import { DndItem } from './DndItem';
import { State } from './State';
import { element } from './UIFramework';

export class StorageMedium extends DndItem {
	constructor(id: string, onMoved: () => void, inserted: boolean = false) {
		const info = State.itemDB[id];

		if (info.type == 'disk') {
			const insertedDisk = element('div', {
				className: 'svg_background container',
				style: {
					backgroundImage: `url("disk_${info.color}_inserted.svg")`,
					aspectRatio: '1100/80',
				},
			});

			const freeDisk = element('div', {
				className: 'svg_background container',
				style: {
					backgroundImage: `url("disk_${info.color}.svg")`,
					aspectRatio: '1100/1075',
				},
				children: [
					element('textarea', {
						rows: 5,
						className: 'sticker',
						value: info.label,
						spellcheck: false,
						style: {
							position: 'relative',
							left: '18%',
							top: '42%',
							width: '61%',
							height: '46%',
						},
						onmousedown: (ev) => {
							ev.stopPropagation();
						},
						onchange: (ev) => {
							State.itemDB[id].label = (
								ev.target as HTMLTextAreaElement
							).value;
							State.saveToStorage();
						},
					}),
				],
			});

			if (inserted) freeDisk.hidden = true;
			else insertedDisk.hidden = true;

			super(
				id,
				onMoved,
				() => {
					insertedDisk.hidden = true;
					freeDisk.hidden = false;
				},
				() => {
					insertedDisk.hidden = false;
					freeDisk.hidden = true;
				}
			);

			this.root.appendChild(freeDisk);
			this.root.appendChild(insertedDisk);
		} else if (info.type == 'eeprom') {
			const background = element('div', {
				className: 'svg_background container',
				style: {
					backgroundImage: 'url("eeprom.svg")',
					aspectRatio: '900/425',
				},
				children: [
					element('textarea', {
						rows: 5,
						className: 'sticker',
						value: info.label,
						spellcheck: false,
						style: {
							position: 'relative',
							left: '18%',
							top: '35%',
							width: '61%',
							height: '25%',
						},
						onmousedown: (ev) => {
							ev.stopPropagation();
						},
						onchange: (ev) => {
							State.itemDB[id].label = (
								ev.target as HTMLTextAreaElement
							).value;
							State.saveToStorage();
						},
					}),
				],
			});

			super(id, onMoved);

			this.root.appendChild(background);
		}
	}
}
