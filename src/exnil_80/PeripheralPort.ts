export type PeripheralCallbacks = {
  tick: (delta: number) => void;
  read: () => number;
  write: (value: number) => void;
  readyToWrite: () => boolean;
  readyToRead: () => boolean;
};

export class PeripheralPort {
  public peripheralCallbacks?: PeripheralCallbacks;
  private registers: Uint8Array = new Uint8Array(2);

  constructor() {}

  cycle(delta: number) {
    this.peripheralCallbacks?.tick(delta);
  }

  readReg(addr: number): number {
    switch (addr) {
      case 2:
        // status
        let b = 0;
        b |= this.peripheralCallbacks?.readyToRead() ? 0x40 : 0x00;
        b |= this.peripheralCallbacks?.readyToWrite() ?? true ? 0x80 : 0x00;
        return b;
      case 3:
        return 0;
      default:
        return this.registers[addr] ?? 0;
    }
  }

  writeReg(addr: number, val: number): void {
    switch (addr) {
      case 3:
        if (this.peripheralCallbacks?.readyToWrite())
          this.peripheralCallbacks.write(val);
        break;
      default:
        this.registers[addr] = val;
    }
  }
}
