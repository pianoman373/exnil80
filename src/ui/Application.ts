import { Exnil80FP } from './Exnil80FP.ts';
import { LoadPresetPopup } from './LoadPresetPopup.ts';
import { LoadStatePopup } from './LoadStatePopup.ts';
import { ManualPanel } from './ManualPanel.ts';
import { NotesPanel } from './NotesPanel.ts';
import { Notifier } from './Notifier.ts';
import { PanelManager } from './PanelManager.ts';
import { PeripheralsPanel } from './PeripheralsPanel.ts';
import { PopupManager } from './PopupManager.ts';
import { State } from './State.ts';
import { StoragePanel } from './StoragePanel.ts';
import { element } from './UIFramework.ts';

const clipboardSave = false;

function downloadFile(contents: string) {
  var bb = new Blob([contents ], { type: 'text/plain' });
  var a = document.createElement('a');
  let d = new Date();
  a.download = `state_${d.getFullYear()}${d.getMonth().toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}_${d.getHours().toString().padStart(2, '0')}${d.getMinutes().toString().padStart(2, '0')}${d.getSeconds().toString().padStart(2, '0')}.x80`;
  a.href = window.URL.createObjectURL(bb);
  a.click();
}

function uploadFile(done: (contents: string) => void) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.x80';

  input.onchange = (e: Event) => { 
    var target = e.target as HTMLInputElement;
    var file = target.files![0]; 

    // setting up the reader
    var reader = new FileReader();
    reader.readAsText(file);

    // here we tell the reader what to do when it's done reading...
    reader.onload = readerEvent => {
      done(readerEvent.target!.result as string);
    }
  }
  input.click();
}

export class Application {
  private static frontPanel: Exnil80FP;

  public static async loadUI() {
    await State.loadFromStorage();

    if (localStorage.getItem('simpleUI') == 'true') {
      document.body.className = 'simple';
    }

    const app = document.getElementById('app')!;
    app.replaceChildren();

    const topBar = element('div', {
      id: 'top_bar',
      children: [
        element('button', {
          innerHTML: `<span class="material-symbols-outlined">
					save
					</span>Save State`,
          onclick: async () => {
            const state = await State.saveToString(true);
            if (clipboardSave) {
              Notifier.notify('Copied state to clipboard');

              const textarea = document.createElement('textarea');
              textarea.textContent = state;
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
            else {
              downloadFile(state);
            }
            
          },
        }),
        element('button', {
          innerHTML: `<span class="material-symbols-outlined">
					file_open
					</span>Load State`,
          onclick: async () => {
            if (clipboardSave) {
              const contents = new LoadStatePopup();
              PopupManager.popup(contents.root);
            }
            else {
              uploadFile(async (contents) => {
                const result = await State.loadFromString(
									contents,
									true
								);
								if (!result) {
									Notifier.notify(
										'Error: Invalid or corrupt state file'
									);
								}
                else {
                  Application.loadUI();
                }
              })
            }
            
          },
        }),
        element('button', {
          innerHTML: `<span class="material-symbols-outlined">
					lists
					</span>Load Preset`,
          onclick: async () => {
            const contents = new LoadPresetPopup();
            PopupManager.popup(contents.root);
          },
        }),
      ],
    });
    app.appendChild(topBar);

    const panelManager = new PanelManager();
    app.appendChild(panelManager.root);

    const notesPanel = new NotesPanel();
    panelManager.addPanel('Notes', 'right', notesPanel.root);

    const peripheralsPanel = new PeripheralsPanel();
    panelManager.addPanel('Peripherals', 'right', peripheralsPanel.root);

    const storagePanel = new StoragePanel();
    panelManager.addPanel('Storage', 'left', storagePanel.root);

    const manualPanel = new ManualPanel();
    panelManager.addPanel('Manual', 'left', manualPanel.root);

    this.frontPanel = new Exnil80FP(peripheralsPanel);
    panelManager.addPanel('Main Screen', 'center', this.frontPanel.root);

    if (localStorage.getItem('notFirstVisit') != 'true') {
      localStorage.setItem('notFirstVisit', 'true');
      const contents = new LoadPresetPopup();
      PopupManager.popup(contents.root);
    }
  }

  public static update(delta: number) {
    //console.time('update');
    Application.frontPanel.update(delta);
    //console.timeEnd('update');
  }
}
