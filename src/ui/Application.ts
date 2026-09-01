import { Exnil80FP } from './Exnil80FP.ts';
import { LoadPresetPopup } from './LoadPresetPopup.ts';
import { LoadStatePopup } from './LoadStatePopup.ts';
import { ManualPanel } from './ManualPanel.ts';
import { NotesPanel } from './NotesPanel.ts';
import { Notifier } from './Notifier.ts';
import { PanelManager } from './PanelManager.ts';
import { PeripheralsPanel } from './PeripheralsPanel.ts';
import { PopupManager } from './PopupManager.ts';
import { SettingsPanel } from './SettingsPanel.ts';
import { State } from './State.ts';
import { StoragePanel } from './StoragePanel.ts';
import { element } from './UIFramework.ts';

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
            const state = await State.saveToString();
            Notifier.notify('Copied state to clipboard');

            const textarea = document.createElement('textarea');
            textarea.textContent = state;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          },
        }),
        element('button', {
          innerHTML: `<span class="material-symbols-outlined">
					file_open
					</span>Load State`,
          onclick: async () => {
            const contents = new LoadStatePopup();
            PopupManager.popup(contents.root);
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
    panelManager.addPanel('EXNIL 80', 'center', this.frontPanel.root);

    const settingsPanel = new SettingsPanel();
    panelManager.addPanel('Settings', 'center', settingsPanel.root);

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
