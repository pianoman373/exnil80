import CPU from './CPU';

class StorageDevice {
  public readTime: number = 0;
  public writeTime: number = 0;
  public spinUpTime: number = 0;
  public spinDownTimeout: number = 0;

  public onReadSector?: (sector: number) => Uint8Array;
  public onWriteSector?: (sector: number, data: Uint8Array) => void;

  private transferCooldown = 0;
  private transferWrite = false;
  public diskPresent = false;
  public spinningCooldown = 0;

  private registers: Uint8Array = new Uint8Array(8);
  private buffer: Uint8Array = new Uint8Array(256);

  readReg(addr: number): number {
    switch (addr) {
      case 5: // transfer complete
        return this.transferCooldown > 0 ? 0x00 : 0x80;
      case 6: //shift register data out
        if (this.transferCooldown === 0) {
          const val = this.buffer[this.registers[7]];
          this.registers[7] += 1; // increment index
          if (this.registers[7] === 0) {
            // set overflow
            this.registers[4] = 0x80;
          } else {
            // clear overflow
            this.registers[4] = 0x00;
          }
          return val;
        }
        return 0;
      case 8:
        return this.diskPresent ? 0x80 : 0;
      default:
        return this.registers[addr] ?? 0;
    }
  }

  writeReg(addr: number, val: number): void {
    switch (addr) {
      case 0: // sector high
        if (this.transferCooldown === 0) this.registers[addr] = val;
        break;
      case 1: // sector low
        if (this.transferCooldown === 0) this.registers[addr] = val;
        break;
      case 2: // initiate read operation
        if (this.transferCooldown === 0) {
          this.transferCooldown =
            this.readTime + (this.spinningCooldown > 0 ? 0 : this.spinUpTime);
          this.spinningCooldown = this.spinDownTimeout;
          this.transferWrite = false;
        }
        break;
      case 3: // initiate write operation
        if (this.transferCooldown === 0) {
          this.transferCooldown =
            this.writeTime + (this.spinningCooldown > 0 ? 0 : this.spinUpTime);
          this.spinningCooldown = this.spinDownTimeout;
          this.transferWrite = true;
        }
        break;
      case 4: // shift register overflow
        break; // read-only
      case 5: // transfer complete
        break; // read-only
      case 6: // shift register data in
        if (this.transferCooldown === 0) {
          this.buffer[this.registers[7]] = val;
          this.registers[7] += 1; // increment index
          if (this.registers[7] === 0) {
            // set overflow
            this.registers[4] = 0x80;
          } else {
            // clear overflow
            this.registers[4] = 0x00;
          }
        }
        break;
      case 7: // shift register position
        if (this.transferCooldown === 0) {
          this.registers[addr] = val;
          this.registers[4] = 0; // reset overflow
        }
        break;
      default:
        this.registers[addr] = val;
    }
    return;
  }

  frame(delta: number): boolean {
    if (this.transferCooldown > 0) {
      this.transferCooldown = Math.max(0, this.transferCooldown - delta);

      if (this.transferCooldown === 0) {
        this.registers[7] = 0; // reset shift register position
        this.registers[4] = 0; // reset overflow
        const sector = (this.registers[0] << 8) | this.registers[1];
        if (this.transferWrite) {
          //console.log(this.buffer);
          this.onWriteSector?.(sector, this.buffer);
        } else {
          this.buffer = this.onReadSector?.(sector) ?? this.buffer.fill(0);
        }

        return true;
      }
    }

    this.spinningCooldown = Math.max(0, this.spinningCooldown - delta);
    return false;
  }
}

class StorageController {
  public disk0;
  public disk1;

  private registers: Uint8Array = new Uint8Array(3);

  private cpu: CPU;

  constructor(cpu: CPU) {
    this.cpu = cpu;
    this.disk0 = new StorageDevice();
    this.disk1 = new StorageDevice();

    this.disk0.readTime = 0.01;
    this.disk0.writeTime = 0.01;
    this.disk0.spinUpTime = 0.5;
    this.disk0.spinDownTimeout = 1.0;

    this.disk1.readTime = 0.01;
    this.disk1.writeTime = 0.01;
    this.disk1.spinUpTime = 0.5;
    this.disk1.spinDownTimeout = 1.0;
  }

  readReg(addr: number): number {
    if (addr < 3) {
      return this.registers[addr];
    } else {
      switch (this.registers[2]) {
        case 0x00:
          return this.disk0.readReg(addr - 3);
        case 0x01:
          return this.disk1.readReg(addr - 3);
        default:
          return 0;
      }
    }
  }
  writeReg(addr: number, val: number): void {
    if (addr < 3) {
      this.registers[addr] = val;
    } else {
      switch (this.registers[2]) {
        case 0x00:
          this.disk0.writeReg(addr - 3, val);
          return;
        case 0x01:
          this.disk1.writeReg(addr - 3, val);
          return;
      }
    }
  }
  frame(delta: number, cpu: CPU): void {
    let interrupt = false;

    interrupt ||= this.disk0.frame(delta);
    interrupt ||= this.disk1.frame(delta);

    if (interrupt) {
      if (this.registers[1] & 0b1000_0000) {
        // is interrupt enabled?
        this.registers[0] |= 0b1000_0000; // latch interrupt status
        cpu.interrupt();
      }
    }
  }
  notifyDiskSwap() {
    if (this.registers[1] & 0b0100_0000) {
      // is interrupt enabled?
      this.registers[0] |= 0b0100_0000; // latch interrupt status
      this.cpu.interrupt();
    }
  }
}

export default StorageController;
