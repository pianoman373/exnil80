import { AudioManager } from './AudioManager';
import Exnil80 from '../exnil_80/Exnil80';
import { CRTScreen } from './CRTScreen';
import { DndSlot } from './DndSlot';
import { PeripheralsPanel } from './PeripheralsPanel';
import { State } from './State';
import { StorageMedium } from './StorageMedium';
import { element } from './UIFramework';

type LedByte = {
  get: () => number;
  set: (value: number) => void;
};

type Led = {
  set: (value: boolean) => void;
};

export class Exnil80FP {
  public root: HTMLElement;
  public powerButton: HTMLElement;
  public crt: CRTScreen;
  public exnil: Exnil80;
  public audio?: AudioManager;

  public power = false;
  public alternateDisplay = false;
  public halt = false;

  private keys: any = {};

  private diskA: DndSlot;
  private diskB: DndSlot;
  private rom: DndSlot;
  private flash: DndSlot;

  private driveALed: Led;
  private driveBLed: Led;
  private flashLed: Led;
  private brkLed: Led;
  private hltLed: Led;

  private dp: LedByte;
  private sp: LedByte;
  private x: LedByte;
  private y: LedByte;
  private a: LedByte;
  private flags: LedByte;
  private pch: LedByte;
  private pcl: LedByte;

  private addrh: number = 0;
  private addrl: number = 0;

  private inputh: number = 0;
  private inputl: number = 0;

  private peripherals: PeripheralsPanel;

  constructor(peripherals: PeripheralsPanel) {
    this.peripherals = peripherals;
    this.root = element('div', {
      style: {
        position: 'relative',
        aspectRatio: '4000 / 7575',
      },
    });

    this.exnil = new Exnil80(44000);

    this.crt = new CRTScreen(376, 240);
    this.crt.root.style.position = 'absolute';
    this.crt.root.style.top = (185 / 7575) * 100.0 + '%';
    this.crt.root.style.left = (233 / 4000) * 100.0 + '%';
    //this.crt.root.style.zIndex = '999';
    this.root.appendChild(this.crt.root);

    const background = element('div', {
      className: 'svg_background',
      style: {
        position: 'relative',
        backgroundImage: 'url("exnil_80.svg")',
        aspectRatio: '4000 / 7575',
        width: '100%',
        pointerEvents: 'none',
      },
    });
    this.root.appendChild(background);

    this.powerButton = document.createElement('div');
    this.powerButton.className = 'power_button';

    // power button
    this.addButton(
      3400,
      2850,
      200,
      200,
      'power_button_on.svg',
      true,
      async (v) => {
        this.power = v;
        if (v) {
          await this.powerUp();
        } else if (this.audio) {
          this.audio.free();
          this.audio = undefined;
        }
      }
    );

    // drive lights
    this.driveALed = this.addLed(450, 3675);
    this.driveBLed = this.addLed(2450, 3675);

    //flash light
    this.flashLed = this.addLed(2375, 5700);

    //BRK and HLT
    this.brkLed = this.addLed(900, 6550);
    this.hltLed = this.addLed(1050, 6550);

    //registers
    this.dp = this.addLedByte(2675, 5725);
    this.sp = this.addLedByte(2675, 6000);
    this.y = this.addLedByte(2675, 6275);
    this.x = this.addLedByte(2675, 6550);
    this.a = this.addLedByte(2675, 6825);

    // data/flags
    this.flags = this.addLedByte(1350, 6550);

    // address/program counter
    this.pch = this.addLedByte(150, 6825);
    this.pcl = this.addLedByte(1350, 6825);

    // address & data input
    this.addSwitchByte(112.5, 7150, (v) => {
      this.inputh = v;
    });
    this.addSwitchByte(1312.5, 7150, (v) => {
      this.inputl = v;
    });

    // set data
    this.addButton(
      2637.5 + 0 * 150,
      7150,
      150,
      325,
      'switch_on_white.svg',
      false,
      (v) => {
        if (!v) return;
        if (this.power) {
          this.exnil.memset((this.addrh << 8) | this.addrl, this.inputl);
        }
      }
    );

    // inc addr
    this.addButton(
      2637.5 + 1 * 150,
      7150,
      150,
      325,
      'switch_on_white.svg',
      false,
      (v) => {
        if (!v) return;
        this.addrl += 1;
        if (this.addrl > 255) {
          this.addrl = 0;
          this.addrh += 1;
          if (this.addrh > 255) {
            this.addrh = 0;
          }
        }
      }
    );

    // dec addr
    this.addButton(
      2637.5 + 2 * 150,
      7150,
      150,
      325,
      'switch_on_white.svg',
      false,
      (v) => {
        if (!v) return;
        this.addrl -= 1;
        if (this.addrl < 0) {
          this.addrl = 0xff;
          this.addrh -= 1;
          if (this.addrh < 0) {
            this.addrh = 0xff;
          }
        }
      }
    );

    // load addr
    this.addButton(
      2637.5 + 3 * 150,
      7150,
      150,
      325,
      'switch_on_white.svg',
      false,
      (v) => {
        if (!v) return;

        this.addrh = this.inputh;
        this.addrl = this.inputl;
      }
    );

    // alt disp
    this.addButton(
      2637.5 + 4 * 150,
      7150,
      150,
      325,
      'switch_on_blue.svg',
      true,
      (v) => {
        this.alternateDisplay = v;
      }
    );

    // step
    this.addButton(
      2637.5 + 5 * 150,
      7150,
      150,
      325,
      'switch_on_white.svg',
      false,
      (v) => {
        if (!v) return;
        this.exnil.cpu.cycleInstruction();
      }
    );

    // run
    this.addButton(
      2637.5 + 6 * 150,
      7150,
      150,
      325,
      'switch_on_white.svg',
      false,
      (v) => {
        if (!v) return;
        this.exnil.cpu.setPC((this.inputh << 8) | this.inputl);
        this.exnil.cpu.errorBreak = false;
      }
    );

    // halt
    this.addButton(
      2637.5 + 7 * 150,
      7150,
      150,
      325,
      'switch_on_blue.svg',
      true,
      (v) => {
        this.halt = v;
      }
    );

    this.diskA = this.addSlot(
      400 - 50,
      3415 - 200,
      1200 + 100,
      230 + 400,
      'diskA'
    );
    this.diskB = this.addSlot(
      2400 - 50,
      3415 - 200,
      1200 + 100,
      230 + 400,
      'diskB'
    );
    this.rom = this.addSlot(150, 5700, 1000, 525, 'rom');
    this.flash = this.addSlot(1350, 5700, 1000, 525, 'flash');

    // prettier-ignore
    {
			// keyboard
			this.keys["Backquote"] = 	this.addKey(0, 0, 2, 0x60);
			this.keys["Digit1"] = 		this.addKey(2, 0, 2, 0x31);
			this.keys["Digit2"] = 		this.addKey(4, 0, 2, 0x32);
			this.keys["Digit3"] = 		this.addKey(6, 0, 2, 0x33);
			this.keys["Digit4"] = 		this.addKey(8, 0, 2, 0x34);
			this.keys["Digit5"] = 		this.addKey(10, 0, 2, 0x35);
			this.keys["Digit6"] = 		this.addKey(12, 0, 2, 0x36);
			this.keys["Digit7"] = 		this.addKey(14, 0, 2, 0x37);
			this.keys["Digit8"] = 		this.addKey(16, 0, 2, 0x38);
			this.keys["Digit9"] = 		this.addKey(18, 0, 2, 0x39);
			this.keys["Digit0"] = 		this.addKey(20, 0, 2, 0x30);
			this.keys["Minus"] = 		this.addKey(22, 0, 2, 0x2D);
			this.keys["Equal"] = 		this.addKey(24, 0, 2, 0x3D);
			this.keys['ScrollLock'] = 	this.addKey(26, 0, 2, 0x15, true);
			this.keys["Delete"] = 		this.addKey(28, 0, 2, 0x08);
			this.keys["Backspace"] = 	this.keys["Delete"];

			this.keys["Tab"] = 			this.addKey(0, 2, 3, 0x09);
			this.keys["KeyQ"] = 		this.addKey(3, 2, 2,  0x71);
			this.keys["KeyW"] = 		this.addKey(5, 2, 2,  0x77);
			this.keys["KeyE"] = 		this.addKey(7, 2, 2,  0x65);
			this.keys["KeyR"] = 		this.addKey(9, 2, 2,  0x72);
			this.keys["KeyT"] = 		this.addKey(11, 2, 2,  0x74);
			this.keys["KeyY"] = 		this.addKey(13, 2, 2,  0x79);
			this.keys["KeyU"] = 		this.addKey(15, 2, 2,  0x75);
			this.keys["KeyI"] = 		this.addKey(17, 2, 2,  0x69);
			this.keys["KeyO"] = 		this.addKey(19, 2, 2,  0x6F);
			this.keys["KeyP"] = 		this.addKey(21, 2, 2,  0x70);
			this.keys["BracketLeft"] = 	this.addKey(23, 2, 2, 0x5B);
			this.keys["BracketRight"] = this.addKey(25, 2, 2, 0x5D);
			this.keys["Backslash"] = 	this.addKey(27, 2, 3, 0x5C);

			this.keys["Escape"] = 		this.addKey(0, 4, 4, 0x1B);
			this.keys["CapsLock"] = this.keys["Escape"]
			this.keys["KeyA"] = 		this.addKey(4, 4, 2,  0x61);
			this.keys["KeyS"] = 		this.addKey(6, 4, 2,  0x73);
			this.keys["KeyD"] = 		this.addKey(8, 4, 2,  0x64);
			this.keys["KeyF"] = 		this.addKey(10, 4, 2,  0x66);
			this.keys["KeyG"] = 		this.addKey(12, 4, 2,  0x67);
			this.keys["KeyH"] = 		this.addKey(14, 4, 2,  0x68);
			this.keys["KeyJ"] = 		this.addKey(16, 4, 2,  0x6A);
			this.keys["KeyK"] = 		this.addKey(18, 4, 2,  0x6B);
			this.keys["KeyL"] = 		this.addKey(20, 4, 2,  0x6C);
			this.keys["Semicolon"] = 	this.addKey(22, 4, 2, 0x3B);
			this.keys["Quote"] = 		this.addKey(24, 4, 2, 0x27);
			this.keys["Enter"] = 		this.addKey(26, 4, 4, 0x0A);

			this.keys["ShiftLeft"] = 	this.addKey(0, 6, 5, 0x11, true);
			this.keys["KeyZ"] = 		this.addKey(5, 6, 2,  0x7A);
			this.keys["KeyX"] = 		this.addKey(7, 6, 2,  0x78);
			this.keys["KeyC"] = 		this.addKey(9, 6, 2,  0x63);
			this.keys["KeyV"] = 		this.addKey(11, 6, 2,  0x76);
			this.keys["KeyB"] = 		this.addKey(13, 6, 2,  0x62);
			this.keys["KeyN"] = 		this.addKey(15, 6, 2,  0x6E);
			this.keys["KeyM"] = 		this.addKey(17, 6, 2,  0x6D);
			this.keys["Comma"] = 		this.addKey(19, 6, 2, 0x2C);
			this.keys["Period"] = 		this.addKey(21, 6, 2, 0x2E);
			this.keys["Slash"] = 		this.addKey(23, 6, 2, 0x2F);
			this.keys["Home"] = 		this.addKey(25, 6, 2, 0x14);
			this.keys["ShiftRight"] = 	this.addKey(27, 6, 3, 0x11, true);

			this.keys["ControlLeft"] = 	this.addKey(0, 8, 4, 0x12, true);
			this.keys["AltLeft"] = 		this.addKey(4, 8, 2, 0x13, true);
			this.keys["Space"] = 		this.addKey(6, 8, 12, 0x20);
			this.keys["AltRight"] = 	this.addKey(18, 8, 2, 0x10);
			this.keys["ArrowLeft"] = 	this.addKey(20, 8, 2, 0x1C);
			this.keys["ArrowDown"] = 	this.addKey(22, 8, 2, 0x1D);
			this.keys["ArrowUp"] = 		this.addKey(24, 8, 2, 0x1E);
			this.keys["ArrowRight"] = 	this.addKey(26, 8, 2, 0x1F);
			this.keys["ControlRight"] = this.addKey(28, 8, 2, 0x18);
			this.keys["Pause"] = this.keys["ControlRight"]
      this.keys["End"] = this.keys["ControlRight"]
      this.keys["F1"] = this.keys["ControlRight"]
		}

    this.crt.root.onkeydown = (ev) => {
      //console.log(ev.code);
      ev.preventDefault();
      ev.stopPropagation();
      if (this.keys[ev.code] && !ev.repeat) {
        this.keys[ev.code].press();
      }
    };

    this.crt.root.onkeyup = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (this.keys[ev.code] && !ev.repeat) {
        this.keys[ev.code].release();
      }
    };

    this.renderSlots();
  }

  public async powerUp() {
    this.audio = new AudioManager(1024, () => {
      this.update(1 / 60);
    });

    const romContents = this.loadRom();
    this.exnil = new Exnil80(this.audio.sampleRate);
    this.exnil.romContents = romContents;
    this.exnil.reset();

    this.exnil.peripheralPort.peripheralCallbacks =
      this.peripherals.peripheralCallbacks;
    this.exnil.storageController.disk0.onReadSector = (sector) => {
      return State.storageReadBlock(State.exnil80fp.diskA, sector * 256, 256);
    };
    this.exnil.storageController.disk0.onWriteSector = (sector, data) => {
      State.storageWriteBlock(State.exnil80fp.diskA, sector * 256, data);
    };
    this.exnil.storageController.disk1.onReadSector = (sector) => {
      return State.storageReadBlock(State.exnil80fp.diskB, sector * 256, 256);
    };
    this.exnil.storageController.disk1.onWriteSector = (sector, data) => {
      State.storageWriteBlock(State.exnil80fp.diskB, sector * 256, data);
    };
    if (State.exnil80fp.diskA !== '') {
      this.exnil.storageController.disk0.diskPresent = true;
    }
    if (State.exnil80fp.diskB !== '') {
      this.exnil.storageController.disk1.diskPresent = true;
    }

    this.exnil.flashPort.onReadSector = (sector) => {
      return State.storageReadBlock(State.exnil80fp.flash, sector * 256, 256);
    };
    this.exnil.flashPort.onWriteSector = (sector, data) => {
      State.storageWriteBlock(State.exnil80fp.flash, sector * 256, data);
    };
    this.addrh = 0;
    this.addrl = 0;
  }

  public loadRom() {
    return State.storageReadBlock(State.exnil80fp.rom, 0, 0x2000);
  }

  public renderSlots() {
    const slots = ['diskA', 'diskB', 'rom', 'flash'] as const;

    for (const slot of slots) {
      this[slot].root.replaceChildren();

      if (State.exnil80fp[slot] !== '') {
        const item = new StorageMedium(
          State.exnil80fp[slot],
          () => {
            if (slot === 'diskA') {
              this.exnil.storageController.disk0.diskPresent = false;
              this.exnil.storageController.notifyDiskSwap();
            }
            if (slot === 'diskB') {
              this.exnil.storageController.disk1.diskPresent = false;
              this.exnil.storageController.notifyDiskSwap();
            }
            State.exnil80fp[slot] = '';
            State.saveToStorage();
            this.renderSlots();
          },
          true
        );
        this[slot].root.appendChild(item.root);
      }
    }
  }

  public update(delta: number) {
    this.crt.root.width = (3533 / 4000) * this.root.clientWidth;
    this.crt.root.height = (2650 / 7575) * this.root.clientHeight;

    if (this.power) {
      this.exnil.cpuHalt = this.halt;
      this.exnil.frame(delta);
      this.crt.render(this.exnil.vdp.framebuffer);

      if (this.audio) {
        for (let i = 0; i < this.exnil.sampleBufferSize; i++) {
          this.audio.pushSample(this.exnil.sampleBuffer[i]);
        }
      }

      this.hltLed.set(this.halt);
      this.brkLed.set(this.exnil.cpu.errorBreak);
      this.driveALed.set(
        this.exnil.storageController.disk0.spinningCooldown > 0
      );
      this.driveBLed.set(
        this.exnil.storageController.disk1.spinningCooldown > 0
      );
      this.flashLed.set(this.exnil.flashPort.isActive());

      if (this.halt || this.exnil.cpu.errorBreak) {
        this.dp.set(this.exnil.cpu.DP());
        this.sp.set(this.exnil.cpu.S());
        this.y.set(this.exnil.cpu.Y());
        this.x.set(this.exnil.cpu.X());
        this.a.set(this.exnil.cpu.A());
      } else {
        this.dp.set(0);
        this.sp.set(0);
        this.y.set(0);
        this.x.set(0);
        this.a.set(0);
      }

      if (this.halt || this.exnil.cpu.errorBreak) {
        if (this.alternateDisplay) {
          this.pch.set(this.exnil.cpu.PCH());
          this.pcl.set(this.exnil.cpu.PCL());
          this.flags.set(this.exnil.cpu.F());
        } else {
          this.pch.set(this.addrh);
          this.pcl.set(this.addrl);
          this.flags.set(this.exnil.memget((this.addrh << 8) | this.addrl));
        }
      } else {
        this.pch.set(0);
        this.pcl.set(0);
        this.flags.set(0);
      }
    } else {
      this.crt.render(null);

      this.hltLed.set(false);
      this.brkLed.set(false);
      this.driveALed.set(false);
      this.driveBLed.set(false);
      this.dp.set(0);
      this.sp.set(0);
      this.y.set(0);
      this.x.set(0);
      this.a.set(0);
      this.flags.set(0);
      this.pch.set(0);
      this.pcl.set(0);
    }
  }

  keyUp(keycode: number) {
    //console.log(`Key up: '${String.fromCharCode(keycode)}'`);
    if (this.power) this.exnil.keyboardPort.sendScancode(keycode | 0x80);
  }

  keyDown(keycode: number) {
    //console.log(`Key down: '${String.fromCharCode(keycode)}'`);
    if (this.power) this.exnil.keyboardPort.sendScancode(keycode);
  }

  addKey(
    x: number,
    y: number,
    width: number,
    keycode: number,
    toggle: boolean = false
  ) {
    return this.addButton(
      125 + x * 125,
      4000 + y * 125,
      width * 125,
      250,
      'keycap_on.svg',
      toggle,
      (v) => {
        if (v) this.keyDown(keycode);
        else this.keyUp(keycode);
      }
    );
  }

  addSwitchByte(x: number, y: number, onchange: (v: number) => void) {
    let value = 0;

    this.addButton(
      x + 0 * 150,
      y,
      150,
      325,
      'switch_on_white.svg',
      true,
      (v) => {
        if (v) value = value | (1 << 7);
        else value = value & ~(1 << 7);
        onchange(value);
      }
    );
    this.addButton(
      x + 1 * 150,
      y,
      150,
      325,
      'switch_on_white.svg',
      true,
      (v) => {
        if (v) value = value | (1 << 6);
        else value = value & ~(1 << 6);
        onchange(value);
      }
    );
    this.addButton(
      x + 2 * 150,
      y,
      150,
      325,
      'switch_on_white.svg',
      true,
      (v) => {
        if (v) value = value | (1 << 5);
        else value = value & ~(1 << 5);
        onchange(value);
      }
    );
    this.addButton(
      x + 3 * 150,
      y,
      150,
      325,
      'switch_on_white.svg',
      true,
      (v) => {
        if (v) value = value | (1 << 4);
        else value = value & ~(1 << 4);
        onchange(value);
      }
    );

    this.addButton(
      x + 4 * 150,
      y,
      150,
      325,
      'switch_on_blue.svg',
      true,
      (v) => {
        if (v) value = value | (1 << 3);
        else value = value & ~(1 << 3);
        onchange(value);
      }
    );
    this.addButton(
      x + 5 * 150,
      y,
      150,
      325,
      'switch_on_blue.svg',
      true,
      (v) => {
        if (v) value = value | (1 << 2);
        else value = value & ~(1 << 2);
        onchange(value);
      }
    );
    this.addButton(
      x + 6 * 150,
      y,
      150,
      325,
      'switch_on_blue.svg',
      true,
      (v) => {
        if (v) value = value | (1 << 1);
        else value = value & ~(1 << 1);
        onchange(value);
      }
    );
    this.addButton(
      x + 7 * 150,
      y,
      150,
      325,
      'switch_on_blue.svg',
      true,
      (v) => {
        if (v) value = value | (1 << 0);
        else value = value & ~(1 << 0);
        onchange(value);
      }
    );
  }

  addLedByte(x: number, y: number): LedByte {
    let value = 0;
    const arr = [
      this.addLed(x + 0 * 150, y),
      this.addLed(x + 1 * 150, y),
      this.addLed(x + 2 * 150, y),
      this.addLed(x + 3 * 150, y),
      this.addLed(x + 4 * 150, y),
      this.addLed(x + 5 * 150, y),
      this.addLed(x + 6 * 150, y),
      this.addLed(x + 7 * 150, y),
    ];
    return {
      get: () => {
        return value;
      },
      set: (v) => {
        value = v;
        for (let i = 0; i < 8; i++) {
          arr[i].set(((v >>> (7 - i)) & 1) > 0);
        }
      },
    };
  }

  addLed(x: number, y: number): Led {
    const led = element('div', {
      className: 'svg_background',
      style: {
        backgroundImage: 'url(led_on.svg)',
        position: 'absolute',
        top: (y / 7575) * 100.0 + '%',
        left: (x / 4000) * 100.0 + '%',
        width: (75 / 4000) * 100.0 + '%',
        height: (125 / 7575) * 100.0 + '%',
      },
    });
    led.hidden = true;

    this.root.appendChild(led);
    return {
      set: (value) => {
        if (led.hidden === value) led.hidden = !value;
      },
    };
  }

  addButton(
    x: number,
    y: number,
    width: number,
    height: number,
    image: string,
    toggle: boolean,
    onClick: (value: boolean) => void
  ) {
    const button = element('div', {
      className: 'svg_background',
      style: {
        position: 'absolute',
        top: (y / 7575) * 100.0 + '%',
        left: (x / 4000) * 100.0 + '%',
        width: (width / 4000) * 100.0 + '%',
        height: (height / 7575) * 100.0 + '%',
      },
    });
    let active = false;

    const release = () => {
      if (active) {
        button.style.backgroundImage = '';
        active = false;
        onClick(active);
      }
    };

    const mouseDown = () => {
      if (toggle) {
        active = !active;
        button.style.backgroundImage = active ? 'url("' + image + '")' : '';

        onClick(active);
      } else {
        if (!active) {
          button.style.backgroundImage = 'url("' + image + '")';
          active = true;
          onClick(active);

          window.addEventListener(
            'mouseup',
            () => {
              release();
            },
            {
              once: true,
            }
          );
        }
      }
    };
    button.onmousedown = mouseDown;

    this.root.appendChild(button);
    return {
      press: mouseDown,
      release: release,
    };
  }

  addSlot(
    x: number,
    y: number,
    width: number,
    height: number,
    slotId: 'diskA' | 'diskB' | 'rom' | 'flash'
  ) {
    const slot = new DndSlot(
      {
        className: 'fp_slot',
        style: {
          position: 'absolute',
          top: (y / 7575) * 100.0 + '%',
          left: (x / 4000) * 100.0 + '%',
          width: (width / 4000) * 100.0 + '%',
          height: (height / 7575) * 100.0 + '%',
          // backgroundColor: '#10101090',
        },
      },
      (p) => {
        if (State.exnil80fp[slotId] !== '') return false;
        if (slotId === 'diskA' || slotId === 'diskB') {
          if (slotId === 'diskA') {
            this.exnil.storageController.disk0.diskPresent = true;
            this.exnil.storageController.notifyDiskSwap();
          }
          if (slotId === 'diskB') {
            this.exnil.storageController.disk1.diskPresent = true;
            this.exnil.storageController.notifyDiskSwap();
          }
          if (State.itemDB[p].type !== 'disk') return false;
        } else {
          if (State.itemDB[p].type !== 'eeprom') return false;
        }
        State.exnil80fp[slotId] = p;
        State.saveToStorage();
        if (slotId === 'rom') this.loadRom();
        this.renderSlots();

        return true;
      }
    );

    this.root.appendChild(slot.root);
    return slot;
  }
}
