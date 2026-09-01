import { State } from './State';
import { element } from './UIFramework';

const MIN_PANEL_WIDTH = 260;

class Resizer {
  public root: HTMLElement;
  private splitPos: number;
  private basis: 'left' | 'right';

  setPos(pos: number) {
    this.splitPos = pos;
    this.root.style[this.basis] = `${this.splitPos - 3}px`;
  }

  constructor(
    startPos: number,
    basis: 'left' | 'right',
    onDrag: (newPos: number) => void
  ) {
    this.splitPos = startPos;
    this.basis = basis;

    const mousemove = (ev: MouseEvent) => {
      if (this.basis === 'right') {
        onDrag(window.innerWidth - ev.clientX);
      } else {
        onDrag(ev.clientX);
      }
    };

    this.root = element('div', {
      className: 'resizer',
      style: {
        [basis]: `${this.splitPos - 3}px`,
      },
      draggable: false,
      onmousedown: (ev) => {
        this.root.classList.add('active');

        window.addEventListener('mousemove', mousemove);

        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((e) => (e.style.pointerEvents = 'none'));

        window.addEventListener(
          'mouseup',
          () => {
            this.root.classList.remove('active');
            window.removeEventListener('mousemove', mousemove);

            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((e) => (e.style.pointerEvents = 'auto'));
          },
          { once: true }
        );
        ev.preventDefault();
        ev.stopPropagation();
      },
    });
  }
}

class TabbedPanel {
  public root: HTMLElement;

  private tabList: HTMLElement;
  private collapsedLeft;
  private collapsedRight;
  private selectedTab = 0;
  private tabElements: HTMLElement[] = [];
  private contentsElements: HTMLElement[] = [];
  private contents: HTMLElement;

  constructor(
    collapseButtons: boolean,
    collapsedLeft?: boolean,
    collapsedRight?: boolean,
    onCollapse?: (side: 'left' | 'right', value: boolean) => void
  ) {
    this.collapsedLeft = collapsedLeft ?? false;
    this.collapsedRight = collapsedRight ?? false;
    const collapseLeft = element('div', {
      className: 'sidebar_toggle',
      children: [
        element('i', {
          className: 'material-symbols-outlined noselect',
          textContent: this.collapsedLeft
            ? 'keyboard_arrow_right'
            : 'keyboard_arrow_left',
        }),
      ],
      onclick: () => {
        this.collapsedLeft = !this.collapsedLeft;
        collapseLeft.firstChild!.textContent = this.collapsedLeft
          ? 'keyboard_arrow_right'
          : 'keyboard_arrow_left';
        onCollapse?.('left', this.collapsedLeft);
      },
    });
    const collapseRight = element('div', {
      className: 'sidebar_toggle',
      children: [
        element('i', {
          className: 'material-symbols-outlined noselect',
          textContent: this.collapsedRight
            ? 'keyboard_arrow_left'
            : 'keyboard_arrow_right',
        }),
      ],
      onclick: () => {
        this.collapsedRight = !this.collapsedRight;
        collapseRight.firstChild!.textContent = this.collapsedRight
          ? 'keyboard_arrow_left'
          : 'keyboard_arrow_right';
        onCollapse?.('right', this.collapsedRight);
      },
    });
    this.tabList = element('div', {
      className: 'tab_list',
    });

    const tabBar = element('div', {
      className: 'tab_bar',
      children: collapseButtons
        ? [collapseLeft, this.tabList, collapseRight]
        : [this.tabList],
    });
    this.contents = element('div', {
      className: 'panel_contents scrollable',
    });

    this.root = element('div', {
      className: 'panel',
      children: [tabBar, this.contents],
      style: {
        minWidth: MIN_PANEL_WIDTH + 'px',
      },
    });
  }

  selectTab(tab: number) {
    this.tabElements[this.selectedTab].classList.remove('active');
    this.contentsElements[this.selectedTab].hidden = true;
    this.selectedTab = tab;
    this.tabElements[this.selectedTab].classList.add('active');
    this.contentsElements[this.selectedTab].hidden = false;
  }

  addTab(name: string, contents: HTMLElement) {
    const active = this.tabElements.length === this.selectedTab;
    const tabNumber = this.tabElements.length;
    const tab = element('div', {
      className: `tab ${active ? 'active' : ''}`,
      onclick: () => {
        this.selectTab(tabNumber);
      },
      children: [
        element('span', {
          className: 'noselect',
          textContent: name,
        }),
      ],
    });
    if (!active) contents.hidden = true;
    this.tabList.appendChild(tab);
    this.tabElements.push(tab);
    this.contents.appendChild(contents);
    this.contentsElements.push(contents);
  }
}

export class PanelManager {
  public root: HTMLElement;
  public leftPanel: TabbedPanel;
  public centerPanel: TabbedPanel;
  public rightPanel: TabbedPanel;

  private leftPanelSize: number;
  private rightPanelSize: number;
  private leftResizer: Resizer;
  private rightResizer: Resizer;

  constructor() {
    this.leftPanelSize = State.settings.leftSplitSize;
    if (State.settings.leftCollapse) this.leftPanelSize = 0;
    this.rightPanelSize = State.settings.rightSplitSize;
    if (State.settings.rightCollapse) this.rightPanelSize = 0;
    this.leftPanel = new TabbedPanel(false);
    this.centerPanel = new TabbedPanel(
      true,
      State.settings.leftCollapse,
      State.settings.rightCollapse,
      (side, value) => {
        console.log(side, value);
        switch (side) {
          case 'left':
            if (value) {
              this.leftPanelSize = 0;
              State.settings.leftCollapse = true;
              State.saveToStorage();
              this.updatePanels();
            } else {
              this.leftPanelSize = State.settings.leftSplitSize;
              State.settings.leftCollapse = false;
              State.saveToStorage();
              this.updatePanels();
            }
            break;
          case 'right':
            if (value) {
              this.rightPanelSize = 0;
              State.settings.rightCollapse = true;
              State.saveToStorage();
              this.updatePanels();
            } else {
              this.rightPanelSize = State.settings.rightSplitSize;
              State.settings.rightCollapse = false;
              State.saveToStorage();
              this.updatePanels();
            }
            break;
        }
      }
    );
    this.rightPanel = new TabbedPanel(false);

    this.leftResizer = new Resizer(this.leftPanelSize, 'left', (pos) => {
      if (pos < MIN_PANEL_WIDTH) return;
      if (window.innerWidth - this.rightPanelSize - pos < MIN_PANEL_WIDTH)
        return;
      this.leftPanelSize = pos;
      State.settings.leftSplitSize = pos;
      State.saveToStorage();
      this.updatePanels();
    });
    this.rightResizer = new Resizer(this.rightPanelSize, 'right', (pos) => {
      if (pos < MIN_PANEL_WIDTH) return;
      if (window.innerWidth - this.leftPanelSize - pos < MIN_PANEL_WIDTH)
        return;
      this.rightPanelSize = pos;
      State.settings.rightSplitSize = pos;
      State.saveToStorage();
      this.updatePanels();
    });

    this.root = element('div', {
      id: 'panel_manager',
      children: [
        this.leftPanel.root,
        this.centerPanel.root,
        this.rightPanel.root,
        this.leftResizer.root,
        this.rightResizer.root,
      ],
    });
    console.log(this.leftPanelSize);
    this.updatePanels();

    window.onresize = () => {
      this.updatePanels();
    };
  }

  private updatePanels() {
    if (
      window.innerWidth - this.rightPanelSize - this.leftPanelSize <
      MIN_PANEL_WIDTH
    ) {
      this.leftPanelSize = Math.max(
        MIN_PANEL_WIDTH,
        window.innerWidth - this.rightPanelSize - MIN_PANEL_WIDTH
      );
    }

    if (
      window.innerWidth - this.rightPanelSize - this.leftPanelSize <
      MIN_PANEL_WIDTH
    ) {
      this.rightPanelSize = Math.max(
        MIN_PANEL_WIDTH,
        window.innerWidth - this.leftPanelSize - MIN_PANEL_WIDTH
      );
    }

    this.root.style.gridTemplateColumns = `${this.leftPanelSize}px auto ${this.rightPanelSize}px`;
    this.leftResizer.setPos(this.leftPanelSize);
    this.rightResizer.setPos(this.rightPanelSize);
  }

  public addPanel(
    name: string,
    location: 'left' | 'center' | 'right',
    contents: HTMLElement
  ) {
    switch (location) {
      case 'left':
        this.leftPanel.addTab(name, contents);
        break;
      case 'center':
        this.centerPanel.addTab(name, contents);
        break;
      case 'right':
        this.rightPanel.addTab(name, contents);
        break;
    }
  }
}
