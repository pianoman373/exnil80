import CPU from './CPU';

// const freqTable: any = {
// 	u: 493.883, // B4   -   5819 $16bb
// 	'7': 466.164, // A#4  -   6920 $1b08
// 	y: 440.0, // A4   -   8229 $2025
// 	'6': 415.305, // G#4  -   7331 $1ca3
// 	t: 391.995, // G4   -   6531 $1983
// 	'5': 369.994, // F#4  -   6165 $1815
// 	r: 349.228, // F4   -   5492 $1574
// 	e: 329.628, // E4   -   4893 $131d
// 	'3': 311.127, // D#4  -   4359 $1107
// 	w: 293.665, // D4   -   4114 $1012
// 	'2': 277.183, // C#4  -   3665 $0e51
// 	q: 261.626, // C4   -   3265 $0cc1
// };

// prettier-ignore
// const notes: any = [
//   32.70, // C1
//   34.65, // C#1
//   36.71, // D1
//   38.89, // D#1
//   41.20, // E1
//   43.65, // F1
//   46.25, // F#1
//   49.00, // G1
//   51.91, // G#1
//   55.00, // A1
//   58.27, // A#1
//   61.74, // B1
// ];

// prettier-ignore
const envelopeRates: number[] = [
  0.002,
  0.008,
  0.016,
  0.024,
  0.038,
  0.056,
  0.068,
  0.080,
  0.100,
  0.250,
  0.500,
  0.800,
  1.000,
  3.000,
  5.000,
  8.000
]

const RANGE_24BIT = 16777216;
const RANGE_12BIT = 4096;
const CLOCK_SPEED = 1_792_080; // 1.792080 MHz

// function freqVal(freq: number) {
//   return Math.floor(freq / (CLOCK_SPEED / RANGE_24BIT));
// }

// for (let k of notes) {
//   console.log(k, freqVal(k), freqVal(k).toString(16).padStart(4, '0'));
// }

function Filter() {
  let buf0 = 0;
  let buf1 = 1;

  return {
    secondOrder: (
      input: number,
      mode: 'lowpass' | 'highpass' | 'bandpass',
      cutoff: number,
      resonance: number
    ) => {
      const feedbackAmount = resonance + resonance / (1.0 - cutoff);
      buf0 += cutoff * (input - buf0 + feedbackAmount * (buf0 - buf1));
      buf1 += cutoff * (buf0 - buf1);

      switch (mode) {
        case 'lowpass':
          return buf1;
        case 'highpass':
          return input - buf0;
        case 'bandpass':
          return buf0 - buf1;
      }
    },
  };
}

const REG_FILTER_FLAGS = 0x00;
const REG_OSC_CONTROL = 0x01;
const REG_ENV_READBACK = 0x04;
const REG_OSC_VOLUMES = 0x05;
const REG_FILTERCUT_HI = 0x08;
const REG_OSC_FREQ_HI = 0x09;
const REG_FILTERCUT_LO = 0x0c;
const REG_OSC_FREQ_LO = 0x0d;
const REG_WAVEFORM_READBACK = 0x10;
const REG_OSC_PW = 0x11;
const REG_OSC_ATTACKDECAY = 0x15;
const REG_OSC_SUSTAINRELEASE = 0x19;

class SoundChip {
  private registers: Uint8Array = new Uint8Array(0x30);
  private accumulators = [0, 0, 0];
  private adsrStages = [0, 0, 0];
  private adsrLevels = [0, 0, 0];
  private noiseLFSRs = [1, 1, 1];
  private programmableFilter = Filter();
  private residualHighpass = Filter();
  private residualLowpass = Filter();

  public outputLine = 0;

  constructor() {
    // window.addEventListener('keydown', (ev) => {
    // 	const frequency = freqVal(freqTable[ev.key]);
    // 	this.registers[0x12] = (frequency * 1) >>> 8;
    // 	this.registers[0x13] = frequency * 1;
    // 	this.registers[0x10] |= 0b0000_0001;
    // 	// this.registers[0x22] = (frequency / 2) >>> 8;
    // 	// this.registers[0x23] = frequency / 2;
    // 	// this.registers[0x20] |= 0b0000_0001;
    // });
    // window.addEventListener('keyup', (_ev) => {
    // 	this.registers[0x10] &= 0b1111_1110;
    // 	// this.registers[0x20] &= 0b1111_1110;
    // });
  }

  readReg(addr: number): number {
    switch (addr) {
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

  cycleOscillator(i: number): number {
    const controlReg = this.registers[REG_OSC_CONTROL + i];

    if (controlReg & 0b1000) {
      // reset bit is on
      this.accumulators[i] = 0;
      this.noiseLFSRs[i] = 1;
      this.adsrLevels[i] = 0;
      this.adsrStages[i] = 0;
      return 0;
    }

    const attack =
      1.0 /
      envelopeRates[this.registers[REG_OSC_ATTACKDECAY + i] >>> 4] /
      CLOCK_SPEED;
    const decay =
      1.0 /
      envelopeRates[this.registers[REG_OSC_ATTACKDECAY + i] & 0xf] /
      CLOCK_SPEED;
    const sustain = (this.registers[REG_OSC_SUSTAINRELEASE + i] >>> 4) / 15;
    const release =
      1.0 /
      envelopeRates[this.registers[REG_OSC_SUSTAINRELEASE + i] & 0xf] /
      CLOCK_SPEED;

    const gate = (controlReg & 1) > 0;
    const tuningWord =
      (this.registers[REG_OSC_FREQ_HI + i] << 8) |
      this.registers[REG_OSC_FREQ_LO + i];
    const pulseWidth = this.registers[REG_OSC_PW + i];
    const prevAccumulator = this.accumulators[i];
    this.accumulators[i] = (this.accumulators[i] + tuningWord) & 0xffffff;

    if (this.accumulators[i] & 0x080000 && !(prevAccumulator & 0x080000)) {
      const lfsrFeedback =
        ((this.noiseLFSRs[i] >>> 22) ^ (this.noiseLFSRs[i] >> 11)) & 0x1;
      this.noiseLFSRs[i] <<= 1;
      this.noiseLFSRs[i] &= 0x7fffff;
      this.noiseLFSRs[i] |= lfsrFeedback;
      this.noiseLFSRs[i] = Math.random() * RANGE_24BIT - 1;
    }

    const saw = this.accumulators[i];
    const square = saw >>> 16 > pulseWidth ? RANGE_24BIT - 1 : 0;
    const triangle = saw > RANGE_24BIT / 2 ? RANGE_24BIT - saw * 2 : saw * 2;
    const noise = this.noiseLFSRs[i];
    let amplitude = 0xffffff;
    if (controlReg & 0b1000_0000) {
      amplitude &= saw;
    }
    if (controlReg & 0b0100_0000) {
      amplitude &= square;
    }
    if (controlReg & 0b0010_0000) {
      amplitude &= triangle;
    }
    if (controlReg & 0b0001_0000) {
      amplitude &= noise;
    }
    amplitude &= 0xffffff;

    // feed 24 bit amplitude through 12 bit DAC
    let sample = ((amplitude >>> 12) / RANGE_12BIT) * 2 - 1;

    let level = this.adsrLevels[i];
    switch (this.adsrStages[i]) {
      case 0:
        // releasing
        level = Math.max(0, level - release * level);
        if (gate) {
          this.adsrStages[i] = 1;
        }
        break;
      case 1:
        // attacking
        if (gate) {
          level += attack;
          if (level >= 1.0) {
            level = 1.0;
            this.adsrStages[i] = 2;
          }
        } else {
          this.adsrStages[i] = 0;
        }
        break;
      case 2:
        // sustaining
        if (gate) {
          level = Math.max(sustain, level - decay * (level - sustain));
        } else {
          this.adsrStages[i] = 0;
        }
        break;
    }
    this.adsrLevels[i] = level;

    sample *= level;
    sample *= (this.registers[REG_OSC_VOLUMES + i] & 0x0f) / 15.0;

    if (i === 2) {
      // set readback registers
      this.registers[REG_WAVEFORM_READBACK] = amplitude >>> 16;
      this.registers[REG_ENV_READBACK] = level * 255;
    }

    // channel enable bit?
    if (controlReg & 0b10) {
      return sample;
    }
    return 0;
  }

  cycle(_cpu: CPU, _ram: Uint8Array): void {
    let outputLine = 0;
    let filterLine = 0;

    if (this.registers[REG_OSC_CONTROL + 0] & 0b100) {
      filterLine += this.cycleOscillator(0) * 0.3;
    } else {
      outputLine += this.cycleOscillator(0) * 0.3;
    }
    if (this.registers[REG_OSC_CONTROL + 1] & 0b100) {
      filterLine += this.cycleOscillator(1) * 0.3;
    } else {
      outputLine += this.cycleOscillator(1) * 0.3;
    }
    if (this.registers[REG_OSC_CONTROL + 2] & 0b100) {
      filterLine += this.cycleOscillator(2) * 0.3;
    } else {
      outputLine += this.cycleOscillator(2) * 0.3;
    }

    const resonance = ((this.registers[REG_FILTER_FLAGS] >>> 4) / 15) * 0.95;
    const a =
      0.0001 +
      (((this.registers[REG_FILTERCUT_HI] << 8) |
        this.registers[REG_FILTERCUT_LO]) /
        0xffff) *
        0.1;

    // a relates to cutoff frequency by:
    // fc = a/((1-a)*2*3.14*(1/CLOCK_SPEED))
    // a=0.0001 is 28.8Hz
    // a=0.035 is 10kHz

    if (this.registers[REG_FILTER_FLAGS] & 0b001) {
      filterLine = this.programmableFilter.secondOrder(
        filterLine,
        'lowpass',
        a,
        resonance
      );
    } else if (this.registers[REG_FILTER_FLAGS] & 0b010) {
      filterLine = this.programmableFilter.secondOrder(
        filterLine,
        'highpass',
        a,
        resonance
      );
    } else if (this.registers[REG_FILTER_FLAGS] & 0b100) {
      filterLine = this.programmableFilter.secondOrder(
        filterLine,
        'bandpass',
        a,
        resonance
      );
    }

    this.outputLine = filterLine + outputLine;

    // add extra low and high pass filtering so simulate residual capacitance
    this.outputLine = this.residualHighpass.secondOrder(
      this.outputLine,
      'highpass',
      0.0001,
      0
    );
    this.outputLine = this.residualLowpass.secondOrder(
      this.outputLine,
      'lowpass',
      0.2,
      0
    );
  }
}

export default SoundChip;
