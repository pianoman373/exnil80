import { test } from 'vitest';
import CPU from './CPU';
import { assemble } from './Assembler';

const ram = new Uint8Array(65536).fill(0); // 64K of ram
let cpu = new CPU(
  (addr) => {
    return ram[addr];
  },
  (addr, value) => {
    ram[addr] = value;
  }
);

function printCPUState() {
  const A = cpu.A().toString(16).padStart(2, '0');
  const X = cpu.X().toString(16).padStart(2, '0');
  const Y = cpu.Y().toString(16).padStart(2, '0');
  const PC = cpu.PC().toString(16).padStart(4, '0');
  const SP = cpu.S().toString(16).padStart(4, '0');
  const DP = cpu.DP().toString(16).padStart(2, '0');
  const F = cpu.F().toString(2).padStart(8, '0');

  const opcode = cpu.opcode.toString(16).padStart(2, '0');
  const operand = cpu.operand.toString(16).padStart(2, '0');
  const addr = cpu.addr.toString(16).padStart(4, '0');
  console.log(
    `------- A:${A} X:${X} Y:${Y} PC:${PC} SP:${SP} DP:${DP} F:${F} Cycle:${cpu.cycleCounter} Opcode:${opcode} Operand:${operand} Addr:${addr} -------`
  );
  let str = 'Stack: ';
  for (let i = 0x01d0; i <= 0x01ff; i++) {
    str += `${ram[i].toString(16).padStart(2, '0')} `;
  }
  console.log(str);

  str = 'DP:    ';
  for (let i = cpu.DP(); i < cpu.DP() + 0x30; i++) {
    str += `${ram[i].toString(16).padStart(2, '0')} `;
  }
  console.log(str);

  str = '4000:  ';
  for (let i = 0x4000; i < 0x4030; i++) {
    str += `${ram[i].toString(16).padStart(2, '0')} `;
  }
  console.log(str);
}

function runProgram(assembly: string, debug?: boolean, maxCycles?: number) {
  cpu = new CPU(
    (addr) => {
      return ram[addr];
    },
    (addr, value) => {
      ram[addr] = value;
    }
  );
  ram.fill(0);
  ram.set([0x10, 0x11, 0x22, 0x23, 0xde, 0xad, 0xbe, 0xef, 0x40, 0x02], 0x4000);
  assemble(assembly, ram);
  for (let i = 0; i < (maxCycles ?? 1000); i++) {
    cpu.cycle();

    if (cpu.opcode == 0) break;
    if (debug) printCPUState();

    //if (ram[cpu.PC()] === 0 && ram[cpu.PC() + 1] === 0) break;
  }
}

test('sandbox', () => {
  runProgram(
    `
    LDA #$40
    TAD
    LDY #$01
    LDA ($08),Y
	`,
    true,
    50
  );
});

// test('Arithmetic & Flags', () => {
// 	runProgram(`
//   LDA #$10
//   ADC #$08
// `);
// 	expect(cpu.A()).toBe(0x18);
// 	//expect(cpu.F()).toBe(0b00000000);

// 	runProgram(`
//   LDA #$FF
//   ADC #$01
// `);
// 	expect(cpu.A()).toBe(0x00);
// 	//expect(cpu.F()).toBe(0b00000011);
// });

// test('16 bit arithmetic', () => {
// 	runProgram(
// 		`
// SRCH = $00
// SRCL = $01
// DSTH = $02
// DSTL = $03

//   LDA #$40
//   TAD             ; set $4000 as direct-page

//   LDA SRCL
//   SUB DSTL
//   DAS
//   STA SRCL

//   LDA SRCH
//   SBC DSTH
//   DAS
//   STA SRCH

//   .ORG $4000
//   .WORD $4129
//   .WORD $0145
// `,
// 		true,
// 		100
// 	);
// 	expect(0xff).toBe(0xff);
// });
