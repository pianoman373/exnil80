import type { PeripheralCallbacks } from '../exnil_80/PeripheralPort';
import { element } from './UIFramework';

export class PeripheralsPanel {
  public root: HTMLElement;
  private lButton: HTMLElement;

  public peripheralCallbacks: PeripheralCallbacks;
  private cooldown: number = 0;

  constructor() {
    const contents = element('div', {
      className: 'printer_paper',
      textContent: '',
    });

    this.lButton = element('button', {
      textContent: 'clear',
      onclick: () => {
        contents.textContent = '';
      },
    });
    const topBar = element('div', {
      className: 'notes_panel_top_bar',
      children: [this.lButton],
    });

    this.root = element('div', {
      className: 'storage_panel',
      children: [topBar, contents],
    });

    this.peripheralCallbacks = {
      read: () => {
        return this.cooldown > 0 ? 0x00 : 0x80;
      },
      tick: (dt) => {
        this.cooldown = Math.max(0, this.cooldown - dt);
      },
      write: (v) => {
        if (this.cooldown == 0) {
          this.cooldown = 0.001;
          contents.textContent += String.fromCharCode(v);
        }
      },
      readyToRead: () => {
        return false;
      },
      readyToWrite: () => {
        return this.cooldown === 0;
      },
    };
  }
}
