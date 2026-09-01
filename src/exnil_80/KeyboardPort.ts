import CPU from './CPU';

class KeyboardPort {
  private terminalBuffer: string = '';
  public registers: Uint8Array;

  private shiftDown = false;
  private ctrlDown = false;
  private altDown = false;
  private heldKey: number = 0;
  private repeatTimer: number = 0;

  private cpu: CPU;

  put(num: number | null) {
    //console.log(num);
    if (num !== null) this.terminalBuffer += String.fromCharCode(num);
  }

  sendScancode(scancode: number, repeat: boolean = false) {
    const capsOn = (this.registers[1] & 0x04) > 0;
    const scrollLockOn = (this.registers[1] & 0x08) > 0;
    const intEnable = (this.registers[1] & 0x80) > 0;
    const realMode = (this.registers[1] & 1) > 0;
    let code = scancode & 0x7f;
    const isDown = (scancode & 0x80) === 0;

    if (code === 0x18 && isDown) {
      // break key
      this.cpu.nmi();
      return;
    }
    if (code === 0x14 && isDown) {
      // caps key
      if (capsOn) this.registers[1] &= ~0x04;
      else this.registers[1] |= 0x04;
    } else if (code === 0x15) {
      // scroll lock key
      if (scrollLockOn) this.registers[1] &= ~0x08;
      else this.registers[1] |= 0x08;
      return;
    } else if (code === 0x12) {
      // ctrl key
      this.ctrlDown = isDown;
    } else if (code === 0x11) {
      // shift key
      this.shiftDown = isDown;
    } else if (code === 0x13) {
      // alt key
      this.altDown = isDown;
    } else if (!repeat) {
      if (isDown) {
        this.heldKey = code;
        this.repeatTimer = 500000;
      } else {
        if (this.heldKey == code) {
          this.heldKey = 0;
          this.repeatTimer = 0;
        }
      }
    }

    if (realMode) {
      this.put(scancode);

      if (intEnable) {
        this.cpu.interrupt();
      }

      return;
    }

    if (isDown) {
      if (code === 0x14) return; // caps
      if (code === 0x12) return; // ctrl
      if (code === 0x11) return; // shift
      if (code === 0x13) return; // alt
      if (this.shiftDown) {
        if (code >= 0x61 && code < 0x7b && !capsOn) code -= 0x20; // a to z
        if (code >= 0x5b && code < 0x5e) code += 0x20; // [ to ]
        if (code == 0x2c || code == 0x2e || code == 0x2f) code += 0x10; // , .
        if (code == 0x30) code = 0x29; // 0
        if (code == 0x31) code = 0x21; // 1
        if (code == 0x32) code = 0x40; // 2
        if (code == 0x33) code = 0x23; // 3
        if (code == 0x34) code = 0x24; // 4
        if (code == 0x35) code = 0x25; // 5
        if (code == 0x36) code = 0x5e; // 6
        if (code == 0x37) code = 0x26; // 7
        if (code == 0x38) code = 0x2a; // 8
        if (code == 0x39) code = 0x28; // 9
        if (code == 0x2d) code = 0x5f; // -
        if (code == 0x3d) code = 0x2b; // =
        if (code == 0x3b) code = 0x3a; // ;
        if (code == 0x60) code = 0x7e; // `
        if (code == 0x27) code = 0x22; // '
      } else if (capsOn) {
        if (code >= 0x61 && code < 0x7b) code -= 0x20; // a to z
      }

      if (this.ctrlDown) {
        if (code >= 0x41 && code < 0x5b) code -= 0x40; // A to Z
        if (code >= 0x61 && code < 0x7b) code -= 0x60; // a to z
        if (code >= 0x5b && code < 0x60) code -= 0x40; // [ to _
        if (code == 0x40) code = 0; // @
        if (code == 0x08) code = 0x7f; // delete
      }

      if (this.altDown) {
        code |= 0x80;
      }

      this.put(code);

      if (intEnable) {
        this.cpu.interrupt();
      }
    }
  }

  cycle() {
    const repeatEnable = (this.registers[1] & 0x02) > 0;
    if (!repeatEnable) return;

    if (this.repeatTimer > 0) {
      this.repeatTimer--;

      if (this.repeatTimer == 0) {
        if (this.heldKey != 0) {
          this.repeatTimer = 40000;
          this.sendScancode(this.heldKey, true);
        }
      }
    }
  }

  constructor(cpu: CPU) {
    this.cpu = cpu;
    this.registers = new Uint8Array(4);
    this.registers[1] = 0x06;
  }

  readReg(addr: number): number {
    switch (addr) {
      case 2:
        return this.terminalBuffer.length > 0 ? 0x80 : 0x00;
      case 3:
        const c = this.terminalBuffer.charCodeAt(0);
        this.terminalBuffer = this.terminalBuffer.slice(1);
        return c;
      default:
        return this.registers[addr] ?? 0;
    }
  }
  writeReg(addr: number, val: number): void {
    switch (addr) {
      default:
        this.registers[addr] = val;
    }
  }
}

export default KeyboardPort;
