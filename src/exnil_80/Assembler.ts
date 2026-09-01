const opcodes: Record<string, number> = {
	BRK: 0x00,
	NOP: 0x01,
	RTS: 0x02,
	RTI: 0x03,

	DAA: 0x08,
	DAS: 0x09,
	SLA: 0x0c,
	SRA: 0x0d,
	RLA: 0x0e,
	RRA: 0x0f,

	CLC: 0x10,
	SEC: 0x11,
	CLI: 0x12,
	SEI: 0x13,
	CLV: 0x14,
	SEV: 0x15,

	INA: 0x18,
	DEA: 0x19,
	INX: 0x1a,
	DEX: 0x1b,
	INY: 0x1c,
	DEY: 0x1d,

	TAX: 0x20,
	TXA: 0x21,
	TAY: 0x22,
	TYA: 0x23,
	TAD: 0x24,
	TDA: 0x25,
	TAS: 0x26,
	TSA: 0x27,

	PHA: 0x28,
	PLA: 0x29,
	PHX: 0x2a,
	PLX: 0x2b,
	PHY: 0x2c,
	PLY: 0x2d,
	PHF: 0x2e,
	PLF: 0x2f,

	BCC: 0x30,
	BCS: 0x31,
	BNE: 0x32,
	BEQ: 0x33,
	BPL: 0x34,
	BMI: 0x35,
	BVC: 0x36,
	BVS: 0x37,

	JMP: 0x38,
	JSR: 0x3c,

	LDX: 0x40,
	LDY: 0x48,
	CPX: 0x50,
	CPY: 0x58,
	CMP: 0x60,
	CPC: 0x68,
	ADD: 0x70,
	ADC: 0x78,

	SUB: 0x80,
	SBC: 0x88,
	ORA: 0x90,
	AND: 0x98,
	XOR: 0xa0,
	BIT: 0xa8,
	LDA: 0xb0,
	STA: 0xb8,

	STX: 0xc0,
	STY: 0xc8,
	ACM: 0xd0,
	SCM: 0xd8,
	INC: 0xe0,
	DEC: 0xe8,
	ROL: 0xf0,
	ROR: 0xf8,
};

function ascii(char: string) {
	return char.charCodeAt(0);
}

export function assemble(code: string, ram: Uint8Array) {
	const variables: Record<string, number> = {};

	for (let pass = 0; pass < 2; pass++) {
		var data = code.split('').map((i) => {
			return i.charCodeAt(0);
		});
		data.reverse();

		let c = data.pop();
		let i = 0;
		let line = 1;

		function parseNum() {
			let num = 0;
			let base = 10;

			if (c === ascii('$')) {
				base = 16;
				c = data.pop();
			} else if (c === ascii('%')) {
				base = 1;
				c = data.pop();
			} else if (c === ascii("'")) {
				c = data.pop();
				if (c === undefined) {
					throw new Error(`Line ${line}: unexpected EOF`);
				}
				num = c;
				c = data.pop();
				if (c != ascii("'")) {
					throw new Error(
						`Line ${line}: expected closing char quote`
					);
				}
				c = data.pop();
			} else if (c && c >= ascii('A') && c <= ascii('_')) {
				let str = '';
				while (c && c >= ascii('A') && c <= ascii('_')) {
					// A-Z
					str = str + String.fromCharCode(c);
					c = data.pop();
				}

				const labelVal = variables[str];
				if (labelVal === undefined) {
					if (pass == 1) {
						throw new Error(`Line ${line}: unknown label '${str}'`);
					} else {
						return 0xffff;
					}
				}
				return labelVal;
			}

			if (base == 16) {
				while (
					c &&
					((c >= ascii('0') && c <= ascii('9')) ||
						(c >= ascii('A') && c <= ascii('F')))
				) {
					if (c >= ascii('0') && c <= ascii('9')) {
						num = (num << 4) | (c - ascii('0'));
						c = data.pop();
					} else if (c >= ascii('A') && c <= ascii('F')) {
						num = (num << 4) | (c - ascii('A') + 10);
						c = data.pop();
					}
				}
			} else if (base == 10) {
				while (c && c >= ascii('0') && c <= ascii('9')) {
					num = num * 10 + (c - ascii('0'));
					c = data.pop();
				}
			} else if (base == 1) {
				while (c && c >= ascii('0') && c <= ascii('1')) {
					num = num * 2 + (c - ascii('0'));
					c = data.pop();
				}
			}

			return num;
		}

		function runMacro(macro: string) {
			switch (macro) {
				case 'ORG':
					i = parseNum();
					break;
				case 'BYTE':
					ram[i++] = parseNum();
					while (c === ascii(',')) {
						c = data.pop();
						ram[i++] = parseNum();
					}
					break;
				case 'WORD':
					const num = parseNum();
					ram[i++] = num >>> 8;
					ram[i++] = num & 0xff;
					while (c === ascii(',')) {
						c = data.pop();
						const num = parseNum();
						ram[i++] = num >>> 8;
						ram[i++] = num & 0xff;
					}
					break;
			}
		}

		while (c && c !== 0) {
			if (c === ascii(' ') || c === ascii('\t')) {
				// consume all spaces and tabs before opcode
				while (c && (c == ascii(' ') || c == ascii('\t'))) {
					c = data.pop();
				}

				if (c === ascii('.')) {
					// macro
					c = data.pop();
					let str = '';
					while (c && c >= ascii('A') && c <= ascii('_')) {
						// A-Z
						str = str + String.fromCharCode(c);
						c = data.pop();
					}

					if (c === ascii(' ')) {
						// consume space
						c = data.pop();
					}

					runMacro(str);
				} else if (c && c >= ascii('A') && c <= ascii('_')) {
					// opcode
					let str = '';
					while (c && c >= ascii('A') && c <= ascii('_')) {
						// A-Z
						str = str + String.fromCharCode(c);
						c = data.pop();
					}
					let op = opcodes[str];
					if (op === undefined) {
						throw new Error(
							`Line ${line}: unknown opcode '${str}'`
						);
					}
					const group = op >>> 6;

					if (c === ascii(' ')) {
						// consume space
						c = data.pop();
					}

					if (group == 0) {
						// 00 group

						if (op === 0) {
							const id = parseNum();
							ram[i++] = op;
							ram[i++] = id;
						} else if (op >>> 3 === 0b110) {
							// branches
							const dest = parseNum();
							const addr = dest - i;
							if ((addr > 127 || addr < -128) && pass == 1) {
								//console.log(addr);
								throw new Error(
									`Line ${line}: branch destination is out of range`
								);
							}
							ram[i++] = op;
							ram[i++] = addr & 0xff;
						} else if (op >>> 3 === 0b111) {
							// JMP/JSR
							const addr = parseNum();
							ram[i++] = op;
							ram[i++] = addr >>> 8;
							ram[i++] = addr & 0xff;
						} else {
							ram[i++] = op;
						}
					} else {
						// 01/10/11 group

						if (c === ascii('#')) {
							c = data.pop();
							ram[i++] = op;
							ram[i++] = parseNum();
						} else if (c === ascii('(')) {
							// indirect
							c = data.pop();
							op += 5;
							const addr = parseNum();

							if (c !== ascii(')')) {
								throw new Error(`Line ${line}: expected ')'`);
							}
							c = data.pop();

							if (c === ascii(',')) {
								c = data.pop();

								if (c === ascii('X')) {
									op += 1;
									c = data.pop();
								} else if (c === ascii('Y')) {
									op += 2;
									c = data.pop();
								} else {
									throw new Error(
										`Line ${line}: expected 'X' or 'Y'`
									);
								}
							}
							ram[i++] = op;
							ram[i++] = addr & 0xff;
						} else {
							const addr = parseNum();

							if (c === ascii(',')) {
								c = data.pop();

								if (c === ascii('X')) {
									// indexed X
									ram[i++] = op + 2;
									ram[i++] = addr >>> 8;
									ram[i++] = addr & 0xff;
								} else if (c === ascii('Y')) {
									// indexed Y
									ram[i++] = op + 3;
									ram[i++] = addr >>> 8;
									ram[i++] = addr & 0xff;
								} else {
									throw new Error(
										`Line ${line}: expected 'X', 'Y', or 'S'`
									);
								}
							} else {
								if (addr >> 8 === 0) {
									// zeropage
									ram[i++] = op + 4;
									ram[i++] = addr;
								} else {
									//absolute
									ram[i++] = op + 1;
									ram[i++] = addr >>> 8;
									ram[i++] = addr & 0xff;
								}
							}
						}
					}
				}
			} else if (c >= ascii('A') && c <= ascii('_')) {
				// label
				let str = '';
				while (c && c >= ascii('A') && c <= ascii('_')) {
					// A-Z
					str = str + String.fromCharCode(c);
					c = data.pop();
				}

				// consume whitespace
				if (c === ascii(' ')) {
					c = data.pop();
				}
				if (c === ascii('=')) {
					c = data.pop();
					// consume whitespace
					if (c === ascii(' ')) {
						c = data.pop();
					}
					variables[str] = parseNum();
				} else {
					variables[str] = i;
				}
			}

			// consume everything until newline
			while (c && c !== ascii('\n')) {
				c = data.pop();
			}
			line++;

			c = data.pop();
		}
	}

	console.log('----label list----');
	for (let i in variables) {
		console.log(`${i}: ${variables[i].toString(16).padStart(4, '0')}`);
	}
}
