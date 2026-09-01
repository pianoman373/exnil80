import { DndSlot } from './DndSlot';
import { State } from './State';
import { StorageMedium } from './StorageMedium';
import { element } from './UIFramework';

export class StoragePanel {
	public root: HTMLElement;
	public contents: DndSlot;

	constructor() {
		const topBar = element('div', {
			className: 'storage_panel_top_bar',
			children: [
				element('button', {
					textContent: '+ EEPROM',
					onclick: () => this.addItem('eeprom'),
				}),
				element('button', {
					textContent: '+ DISK',
					onclick: () => this.addItem('disk'),
				}),
			],
		});
		this.contents = new DndSlot(
			{
				className: 'storage_panel_contents scrollable',
			},
			(p) => {
				State.storageContents = [p, ...State.storageContents];
				State.saveToStorage();
				this.renderContents();
				return true;
			}
		);

		const trashBar = new DndSlot(
			{
				className: 'storage_panel_trash_bar',
				children: [
					element('i', {
						className: 'material-symbols-outlined noselect',
						textContent: 'delete',
					}),
				],
			},
			(p) => {
				State.deleteDevice(p);
				State.saveToStorage();
				return true;
			}
		);

		this.root = element('div', {
			className: 'storage_panel',
			children: [topBar, this.contents.root, trashBar.root],
		});

		this.renderContents();
	}

	addItem(type: string) {
		const colors = ['black', 'blue', 'green', 'orange', 'red'];
		const randomColor = colors[Math.floor(Math.random() * colors.length)];
		State.newDevice(type, randomColor, '');
		this.renderContents();
	}

	renderContents() {
		this.contents.root.replaceChildren();
		for (var id of State.storageContents) {
			//console.log(id);
			const item = State.itemDB[id];
			this.contents.root.appendChild(this.createSlot(item.id));
		}
	}

	onItemLeave(id: string) {
		State.storageContents.splice(State.storageContents.indexOf(id), 1);
		State.saveToStorage();
		this.renderContents();
	}

	createSlot(id: string) {
		const contents = new StorageMedium(id, () => this.onItemLeave(id));
		const slot = element('div', {
			className: 'storage_panel_slot',
			children: [contents.root],
		});

		return slot;
	}
}
