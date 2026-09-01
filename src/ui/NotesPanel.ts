import { State } from './State';
import { element } from './UIFramework';

import {
	EditorView,
	keymap,
	drawSelection,
	highlightActiveLine,
	rectangularSelection,
} from '@codemirror/view';
import { indentOnInput } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { insertTab } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { EditorState } from '@codemirror/state';

class Notepad {
	public root: HTMLElement;
	public view: EditorView;
	private noteID: number;

	constructor(num: number) {
		this.noteID = num;

		this.view = new EditorView({
			doc: State.notes[this.noteID],
			parent: document.body,
			extensions: [
				// The undo history
				history(),
				// Replace native cursor/selection with our own
				drawSelection(),
				// Re-indent lines when typing specific input
				indentOnInput(),
				highlightActiveLine(),
				rectangularSelection(),
				EditorState.allowMultipleSelections.of(true),
				keymap.of([
					// A large set of basic bindings
					...defaultKeymap,
					// Redo/undo keys
					...historyKeymap,
					{
						key: 'Tab',
						run: insertTab,
					},
				]),
				indentUnit.of('\t'),
				EditorView.updateListener.of((update) => {
					State.notes[this.noteID] = update.state.doc.toString();
					State.saveToStorage();
				}),
			],
		});
		this.root = element('div', {
			className: 'notepad',
			children: [this.view.dom],
		});

		// this.noteID = num;
		// const lines = (State.notes[this.noteID].match(/\n/g) || '').length + 1;
		// this.text = element('textarea', {
		// 	className: 'note_text',
		// 	spellcheck: false,
		// 	cols: 80,
		// 	rows: 2,
		// 	value: State.notes[this.noteID],
		// 	onkeydown: (ev) => this.onKeyDown(ev),
		// 	onkeyup: (ev) => this.onKeyUp(ev),
		// 	onchange: (ev) => this.onChange(ev),
		// });

		// this.root = element('div', {
		// 	className: 'notepad scrollable scrollable_x',
		// 	children: [
		// 		element('div', {
		// 			className: 'note_paper',
		// 			children: [this.text],
		// 		}),
		// 	],
		// });
	}

	// private onChange(ev: Event) {
	// 	State.notes[this.noteID] = this.text.value;
	// 	State.saveToStorage();
	// }

	// private onKeyDown(ev: KeyboardEvent) {
	// 	const lines = (this.text.value.match(/\n/g) || '').length + 1;

	// 	if (ev.key === 'Tab') {
	// 		ev.preventDefault();
	// 		var start = this.text.selectionStart;
	// 		var end = this.text.selectionEnd;

	// 		// set textarea value to: text before caret + tab + text after caret
	// 		this.text.value =
	// 			this.text.value.substring(0, start) +
	// 			'\t' +
	// 			this.text.value.substring(end);

	// 		// put caret at right position again
	// 		this.text.selectionStart = this.text.selectionEnd = start + 1;
	// 	} else if (ev.key === 'Enter') {
	// 		this.text.rows += 1;
	// 	}
	// }

	// private onKeyUp(ev: KeyboardEvent) {
	// 	const lines = (this.text.value.match(/\n/g) || '').length + 1;
	// 	this.text.rows = lines;
	// }
}

export class NotesPanel {
	public root: HTMLElement;
	private page = 0;

	private lButton: HTMLElement;
	private pageLabel: HTMLElement;
	private rButton: HTMLElement;

	private notepads: Notepad[] = [];

	constructor() {
		this.page = 0;

		this.lButton = element('button', {
			textContent: '<',
			onclick: () => this.setPage(Math.max(0, this.page - 1)),
		});

		this.pageLabel = element('button', {
			className: 'disabled',
			textContent: 'Note 1 / 10',
		});

		this.rButton = element('button', {
			textContent: '>',
			onclick: () => this.setPage(Math.min(9, this.page + 1)),
		});

		const topBar = element('div', {
			className: 'notes_panel_top_bar',
			children: [this.lButton, this.pageLabel, this.rButton],
		});

		for (let i = 0; i < 10; i++) {
			const notepad = new Notepad(i);
			notepad.root.hidden = true;
			this.notepads.push(notepad);
		}

		this.root = element('div', {
			className: 'storage_panel',
			children: [topBar, ...this.notepads.map((v) => v.root)],
		});

		this.setPage(State.notesPage);
	}

	private setPage(page: number) {
		this.notepads[this.page].root.hidden = true;
		this.notepads[page].root.hidden = false;
		this.page = page;
		State.notesPage = page;
		State.saveToStorage();
		this.lButton.classList.toggle('disabled', this.page === 0);
		this.rButton.classList.toggle('disabled', this.page === 9);

		this.pageLabel.textContent = `Note ${this.page + 1} / 10`;
	}
}
