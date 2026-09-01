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
  isrTarget: number = 0;

  public errorBreak = false;

  cycleCounter: number = 0;
  opcode: number = 0;
  operand: number = 0;
  addr: number = 0;

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

    this.setFlag((unsignedX & 0x0f) + (unsignedY & 0x0f) + carry > 0x0f, HBit);
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

  incPC() {
    this.setPC(this.PC() + 1);
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

  cycleSingleOps() {
    switch (this.opcode) {
      case 0x00: // BRK
        switch (this.cycleCounter) {
          case 2:
            this.pushByte(this.F());
            this.setFlag(false, SBit);
            break;
          case 3:
            this.pushByte(this.PCL());
            break;
          case 4:
            this.pushByte(this.PCH());
            break;
          case 5:
            this.addr = this.memget(this.isrTarget) << 8;
            break;
          case 6:
            this.addr = this.addr | this.memget(this.isrTarget + 1);
            if (this.addr === 0 && this.isrTarget === ISR_BRK) {
              this.errorBreak = true;
            } else {
              this.setPC(this.addr);
            }
            this.cycleCounter = 0;
        }
        break;
      case 0x02: // RTS
        switch (this.cycleCounter) {
          case 2:
            this.addr = this.pullByte() << 8;
            break;
          case 3:
            this.addr = this.addr | this.pullByte();
            this.setPC(this.addr);
            this.cycleCounter = 0;
            break;
        }
        break;
      case 0x03: // RTI
        switch (this.cycleCounter) {
          case 2:
            this.addr = this.pullByte() << 8;
            break;
          case 3:
            this.addr = this.addr | this.pullByte();
            this.setPC(this.addr);
            break;
          case 4:
            this.registers[REG_F] = this.pullByte();
            this.cycleCounter = 0;
            break;
        }
        break;
      case 0x08: {
        // DAA
        // algorithm from https://worldofspectrum.org/faq/reference/z80reference.htm#:~:text=The%20DAA%20Instruction&text=The%20algorithm%20used%20is%20as,Carry%20flag%20will%20be%20CLEARED.
        this.cycleCounter = 0;
        let cf = 0x00;
        let newCarry = false;
        if (this.registers[REG_A] > 0x99 || this.getFlag(CBit)) {
          cf = 0x60;
          newCarry = true;
        }
        if ((this.registers[REG_A] & 0x0f) > 0x09 || this.getFlag(HBit)) {
          cf += 0x06;
        }
        this.registers[REG_A] = this.aluAdd(this.registers[REG_A], cf, 0);
        this.setFlag(newCarry, CBit);
        break;
      }
      case 0x09: {
        // DAS
        this.cycleCounter = 0;
        let cf = 0x00;
        let newCarry = false;
        if (this.registers[REG_A] > 0x99 || !this.getFlag(CBit)) {
          cf = 0x60;
          newCarry = true;
        }
        if ((this.registers[REG_A] & 0x0f) > 0x09 || !this.getFlag(HBit)) {
          cf += 0x06;
        }
        this.registers[REG_A] = this.aluAdd(this.registers[REG_A], -cf - 1, 1);
        this.setFlag(!newCarry, CBit);
        break;
      }
      case 0x0c: // SLA
        this.cycleCounter = 0;
        this.setFlag(((this.registers[REG_A] >>> 7) & 1) > 0, CBit);
        this.registers[REG_A] = (this.registers[REG_A] << 1) & 0x0ff;
        this.setNZ(this.registers[REG_A]);
        break;
      case 0x0d: // SRA
        this.cycleCounter = 0;
        this.setFlag((this.registers[REG_A] & 1) > 0, CBit);
        this.registers[REG_A] = (this.registers[REG_A] >>> 1) & 0xff;
        break;
      case 0x0e: {
        // RLA
        this.cycleCounter = 0;
        const C = this.getFlag(CBit);
        this.setFlag(((this.registers[REG_A] >>> 7) & 1) > 0, CBit);
        this.registers[REG_A] =
          ((this.registers[REG_A] << 1) & 0xff) | (C ? 1 : 0);
        break;
      }
      case 0x0f: {
        // RRA
        this.cycleCounter = 0;
        const C = this.getFlag(CBit);
        this.setFlag((this.registers[REG_A] & 1) > 0, CBit);
        this.registers[REG_A] =
          ((this.registers[REG_A] >>> 1) & 0xff) | (C ? 0x80 : 0);
        this.setNZ(this.registers[REG_A]);
        break;
      }
      case 0x10: // CLC
        this.cycleCounter = 0;
        this.setFlag(false, CBit);
        break;
      case 0x11: // SEC
        this.cycleCounter = 0;
        this.setFlag(true, CBit);
        break;
      case 0x12: // CLI
        this.cycleCounter = 0;
        this.setFlag(false, IBit);
        break;
      case 0x13: // SEI
        this.cycleCounter = 0;
        this.setFlag(true, IBit);
        break;
      case 0x14: // CLV
        this.cycleCounter = 0;
        this.setFlag(false, VBit);
        break;
      case 0x15: // SEV
        this.cycleCounter = 0;
        this.setFlag(true, VBit);
        break;

      case 0x18: // INA
        this.cycleCounter = 0;
        this.registers[REG_A] = this.aluAdd(this.registers[REG_A], 1, 0);
        break;
      case 0x19: // DEA
        this.cycleCounter = 0;
        this.registers[REG_A] = this.aluAdd(this.registers[REG_A], -2, 1);
        break;
      case 0x1a: // INX
        this.cycleCounter = 0;
        this.registers[REG_X] = this.aluAdd(this.registers[REG_X], 1, 0);
        break;
      case 0x1b: // DEX
        this.cycleCounter = 0;
        this.registers[REG_X] = this.aluAdd(this.registers[REG_X], -2, 1);
        break;
      case 0x1c: // INY
        this.cycleCounter = 0;
        this.registers[REG_Y] = this.aluAdd(this.registers[REG_Y], 1, 0);
        break;
      case 0x1d: // DEY
        this.cycleCounter = 0;
        this.registers[REG_Y] = this.aluAdd(this.registers[REG_Y], -2, 1);
        break;

      case 0x20: // TAX
        this.cycleCounter = 0;
        this.registers[REG_X] = this.registers[REG_A];
        this.setNZ(this.registers[REG_X]);
        break;
      case 0x21: // TXA
        this.cycleCounter = 0;
        this.registers[REG_A] = this.registers[REG_X];
        this.setNZ(this.registers[REG_A]);
        break;
      case 0x22: // TAY
        this.cycleCounter = 0;
        this.registers[REG_Y] = this.registers[REG_A];
        this.setNZ(this.registers[REG_Y]);
        break;
      case 0x23: // TYA
        this.cycleCounter = 0;
        this.registers[REG_A] = this.registers[REG_Y];
        this.setNZ(this.registers[REG_A]);
        break;
      case 0x24: // TAD
        this.cycleCounter = 0;
        this.registers[REG_DP] = this.registers[REG_A];
        this.setNZ(this.registers[REG_DP]);
        break;
      case 0x25: // TDA
        this.cycleCounter = 0;
        this.registers[REG_A] = this.registers[REG_DP];
        this.setNZ(this.registers[REG_A]);
        break;
      case 0x26: // TAS
        this.cycleCounter = 0;
        this.registers[REG_S] = this.registers[REG_A];
        break;
      case 0x27: // TSA
        this.cycleCounter = 0;
        this.registers[REG_A] = this.registers[REG_S];
        break;

      case 0x28: // PHA
        this.cycleCounter = 0;
        this.pushByte(this.registers[REG_A]);
        break;
      case 0x29: // PLA
        this.cycleCounter = 0;
        this.registers[REG_A] = this.pullByte();
        this.setNZ(this.registers[REG_A]);
        break;
      case 0x2a: // PHX
        this.cycleCounter = 0;
        this.pushByte(this.registers[REG_X]);
        break;
      case 0x2b: // PLX
        this.cycleCounter = 0;
        this.registers[REG_X] = this.pullByte();
        this.setNZ(this.registers[REG_X]);
        break;
      case 0x2c: // PHY
        this.cycleCounter = 0;
        this.pushByte(this.registers[REG_Y]);
        break;
      case 0x2d: // PLY
        this.cycleCounter = 0;
        this.registers[REG_Y] = this.pullByte();
        this.setNZ(this.registers[REG_Y]);
        break;
      case 0x2e: // PHF
        this.cycleCounter = 0;
        this.pushByte(this.registers[REG_F]);
        break;
      case 0x2f: // PLF
        this.cycleCounter = 0;
        this.registers[REG_F] = this.pullByte();
        break;

      default:
        this.cycleCounter = 0;
    }
  }

  cycleBranches() {
    let branchTaken = false;
    switch (this.cycleCounter) {
      case 2:
        this.operand = this.memget(this.PC());
        switch (this.opcode) {
          case 0x30: // BCC
            branchTaken = !this.getFlag(CBit);
            break;
          case 0x31: // BCS
            branchTaken = this.getFlag(CBit);
            break;
          case 0x32: // BNE
            branchTaken = !this.getFlag(ZBit);
            break;
          case 0x33: // BEQ
            branchTaken = this.getFlag(ZBit);
            break;
          case 0x34: // BPL
            branchTaken = !this.getFlag(NBit);
            break;
          case 0x35: // BMI
            branchTaken = this.getFlag(NBit);
            break;
          case 0x36: // BVC
            branchTaken = !this.getFlag(VBit);
            break;
          case 0x37: // BVS
            branchTaken = this.getFlag(VBit);
            break;
        }
        if (!branchTaken) {
          this.incPC();
          this.cycleCounter = 0;
        }
        break;
      case 3:
        this.setPC(this.PC() - 1 + ((this.operand << 24) >> 24));
        this.cycleCounter = 0;
        break;
    }
  }

  cycleJumps() {
    switch (this.opcode) {
      case 0x38: // JMP abs
        switch (this.cycleCounter) {
          case 2:
            this.operand = this.memget(this.PC()) << 8;
            this.incPC();
            break;
          case 3:
            this.operand = this.operand | this.memget(this.PC());
            this.incPC();
            this.setPC(this.operand);
            this.cycleCounter = 0;
            break;
        }
        break;
      case 0x39: // JMP ()
      case 0x3a: // JMP (X)
      case 0x3b: // JMP (Y)
        switch (this.cycleCounter) {
          case 2:
            this.addr = this.memget(this.PC()) << 8;
            this.incPC();
            break;
          case 3:
            this.addr = this.addr | this.memget(this.PC());
            if (this.opcode == 0x3a)
              this.addr = (this.addr + this.X()) & 0xffff;
            if (this.opcode == 0x3b)
              this.addr = (this.addr + this.Y()) & 0xffff;
            this.incPC();
            break;
          case 4:
            this.operand = this.memget(this.addr) << 8;
            break;
          case 5:
            this.operand = this.operand | this.memget((this.addr + 1) & 0xffff);
            this.setPC(this.operand);
            this.cycleCounter = 0;
            break;
        }
        break;
      case 0x3c: // JSR abs
        switch (this.cycleCounter) {
          case 2:
            this.operand = this.memget(this.PC()) << 8;
            this.incPC();
            break;
          case 3:
            this.operand = this.operand | this.memget(this.PC());
            this.incPC();
            break;
          case 4:
            this.pushByte(this.PCL());
            break;
          case 5:
            this.pushByte(this.PCH());
            this.setPC(this.operand);
            this.cycleCounter = 0;
            break;
        }
        break;
      case 0x3d: // JSR ()
      case 0x3e: // JSR (X)
      case 0x3f: // JSR (Y)
        switch (this.cycleCounter) {
          case 2:
            this.addr = this.memget(this.PC()) << 8;
            this.incPC();
            break;
          case 3:
            this.addr = this.addr | this.memget(this.PC());
            if (this.opcode == 0x3e)
              this.addr = (this.addr + this.X()) & 0xffff;
            if (this.opcode == 0x3f)
              this.addr = (this.addr + this.Y()) & 0xffff;
            this.incPC();
            break;
          case 4:
            this.operand = this.memget(this.addr) << 8;
            break;
          case 5:
            this.operand = this.operand | this.memget((this.addr + 1) & 0xffff);
            break;
          case 6:
            this.pushByte(this.PCL());
            break;
          case 7:
            this.pushByte(this.PCH());
            this.setPC(this.operand);
            this.cycleCounter = 0;
            break;
        }
        break;
    }
  }

  cycleLoads() {
    let addressMode = this.opcode & 0x07;

    switch (addressMode) {
      case 0: // immediate
        switch (this.cycleCounter) {
          case 2:
            this.operand = this.memget(this.PC());
            this.incPC();
            this.cycleCounter = 0;
            break;
        }
        break;
      case 1: // absolute
      case 2: // absolute,X
      case 3: // absolute,Y
        switch (this.cycleCounter) {
          case 2:
            this.addr = this.memget(this.PC()) << 8;
            this.incPC();
            break;
          case 3:
            this.addr = this.addr | this.memget(this.PC());
            this.incPC();
            break;
          case 4:
            if (addressMode === 2) this.addr = (this.addr + this.X()) & 0xffff;
            if (addressMode === 3) this.addr = (this.addr + this.Y()) & 0xffff;
            this.operand = this.memget(this.addr);
            this.cycleCounter = 0;
            break;
        }
        break;
      case 4: // direct page
        switch (this.cycleCounter) {
          case 2:
            this.addr = (this.DP() << 8) | this.memget(this.PC());
            this.incPC();
            break;
          case 3:
            this.operand = this.memget(this.addr);
            this.cycleCounter = 0;
            break;
        }
        break;
      case 5: // indirect
      case 6: // indirect X
      case 7: // indirect Y
        switch (this.cycleCounter) {
          case 2:
            this.operand = this.memget(this.PC());
            this.incPC();
            break;
          case 3:
            this.addr = this.memget((this.DP() << 8) | this.operand) << 8;
            this.operand = (this.operand + 1) & 0xff;
            break;
          case 4:
            this.addr =
              this.addr | this.memget((this.DP() << 8) | this.operand);
            break;
          case 5:
            if (addressMode === 6) this.addr = (this.addr + this.X()) & 0xffff;
            if (addressMode === 7) this.addr = (this.addr + this.Y()) & 0xffff;
            this.operand = this.memget(this.addr);
            this.cycleCounter = 0;
            break;
        }
        break;
    }

    if (this.cycleCounter === 0) {
      let instruction = this.opcode >>> 3;
      switch (instruction) {
        case 0x08: // LDX
          this.setNZ(this.operand);
          this.registers[REG_X] = this.operand;
          break;
        case 0x09: // LDY
          this.setNZ(this.operand);
          this.registers[REG_Y] = this.operand;
          break;
        case 0x0a: // CPX
          this.aluAdd(this.registers[REG_X], -this.operand - 1, 1);
          break;
        case 0x0b: // CPY
          this.aluAdd(this.registers[REG_Y], -this.operand - 1, 1);
          break;
        case 0x0c: // CMP
          this.aluAdd(this.registers[REG_A], -this.operand - 1, 1);
          break;
        case 0x0d: // CPC
          this.aluAdd(
            this.registers[REG_A],
            -this.operand - 1,
            this.getFlag(CBit) ? 1 : 0
          );
          break;
        case 0x0e: // ADD
          this.registers[REG_A] = this.aluAdd(
            this.registers[REG_A],
            this.operand,
            0
          );
          break;
        case 0x0f: // ADC
          this.registers[REG_A] = this.aluAdd(
            this.registers[REG_A],
            this.operand,
            this.getFlag(CBit) ? 1 : 0
          );
          break;
        case 0x10: // SUB
          this.registers[REG_A] = this.aluAdd(
            this.registers[REG_A],
            -this.operand - 1,
            1
          );
          break;
        case 0x11: // SBC
          this.registers[REG_A] = this.aluAdd(
            this.registers[REG_A],
            -this.operand - 1,
            this.getFlag(CBit) ? 1 : 0
          );
          break;
        case 0x12: // ORA
          this.registers[REG_A] = this.registers[REG_A] | this.operand;
          this.setNZ(this.registers[REG_A]);
          break;
        case 0x13: // AND
          this.registers[REG_A] = this.registers[REG_A] & this.operand;
          this.setNZ(this.registers[REG_A]);
          break;
        case 0x14: // XOR
          this.registers[REG_A] = this.registers[REG_A] ^ this.operand;
          this.setNZ(this.registers[REG_A]);
          break;
        case 0x15: // BIT
          this.setNZ(this.registers[REG_A] & this.operand);
          this.setFlag(((this.operand >>> 7) & 1) > 0, NBit);
          this.setFlag(((this.operand >>> 6) & 1) > 0, VBit);
          this.setFlag((this.operand & 1) > 0, CBit);
          break;
        case 0x16: // LDA
          this.registers[REG_A] = this.operand;
          this.setNZ(this.registers[REG_A]);
          break;
      }
    }
  }

  cycleStores() {
    let addressMode = this.opcode & 0x07;

    switch (addressMode) {
      case 0: // immediate
        switch (this.cycleCounter) {
          case 2:
            this.incPC();
            this.cycleCounter = 0;
            return;
        }
        break;
      case 1: // absolute
      case 2: // absolute,X
      case 3: // absolute,Y
        switch (this.cycleCounter) {
          case 2:
            this.addr = this.memget(this.PC()) << 8;
            this.incPC();
            break;
          case 3:
            this.addr = this.addr | this.memget(this.PC());
            this.incPC();
            break;
          case 4:
            if (addressMode === 2) this.addr = (this.addr + this.X()) & 0xffff;
            if (addressMode === 3) this.addr = (this.addr + this.Y()) & 0xffff;
            this.cycleCounter = 0;
            break;
        }
        break;
      case 4: // direct page
        switch (this.cycleCounter) {
          case 2:
            this.addr = (this.DP() << 8) | this.memget(this.PC());
            this.incPC();
            break;
          case 3:
            this.cycleCounter = 0;
            break;
        }
        break;
      case 5: // indirect
      case 6: // indirect X
      case 7: // indirect Y
        switch (this.cycleCounter) {
          case 2:
            this.operand = this.memget(this.PC());
            this.incPC();
            break;
          case 3:
            this.addr = this.memget((this.DP() << 8) | this.operand) << 8;
            this.operand = (this.operand + 1) & 0xff;
            break;
          case 4:
            this.addr =
              this.addr | this.memget((this.DP() << 8) | this.operand);
            break;
          case 5:
            if (addressMode === 6) this.addr = (this.addr + this.X()) & 0xffff;
            if (addressMode === 7) this.addr = (this.addr + this.Y()) & 0xffff;
            this.cycleCounter = 0;
            break;
        }
        break;
    }

    if (this.cycleCounter === 0) {
      let instruction = this.opcode >>> 3;
      switch (instruction) {
        case 0x17: // STA
          this.memset(this.addr, this.registers[REG_A]);
          break;
        case 0x18: // STX
          this.memset(this.addr, this.registers[REG_X]);
          break;
        case 0x19: // STY
          this.memset(this.addr, this.registers[REG_Y]);
          break;
      }
    }
  }

  cycleLoadStores() {
    let addressMode = this.opcode & 0x07;

    switch (addressMode) {
      case 0: // immediate
        switch (this.cycleCounter) {
          case 2:
            this.incPC();
            this.cycleCounter = 0;
            return;
        }
        break;
      case 1: // absolute
      case 2: // absolute,X
      case 3: // absolute,Y
        switch (this.cycleCounter) {
          case 2:
            this.addr = this.memget(this.PC()) << 8;
            this.incPC();
            break;
          case 3:
            this.addr = this.addr | this.memget(this.PC());
            this.incPC();
            break;
          case 4:
            if (addressMode === 2) this.addr = (this.addr + this.X()) & 0xffff;
            if (addressMode === 3) this.addr = (this.addr + this.Y()) & 0xffff;
            this.operand = this.memget(this.addr);
            break;
          case 5:
            this.cycleCounter = 0;
        }
        break;
      case 4: // direct page
        switch (this.cycleCounter) {
          case 2:
            this.addr = (this.DP() << 8) | this.memget(this.PC());
            this.incPC();
            break;
          case 3:
            this.operand = this.memget(this.addr);
            break;
          case 4:
            this.cycleCounter = 0;
            break;
        }
        break;
      case 5: // indirect
      case 6: // indirect X
      case 7: // indirect Y
        switch (this.cycleCounter) {
          case 2:
            this.operand = this.memget(this.PC());
            this.incPC();
            break;
          case 3:
            this.addr = this.memget((this.DP() << 8) | this.operand) << 8;
            this.operand = (this.operand + 1) & 0xff;
            break;
          case 4:
            this.addr =
              this.addr | this.memget((this.DP() << 8) | this.operand);
            break;
          case 5:
            if (addressMode === 6) this.addr = (this.addr + this.X()) & 0xffff;
            if (addressMode === 7) this.addr = (this.addr + this.Y()) & 0xffff;
            this.operand = this.memget(this.addr);
            break;
          case 6:
            this.cycleCounter = 0;
            break;
        }
        break;
    }

    if (this.cycleCounter === 0) {
      let instruction = this.opcode >>> 3;
      switch (instruction) {
        case 0x1a: // ACM
          this.memset(
            this.addr,
            this.aluAdd(this.operand, 0, this.getFlag(CBit) ? 1 : 0)
          );
          break;
        case 0x1b: // SCM
          this.memset(
            this.addr,
            this.aluAdd(this.operand, -1, this.getFlag(CBit) ? 1 : 0)
          );
          break;
        case 0x1c: // INC
          this.memset(this.addr, this.aluAdd(this.operand, 1, 0));
          break;
        case 0x1d: // DEC
          this.memset(this.addr, this.aluAdd(this.operand, -2, 1));
          break;
        case 0x1e: // ROL
          this.memset(
            this.addr,
            ((this.operand << 1) & 0xff) | (this.getFlag(CBit) ? 1 : 0)
          );
          this.setFlag(((this.operand >>> 7) & 1) > 0, CBit);

          break;
        case 0x1f: // ROR
          this.memset(
            this.addr,
            ((this.operand >>> 1) & 0xff) | (this.getFlag(CBit) ? 0x80 : 0)
          );
          this.setFlag((this.operand & 1) > 0, CBit);

          break;
      }
    }
  }

  cycleInstruction() {
    do {
      this.cycle();
    } while (this.cycleCounter !== 0);
  }

  cycle() {
    if (this.errorBreak) return;

    if (this.cycleCounter === 0) {
      if (this.nmiPending === true) {
        this.nmiPending = false;
        this.isrTarget = ISR_NMI;
        this.opcode = 0;
        this.cycleCounter = 1;
      } else if (this.interruptPending === true && this.getFlag(IBit)) {
        this.interruptPending = false;
        this.isrTarget = ISR_INT;
        this.opcode = 0;
        this.cycleCounter = 1;
      } else if (this.getFlag(SBit) && this.opcode !== 0x03) {
        console.log('single step BRK');
        this.isrTarget = ISR_BRK;
        this.opcode = 0;
        this.cycleCounter = 1;
      }
    }

    this.cycleCounter += 1;
    if (this.cycleCounter === 1) {
      // fetch & decode
      this.opcode = this.memget(this.PC());
      this.incPC();

      if (this.opcode === 0) {
        this.isrTarget = ISR_BRK;
      }
    } else {
      if (this.opcode < 0x30) {
        this.cycleSingleOps();
      } else if (this.opcode < 0x38) {
        this.cycleBranches();
      } else if (this.opcode < 0x40) {
        this.cycleJumps();
      } else if (this.opcode < 0xb8) {
        this.cycleLoads();
      } else if (this.opcode < 0xd0) {
        this.cycleStores();
      } else {
        this.cycleLoadStores();
      }
    }
  }
}

export default CPU;
