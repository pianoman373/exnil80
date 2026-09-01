import Exnil80 from './Exnil80';

export class FlashPort {
	private registers: Uint8Array = new Uint8Array(2);

	private sectorCounter = 0;
	private byteCounter = 0;
	private isReading = false;
	private isWriting = false;
	private timeout = 0;

	private sectorBuffer: Uint8Array = new Uint8Array(256);

	public onReadSector?: (sector: number) => Uint8Array;
	public onWriteSector?: (sector: number, data: Uint8Array) => void;

	constructor() {}

	isActive(): boolean {
		return this.isReading || this.isWriting;
	}

	cycle(exnil: Exnil80): boolean {
		if (this.timeout > 0) {
			this.timeout--;
			return true;
		}
		if (this.isReading) {
			if (this.byteCounter < 256) {
				const base = this.registers[1] << 8;
				exnil.memset(
					base + (this.sectorCounter - 1) * 256 + this.byteCounter,
					this.sectorBuffer[this.byteCounter]
				);
				this.byteCounter++;
				return true;
			} else {
				if (this.sectorCounter < 32) {
					this.sectorBuffer =
						this.onReadSector?.(this.sectorCounter) ??
						new Uint8Array(256);
					this.timeout = 2048;
					this.byteCounter = 0;
					this.sectorCounter += 1;
					return true;
				} else {
					this.isReading = false;
					return false;
				}
			}
		} else if (this.isWriting) {
			if (this.byteCounter < 256) {
				const base = this.registers[1] << 8;
				this.sectorBuffer[this.byteCounter] = exnil.memget(
					base + this.sectorCounter * 256 + this.byteCounter
				);
				this.byteCounter++;
				return true;
			} else {
				//console.log(`writing sector ${this.sectorCounter}`);
				this.onWriteSector?.(this.sectorCounter, this.sectorBuffer);
				this.timeout = 300000;
				this.byteCounter = 0;
				this.sectorCounter += 1;

				if (this.sectorCounter == 32) {
					this.isWriting = false;
				}
				return true;
			}
		}
		return false;
	}

	readReg(addr: number): number {
		switch (addr) {
			default:
				return this.registers[addr] ?? 0;
		}
	}

	writeReg(addr: number, val: number): void {
		switch (addr) {
			case 0:
				if (this.isReading || this.isWriting) return;
				if ((val & 1) === 1) {
					this.sectorCounter = 0;
					this.byteCounter = 0;
					this.isWriting = true;
				} else {
					this.sectorCounter = 0;
					this.byteCounter = 256;
					this.isReading = true;
				}
				return;
			default:
				this.registers[addr] = val;
		}
	}
}
