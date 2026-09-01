import { DndSlot } from './DndSlot';
import { element } from './UIFramework';

export class DndItem {
  public root: HTMLElement;
  private dragging = false;
  private grabX = 0;
  private grabY = 0;
  public payload: string;
  public onMoved: () => void;

  constructor(
    payload: string,
    onMoved: () => void,
    onDragStart?: () => void,
    onDragEnd?: () => void
  ) {
    this.payload = payload;
    this.onMoved = onMoved;
    this.root = element('div');

    const onmousemove = (ev: MouseEvent) => {
      if (this.dragging) {
        ev.stopPropagation();
        ev.preventDefault();
        this.root.style.top = ev.clientY - this.grabY + 'px';
        this.root.style.left = ev.clientX - this.grabX + 'px';
      }
    };

    this.root.onmousedown = (ev) => {
      if (this.dragging) return;
      this.dragging = true;

      const rect = this.root.getBoundingClientRect();
      this.grabX = ev.clientX - rect.x;
      this.grabY = ev.clientY - rect.y;

      this.root.style.position = 'fixed';
      this.root.style.top = ev.clientY - this.grabY + 'px';
      this.root.style.left = ev.clientX - this.grabX + 'px';
      this.root.style.width = rect.width + 'px';
      this.root.style.height = rect.height + 'px';
      this.root.style.zIndex = '100';

      window.addEventListener('mousemove', onmousemove);

      onDragStart?.();

      ev.stopPropagation();
      ev.preventDefault();
    };

    this.root.onmouseup = (ev) => {
      if (this.dragging) {
        this.root.style.position = '';
        this.root.style.transform = '';
        this.root.style.width = '';
        this.root.style.height = '';
        this.dragging = false;
        const slot = DndSlot.findSlotAt(ev.clientX, ev.clientY);
        if (slot !== null) {
          if (slot.onDrop(this.payload)) {
            this.onMoved();
          }
        }
        onDragEnd?.();
        window.removeEventListener('mousemove', onmousemove);
      }
    };
  }
}
