export const REG_A = 0;
export const REG_X = 1;
export const REG_Y = 2;
export const REG_S = 3;
export const REG_DP = 4;
export const REG_F = 5;
export const REG_PCL = 6;
export const REG_PCH = 7;

const NBit = 0b10000000;
const VBit = 0b01000000;
const IBit = 0b00100000;
const SBit = 0b00010000;
const HBit = 0b00001000;
const ZBit = 0b00000010;
const CBit = 0b00000001;

const ISR_INT = 0xfff8;
const ISR_NMI = 0xfffa;
const ISR_BRK = 0xfffc;
const ISR_RST = 0xfffe;

class CPU {
	memget: (address: number) => number;
	memset: (address: number, value: number) => void;

	registers: Uint8Array;
	interruptPending: boolean = false;
	nmiPending: boolean = false;

	public errorBreak = false;
	private cooldown = 0;

	constructor(
		memget: (address: number) => number,
		memset: (address: number, value: number) => void
	) {
		this.memget = memget;
		this.memset = memset;

		this.registers = new Uint8Array(9).fill(0);
	}

	PC() {
		return this.registers[REG_PCL] | (this.registers[REG_PCH] << 8);
	}

	PCH() {
		return this.registers[REG_PCH];
	}

	PCL() {
		return this.registers[REG_PCL];
	}

	S() {
		return this.registers[REG_S];
	}

	A() {
		return this.registers[REG_A];
	}

	X() {
		return this.registers[REG_X];
	}

	Y() {
		return this.registers[REG_Y];
	}

	F() {
		return this.registers[REG_F];
	}

	DP() {
		return this.registers[REG_DP];
	}

	setPC(val: number) {
		this.registers[REG_PCL] = val & 0xff;
		this.registers[REG_PCH] = val >>> 8;
	}

	getFlag(bit: number) {
		return (this.registers[REG_F] & bit) > 0;
	}

	setFlag(value: boolean, bit: number) {
		if (value) {
			this.registers[REG_F] = this.registers[REG_F] | bit;
		} else {
			this.registers[REG_F] = this.registers[REG_F] & ~bit;
		}
	}

	aluAdd(X: number, Y: number, carry: number): number {
		let unsignedX = X & 0xff;
		let unsignedY = Y & 0xff;
		let result = unsignedX + unsignedY + carry;
		let signedResult = (result << 24) >> 24;

		this.setFlag(
			(unsignedX & 0x0f) + (unsignedY & 0x0f) + carry > 0x0f,
			HBit
		);
		this.setFlag(result >>> 8 != 0, CBit);
		this.setFlag(
			(~(((X >> 7) & 1) ^ ((Y >> 7) & 1)) &
				(((X >> 7) & 1) ^ ((result >> 7) & 1))) >
				0,
			VBit
		);
		this.setNZ(signedResult);

		return signedResult;
	}

	setNZ(X: number) {
		this.setFlag(((X >> 7) & 1) == 1, NBit);
		this.setFlag((X & 0xff) == 0, ZBit);
	}

	pushByte(val: number) {
		this.registers[REG_S] -= 1;
		this.memset(
			((this.registers[REG_DP] | 1) << 8) | this.registers[REG_S],
			val
		);
	}

	pullByte() {
		const val = this.memget(
			((this.registers[REG_DP] | 1) << 8) | this.registers[REG_S]
		);
		this.registers[REG_S] += 1;
		return val;
	}

	pushShort(val: number) {
		this.pushByte(val & 0xff);
		this.pushByte(val >>> 8);
	}

	pullShort() {
		const hi = this.pullByte();
		const lo = this.pullByte();
		return (hi << 8) | lo;
	}

	interrupt() {
		this.interruptPending = true;
	}

	nmi() {
		this.nmiPending = true;
	}

	reset() {
		const addr = (this.memget(ISR_RST) << 8) | this.memget(ISR_RST + 1);
		this.setPC(addr);
	}

	cycleInstruction() {
		this.cycle();
		this.cooldown = 0;
	}

	cycle() {
		if (this.cooldown > 0) {
			this.cooldown -= 1;
		}
		if (this.cooldown > 0) return;

		if (this.errorBreak) return;
		let cost = 1;
		let PC = this.PC();

		if (this.interruptPending) {
			if (this.getFlag(IBit)) {
				this.pushByte(this.F());
				this.pushShort(PC);
				const addr =
					(this.memget(ISR_INT) << 8) | this.memget(ISR_INT + 1);
				this.setPC(addr);
				this.interruptPending = false;
				this.cooldown = 8;
				return;
			}
			this.interruptPending = false;
		}

		if (this.nmiPending) {
			this.pushByte(this.F());
			this.pushShort(PC);
			const addr = (this.memget(ISR_NMI) << 8) | this.memget(ISR_NMI + 1);
			this.setPC(addr);
			this.nmiPending = false;
			this.cooldown = 8;
			return;
		}

		const singleStep = this.getFlag(SBit);
		const inst = this.memget(PC);
		//console.log(inst.toString(16));
		const group = inst >>> 6;
		const mode = inst & 0x07;
		const code = (inst >>> 3) & 0x07;
		PC += 1;

		if (group === 0) {
			// standalone instructions
			//console.log(`form 00, mode ${mode}`);
			const op = inst & 0x3f;

			switch (op) {
				case 0x00: // BRK
					cost += 8;
					const addr =
						(this.memget(ISR_BRK) << 8) | this.memget(ISR_BRK + 1);
					if (addr === 0) {
						this.errorBreak = true;
					} else {
						this.pushByte(this.F());
						this.pushShort(PC);
						PC = addr;
					}

					break;
				case 0x01: // NOP
					cost += 1;
					break;
				case 0x02: // RTS
					cost += 4;
					PC = this.pullShort();
					break;
				case 0x03: // RTI
					cost += 6;
					PC = this.pullShort();
					this.registers[REG_F] = this.pullByte();
					break;

				case 0x08: {
					// DAA
					// algorithm from https://worldofspectrum.org/faq/reference/z80reference.htm#:~:text=The%20DAA%20Instruction&text=The%20algorithm%20used%20is%20as,Carry%20flag%20will%20be%20CLEARED.
					cost += 1;
					let cf = 0x00;
					let newCarry = false;
					if (this.registers[REG_A] > 0x99 || this.getFlag(CBit)) {
						cf = 0x60;
						newCarry = true;
					}
					if (
						(this.registers[REG_A] & 0x0f) > 0x09 ||
						this.getFlag(HBit)
					) {
						cf += 0x06;
					}
					this.registers[REG_A] = this.aluAdd(
						this.registers[REG_A],
						cf,
						0
					);
					this.setFlag(newCarry, CBit);
					break;
				}
				case 0x09: {
					// DAS
					cost += 1;
					let cf = 0x00;
					let newCarry = false;
					if (this.registers[REG_A] > 0x99 || !this.getFlag(CBit)) {
						cf = 0x60;
						newCarry = true;
					}
					if (
						(this.registers[REG_A] & 0x0f) > 0x09 ||
						!this.getFlag(HBit)
					) {
						cf += 0x06;
					}
					this.registers[REG_A] = this.aluAdd(
						this.registers[REG_A],
						-cf - 1,
						1
					);
					this.setFlag(!newCarry, CBit);
					break;
				}
				case 0x0c: // SLA
					cost += 1;
					this.setFlag(((this.registers[REG_A] >>> 7) & 1) > 0, CBit);
					this.registers[REG_A] =
						(this.registers[REG_A] << 1) & 0x0ff;
					this.setNZ(this.registers[REG_A]);
					break;
				case 0x0d: // SRA
					cost += 1;
					this.setFlag((this.registers[REG_A] & 1) > 0, CBit);
					this.registers[REG_A] =
						(this.registers[REG_A] >>> 1) & 0xff;
					break;
				case 0x0e: {
					// RLA
					cost += 1;
					const C = this.getFlag(CBit);
					this.setFlag(((this.registers[REG_A] >>> 7) & 1) > 0, CBit);
					this.registers[REG_A] =
						((this.registers[REG_A] << 1) & 0xff) | (C ? 1 : 0);
					break;
				}
				case 0x0f: {
					// RRA
					cost += 2;
					const C = this.getFlag(CBit);
					this.setFlag((this.registers[REG_A] & 1) > 0, CBit);
					this.registers[REG_A] =
						((this.registers[REG_A] >>> 1) & 0xff) | (C ? 0x80 : 0);
					this.setNZ(this.registers[REG_A]);
					break;
				}
				case 0x10: // CLC
					cost += 1;
					this.setFlag(false, CBit);
					break;
				case 0x11: // SEC
					cost += 1;
					this.setFlag(true, CBit);
					break;
				case 0x12: // CLI
					cost += 1;
					this.setFlag(false, IBit);
					break;
				case 0x13: // SEI
					cost += 1;
					this.setFlag(true, IBit);
					break;
				case 0x14: // CLV
					cost += 1;
					this.setFlag(false, VBit);
					break;
				case 0x15: // SEV
					cost += 1;
					this.setFlag(true, VBit);
					break;

				case 0x18: // INA
					cost += 1;
					this.registers[REG_A] = this.aluAdd(
						this.registers[REG_A],
						1,
						0
					);
					break;
				case 0x19: // DEA
					cost += 1;
					this.registers[REG_A] = this.aluAdd(
						this.registers[REG_A],
						-2,
						1
					);
					break;
				case 0x1a: // INX
					cost += 1;
					this.registers[REG_X] = this.aluAdd(
						this.registers[REG_X],
						1,
						0
					);
					break;
				case 0x1b: // DEX
					cost += 1;
					this.registers[REG_X] = this.aluAdd(
						this.registers[REG_X],
						-2,
						1
					);
					break;
				case 0x1c: // INY
					cost += 1;
					this.registers[REG_Y] = this.aluAdd(
						this.registers[REG_Y],
						1,
						0
					);
					break;
				case 0x1d: // DEY
					cost += 1;
					this.registers[REG_Y] = this.aluAdd(
						this.registers[REG_Y],
						-2,
						1
					);
					break;

				case 0x20: // TAX
					cost += 1;
					this.registers[REG_X] = this.registers[REG_A];
					this.setNZ(this.registers[REG_X]);
					break;
				case 0x21: // TXA
					cost += 1;
					this.registers[REG_A] = this.registers[REG_X];
					this.setNZ(this.registers[REG_A]);
					break;
				case 0x22: // TAY
					cost += 1;
					this.registers[REG_Y] = this.registers[REG_A];
					this.setNZ(this.registers[REG_Y]);
					break;
				case 0x23: // TYA
					cost += 1;
					this.registers[REG_A] = this.registers[REG_Y];
					this.setNZ(this.registers[REG_A]);
					break;
				case 0x24: // TAD
					cost += 1;
					this.registers[REG_DP] = this.registers[REG_A];
					this.setNZ(this.registers[REG_DP]);
					break;
				case 0x25: // TDA
					cost += 1;
					this.registers[REG_A] = this.registers[REG_DP];
					this.setNZ(this.registers[REG_A]);
					break;
				case 0x26: // TAS
					cost += 1;
					this.registers[REG_S] = this.registers[REG_A];
					break;
				case 0x27: // TSA
					cost += 1;
					this.registers[REG_A] = this.registers[REG_S];
					break;

				case 0x28: // PHA
					cost += 2;
					this.pushByte(this.registers[REG_A]);
					break;
				case 0x29: // PLA
					cost += 2;
					this.registers[REG_A] = this.pullByte();
					this.setNZ(this.registers[REG_A]);
					break;
				case 0x2a: // PHX
					cost += 2;
					this.pushByte(this.registers[REG_X]);
					break;
				case 0x2b: // PLX
					cost += 2;
					this.registers[REG_X] = this.pullByte();
					this.setNZ(this.registers[REG_X]);
					break;
				case 0x2c: // PHY
					cost += 2;
					this.pushByte(this.registers[REG_Y]);
					break;
				case 0x2d: // PLY
					cost += 2;
					this.registers[REG_Y] = this.pullByte();
					this.setNZ(this.registers[REG_Y]);
					break;
				case 0x2e: // PHF
					cost += 2;
					this.pushByte(this.registers[REG_F]);
					break;
				case 0x2f: // PLF
					cost += 2;
					this.registers[REG_F] = this.pullByte();
					break;

				case 0x30: // BCC
					cost += 3;
					PC += 1;
					if (!this.getFlag(CBit))
						PC = this.PC() + ((this.memget(PC - 1) << 24) >> 24);
					break;
				case 0x31: // BCS
					cost += 3;
					PC += 1;
					if (this.getFlag(CBit))
						PC = this.PC() + ((this.memget(PC - 1) << 24) >> 24);
					break;
				case 0x32: // BEQ
					cost += 3;
					PC += 1;
					if (!this.getFlag(ZBit))
						PC = this.PC() + ((this.memget(PC - 1) << 24) >> 24);
					break;
				case 0x33: // BNE
					cost += 3;
					PC += 1;
					if (this.getFlag(ZBit))
						PC = this.PC() + ((this.memget(PC - 1) << 24) >> 24);
					break;
				case 0x34: // BPL
					cost += 3;
					PC += 1;
					if (!this.getFlag(NBit))
						PC = this.PC() + ((this.memget(PC - 1) << 24) >> 24);
					break;
				case 0x35: // BMI
					cost += 3;
					PC += 1;
					if (this.getFlag(NBit))
						PC = this.PC() + ((this.memget(PC - 1) << 24) >> 24);
					break;
				case 0x36: // BVC
					cost += 3;
					PC += 1;
					if (!this.getFlag(VBit))
						PC = this.PC() + ((this.memget(PC - 1) << 24) >> 24);
					break;
				case 0x37: // BVS
					cost += 3;
					PC += 1;
					if (this.getFlag(VBit))
						PC = this.PC() + ((this.memget(PC - 1) << 24) >> 24);
					break;

				case 0x38: // JMP $0000
					cost += 2;
					PC = (this.memget(PC) << 8) | this.memget(PC + 1);
					break;
				case 0x39: {
					// JMP ($0000)
					cost += 4;
					const addr = (this.memget(PC) << 8) | this.memget(PC + 1);
					PC = (this.memget(addr) << 8) | this.memget(addr + 1);
					break;
				}
				case 0x3a: {
					// JMP ($0000,X)
					cost += 5;
					const addr =
						(((this.memget(PC) << 8) | this.memget(PC + 1)) +
							this.registers[REG_X]) &
						0xffff;
					PC = (this.memget(addr) << 8) | this.memget(addr + 1);
					break;
				}
				case 0x3b: {
					// JMP ($0000,Y)
					cost += 5;
					const addr =
						(((this.memget(PC) << 8) | this.memget(PC + 1)) +
							this.registers[REG_Y]) &
						0xffff;
					PC = (this.memget(addr) << 8) | this.memget(addr + 1);
					break;
				}
				case 0x3c: // JSR $0000
					cost += 2;
					this.pushShort(PC + 2);
					PC = (this.memget(PC) << 8) | this.memget(PC + 1);
					break;
				case 0x3d: {
					// JSR ($0000)
					cost += 4;
					this.pushShort(PC + 2);
					const addr = (this.memget(PC) << 8) | this.memget(PC + 1);
					PC = (this.memget(addr) << 8) | this.memget(addr + 1);
					break;
				}
				case 0x3e: {
					// JSR ($0000,X)
					cost += 5;
					this.pushShort(PC + 2);
					const addr =
						(((this.memget(PC) << 8) | this.memget(PC + 1)) +
							this.registers[REG_X]) &
						0xffff;
					PC = (this.memget(addr) << 8) | this.memget(addr + 1);
					break;
				}
				case 0x3f: {
					// JSR ($0000,Y)
					cost += 5;
					this.pushShort(PC + 2);
					const addr =
						(((this.memget(PC) << 8) | this.memget(PC + 1)) +
							this.registers[REG_Y]) &
						0xffff;
					PC = (this.memget(addr) << 8) | this.memget(addr + 1);
					break;
				}
			}
		} else {
			// 01/10/11 modes
			//console.log(`form 11/10, mode ${mode}`);

			//fetch
			let val = 0;
			let addr = -1;
			let noRead = false;
			if (group === 3 && (code === 0 || code == 1)) {
				noRead = true; // STX and STY
			}
			if (group === 2 && code === 7) {
				noRead = true; // STA
			}
			switch (mode) {
				case 0: // immediate
					cost += 1;
					val = this.memget(PC);
					PC += 1;
					break;
				case 1: // absolute
					cost += 3;
					addr = (this.memget(PC) << 8) | this.memget(PC + 1);
					PC += 2;
					if (!noRead) val = this.memget(addr);
					break;
				case 2: // indexed X
					cost += 4;
					addr = (this.memget(PC) << 8) | this.memget(PC + 1);
					addr = (addr + this.registers[REG_X]) & 0xffff;
					PC += 2;
					if (!noRead) val = this.memget(addr);
					break;
				case 3: // indexed Y
					cost += 4;
					addr = (this.memget(PC) << 8) | this.memget(PC + 1);
					addr = (addr + this.registers[REG_Y]) & 0xffff;
					PC += 2;
					if (!noRead) val = this.memget(addr);
					break;
				case 4: // zero-page
					cost += 2;
					addr = (this.DP() << 8) | this.memget(PC);
					PC += 1;
					if (!noRead) val = this.memget(addr);
					break;
				case 5: // indirect
					cost += 4;
					addr = (this.DP() << 8) | this.memget(PC);
					addr = (this.memget(addr) << 8) | this.memget(addr + 1);
					PC += 1;
					if (!noRead) val = this.memget(addr);
					break;
				case 6: // indirect X
					cost += 5;
					addr = (this.DP() << 8) | this.memget(PC);
					addr = (this.memget(addr) << 8) | this.memget(addr + 1);
					addr = (addr + this.registers[REG_X]) & 0xffff;
					PC += 1;
					if (!noRead) val = this.memget(addr);
					break;
				case 7: // indirect Y
					cost += 5;
					addr = (this.DP() << 8) | this.memget(PC);
					addr = (this.memget(addr) << 8) | this.memget(addr + 1);
					addr = (addr + this.registers[REG_Y]) & 0xffff;
					PC += 1;
					if (!noRead) val = this.memget(addr);
					break;
			}

			if (group == 1) {
				switch (code) {
					case 0: // LDX
						this.registers[REG_X] = val;
						this.setNZ(val);
						break;
					case 1: // LDY
						this.registers[REG_Y] = val;
						this.setNZ(val);
						break;
					case 2: // CPX
						this.aluAdd(this.registers[REG_X], -val - 1, 1);
						break;
					case 3: // CPY
						this.aluAdd(this.registers[REG_Y], -val - 1, 1);
						break;
					case 4: // CMP
						this.aluAdd(this.registers[REG_A], -val - 1, 1);
						break;
					case 5: // CPC
						this.aluAdd(
							this.registers[REG_A],
							-val - 1,
							this.getFlag(CBit) ? 1 : 0
						);
						break;
					case 6: // ADD
						this.registers[REG_A] = this.aluAdd(
							this.registers[REG_A],
							val,
							0
						);
						break;
					case 7: // ADC
						this.registers[REG_A] = this.aluAdd(
							this.registers[REG_A],
							val,
							this.getFlag(CBit) ? 1 : 0
						);
						break;
				}
			} else if (group == 2) {
				switch (code) {
					case 0: // SUB
						this.registers[REG_A] = this.aluAdd(
							this.registers[REG_A],
							-val - 1,
							1
						);
						break;
					case 1: // SBC
						this.registers[REG_A] = this.aluAdd(
							this.registers[REG_A],
							-val - 1,
							this.getFlag(CBit) ? 1 : 0
						);
						break;
					case 2: // ORA
						this.registers[REG_A] = this.registers[REG_A] | val;
						this.setNZ(this.registers[REG_A]);
						break;
					case 3: // AND
						this.registers[REG_A] = this.registers[REG_A] & val;
						this.setNZ(this.registers[REG_A]);
						break;
					case 4: // XOR
						this.registers[REG_A] = this.registers[REG_A] ^ val;
						this.setNZ(this.registers[REG_A]);
						break;
					case 5: // BIT
						const temp = this.registers[REG_A] & val;
						this.setNZ(temp);
						this.setFlag(((val >>> 7) & 1) > 0, NBit);
						this.setFlag(((val >>> 6) & 1) > 0, VBit);
						this.setFlag((val & 1) > 0, CBit);
						break;
					case 6: // LDA
						this.registers[REG_A] = val;
						this.setNZ(val);
						break;
					case 7: // STA
						if (addr !== -1)
							this.memset(addr, this.registers[REG_A]);
						break;
				}
			} else if (group == 3) {
				switch (code) {
					case 0: // STX
						if (addr !== -1)
							this.memset(addr, this.registers[REG_X]);
						break;
					case 1: // STY
						if (addr !== -1)
							this.memset(addr, this.registers[REG_Y]);
						break;
					case 2: // ACM
						cost += 1;
						if (addr !== -1)
							this.memset(
								addr,
								this.aluAdd(val, 0, this.getFlag(CBit) ? 1 : 0)
							);
						break;
					case 3: // SCM
						cost += 1;
						if (addr !== -1)
							this.memset(
								addr,
								this.aluAdd(val, -1, this.getFlag(CBit) ? 1 : 0)
							);
						break;
					case 4: // INC
						cost += 1;
						if (addr !== -1) {
							this.memset(addr, this.aluAdd(val, 1, 0));
						}
						break;
					case 5: // DEC
						cost += 1;
						if (addr !== -1) {
							this.memset(addr, this.aluAdd(val, -2, 1));
						}
						break;
					case 6: {
						// ROL
						cost += 1;
						const C = this.getFlag(CBit);
						this.setFlag(((val >>> 7) & 1) > 0, CBit);
						this.memset(addr, ((val << 1) & 0xff) | (C ? 1 : 0));
						break;
					}
					case 7: {
						// ROR
						cost += 1;
						const C = this.getFlag(CBit);
						this.setFlag((val & 1) > 0, CBit);
						this.memset(
							addr,
							((val >>> 1) & 0xff) | (C ? 0x80 : 0)
						);
						break;
					}
				}
			}
		}

		if (singleStep) {
			cost += 8;
			this.pushByte(this.F());
			this.pushShort(PC);
			const addr = (this.memget(ISR_BRK) << 8) | this.memget(ISR_BRK + 1);
			this.setFlag(false, SBit);
			PC = addr;
		}

		this.setPC(PC);
		this.cooldown = cost;
	}
}

export default CPU;
