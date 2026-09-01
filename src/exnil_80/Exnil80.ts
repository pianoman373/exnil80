import { assemble } from './Assembler';
import CPU from './CPU';
import StorageController from './StorageController';
import KeyboardPort from './KeyboardPort';
import SoundChip from './SoundChip';
import { videoTestCode } from './testCode';
import { FlashPort } from './FlashPort';
import { VDP } from './VDP';
import { PeripheralPort } from './PeripheralPort';

const TEST_MODE = false;
const TEST_CODE = videoTestCode;

class Exnil80 {
  public ram: Uint8Array;
  public cpu: CPU;
  public cpuHalt: boolean = false;

  public vdp: VDP;
  public adp: SoundChip;
  public keyboardPort: KeyboardPort;
  public flashPort: FlashPort;
  public storageController: StorageController;
  public romContents: Uint8Array = new Uint8Array(0x2000);
  public peripheralPort: PeripheralPort;

  upperBank: number = TEST_MODE ? 1 : 0;
  lowerBank: number = 0;

  private sampleCooldown = 0;
  public sampleBuffer: Float32Array;
  public sampleBufferSize = 0;
  public sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.sampleBuffer = new Float32Array(1024).fill(0);
    this.ram = new Uint8Array(0x20000).fill(0); // 128K of ram

    this.cpu = new CPU(
      (addr) => {
        return this.memget(addr);
      },
      (addr, value) => {
        this.memset(addr, value);
      }
    );

    this.vdp = new VDP();
    this.adp = new SoundChip();
    this.keyboardPort = new KeyboardPort(this.cpu);
    this.storageController = new StorageController(this.cpu);
    this.flashPort = new FlashPort();
    this.peripheralPort = new PeripheralPort();

    if (TEST_MODE) {
      assemble(TEST_CODE, this.ram);
    }
  }

  reset() {
    this.cpu.reset();
  }

  frame(delta: number) {
    this.sampleBufferSize = 0;
    let clockRate = 1_792_080; // 1.792080 MHz

    const deltaSlice = delta / (delta * clockRate);

    for (let i = 0; i < delta * clockRate; i++) {
      this.peripheralPort.cycle(deltaSlice);

      if (i & 1) {
        // sound chip & keyboard run at 0.5x the clock speed
        this.adp.cycle(this.cpu, this.ram);
        this.keyboardPort.cycle();
        this.vdp.scrollLock = (this.keyboardPort.registers[1] & 0x08) > 0;

        this.sampleCooldown = this.sampleCooldown - deltaSlice * 2;
        if (this.sampleCooldown <= 0) {
          this.sampleCooldown += 1 / this.sampleRate;
          this.sampleBuffer[this.sampleBufferSize] = this.adp.outputLine;
          this.sampleBufferSize += 1;
        }
      }

      this.vdp.cycle(this);

      if (!this.vdp.isStealingCycles) {
        const flashActive = this.flashPort.cycle(this);

        if (!this.cpuHalt && !flashActive) {
          this.cpu.cycle();
        }
      }

      this.vdp.cycle(this);
      this.vdp.cycle(this);
      this.vdp.cycle(this);
    }

    this.storageController.frame(delta, this.cpu);
  }

  memget(addr: number) {
    // if (addr == 0xdfd5) {
    // 	console.log(`R${addr.toString(16).padStart(4, '0')}`);
    // }
    if (addr >= 0xe000) {
      // ROM/RAM
      if (this.upperBank == 0) {
        return this.romContents[addr - 0xe000];
      } else if (this.upperBank == 1) {
        return this.ram[addr];
      } else {
        return 0;
      }
    } else if (addr >= 0xdf50) {
      // VDP
      return this.vdp.readReg(addr - 0xdf50);
    } else if (addr > 0xdf30) {
      // ADP
      return this.adp.readReg(addr - 0xdf30);
    } else if (addr >= 0xdf20) {
      // peripheral port
      return this.peripheralPort.readReg(addr - 0xdf20);
    } else if (addr >= 0xdf10) {
      // storage IO
      return this.storageController.readReg(addr - 0xdf10);
    } else if (addr >= 0xdf06) {
      // FLASH
      return this.flashPort.readReg(addr - 0xdf06);
    } else if (addr >= 0xdf00) {
      // system IO
      if (addr === 0xdf00) {
        return this.lowerBank;
      } else if (addr === 0xdf01) {
        return this.upperBank;
      } else {
        return this.keyboardPort.readReg(addr - 0xdf02);
      }
    } else if (addr >= 0x8000) {
      // ram
      return this.ram[addr];
    } else {
      // paged ram
      if (this.lowerBank == 0) {
        return this.ram[addr];
      } else if (this.lowerBank == 3) {
        return this.ram[addr + 0x8000];
      } else {
        return this.ram[0x10000 + (this.lowerBank - 1) * 0x8000 + addr] ?? 0;
      }
    }
  }

  memset(addr: number, value: number) {
    // if (addr == 0xdfd5) {
    // 	console.log(
    // 		`W${addr.toString(16).padStart(4, '0')}: ${value
    // 			.toString(16)
    // 			.padStart(4, '0')}`
    // 	);
    // }
    if (addr >= 0xe000) {
      // ROM/RAM
      this.ram[addr] = value;
    } else if (addr >= 0xdf50) {
      // VDP
      this.vdp.writeReg(addr - 0xdf50, value);
    } else if (addr >= 0xdf30) {
      // ADP
      this.adp.writeReg(addr - 0xdf30, value);
    } else if (addr >= 0xdf20) {
      // peripheral port
      this.peripheralPort.writeReg(addr - 0xdf20, value);
    } else if (addr >= 0xdf10) {
      // storage IO
      this.storageController.writeReg(addr - 0xdf10, value);
    } else if (addr >= 0xdf06) {
      // FLASH
      this.flashPort.writeReg(addr - 0xdf06, value);
    } else if (addr >= 0xdf00) {
      // system IO
      if (addr === 0xdf00) {
        this.lowerBank = value;
      } else if (addr === 0xdf01) {
        this.upperBank = value;
      } else {
        this.keyboardPort.writeReg(addr - 0xdf02, value);
      }
    } else if (addr >= 0x8000) {
      // ram
      this.ram[addr] = value;
    } else {
      // paged ram
      if (this.lowerBank == 0) {
        this.ram[addr] = value;
      } else if (this.lowerBank == 3) {
        this.ram[addr + 0x8000] = value;
      } else {
        this.ram[0x10000 + (this.lowerBank - 1) * 0x8000 + addr] = value;
      }
    }
  }
}

export default Exnil80;
