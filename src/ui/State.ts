import { set, get, clear, del } from 'idb-keyval';

export type Item = {
	id: string;
	type: string;
	color: string;
	label: string;
};

// Comppreses string to GZIP. Retruns a Promise with Base64 string
export const compress = (string: string) => {
	const blobToBase64 = (blob: Blob) =>
		new Promise<string>((resolve, _) => {
			const reader = new FileReader();
			reader.onloadend = () =>
				resolve((reader.result as string).split(',')[1]);
			reader.readAsDataURL(blob);
		});
	const byteArray = new TextEncoder().encode(string);
	const cs = new CompressionStream('gzip');
	const writer = cs.writable.getWriter();
	writer.write(byteArray);
	writer.close();
	return new Response(cs.readable).blob().then(blobToBase64);
};

// Decompresses base64 encoded GZIP string. Retruns a string with original text.
export const decompress = (base64string: string) => {
	const bytes = Uint8Array.from(atob(base64string), (c) => c.charCodeAt(0));
	const cs = new DecompressionStream('gzip');
	const writer = cs.writable.getWriter();
	writer.write(bytes);
	writer.close();
	return new Response(cs.readable).arrayBuffer().then(function (arrayBuffer) {
		return new TextDecoder().decode(arrayBuffer);
	});
};

export class State {
	public static settings: {
		leftSplitSize: number;
		rightSplitSize: number;
		leftCollapse: boolean;
		rightCollapse: boolean;
	};

	public static storageContents: string[];

	public static itemDB: { [key: string]: Item };

	public static exnil80fp: {
		diskA: string;
		diskB: string;
		rom: string;
		flash: string;
	};

	public static notes: string[];
	public static notesPage: number;

	public static storageData: {
		[key: string]: { dirty: boolean; data: Uint8Array };
	};

	static newDevice(type: string, color: string, label: string): string {
		let item: Item = {
			id: crypto.randomUUID(),
			label: label,
			type: type,
			color: type === 'disk' ? color : '',
		};
		State.itemDB[item.id] = item;
		State.storageContents.push(item.id);
		State.saveToStorage();

		if (type === 'disk') {
			this.storageData[item.id] = {
				dirty: true,
				data: new Uint8Array(1048576),
			};
		} else if (type === 'eeprom') {
			this.storageData[item.id] = {
				dirty: true,
				data: new Uint8Array(8192),
			};
		}
		set(item.id, this.storageData[item.id].data);

		return item.id;
	}

	static deleteDevice(id: string) {
		delete State.itemDB[id];
		delete this.storageData[id];
		del(id);
		State.saveToStorage();
	}

	static clear() {
		State.loadDefaults();
		State.saveToStorage();
		clear();
	}

	static loadDefaults() {
		this.settings = {
			leftSplitSize: 300,
			rightSplitSize: 300,
			leftCollapse: false,
			rightCollapse: false,
		};
		this.storageContents = [];
		this.itemDB = {};
		this.exnil80fp = { diskA: '', diskB: '', rom: '', flash: '' };
		this.notes = Array(10).fill('');
		this.notesPage = 0;
	}

	static async loadFromStorage() {
		this.loadDefaults();
		const state = localStorage.getItem('state');
		if (state != null) {
			const j = JSON.parse(state);
			this.settings = j.settings;
			this.storageContents = j.storageContents;
			this.itemDB = j.itemDB;
			this.exnil80fp = j.exnil80fp;
			this.notes = j.notes;
			this.notesPage = j.notesPage;
		}

		State.storageData = {};
		for (let itemID in this.itemDB) {
			const arr = (await get(itemID)) as Uint8Array;
			if (!arr) {
				console.error(`Could not find item ID ${itemID} in indexedDB`);
			}
			State.storageData[itemID] = {
				data: arr,
				dirty: false,
			};
		}
	}

	static saveToStorage() {
		const j = {
			settings: this.settings,
			storageContents: this.storageContents,
			itemDB: this.itemDB,
			exnil80fp: this.exnil80fp,
			notes: this.notes,
			notesPage: this.notesPage,
		};
		localStorage.setItem('state', JSON.stringify(j));
	}

	static storageReadBlock(
		id: string,
		address: number,
		blockSize: number
	): Uint8Array {
		const buffer = new Uint8Array(blockSize);
		if (!id) return buffer;

		if (!this.storageData[id]) {
			console.log(
				`attempted to read from ${id} which doesn't exist in indexedDB`
			);
			return buffer;
		}
		const arr: Uint8Array = this.storageData[id].data;
		for (let i = 0; i < blockSize; i++) {
			buffer[i] = arr[address + i];
		}
		return buffer;
	}

	static storageWriteBlock(id: string, address: number, value: Uint8Array) {
		if (!id) return;
		if (!this.storageData[id]) {
			console.log(
				`attempted to write to ${id} which doesn't exist in indexedDB`
			);
			return;
		}

		for (let i = 0; i < value.length; i++) {
			this.storageData[id].data[address + i] = value[i];
		}
		set(id, this.storageData[id].data);
	}

	static async loadFromLegacyString(str: string): Promise<boolean> {
		if (str == '') return false;

		try {
			const json: any = JSON.parse(await decompress(str));
			State.clear();
			const slot_contents = JSON.parse(json._slot_contents);
			const storage_contents = JSON.parse(json._storage_contents);

			for (var i of [
				...Object.values(slot_contents),
				...Object.values(storage_contents),
			]) {
				if (i !== null) {
					const item = i as any;
					let id = '';
					if (item.type == 'FLOPPY') {
						id = State.newDevice('disk', 'blue', item.name);
					} else if (item.type == 'EEPROM') {
						id = State.newDevice('eeprom', '', item.name);
					}

					const stringData: string =
						json[`_storagedata_${item.name}`];
					const arr: Uint8Array = new Uint8Array(
						stringData.length / 2
					);
					for (let i = 0; i < stringData.length; i += 2) {
						arr[i / 2] = parseInt(
							stringData.substring(i, i + 2),
							16
						);
					}
					set(id, arr);
				}
			}
			return true;
		} catch (e) {
			console.error(e);
			return false;
		}
	}

	static async loadFromString(str: string, compressed: boolean): Promise<boolean> {
		if (str == '') return false;

		try {
			const json: any = JSON.parse(compressed ? await decompress(str) : str);
			State.clear();

			for (let i in json) {
				if (i.startsWith('_storagedata_')) {
					const stringData: string = json[i];
					const arr: Uint8Array = new Uint8Array(
						stringData.length / 2
					);
					for (let i = 0; i < stringData.length; i += 2) {
						arr[i / 2] = parseInt(
							stringData.substring(i, i + 2),
							16
						);
					}
					set(i.replace('_storagedata_', ''), arr);
				}
			}

			localStorage.setItem('state', json['state']);

			return true;
		} catch (e) {
			return false;
		}
	}

	static async saveToString(compressed: boolean): Promise<string> {
		let obj: any = {};
		obj.state = localStorage.getItem('state');

		for (var itemID in State.itemDB) {
			obj['_storagedata_' + itemID] = Array.from(
				this.storageData[itemID].data
			)
				.map((byte) => byte.toString(16).padStart(2, '0'))
				.join('');
		}
		if (compressed) {
			return await compress(JSON.stringify(obj));
		}
		else {
			return JSON.stringify(obj);
		}

		
	}
}
