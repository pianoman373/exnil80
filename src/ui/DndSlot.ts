import { element, type ElementProps } from './UIFramework';

export class DndSlot {
  public root: HTMLElement;
  public onDrop: (payload: string) => boolean;

  private static slots: DndSlot[] = [];

  static registerSlot(slot: DndSlot) {
    this.slots.push(slot);
  }

  static findSlotAt(clientX: number, clientY: number) {
    for (var slot of this.slots) {
      const rect = slot.root.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return slot;
      }
    }
    return null;
  }

  constructor(
    props: ElementProps<'div'>,
    onDrop: (payload: string) => boolean
  ) {
    this.root = element('div', props);
    this.onDrop = onDrop;

    DndSlot.registerSlot(this);
  }
}
