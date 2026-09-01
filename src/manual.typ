#set page("a4", numbering: "1")
#title("Exnil 80 Users Manual")
#set heading(numbering: "1.")
#set text(size: 11pt)
#outline()

#pagebreak()

= Overview

The Exnil 80 is an 8-bit home computer designed to be the ideal environment for software bootstrapping. With an orthogonal instruction set and straightforward IO interfacing, it is uniquely tailored to be easily programmed by hand in the initial process of writing an assembler environment.

Once an adequate software environment has been bootstrapped, the Exnil 80 supplies audio and visual capabilities that make it ideal for writing multimedia software and games.

== Conventions in this Manual

Throughout this manual numbers will be written as either decimal, hexadecimal, or binary. To provide a clear indicator of which base is being used, numbers will be prefixed with a \$ symbol if they are hexadecimal, a \% symbol if they are binary, and no prefix if they are decimal. This is also to keep in line with the recommended assembler syntax.

== Components

The Exnil 80 can be broken down into the following separate components.

*The CPU*

The Exnil 80 CPU is what executes code to control all other parts of the system. It is an 8-bit CPU with a 16-bit address bus capable of accessing up to 64K bytes of address space at a time. The CPU is clocked at 1.79208 MHz and performs most instructions in 2 to 7 clock cycles.

*Memory*

The Exnil 80 contains 128K bytes of RAM available for the CPU and VDP to access. Since the CPU can only address 64K at once, some portions of the RAM are bank swappable using a special IO register.

*The VDP*

The VDP controls the video output of the Exnil 80. It has several different graphics modes it can operate in for different purposes. The VDP is able to access a portion of RAM to read pixel or tile data to be displayed on screen.

*The ADP*

The ADP controls the audio output of the Exnil 80. It features 3 programmable oscillator channels with advanced filtering capability.

*The ROM Port*

The ROM port allows plugging in an EEPROM to be used as the system's bootloader code. This is the first area in memory that the CPU will begin executing code at.

*The Flash Port*

The flash port allows the user to transfer to and from a block of memory to a plugged in EEPROM.

*The Keyboard Port*

The keyboard port handles all keyboard input from the user and allows the CPU to read what keys have been pressed.

*The Floppy Disk Controller*

The floppy disk controller allows reading and writing data to 1MB floppy disks. Two disk drives are attached to the Exnil 80 and can both be controlled by a singular floppy disk controller.

*The User Port*

The user port allows peripherals such as printers to be controlled by the CPU.

*The Back Panel*

The back panel allows access to the Exnil 80 memory space using only manual switches, as well as viewing the state of the CPUs registers and single stepping instructions. The back panel can be used to hand enter programs into memory without needing any boot software running on the system. This is the first step of bootstrapping software onto the computer if you are starting from scratch.

= Memory Layout

Even though the Exnil 80's CPU can only address 64K of memory, the Exnil 80 has 128K of RAM, as well as additional address space reserved for the ROM. Accessing more than 64K of memory is achieved by banking. The first 32K of memory can be swapped with two additional 32K blocks, and a special extra bank which is a mirror of the RAM at \$8000-\$FFFF. The very top 8K of memory is mapped to the ROM by default, but can also be swapped out for an 8K block of RAM. See the System IO section for how to control the active banks.

#figure(
  caption: [Exnil 80 Memory Map],
  table(
  columns: 5,
  align: horizon,
  table.cell(
    x: 1,
    y: 0,
    rowspan: 8,
    [RAM 32K]
  ),
  table.cell(
    x: 2,
    y: 0,
    rowspan: 8,
    [RAM 32K]
  ),
  table.cell(
    x: 3,
    y: 0,
    rowspan: 8,
    [RAM 32K]
  ),
  table.cell(
    x: 4,
    y: 0,
    rowspan: 8,
    [
      RAM 32K 
      #linebreak()
    (Mirror of \$8000-\$FFFF)
  ]
  ),
  table.cell(
    x: 1,
    y: 14,
    rowspan: 2,
    [ROM 8K]
  ),
  table.cell(
    x: 2,
    y: 14,
    rowspan: 2,
    [RAM 8K]
  ),
  table.cell(
    x: 1,
    y: 8,
    rowspan: 6,
    [RAM & IO 24K]
  ),
  table.cell(
    x: 2,
    y: 8,
    rowspan: 6,
    []
  ),
  table.cell(
    x: 3,
    y: 8,
    rowspan: 8,
    []
  ),
  table.cell(
    x: 4,
    y: 8,
    rowspan: 8,
    []
  ),
  table.cell(
    x: 0,
    y: 0,
    [\$0000-\$0FFF],
  ),
  table.cell(
    x: 0,
    y: 1,
    [\$1000-\$1FFF],
  ),
  table.cell(
    x: 0,
    y: 2,
    [\$2000-\$2FFF],
  ),
  table.cell(
    x: 0,
    y: 3,
    [\$3000-\$3FFF],
  ),
  table.cell(
    x: 0,
    y: 4,
    [\$4000-\$4FFF],
  ),
  table.cell(
    x: 0,
    y: 5,
    [\$5000-\$5FFF],
  ),
  table.cell(
    x: 0,
    y: 6,
    [\$6000-\$6FFF],
  ),
  table.cell(
    x: 0,
    y: 7,
    [\$7000-\$7FFF],
  ),
  table.cell(
    x: 0,
    y: 8,
    [\$8000-\$8FFF],
  ),
  table.cell(
    x: 0,
    y: 9,
    [\$9000-\$9FFF],
  ),
  table.cell(
    x: 0,
    y: 10,
    [\$A000-\$AFFF],
  ),
  table.cell(
    x: 0,
    y: 11,
    [\$B000-\$BFFF],
  ),
  table.cell(
    x: 0,
    y: 12,
    [\$C000-\$CFFF],
  ),
  table.cell(
    x: 0,
    y: 13,
    [\$D000-\$DFFF],
  ),
  table.cell(
    x: 0,
    y: 14,
    [\$E000-\$EFFF],
  ),
  table.cell(
    x: 0,
    y: 15,
    [\$F000-\$FFFF],
  ),
)
)

= CPU Overview

The Exnil 80 CPU is an 8-bit CPU with a simple and orthogonal instruction set. The instruction set is optimized to make writing machine code without an assembler much easier than other instruction sets. Hand assembling assembly language into binary machine code is just a matter of consulting the opcode lookup table. The instruction set also makes writing an assembler easier due to there only being four types of instruction encoding schemes present.

== Registers

Registers are small blocks of memory that reside inside the CPU itself. You can think of them as 8 or 16 bit wide variables that you can use instructions to read to, write from, or modify. Accessing registers is quicker than accessing a variable in RAM, so you will want to utilize all of the available registers as much as possible to get the most performance.

#figure(
  caption: [CPU Register set],
  table(
    columns: 16 * (1fr,),
    align: center,
    [15],[14],[13],[12],[11],[10],[9],[8],[7],[6],[5],[4],[3],[2],[1],[0],
    table.cell(colspan: 8, []), table.cell(colspan: 8, [Accumulator (A)]),
    table.cell(colspan: 8, []), table.cell(colspan: 8, [X Index Register (X)]),
    table.cell(colspan: 8, []), table.cell(colspan: 8, [Y Index Register (Y)]),
    table.cell(colspan: 8, []), table.cell(colspan: 8, [Flags Register (F)]),
    table.cell(colspan: 8, []), table.cell(colspan: 8, [Stack Pointer (S)]),
    table.cell(colspan: 8, []), table.cell(colspan: 8, [Direct Page Register (D)]),
    table.cell(colspan: 16, [Program Counter (PC)])
  )
)

*The Acccumulator Register* is the most commonly used register for mathematical operations. It is typically used to hold the result of various mathematical operations such as adding, subtracting, bit shifting, etc.

*The X and Y Index Registers* are used either as extra data storage, or as offsets when accessing memory in an indexed addressing mode. These registers usually used for loop counters or array indices.

*The Flags Register* The flags register is usually not modified directly; it is a grouping of single bit flags which are set based on different conditions of an executing instruction. Flags are most commonly used as the input for branching instructions. 

#let flags_table = figure(
  caption: [Flags Register],
  table(
    columns: 8 * (1fr,),
    align: center,
    [7], [6], [5], [4], [3], [2], [1], [0],
    [Negative], [Overflow], [Interrupt], [Step], [Half-Carry], [Reserved], [Zero], [Carry],
    )
)
#flags_table

The carry bit is set when an arithmetic operation overflows and would have resulted in a value requiring more than 8 bits to hold.

The zero flag is set when the result of an operation equaled zero.

The half carry bit is similar to the carry, but it is set if a 4-bit operation would have overflowed. This is necessary to implement BCD arithmetic.

The single step flag is useful for writing debuggers where you would like to run a single instruction. When the single step flag is set by a program, it will run one instruction and then immediately send a breakpoint interrupt.

The interrupt mask controls whether or not to mask out interrupts. Interrupts are events that can cause the CPU to jump to another area in memory to handle the hardware event.

The signed overflow flag is set whenever a signed arithmetic operation overflows. 

The negative flag is set whenever the result of an operation was a negative number (bit 7 == 1).

*The Stack Pointer* stores an index to a special area of memory called the stack. Certain instructions can 'push', and 'pop' items into and out of the stack. Doing so will store the item in memory at the stack pointer's index, and then move the stack pointer up or down.

*The Direct Page Register* Sets the address for a special 256 byte region of memory known as the direct page. Accessing memory in the direct page only requires a 1-byte address rather than the usual 2-byte addresses needed.

*The Program Counter* is the only register that is 16 bits wide. It stores the memory address of the current instruction. It is not set directly  except for by branch instructions. All other instructions will automatically increment the program counter to move to the next instruction.

== Interrupts

Interrupts are events that can cause the CPU to jump to another area in memory to handle the hardware event. When an interrupt or break is triggered, first the flags register is pushed onto the stack. Next the program counter is pushed (low byte first). Next the address stored at the vector location is loaded into the program counter. Lastly the single step flag is cleared. This process takes 6 cycles. If an interrupt is triggered partially through the execution of an instruction it will wait for that instruction to finish, adding additional cycles.

There are four different interrupts on the Exnil 80: INT, NMI, BRK, and RST. Their corresponding memory locations are shown below.

#figure(
  caption: [Interrupt Routine Addresses],
  table(
    columns: 2,
    [INT], [\$FFF8 & \$FFF9],
    [NMI], [\$FFFA & \$FFFB],
    [BRK], [\$FFFC & \$FFFD],
    [RST], [\$FFFE & \$FFFF]
  )
)

*RST* is triggered on power-up of the Exnil 80. The very first thing the CPU does when powered up is read the addresses \$FFFE and \$FFFF and sets the program counter to the values read. This means that in order to start executing code on boot-up. The addresses \$FFFE and \$FFFF must contain the value of where your boot up code is located in RAM. In most cases it will make sense to set this to \$E000 which is the start of ROM.

*INT* is triggered via a physical pin on the CPU which is activated through
hardware to inform the CPU of an event. INT can be ignored if the interrupt enable flag is set to zero. See the chapters on the various IO chips to see when they trigger INT.

*NMI* is also triggered by a physical pin on the CPU. Unlike INT though, NMI interrupts cannot be ignored. NMI is used for high priority hardware events. NMI is directly wired to the break key on the keyboard.

*BRK* is triggered by the BRK instruction. This can be used to implement  software breakpoint handling as well as kernel calls. It is also triggered automatically at the end of an instruction if the step flag is set. One special feature about this interrupt, is that if the data at addresses \$FFFC and \$FFFD are both zero, the CPU will completely halt and give control to the back panel until the run switch is flipped. This allows handling breakpoints via the back panel if no software debugger has been developed yet.

== Opcodes

The Exnil 80 features 72 different instructions. Some instructions can have multiple variations known as addressing modes. Counting addressing modes, the number of unique instruction codes is 237. However, it is not necessary to know all 237 instruction codes. Once you understand the encoding format and patterns of instructions you will see that there are actually much fewer aspects to memorize than most CPU instruction sets.

#let opcode_table = figure(
  caption: [Opcode Table],
  table(
    columns: 17 * (1fr,),
    align: center,
    [  ], [ -0], [ -1], [ -2], [ -3], [ -4], [ -5], [ -6], [ -7], [ -8], [ -9], [ -A], [ -B], [ -C], [ -D], [ -E], [ -F],
    [0-], [BRK], [NOP], [RTS], [RTI], [   ], [   ], [   ], [   ], [DAA], [DAS], [   ], [   ], [SLA], [SRA], [RLA], [RRA],
    [1-], [CLC], [SEC], [CLI], [SEI], [CLV], [SEV], [   ], [   ], [INA], [DEA], [INX], [DEX], [INY], [DEY], [   ], [   ],
    [2-], [TAX], [TXA], [TAY], [TYA], [TAD], [TDA], [TAS], [TSA], [PHA], [PLA], [PHX], [PLX], [PHY], [PLY], [PHF], [PLF],
    [3-], [BCC rel], [BCS rel], [BNE rel], [BEQ rel], [BPL rel], [BMI rel], [BVC rel], [BVS rel], [JMP abs], [JMP () ], [JMP (X)], [JMP (Y)], [JSR abs], [JSR () ], [JSR (X)], [JSR (Y)],
    [4-], [LDX \#], [LDX abs], [LDX X  ], [LDX Y  ], [LDX @ ], [LDX (@) ], [LDX (@)X], [LDX (@)Y], [LDY \#], [LDY abs], [LDY X  ], [LDY Y  ], [LDY @ ], [LDY (@) ], [LDY (@)X], [LDY (@)Y],
    [5-], [CPX \#], [CPX abs], [CPX X  ], [CPX Y  ], [CPX @ ], [CPX (@) ], [CPX (@)X], [CPX (@)Y], [CPY \#], [CPY abs], [CPY X  ], [CPY Y  ], [CPY @ ], [CPY (@) ], [CPY (@)X], [CPY (@)Y],
    [6-], [CMP \#], [CMP abs], [CMP X  ], [CMP Y  ], [CMP @ ], [CMP (@) ], [CMP (@)X], [CMP (@)Y], [CPC \#], [CPC abs], [CPC X  ], [CPC Y  ], [CPC @ ], [CPC (@) ], [CPC (@)X], [CPC (@)Y],
    [7-], [ADD \#], [ADD abs], [ADD X  ], [ADD Y  ], [ADD @ ], [ADD (@) ], [ADD (@)X], [ADD (@)Y], [ADC \#], [ADC abs], [ADC X  ], [ADC Y  ], [ADC @ ], [ADC (@) ], [ADC (@)X], [ADC (@)Y],
    [8-], [SUB \#], [SUB abs], [SUB X  ], [SUB Y  ], [SUB @ ], [SUB (@) ], [SUB (@)X], [SUB (@)Y], [SBC \#], [SBC abs], [SBC X  ], [SBC Y  ], [SBC @ ], [SBC (@) ], [SBC (@)X], [SBC (@)Y],
    [9-], [ORA \#], [ORA abs], [ORA X  ], [ORA Y  ], [ORA @ ], [ORA (@) ], [ORA (@)X], [ORA (@)Y], [AND \#], [AND abs], [AND X  ], [AND Y  ], [AND @ ], [AND (@) ], [AND (@)X], [AND (@)Y],
    [A-], [XOR \#], [XOR abs], [XOR X  ], [XOR Y  ], [XOR @ ], [XOR (@) ], [XOR (@)X], [XOR (@)Y], [BIT \#], [BIT abs], [BIT X  ], [BIT Y  ], [BIT @ ], [BIT (@) ], [BIT (@)X], [BIT (@)Y],
    [B-], [LDA \#], [LDA abs], [LDA X  ], [LDA Y  ], [LDA @ ], [LDA (@) ], [LDA (@)X], [LDA (@)Y], [      ], [STA abs], [STA X  ], [STA Y  ], [STA @ ], [STA (@) ], [STA (@)X], [STA (@)Y],
    [C-], [      ], [STX abs], [STX X  ], [STX Y  ], [STX @ ], [STX (@) ], [STX (@)X], [STX (@)Y], [      ], [STY abs], [STY X  ], [STY Y  ], [STY @ ], [STY (@) ], [STY (@)X], [STY (@)Y],
    [D-], [      ], [ACM abs], [ACM X  ], [ACM Y  ], [ACM @ ], [ACM (@) ], [ACM (@)X], [ACM (@)Y], [      ], [SCM abs], [SCM X  ], [SCM Y  ], [SCM @ ], [SCM (@) ], [SCM (@)X], [SCM (@)Y],
    [E-], [      ], [INC abs], [INC X  ], [INC Y  ], [INC @ ], [INC (@) ], [INC (@)X], [INC (@)Y], [      ], [DEC abs], [DEC X  ], [DEC Y  ], [DEC @ ], [DEC (@) ], [DEC (@)X], [DEC (@)Y],
    [F-], [      ], [ROL abs], [ROL X  ], [ROL Y  ], [ROL @ ], [ROL (@) ], [ROL (@)X], [ROL (@)Y], [      ], [ROR abs], [ROR X  ], [ROR Y  ], [ROR @ ], [ROR (@) ], [ROR (@)X], [ROR (@)Y],
  )
)
#opcode_table

#let addressing_shorthand = figure(
  caption: [Addressing Mode Shorthand],
  table(
    columns: 6,
    align: left,
    [Shorthand], [Name], [Assembly Syntax],
    [Shorthand], [Name], [Assembly Syntax],
    [\#], [ Immediate ], [`OPC #$00`],
    [abs], [Absolute], [`OPC $0000`],
    [X], [Indexed X], [`OPC $0000,X`],
    [Y], [Indexed Y], [`OPC $0000,Y`],
    [@], [Direct Page], [`OPC @$00`],
    [(@)], [Indirect], [`OPC (@$00)`],
    [(@)X], [Indirect X], [`OPC (@$00),X`],
    [(@)Y], [Indirect Y], [`OPC (@$00),Y`],
    [(X)], [Absolute Indirect X], [`OPC ($0000,X)`],
    [(Y)], [Absolute Indirect Y], [`OPC ($0000,Y)`],
    [()], [Absolute Indirect], [`OPC ($0000)`],
    [rel], [Relative], [`OPC $0000`],
  )
)
#addressing_shorthand

#figure(
  caption: [Opcode Functions],
  table(
    columns: 2 * (1fr, 2fr),
    align: left,
    [BRK], [Trigger BRK interrupt],	
    [NOP], [No OPeration	],
    [RTS], [ReTurn from Subroutine	],
    [RTI], [ReTurn from Interrupt	],
    [DAA], [Decimal Adjust Addition	],
    [DAS], [Decimal Adjust Subtraction],
    [SLA], [Shift Left Accumulator	],
    [SRA], [Shift Right Accumulator	],
    [RLA], [Rotate Left Accumulator	],
    [RRA], [Rotate Right Accumulator],
    [CLC], [CLear Carry],
    [SEC], [SEt Carry],
    [CLI], [CLear Interrupt mask	],
    [SEI], [SEt Interrupt mask],
    [CLV], [CLear oVerflow mask],
    [SEV], [SEt oVerflow mask],
    [INA], [INcrement Accumulator	],
    [DEA], [DEcrement Accumulator	],
    [INX], [INcrement X],
    [DEX], [DEcrement X],
    [INY], [INcrement Y],
    [DEY], [DEcrement Y],
    [TAX], [Transfer Accumulator to X],
    [TXA], [Transfer X to Accumulator],
    [TAY], [Transfer Accumulator to Y],
    [TYA], [Transfer Y to Accumulator],
    [TAD], [Transfer Accumulator to D],
    [TDA], [Transfer D to Accumulator],
    [TAS], [Transfer Accumulator to S],
    [TSA], [Transfer S to Accumulator],
    [PHA], [Push Accumulator],
    [PLA], [Pull Accumulator],
    [PHX], [Push X	],
    [PLX], [Pull X	],
    [PHY], [Push Y	],
    [PLY], [Pull Y	],
    [PHF], [Push Flags],
    [PLF], [Pull Flags],
    [BCC], [Branch on Carry Clear	],
    [BCS], [Branch on Carry Set],
    [BNE], [Branch on Not Equal],
    [BEQ], [Branch on EQual	],
    [BPL], [Branch on PLus	],
    [BMI], [Branch on MInus	],
    [BVC], [Branch on oVerflow Clear],
    [BVS], [Branch on MInus	],
    [JMP], [JuMP	],
    [JSR], [Jump SubRoutine	],
    [LDX], [LoaD X from memory],
    [LDY], [LoaD Y from memory],
    [CPX], [ComPare X with memory	],
    [CPY], [ComPare Y with memory	],
    [CMP], [CoMPare a with memory	],
    [CPC], [ComPare a with memory with Carry],
    [ADD], [ADD a to memory	],
    [ADC], [ADd a to memory with Carry],
    [SUB], [SUBtract a from memory	],
    [SBC], [SuBtract memory from a with Carry],
    [ORA], [OR A with memory],
    [AND], [AND a with memory],
    [XOR], [eXclusive OR A with memory],
    [BIT], [BIT test memory	],
    [LDA], [LoaD A from memory],
    [STA], [STore A to memory],
    [STX], [Store X to memory],
    [STY], [STore Y to memory],
    [ACM], [Add Carry to Memory],
    [SCM], [Subtract Carry from Memory],
    [INC], [INCrement memory],
    [DEC], [DECrement memory],
    [ROL], [ROtate a Left	],
    [ROR], [ROtate a Right	],
  )
)

== Addressing Modes

Instructions consist of a 1-byte opcode, and 0-2 bytes of a numeric argument after. The addressing mode of the opcode determines how the numeric argument is specified. When a two-byte argument is used, the high byte comes first and the low byte comes second.

Opcodes can be grouped into four distinct groups which all have similar encodings and accept the same kinds of addressing modes.

The first grouping of opcodes are the *single opcodes* group occupies \$00-\$3F and has 38 instructions. These opcodes have no argument and are just a single byte long.

The next group are the *branch opcodes* group occupies \$30-\$37 and has 8 instructions. These opcodes all use the 'relative' addressing mode which specifies a one-byte offset relative to the current opcode position in memory.

The group after are the *jump opcodes* group occupies \$38-\$3F and has 2 instructions, JSR and JMP. Each instruction has 4 addressing modes, three of which are unique to this group.

The last group is the *main opcodes* group occupies \$40-\$FF. This group contains 24 instructions. Each instruction has 8 addressing modes. These instructions are the most commonly used and the most flexible. Note that some of the instructions in this group are missing the 'immediate' addressing mode since storing to an immediate location wouldn't make sense.

*Immediate Addressing* uses the 1-byte argument directly as the operand. This is useful for loading a constant value into a register, or using a constant value in a mathematical operation.

_Example: (left is the compiled hex version of the assembly)_
`
B0 94 ..      LDA #$94  ; load $94 into A register
70 03 ..      ADD #$03  ; add $03 to A and store result in A
60 32 ..      CMP #$32  ; compare A to value $32
`

*Absolute Addressing:* uses a 2-byte argument as a memory location to be used as the operant. This is used for reading or writing to a constant location in memory.

_Example:_
`
C1 DF 01      STX $DF01 ; store X register at address $DF01
B1 10 10      LDA $1010 ; load A register with value at address $1010
3C 20 80      JSR $2080 ; jump to subroutine located at address $2080
`

*Indexed X & Y Addressing* is similar to absolute addressing, except X or Y is added to the final address before being used. This is used for reading dynamically from an array of elements which has an origin at a constant memory address. Note that because X and Y are only 8-bits wide, you can only address 256 elements this way.

_Example:_
`
BA DF 00      STA $DF00,X ; store A register at address $DF00 + X
AA 10 00      BIT $1000,Y ; bit test memory at address $1000 + Y
E2 20 00      INC $2000,X ; increment the memory at address $2000 + Y
`

*Direct Page Addressing* is similar to absolute addressing, except only one byte is needed for the address. The upper 8-bits of the address are taken from the DP register. For example, if DP is \$31 and the argument provided is \$20, then the address used is \$3120. Direct page allows you to access memory much quicker than with other methods. Direct page is commonly used to store scratch variables.

_Example:_
`
B0 30 ..      LDA #$30    ; load $30 to A
24 .. ..      TAD         ; set DP to A
B4 41 ..      LDA @$41    ; load A with value at $3041
F4 02 ..      ROL @$02    ; rotate value at $3002 left
`

*Indirect Addressing* Treats an area of direct page as a pointer to be used to indirectly access memory. For example, if (@\$02) is used as the argument, and DP is \$90, the CPU will grab one byte from address \$9002 to be used as the address high byte, and \$9003 to be used as the address low byte.

_Example:_
`
B0 30 ..      LDA #$30    ; load $30 to A
24 .. ..      TAD         ; set DP to A
B0 20 ..      LDA #$20    ; set A to $20
B9 02 ..      STA @$02    ; store at direct page $02
B0 48 ..      LDA #$48    ; set A to $48
B9 03 ..      STA @$03    ; store at direct page $03
B5 02 ..      LDA (@$02)  ; load A with value at $2048 in memory
`

*Indirect X & Y Addressing* is the same as indirect addressing, except on the last step of the address lookup, X or Y is added to the address.

_Example:_
`
B7 08 ..      LDA (@$08),Y  ; load A with address from DP+8 and DP+9, add Y to it, and then load the value at that address into A
9E 02 ..      AND (@$02),X  ; bitwise AND A with value at address from DP+2 and DP+3, add X to it, and then AND the value at that address into A
`

*Absolute Indirect Addressing* is the same as indirect addressing, but uses a full 16-bit address instead of a direct page address. This addressing mode is only available on JMP and JSR instructions.


_Example:_
`
39 20 31      JMP ($2031) ; jump to address stored at $2031 and $2032
`

*Absolute Indirect X & Y Addressing* is similar to indirect X & Y addressing, except the address is 16-bit, and the X or Y registers are added to the address _before_ performing the indirect lookup.

_Example:_
`
3A 20 10      JMP ($2010,X) ; jump to address stored at $2031+X and $2032+X
`

*Relative Addressing* is unique to branch instructions. It takes a signed 1-byte offset relative to the instruction's position in memory, and uses it to define the address to jump to when the branch is taken. Note that the common assembler syntax is to specify the full 16 bit absolute address to jump to, and have the assembler compute the offset automatically.

_Example:_
`
; code starts at address $1000
34 83 ..      BPL $1083 ; branch to address $1083 if N=0, offset is $1083 - $1000 = $83
30 FE ..      BCC $1000 ; branch to address $1000 if C=0, offset is $1000 - $1002 = $FE
`

= Back Panel Operation

The back panel is essential for initial bootstrapping of the Exnil 80. It allows software to be entered by hand as the first stage of bootstrapping, as well as provide a simple debugging interface for early on in the bootstrap process before a software debugger is made. If you are already using pre-made software on your Exnil 80, then you will likely never need to use the back panel. However even the pre-made software can trace its roots to software that was initially entered using the back panel.

The *Address & Data Input* switches are used to set a 16 bit address to go to, or 8 bits of data to load into the current address.

The *Address / Program Counter* lights display the current address, or the CPU's program counter register if *ALT DISP* is on.

The *Data / Flags* lights display the contents of memory at the current address, or the CPU's flag register if *ALT DISP* is on.

The *BRK* light is active if the CPU encountered a BRK instruction bur the values of the BRK interrupt service routine were zero. This completely stalls the CPU and the CPU will not be resumed until *Run* is pressed.

The *HALT* switch, and corresponding light control whether the CPU has been manually halted by the back panel. when the halt switch is active, the CPU will not execute. The back panel is only active when either the HALT or BRK lights are on.

The *SET DATA* button will write the contents of the bottom 8 bits of the *Address & Data Input* switches to memory at the current address.

The *INC ADDR* button will increment the current address by 1.

The *DEC ADDR* button will decrement the current address by 1.

The *LOAD ADDR* button will load the contents of *Address & Data Input* to the current address.

The *ALT DISP* switch toggles the display of *Address / Program Counter* and *Data / Flags*.

The *STEP* button will execute a single instruction and then return the CPU to its halted state.

The *RUN* button will load the contents of *Address / Program Counter* into the program counter, and clear the *BRK* light, allowing the CPU to be resumed if *HALT* is not on.



= System IO

The system IO chip controls the RAM banking system, the flash port, and the keyboard port.

== RAM Banking
RAM Banking is controlled by the two registers at \$DF00 and \$DF01. The first one controls which page of ram to use for the 32KB memory range \$0000-\$7FFF. There are three pages to swap between in this region setting \$DF00 to the numbers 0-2 selects which page to use. The value 3 is special as it will map the lower half of memory (\$0000-\$7FFF) to mirror the upper half of memory (\$8000-\$FFFF). All other numbers are reserved for future use. 

The second register controls the page for the memory range \$E000-\$FFFF. When set to zero this area maps to the ROM, but when set to one it will map to an additional RAM segment. All other numbers are reserved for future use.

== Keyboard

The keyboard is read by reading the value of \$DF05 when data is available. Bit 7 of \$DF04 will be 1 whenever data is available to be ready. By default the keyboard automatically adjust character codes based on whether control, alt, or shift are pressed. The encoding of keycodes is based on ASCII in this mode. The control key shifts keys to allow entering the standard ASCII control codes. The alt key sets bit 7 of the key code allowing extended ASCII key codes to be typed.

Setting the 'real mode' bit flag on control register \$DF03 will send both key down and key up events for keys, and will not modify key values based on shift.  In 'real mode' the most significant bit is set to 1 for key up events, and 0 for key down events. This allows greater flexibility for handling keyboard input. The key codes of most characters are equivalent to their unshifted ASCII counterparts.

== Flash

The FLASH port allows easy reading and writing of an EEPROM inserted into the flash port on the back panel. When reading or writing, the port utilizes direct memory access to copy to and from memory and will stall the CPU until complete. Address \$DF06 controls the page of ram that will be read from and written to, address \$DF07 will trigger a read when a 0 is written to it, and a write when a 1 is written to it.

== Registers

`$DF00 = lower ram bank
$DF01 = upper ram bank
$DF02 = keyboard interrupt status register
  K _ _ _ _ _ _ _
  |
  +--------------- key press interrupt latch
$DF03 = keyboard control register
  K _ _ _ S C R R
  |       | | | |
  |       | | | +- enable 'real' mode
  |       | | +--- enable key repeating
  |       | +----- caps lock enabled
  |       +------- scroll lock key enabled
  +--------------- enable key press interrupts
$DF04 = keyboard data available (bit 7)
$DF05 = keyboard data
$DF06 = Flash transfer Trigger on write (bit0 = 0 is read, 1 = write)
$DF07 = Flash trasnfer Address high
`

= Floppy Disk Controller

Disks are written to and read from using the 16 bit sector address, and a 256 byte sector buffer. The sector buffer is stored in each drive as a shift register that can  be sequentially read from and written do using the shift register port. Once a read or write operation is initiated, the shift register should not be modified until the transfer complete flag is set.

*Floppy Disk Stats*

- 256 bytes/sector, 16 sector/track 128 track/side 2 side/disk
- 4096 sectors
- 1,048,576 bytes

The physical disk drive to use is selected using the disk device select register. This can be either 0 for disk A, or 1 for disk B. All other values are reserved for future use.

== Registers

`$DF10 = interrupt status register
  T S _ _ _ _ _ _
  | |
  | +------------- disk swap interrupt latch
  +--------------- disk transfer complete interrupt latch
$DF11 = control register
  T S _ _ _ _ _ _
  | |
  | +------------- enable disk swap interrupts
  +--------------- enable disk transfer complete interrupts
$DF12 = storage device select
$DF13 = storage sector high
$DF14 = storage sector low
$DF15 = storage initiate read opetation (on write to this address)
$DF16 = storage initiate write operation (on write to this address)
$DF17 = storage shift register overflow (bit 7)
$DF18 = storage transfer complete (bit 7)
$DF19 = storage shift register data in/out
$DF1A = storage shift register position
$DF1B = storage has disk inserted (bit 7)`

= User Port

The user port provides a serial interface that can be used to control various peripherals using a simple communication method of sending and receiving bytes.

== Registers

`$DF20 = interrupt status register
  I _ _ _ _ _ _ _
  |
  +--------------- Input byte ready interrupt latch
$DF21 = control register
  I _ _ _ _ _ _ _
  |
  +--------------- enable input byte ready interrupts
$DF22 = data port status
  W R _ _ _ _ _ _
  | |
  | +------------- data available to read?
  +--------------- ready to write data?
$DF23 = input/output data port
`

The user port occupies addresses \$DF20-\$DF2F. These addresses can be read from
and written to to control a device plugged into the user port.

= VDP

the VDP is responsible for displaying graphics to an external monitor. It starts out in text mode where it functions as a serial terminal, but can be placed in other modes more suitable for displaying graphics.

*Specifications*

- Visible Resolution: 320x200
- clock speed: 7.168320MHz (4x cpu clock, 2x color clock)
- dots per scanline: 456 (1 cycle per pixel)
- 80 dots of hblank
- 22 lines of vblank
- scanlines per frame: 262
- frames per second: 60

== General Operation

The VDP operates in distinct modes set by the register at \$DF52. The different modes all offer unique ways of displaying different types of graphics on the screen. Some modes are more suited for text, others for tile based games, and others for bitmap images.

In all modes except mode 0, the VDP uses a region of RAM to control what gets drawn to the screen. The VDP is only able to address 16KB of RAM at once. The bottom 2 bits of register \$DF53 selects which of the four 16KB regions of the overall 64KB address space to use. This region of memory will be referred to as vram and addresses within it will be given as vram + an offset.


== Mode 0 - Teletext Mode

In this mode the screen display is entirely controlled by the VDP without using any RAM. Using this mode consists of checking bit 7 of the serial ready register \$DF56, and when it is 1, writing data to the serial data register \$DF57. ASCII characters can be fed in to the VDP this way to write text to the screen one character at a time. This mode essentially emulates a teletype terminal and automatically controls scrolling. This is the default mode at start up and is the easiest to work with.

== Mode 1 - tiled text

In this mode, the screen display is made of an grid of 8x8 pixel tiles which each contain graphics for an ASCII character. The tilemap resides within VRAM plus an offset controlled by the tilemap offset in register \$DF53. Scrolling and sprite rendering are both active in this mode, although sprites can only use the ASCII character graphics. The tilemap in ram is organized as a 64 x 32 grid of tiles. This means there are tiles that are drawn offscreen to allow seamless scrolling.

== Mode 2 - tiled graphics

This mode is the same as mode 1, except the pixel graphics for tiles and sprites are able to be set by the user in vram.

== Mode 3 - 2bpp bitmap
This mode treats the entire screen as one large bitmap. The bitmap takes up the entire 16KB of vram and encodes each pixel using 2 bits, allowing 4 colors on screen. Scrolling and sprites are disabled as there is no room in vram for them.

== Mode 4 - 4bpp bitmap
This mode is the same as mode 3 except the number of bits per pixel is doubled, allowing 16 colors on screen, but pixels are now twice as wide.

== Interrupt Timing

The VDP is designed to output a video signal to a cathode ray tube monitor, and the way in which it times its output is closely tied to how the CRT display works. A CRT moves a beam from left to right on the display, changing the color and brightness as it moves horizontally. Once the beam reaches the right edge of the screen, it is in what is known as the horizontal blanking period. During this short time, nothing is being drawn to the screen to give the beam time to move all the way back to the left side of the screen and draw the next line.

Once the beam reaches the bottom of the display it is in the vertical blanking period. The vertical blanking period is much longer than the horizontal blanking period, and is usually when the CPU would change data in VRAM so as to not do so while it is in the process of being drawn.

The VDP is able to send an interrupt every time it enters vertical blanking period. This is essentially used as a 60fps update loop for the CPU.

Enabling the rasterline interrupt and setting the \$DF55 register to some number will cause the VDP to interrupt the CPU when it reaches horizontal blanking on that particular line. This allows the CPU to change VDP registers so that some lines are drawn differently than other. Note that the horizontal blanking time is very short and the CPU only has time to execute a handful of instructions before the beam is active again. Taking too long in the horizontal blanking time can cause the visual changes to not take effect until midway through the next line.

== Color Byte Format

Colors are set as an 8 bit value in either the background color register or the palette registers. The individual components of the color are split up as so:

`
 H H H H S L L L
 | | | | | | | |
 | | | | | +-+-+- Lightness
 | | | | +------- Saturation
 +-+-+-+--------- Hue
`

Lightness selects between 8 different levels of lightness for a specific hue and saturation.
Saturation selects between a medium or high saturated color.
Hue selects what color to use as a base. A hue value of zero is special and will use grayscale.
Hues are distributed such that red=1, yellow=3, green=5, cyan=8, blue=10, purple = 12, pink = 14/15, with blended hues between.

== Registers

`$DF50 = interrupt status register
  V R _ _ _ _ _ _
  | |
  | +------------- rasterline interrupt latch
  +--------------- vblank interrupt latch
$DF51 = interrupt mask register
  V R _ _ _ _ _ _
  | |
  | +------------- rasterline interrupt enable
  +--------------- vblank interrupt enable
$DF52 = flags
  _ _ _ _ B M M M
          | | | |
          | +-+-+- mode (0=serial, 1=tilemap text, 2=tilemap graphics, 3=2pp bitmap, 4=4pp bitmap)
          +------- disable cursor blink
$DF53 = offsets
  _ _ S S T T V V
      | | | | | |
      | | | | +-+- vram location
      | | +-+----- tilemap location in VRAM (0=vram+$0000, 1=vram+$1000, 2=vram+$2000, 3=vram+$3000)
	    +-+--------- sprite graphics bank
$DF54 = background color
$DF55 = rasterline interrupt target / current rasterline
$DF56 = mode 0 serial ready
$DF57 = mode 0 serial port
$DF58 = scroll X high
$DF59 = scroll X low
$DF5A = scroll Y
$DF5B = mode 0 cursor X
$DF5C = mode 0 cursor y
$DF60-$DF7F = palette data (32 bytes of colors, bottom 16 are for tiles, top 16 are for sprites)

$DF80-$DF9F = sprites 0-31 flags
	X Y P P X Y H X
	| | | | | | | |
	| | | | | | | +- sprite x high bit
	| | | | | | +--- sprite height
	| | | | | +----- stretch Y
	| | | | +------- stretch X
	| | +-+--------- palette
	| +------------- flip Y
 +--------------- flip X
$DFA0-$DFBF = sprites 0-31 X coordinates
$DFC0-$DFDF = sprites 0-31 Y coordinates
$DFE0-$DFFF = sprites 0-31 atlas IDs
vram+$0000 = tile/sprite atlas bank 0
vram+$2000 = tile/sprite atlas bank 1
vram+tilemap = tilemap, 64 * 32 array of:
  1 byte tile atlas index
  1 byte flags
    _ _ X Y P P B B
        | | | | | |
        | | | | | |
        | | | | +-+- tile graphics bank
        | | +-+----- palette
        | +--------- flip Y
        +----------- flip X`

= ADP

The ADP (Audio Data Processor) is a sound chip that supports three individual channels each with independently programmable waveform settings. The ADP also features a programmable filter which any of the channels can be routed into.

== Note Frequencies

Setting the high and low frequency registers for a given oscillator will set the frequency of the note it will play when active. The formula for calculating the register value needed for a note frequency is:

$ "Register Value" = "Frequency" * (16777216 /(1,792,080 "MHz")) $

Here is a table showing all of the register values needed to reproduce musical notes. Note that each octave is twice the frequency of the one before it. To save memory at the expense of accuracy, you can only store one octave in your program as a table and shift values left or right to get the desired octave.

#figure(
  caption: [ADP Frequency Values],
  table(
    columns: 9 * (1fr,),
    align: left,
    [Note],[Freq],[Hex],[Note],[Freq],[Hex],[Note],[Freq],[Hex],
    [C0],[16.35],[0099],[C3],[130.81],[04C8],[C6],[1046.5],[2645],
    [C\#0],[17.32],[00A2],[C\#3],[138.59],[0511],[C\#6],[1108.73],[288B],
    [D0],[18.35],[00AB],[D3],[146.83],[055E],[D6],[1174.66],[2AF5],
    [D\#0],[19.45],[00B6],[D\#3],[155.56],[05B0],[D\#6],[1244.51],[2D82],
    [E0],[20.6],[00C0],[E3],[164.81],[0606],[E6],[1318.51],[3037],
    [F0],[21.83],[00CC],[F3],[174.61],[0662],[F6],[1396.91],[3315],
    [F\#0],[23.12],[00D8],[F\#3],[185],[06C3],[F\#6],[1479.98],[361F],
    [G0],[24.5],[00E5],[G3],[196],[072A],[G6],[1567.98],[3957],
    [G\#0],[25.96],[00F3],[G\#3],[207.65],[0797],[G\#6],[1661.22],[3CC0],
    [A0],[27.5],[0101],[A3],[220],[080B],[A6],[1760],[405C],
    [A\#0],[29.14],[0110],[A\#3],[233.08],[0886],[A\#6],[1864.66],[4430],
    [B0],[30.87],[0121],[B3],[246.94],[0907],[B6],[1975.53],[483E],
    [C1],[32.7],[0132],[C4],[261.63],[0991],[C7],[2093],[4C8A],
    [C\#1],[34.65],[0144],[C\#4],[277.18],[0A22],[C\#7],[2217.46],[5117],
    [D1],[36.71],[0157],[D4],[293.66],[0ABD],[D7],[2349.32],[55EA],
    [D\#1],[38.89],[016C],[D\#4],[311.13],[0B60],[D\#7],[2489.02],[5B05],
    [E1],[41.2],[0181],[E4],[329.63],[0C0D],[E7],[2637.02],[606F],
    [F1],[43.65],[0198],[F4],[349.23],[0CC5],[F7],[2793.83],[662B],
    [F\#1],[46.25],[01B0],[F\#4],[369.99],[0D87],[F\#7],[2959.96],[6C3E],
    [G1],[49],[01CA],[G4],[392],[0E55],[G7],[3135.96],[72AE],
    [G\#1],[51.91],[01E5],[G\#4],[415.3],[0F2F],[G\#7],[3322.44],[7980],
    [A1],[55],[0202],[A4],[440],[1017],[A7],[3520],[80B9],
    [A\#1],[58.27],[0221],[A\#4],[466.16],[110C],[A\#7],[3729.31],[8861],
    [B1],[61.74],[0242],[B4],[493.88],[120F],[B7],[3951.07],[907D],
    [C2],[65.41],[0264],[C5],[523.25],[1322],[C8],[4186.01],[9914],
    [C\#2],[69.3],[0288],[C\#5],[554.37],[1445],[C\#8],[4434.92],[A22F],
    [D2],[73.42],[02AF],[D5],[587.33],[157A],[D8],[4698.63],[ABD3],
    [D\#2],[77.78],[02D8],[D\#5],[622.25],[16C1],[D\#8],[4978.03],[B60B],
    [E2],[82.41],[0303],[E5],[659.25],[181B],[E8],[5274.04],[C0DE],
    [F2],[87.31],[0331],[F5],[698.46],[198A],[F8],[5587.65],[CC56],
    [F\#2],[92.5],[0361],[F\#5],[739.99],[1B0F],[F\#8],[5919.91],[D87D],
    [G2],[98],[0395],[G5],[783.99],[1CAB],[G8],[6271.93],[E55C],
    [G\#2],[103.83],[03CC],[G\#5],[830.61],[1E60],[G\#8],[6644.88],[F300],
    [A2],[110],[0405],[A5],[880],[202E],[A8],[7040],[N/A],
    [A\#2],[116.54],[0443],[A\#5],[932.33],[2218],[A\#8],[7458.62],[N/A],
    [B2],[123.47],[0483],[B5],[987.77],[241F],[B8],[7902.13],[N/A],
    )
)

== Registers
`$DF30 = filter flags
  R R R R _ B H L
  | | | |   | | +- low pass
  | | | |   | +--- high pass
  | | | |   +----- band pass
  +-+-+-+--------- resonance
$DF31-$DF33 = OSC 1-3 control registers
  W S T N R F E G
  | | | | | | | +- gate
  | | | | | | +--- channel enable
  | | | | | +----- filter
  | | | | +------- reset
  | | | +--------- noise enable
  | | +----------- triangle wave enable
  | +------------- square wave enable
  +--------------- saw wave enable
$DF34 = OSC 3 envelope readback
$DF35-$DF37 = OSC 1-3 volumes (bottom 4 bits)
$DF38 = filter cutoff high
$DF39-$DF3B = OSC 1-3 frequencies high
$DF3C = filter cutoff low
$DF3D-$DF3F = OSC 1-3 frequencies low
$DF40 = OSC 3 waveform readback
$DF41-$DF43 = OSC 1-3 Pulse Widths
$DF44 = reserved
$DF45-$DF47 = OSC 1-3 attacks/decays (top 4 & bottom 4 bits)
$DF48 = reserved
$DF49-$DF4B = OSC 1-3 sustains/releases (top 4 & bottom 4 bits)
$DF4C-$DF4F = reserved`

= Appendix

== Detailed List of Opcodes

#let opcode_details(name: "", description: "", function: "", flags: "", ..contents) = {
  block(breakable: false)[
  #table(
    stroke: none,
    columns: (1.4fr, 1.7fr, 1fr, 1fr, 1.2fr),
    text(size: 16pt, name), table.cell(colspan: 3, [#description#linebreak()#text(style: "italic", function)]), [`N V I S H Z C`#linebreak()#raw(flags)],
    [Addressing], [Assembler], [Opcode], [Bytes], [Cycles],
    table.hline(),
    ..contents
  )
  ]
  linebreak()
}

=== Single Opcodes

#opcode_details(
  name: "BRK",
  description: "Trigger BRK interrupt",
  function: "push F; push PC; PC = $FFFC&$FFFD; clear S flag;",
  flags: "- - - 0 - - -",
  [none], [`BRK`], [\$00], [1], [6]
)
#opcode_details(
  name: "NOP",
  description: "No OPeration",
  function: "",
  flags: "- - - - - - -",
  [none], [`NOP`], [\$01], [1], [2]
)
#opcode_details(
  name: "RTS",
  description: "ReTurn from Subroutine",
  function: "pull PC",
  flags: "- - - - - - -",
  [none], [`RTS`], [\$02], [1], [3]
)
#opcode_details(
  name: "RTI",
  description: "ReTurn from Interrupt",
  function: "pull F; pull PC",
  flags: "+ + + + + + +",
  [none], [`RTI`], [\$03], [1], [4]
)
#opcode_details(
  name: "DAA",
  description: "Decimal Adjust after Addition",
  function: "BCD correct A after ADD",
  flags: "+ + - - + + +",
  [none], [`DAA`], [\$08], [1], [2]
)
#opcode_details(
  name: "DAS",
  description: "Decimal Adjust after Subtraction",
  function: "BCD correct A after SUB",
  flags: "+ + - - + + +",
  [none], [`DAS`], [\$09], [1], [2]
)
#opcode_details(
  name: "SLA",
  description: "Shift Left Accumulator",
  function: "C = A[7]; A = A << 1",
  flags: "+ - - - - + +",
  [none], [`SLA`], [\$0C], [1], [2]
)
#opcode_details(
  name: "SRA",
  description: "Shift Right Accumulator",
  function: "C = A[0]; A = A >> 1",
  flags: "+ - - - - + +",
  [none], [`SRA`], [\$0D], [1], [2]
)
#opcode_details(
  name: "RLA",
  description: "Rotate Left Accumulator",
  function: "A = (A << 1); A[0] = C; C = A[8]",
  flags: "+ - - - - + +",
  [none], [`RLA`], [\$0E], [1], [2]
)
#opcode_details(
  name: "RRA",
  description: "Rotate Right Accumulator",
  function: "A = (A >> 1); A[7] = C; C = A[-1]",
  flags: "+ - - - - + +",
  [none], [`RRA`], [\$0F], [1], [2]
)
#opcode_details(
  name: "CLC",
  description: "CLear Carry",
  function: "C = 0",
  flags: "- - - - - - 0",
  [none], [`CLC`], [\$10], [1], [2]
)
#opcode_details(
  name: "SEC",
  description: "SEt Carry",
  function: "C = 1",
  flags: "- - - - - - 1",
  [none], [`SEC`], [\$11], [1], [2]
)
#opcode_details(
  name: "CLI",
  description: "CLear Interrupt enable",
  function: "I = 0",
  flags: "- - 0 - - - -",
  [none], [`CLI`], [\$12], [1], [2]
)
#opcode_details(
  name: "SEI",
  description: "SEt Interrupt enable",
  function: "I = 1",
  flags: "- - 1 - - - -",
  [none], [`SEI`], [\$13], [1], [2]
)
#opcode_details(
  name: "CLV",
  description: "CLear oVerflow",
  function: "V = 0",
  flags: "- 0 - - - - -",
  [none], [`CLV`], [\$14], [1], [2]
)
#opcode_details(
  name: "SEV",
  description: "SEt oVerflow",
  function: "V = 1",
  flags: "- 1 - - - - -",
  [none], [`SEV`], [\$15], [1], [2]
)
#opcode_details(
  name: "INA",
  description: "INcrement Accumulator",
  function: "A += 1",
  flags: "+ + - - + + +",
  [none], [`INA`], [\$18], [1], [2]
)
#opcode_details(
  name: "DEA",
  description: "DEcrement Accumulator",
  function: "A -= 1",
  flags: "+ + - - + + +",
  [none], [`DEA`], [\$19], [1], [2]
)
#opcode_details(
  name: "INX",
  description: "INcrement X",
  function: "X -= 1",
  flags: "+ + - - + + +",
  [none], [`INX`], [\$1A], [1], [2]
)
#opcode_details(
  name: "DEX",
  description: "DEcrement X",
  function: "X -= 1",
  flags: "+ + - - + + +",
  [none], [`DEX`], [\$1B], [1], [2]
)
#opcode_details(
  name: "INY",
  description: "INcrement Y",
  function: "Y -= 1",
  flags: "+ + - - + + +",
  [none], [`INY`], [\$1C], [1], [2]
)
#opcode_details(
  name: "DEY",
  description: "DEcrement Y",
  function: "Y -= 1",
  flags: "+ + - - + + +",
  [none], [`DEY`], [\$1D], [1], [2]
)
#opcode_details(
    name: "TAX",
    flags: "+ - - - - + -",
    description: "Transfer Accumulator to X",
    function: "X = A",
    [none], [`TAX`], [\$20], [1], [2]
)
#opcode_details(
    name: "TXA",
    flags: "+ - - - - + -",
    description: "Transfer X to Accumulator",
    function: "A = X",
    [none], [`TXA`], [\$21], [1], [2]
)
#opcode_details(
    name: "TAY",
    flags: "+ - - - - + -",
    description: "Transfer Accumulator to Y",
    function: "Y = A",
    [none], [`TAY`], [\$22], [1], [2]
)
#opcode_details(
    name: "TYA",
    flags: "+ - - - - + -",
    description: "Transfer Y to Accumulator",
    function: "A = Y",
    [none], [`TYA`], [\$23], [1], [2]
)
#opcode_details(
    name: "TAD",
    flags: "+ - - - - + -",
    description: "Transfer Accumulator to D",
    function: "D = A",
    [none], [`TAD`], [\$24], [1], [2]
)
#opcode_details(
    name: "TDA",
    flags: "+ - - - - + -",
    description: "Transfer D to Accumulator",
    function: "A = D",
    [none], [`TDA`], [\$25], [1], [2]
)
#opcode_details(
    name: "TAS",
    flags: "+ - - - - + -",
    description: "Transfer Accumulator to S",
    function: "S = A",
    [none], [`TAS`], [\$26], [1], [2]
)
#opcode_details(
    name: "TSA",
    flags: "+ - - - - + -",
    description: "Transfer S to Accumulator",
    function: "A = S",
    [none], [`TSA`], [\$27], [1], [2]
)
#opcode_details(
    name: "PHA",
    flags: "+ - - - - + -",
    description: "PusH Accumulator",
    function: "push A",
    [none], [`PHA`], [\$28], [1], [2]
)
#opcode_details(
    name: "PLA",
    flags: "+ - - - - + -",
    description: "PulL Accumulator",
    function: "pull A",
    [none], [`PLA`], [\$29], [1], [2]
)
#opcode_details(
    name: "PHX",
    flags: "+ - - - - + -",
    description: "PusH X",
    function: "push X",
    [none], [`PHX`], [\$2A], [1], [2]
)
#opcode_details(
    name: "PLX",
    flags: "+ - - - - + -",
    description: "PulL X",
    function: "pull X",
    [none], [`PLX`], [\$2B], [1], [2]
)
#opcode_details(
    name: "PHY",
    flags: "+ - - - - + -",
    description: "PusH Y",
    function: "push Y",
    [none], [`PHY`], [\$2C], [1], [2]
)
#opcode_details(
    name: "PLY",
    flags: "+ - - - - + -",
    description: "PulL Y",
    function: "pull Y",
    [none], [`PLY`], [\$2D], [1], [2]
)
#opcode_details(
    name: "PHF",
    flags: "+ - - - - + -",
    description: "PusH Flags",
    function: "push F",
    [none], [`PHF`], [\$2E], [1], [2]
)
#opcode_details(
    name: "PLF",
    flags: "+ - - - - + -",
    description: "PulL Flags",
    function: "pull F",
    [none], [`PLF`], [\$2F], [1], [2]
)

=== Branch Opcodes

#opcode_details(
    name: "BCC",
    flags: "- - - - - - -",
    description: "Branch on Carry Clear",
    function: "PC += <arg> if C == 0",
    [Relative], [`BCC $0000`], [\$30], [2],	[2-3]
)
#opcode_details(
    name: "BCS",
    flags: "- - - - - - -",
    description: "Branch on Carry Set",
    function: "PC += <arg> if C == 1",
    [Relative], [`BCS $0000`], [\$31], [2],	[2-3]
)
#opcode_details(
    name: "BNE",
    flags: "- - - - - - -",
    description: "Branch on Not Equal",
    function: "PC += <arg> if Z == 0",
    [Relative], [`BNE $0000`], [\$32], [2],	[2-3]
)
#opcode_details(
    name: "BEQ",
    flags: "- - - - - - -",
    description: "Branch on EQual",
    function: "PC += <arg> if Z == 1",
    [Relative], [`BEQ $0000`], [\$33], [2],	[2-3]
)
#opcode_details(
    name: "BPL",
    flags: "- - - - - - -",
    description: "Branch on PLus",
    function: "PC += <arg> if N == 0",
    [Relative], [`BPL $0000`], [\$34], [2],	[2-3]
)
#opcode_details(
    name: "BMI",
    flags: "- - - - - - -",
    description: "Branch on MInus",
    function: "PC += <arg> if N == 1",
    [Relative], [`BMI $0000`], [\$35], [2],	[2-3]
)
#opcode_details(
    name: "BVC",
    flags: "- - - - - - -",
    description: "Branch on oVerflow Clear",
    function: "PC += <arg> if V == 0",
    [Relative], [`BVC $0000`], [\$36], [2],	[2-3]
)
#opcode_details(
    name: "BVS",
    flags: "- - - - - - -",
    description: "Branch on MInus",
    function: "PC += <arg> if V == 1",
    [Relative], [`BVS $0000`], [\$37], [2],	[2-3]
)

=== Jump Opcodes

#opcode_details(
    name: "JMP",
    flags: "- - - - - - -",
    description: "JuMP",
    function: "PC = <arg>",
    [Absolute], [`JMP $0000`], [\$38], [3], [3],
    [Indirect], [`JMP ($0000)`], [\$39], [3], [5],
    [Absolute Indirect X], [`JMP ($0000,X)`], [\$3A], [3], [5],
    [Absolute Indirect Y], [`JMP ($0000,Y)`], [\$3B], [3], [5],
)
#opcode_details(
    name: "JSR",
    flags: "- - - - - - -",
    description: "Jump to SubRoutine",
    function: "PC = <arg>",
    [Absolute], [`JSR $0000`], [\$3C], [3], [5],
    [Absolute Indirect], [`JSR ($0000)`], [\$3D], [3], [7],
    [Absolute Indirect X], [`JSR ($0000,X)`], [\$3E], [3], [7],
    [Absolute Indirect Y], [`JSR ($0000,Y)`], [\$3F], [3], [7],
)

=== Main Opcodes

#opcode_details(
    name: "LDX",
    flags: "+ - - - - + -",
    description: "LoaD X from memory",
    function: "X = <memory value>",
    [Immediate], [`LDX #$00`], [\$40], [2], [2],
    [Absolute], [`LDX $0000`], [\$41], [3], [4],
    [Absolute X], [`LDX $0000,X`], [\$42], [3], [4],
    [Absolute Y], [`LDX $0000,Y`], [\$43], [3],	[4],
    [Direct Page], [`LDX @$00`], [\$44], [2], [3],
    [Indirect], [`LDX (@$00)`], [\$45], [2], [5],
    [Indirect X], [`LDX (@$00),X`], [\$46], [2], [5],
    [Indirect Y], [`LDX (@$00),Y`], [\$47], [2], [5]
)
#opcode_details(
    name: "LDY",
    flags: "+ - - - - + -",
    description: "LoaD Y from memory",
    function: "Y = <memory value>",
    [Immediate], [`LDY #$00`], [\$48], [2], [2],
    [Absolute], [`LDY $0000`], [\$49], [3], [4],
    [Absolute X], [`LDY $0000,X`], [\$4A], [3], [4],
    [Absolute Y], [`LDY $0000,Y`], [\$4B], [3],	[4],
    [Direct Page], [`LDY @$00`], [\$4C], [2], [3],
    [Indirect], [`LDY (@$00)`], [\$4D], [2], [5],
    [Indirect X], [`LDY (@$00),X`], [\$4E], [2], [5],
    [Indirect Y], [`LDY (@$00),Y`], [\$4F], [2], [5]
)
#opcode_details(
    name: "CPX",
    flags: "+ + - - + + +",
    description: "ComPare X with memory",
    function: "X - <memory value>",
    [Immediate], [`CPX #$00`], [\$50], [2], [2],
    [Absolute], [`CPX $0000`], [\$51], [3], [4],
    [Absolute X], [`CPX $0000,X`], [\$52], [3], [4],
    [Absolute Y], [`CPX $0000,Y`], [\$53], [3],	[4],
    [Direct Page], [`CPX @$00`], [\$54], [2], [3],
    [Indirect], [`CPX (@$00)`], [\$55], [2], [5],
    [Indirect X], [`CPX (@$00),X`], [\$56], [2], [5],
    [Indirect Y], [`CPX (@$00),Y`], [\$57], [2], [5]
)
#opcode_details(
    name: "CPY",
    flags: "+ + - - + + +",
    description: "ComPare Y with memory",
    function: "Y - <memory value>",
    [Immediate], [`CPY #$00`], [\$58], [2], [2],
    [Absolute], [`CPY $0000`], [\$59], [3], [4],
    [Absolute X], [`CPY $0000,X`], [\$5A], [3], [4],
    [Absolute Y], [`CPY $0000,Y`], [\$5B], [3],	[4],
    [Direct Page], [`CPY @$00`], [\$5C], [2], [3],
    [Indirect], [`CPY (@$00)`], [\$5D], [2], [5],
    [Indirect X], [`CPY (@$00),X`], [\$5E], [2], [5],
    [Indirect Y], [`CPY (@$00),Y`], [\$5F], [2], [5]
)
#opcode_details(
    name: "CMP",
    flags: "+ + - - + + +",
    description: "CoMPare a with memory",
    function: "A - <memory value>",
    [Immediate], [`CMP #$00`], [\$60], [2], [2],
    [Absolute], [`CMP $0000`], [\$61], [3], [4],
    [Absolute X], [`CMP $0000,X`], [\$62], [3], [4],
    [Absolute Y], [`CMP $0000,Y`], [\$63], [3],	[4],
    [Direct Page], [`CMP @$00`], [\$64], [2], [3],
    [Indirect], [`CMP (@$00)`], [\$65], [2], [5],
    [Indirect X], [`CMP (@$00),X`], [\$66], [2], [5],
    [Indirect Y], [`CMP (@$00),Y`], [\$67], [2], [5]
)
#opcode_details(
    name: "CPC",
    flags: "+ + - - + + +",
    description: "ComPare a with memory with Carry",
    function: "A - <memory value> - carry",
    [Immediate], [`CPC #$00`], [\$68], [2], [2],
    [Absolute], [`CPC $0000`], [\$6A], [3], [4],
    [Absolute X], [`CPC $0000,X`], [\$6B], [3], [4],
    [Absolute Y], [`CPC $0000,Y`], [\$6C], [3],	[4],
    [Direct Page], [`CPC @$00`], [\$69], [2], [3],
    [Indirect], [`CPC (@$00)`], [\$6E], [2], [5],
    [Indirect X], [`CPC (@$00),X`], [\$6F], [2], [5],
    [Indirect Y], [`CPC (@$00),Y`], [\$6F], [2], [5]
)
#opcode_details(
    name: "ADD",
    flags: "+ + - - + + +",
    description: "ADD a to memory	",
    function: "A += <memory value>",
    [Immediate], [`ADD #$00`], [\$70], [2], [2],
    [Absolute], [`ADD $0000`], [\$71], [3], [4],
    [Absolute X], [`ADD $0000,X`], [\$72], [3], [4],
    [Absolute Y], [`ADD $0000,Y`], [\$73], [3],	[4],
    [Direct Page], [`ADD @$00`], [\$74], [2], [3],
    [Indirect], [`ADD (@$00)`], [\$75], [2], [5],
    [Indirect X], [`ADD (@$00),X`], [\$76], [2], [5],
    [Indirect Y], [`ADD (@$00),Y`], [\$77], [2], [5]
)
#opcode_details(
    name: "ADC",
    flags: "+ + - - + + +",
    description: "ADd a to memory with Carry		",
    function: "A += <memory value> + carry",
    [Immediate], [`ADC #$00`], [\$78], [2], [2],
    [Absolute], [`ADC $0000`], [\$79], [3], [4],
    [Absolute X], [`ADC $0000,X`], [\$7A], [3], [4],
    [Absolute Y], [`ADC $0000,Y`], [\$7B], [3],	[4],
    [Direct Page], [`ADC @$00`], [\$7C], [2], [3],
    [Indirect], [`ADC (@$00)`], [\$7D], [2], [5],
    [Indirect X], [`ADC (@$00),X`], [\$7E], [2], [5],
    [Indirect Y], [`ADC (@$00),Y`], [\$7F], [2], [5]
)
#opcode_details(
    name: "SUB",
    flags: "+ + - - + + +",
    description: "SUBtract a from memory",
    function: "A -= <memory value>",
    [Immediate], [`ADD #$00`], [\$80], [2], [2],
    [Absolute], [`ADD $0000`], [\$81], [3], [4],
    [Absolute X], [`ADD $0000,X`], [\$82], [3], [4],
    [Absolute Y], [`ADD $0000,Y`], [\$83], [3],	[4],
    [Direct Page], [`ADD @$00`], [\$84], [2], [3],
    [Indirect], [`ADD (@$00)`], [\$85], [2], [5],
    [Indirect X], [`ADD (@$00),X`], [\$86], [2], [5],
    [Indirect Y], [`ADD (@$00),Y`], [\$87], [2], [5]
)
#opcode_details(
    name: "SBC",
    flags: "+ + - - + + +",
    description: "SuBtract memory from a with Carry",
    function: "A -= <memory value> - carry",
    [Immediate], [`SBC #$00`], [\$88], [2], [2],
    [Absolute], [`SBC $0000`], [\$89], [3], [4],
    [Absolute X], [`SBC $0000,X`], [\$8A], [3], [4],
    [Absolute Y], [`SBC $0000,Y`], [\$8B], [3],	[4],
    [Direct Page], [`SBC @$00`], [\$8C], [2], [3],
    [Indirect], [`SBC (@$00)`], [\$8D], [2], [5],
    [Indirect X], [`SBC (@$00),X`], [\$8E], [2], [5],
    [Indirect Y], [`SBC (@$00),Y`], [\$8F], [2], [5]
)
#opcode_details(
    name: "ORA",
    flags: "+ - - - - + -",
    description: "OR A with memory",
    function: "A |= <memory value>",
    [Immediate], [`ORA #$00`], [\$90], [2], [2],
    [Absolute], [`ORA $0000`], [\$91], [3], [4],
    [Absolute X], [`ORA $0000,X`], [\$92], [3], [4],
    [Absolute Y], [`ORA $0000,Y`], [\$93], [3],	[4],
    [Direct Page], [`ORA @$00`], [\$94], [2], [3],
    [Indirect], [`ORA (@$00)`], [\$95], [2], [5],
    [Indirect X], [`ORA (@$00),X`], [\$96], [2], [5],
    [Indirect Y], [`ORA (@$00),Y`], [\$97], [2], [5]
)
#opcode_details(
    name: "AND",
    flags: "+ - - - - + -",
    description: "AND a with memory",
    function: "A &= <memory value>",
    [Immediate], [`AND #$00`], [\$98], [2], [2],
    [Absolute], [`AND $0000`], [\$99], [3], [4],
    [Absolute X], [`AND $0000,X`], [\$9A], [3], [4],
    [Absolute Y], [`AND $0000,Y`], [\$9B], [3],	[4],
    [Direct Page], [`AND @$00`], [\$9C], [2], [3],
    [Indirect], [`AND (@$00)`], [\$9D], [2], [5],
    [Indirect X], [`AND (@$00),X`], [\$9E], [2], [5],
    [Indirect Y], [`AND (@$00),Y`], [\$9F], [2], [5]
)
#opcode_details(
    name: "XOR",
    flags: "+ - - - - + -",
    description: "eXclusive OR A with memory		",
    function: "A ^= <memory value>",
    [Immediate], [`XOR #$00`], [\$A0], [2], [2],
    [Absolute], [`XOR $0000`], [\$A1], [3], [4],
    [Absolute X], [`XOR $0000,X`], [\$A2], [3], [4],
    [Absolute Y], [`XOR $0000,Y`], [\$A3], [3],	[4],
    [Direct Page], [`XOR @$00`], [\$A4], [2], [3],
    [Indirect], [`XOR (@$00)`], [\$A5], [2], [5],
    [Indirect X], [`XOR (@$00),X`], [\$A6], [2], [5],
    [Indirect Y], [`XOR (@$00),Y`], [\$A7], [2], [5]
)
#opcode_details(
    name: "BIT",
    flags: "+ + - - + + +",
    description: "BIT test memory	",
    function: "Z=A & <memory value>; N=bit7; V=bit6; C=bit0",
    [Immediate], [`BIT #$00`], [\$A8], [2], [2],
    [Absolute], [`BIT $0000`], [\$A9], [3], [4],
    [Absolute X], [`BIT $0000,X`], [\$AA], [3], [4],
    [Absolute Y], [`BIT $0000,Y`], [\$AB], [3],	[4],
    [Direct Page], [`BIT @$00`], [\$AC], [2], [3],
    [Indirect], [`BIT (@$00)`], [\$AD], [2], [5],
    [Indirect X], [`BIT (@$00),X`], [\$AE], [2], [5],
    [Indirect Y], [`BIT (@$00),Y`], [\$AF], [2], [5]
)
#opcode_details(
    name: "LDA",
    flags: "+ - - - - + -",
    description: "LoaD A from memory",
    function: "A = <memory value>",
    [Immediate], [`LDA #$00`], [\$B0], [2], [2],
    [Absolute], [`LDA $0000`], [\$B1], [3], [4],
    [Absolute X], [`LDA $0000,X`], [\$B2], [3], [4],
    [Absolute Y], [`LDA $0000,Y`], [\$B3], [3],	[4],
    [Direct Page], [`LDA @$00`], [\$B4], [2], [3],
    [Indirect], [`LDA (@$00)`], [\$B5], [2], [5],
    [Indirect X], [`LDA (@$00),X`], [\$B6], [2], [5],
    [Indirect Y], [`LDA (@$00),Y`], [\$B7], [2], [5]
)
#opcode_details(
    name: "STA",
    flags: "- - - - - - -",
    description: "STore A to memory",
    function: "<memory value> = A",
    [Absolute], [`STA $0000`], [\$B9], [3], [4],
    [Absolute X], [`STA $0000,X`], [\$BA], [3], [4],
    [Absolute Y], [`STA $0000,Y`], [\$BB], [3], [4],
    [Direct Page], [`STA @$00`], [\$BC], [2], [3],
    [Indirect], [`STA (@$00)`], [\$BD], [2], [5],
    [Indirect X], [`STA (@$00),X`], [\$BE], [2], [5],
    [Indirect Y], [`STA (@$00),Y`], [\$BF], [2], [5]
)

#opcode_details(
    name: "STX",
    flags: "- - - - - - -",
    description: "Store X to memory",
    function: "<memory value> = X",
    [Absolute], [`STX $0000`], [\$C1], [3], [4],
    [Absolute X], [`STX $0000,X`], [\$C2], [3], [4],
    [Absolute Y], [`STX $0000,Y`], [\$C3], [3], [4],
    [Direct Page], [`STX @$00`], [\$C4], [2], [3],
    [Indirect], [`STX (@$00)`], [\$C5], [2], [5],
    [Indirect X], [`STX (@$00),X`], [\$C6], [2], [5],
    [Indirect Y], [`STX (@$00),Y`], [\$C7], [2], [5]
)

#opcode_details(
    name: "STY",
    flags: "- - - - - - -",
    description: "STore Y to memory",
    function: "<memory value> = Y",
    [Absolute], [`STY $0000`], [\$C9], [3], [4],
    [Absolute X], [`STY $0000,X`], [\$CA], [3], [4],
    [Absolute Y], [`STY $0000,Y`], [\$CB], [3], [4],
    [Direct Page], [`STY @$00`], [\$CC], [2], [3],
    [Indirect], [`STY (@$00)`], [\$CD], [2], [5],
    [Indirect X], [`STY (@$00),X`], [\$CE], [2], [5],
    [Indirect Y], [`STY (@$00),Y`], [\$CF], [2], [5]
)

#opcode_details(
    name: "ACM",
    flags: "+ + - - + + +",
    description: "Add Carry to Memory",
    function: "<memory value> += carry",
    [Absolute], [`ACM $0000`], [\$D1], [3], [5],
    [Absolute X], [`ACM $0000,X`], [\$D2], [3], [5],
    [Absolute Y], [`ACM $0000,Y`], [\$D3], [3], [5],
    [Direct Page], [`ACM @$00`], [\$D4], [2], [4],
    [Indirect], [`ACM (@$00)`], [\$D5], [2], [6],
    [Indirect X], [`ACM (@$00),X`], [\$D6], [2], [6],
    [Indirect Y], [`ACM (@$00),Y`], [\$D7], [2], [6]
)

#opcode_details(
    name: "SCM",
    flags: "+ + - - + + +",
    description: "Subtract Carry from Memory",
    function: "<memory value> -= carry",
    [Absolute], [`SCM $0000`], [\$D9], [3], [5],
    [Absolute X], [`SCM $0000,X`], [\$DA], [3], [5],
    [Absolute Y], [`SCM $0000,Y`], [\$DB], [3], [5],
    [Direct Page], [`SCM @$00`], [\$DC], [2], [4],
    [Indirect], [`SCM (@$00)`], [\$DD], [2], [6],
    [Indirect X], [`SCM (@$00),X`], [\$DE], [2], [6],
    [Indirect Y], [`SCM (@$00),Y`], [\$DF], [2], [6]
)
#opcode_details(
    name: "INC",
    flags: "+ + - - + + +",
    description: "INCrement memory",
    function: "<memory value> += 1	",
    [Absolute], [`ACM $0000`], [\$E1], [3], [5],
    [Absolute X], [`ACM $0000,X`], [\$E2], [3], [5],
    [Absolute Y], [`ACM $0000,Y`], [\$E3], [3], [5],
    [Direct Page], [`ACM @$00`], [\$E4], [2], [4],
    [Indirect], [`ACM (@$00)`], [\$E5], [2], [6],
    [Indirect X], [`ACM (@$00),X`], [\$E6], [2], [6],
    [Indirect Y], [`ACM (@$00),Y`], [\$E7], [2], [6]
)

#opcode_details(
    name: "DEC",
    flags: "+ + - - + + +",
    description: "DECrement memory",
    function: "<memory value> -= 1	",
    [Absolute], [`SCM $0000`], [\$E9], [3], [5],
    [Absolute X], [`SCM $0000,X`], [\$EA], [3], [5],
    [Absolute Y], [`SCM $0000,Y`], [\$EB], [3], [5],
    [Direct Page], [`SCM @$00`], [\$EC], [2], [4],
    [Indirect], [`SCM (@$00)`], [\$ED], [2], [6],
    [Indirect X], [`SCM (@$00),X`], [\$EE], [2], [6],
    [Indirect Y], [`SCM (@$00),Y`], [\$EF], [2], [6]
)

#opcode_details(
    name: "ROL",
    flags: "+ - - - - + +",
    description: "ROtate a Left	",
    function: "C << <memory> << C",
    [Absolute], [`ROL $0000`], [\$F1], [3], [5],
    [Absolute X], [`ROL $0000,X`], [\$F2], [3], [5],
    [Absolute Y], [`ROL $0000,Y`], [\$F3], [3], [5],
    [Direct Page], [`ROL @$00`], [\$F4], [2], [4],
    [Indirect], [`ROL (@$00)`], [\$F5], [2], [6],
    [Indirect X], [`ROL (@$00),X`], [\$F6], [2], [6],
    [Indirect Y], [`ROL (@$00),Y`], [\$F7], [2], [6]
)

#opcode_details(
    name: "ROR",
    flags: "+ - - - - + +",
    description: "ROtate a Right	",
    function: "C >> <memory value> >> C",
    [Absolute], [`ROR $0000`], [\$F9], [3], [5],
    [Absolute X], [`ROR $0000,X`], [\$FA], [3], [5],
    [Absolute Y], [`ROR $0000,Y`], [\$FB], [3], [5],
    [Direct Page], [`ROR @$00`], [\$FC], [2], [4],
    [Indirect], [`ROR (@$00)`], [\$FD], [2], [6],
    [Indirect X], [`ROR (@$00),X`], [\$FE], [2], [6],
    [Indirect Y], [`ROR (@$00),Y`], [\$FF], [2], [6]
)

== Quick Reference Tables


#opcode_table
#addressing_shorthand

#figure(
  caption: [ASCII Table],
  table(
    columns: 17 * (1fr,),
    align: center,
    [   ], [ -0], [ -1], [ -2], [ -3], [ -4], [ -5], [ -6], [ -7], [ -8], [ -9], [ -A], [ -B], [ -C], [ -D], [ -E], [ -F], 
    [ 0-], [NUL], [   ], [   ], [   ], [   ], [   ], [   ], [   ], [BS ], [HT ], [LF ], [VT ], [FF ], [CR ], [   ], [   ],
    [ 1-], [   ], [SHIF], [CTRL], [ALT], [CAP], [SCLK], [   ], [   ], [BRK], [   ], [   ], [ESC], [LEFT], [DOW], [UP ], [RIGH],
    [ 2-], [SP ], [ ! ], [ " ], [ \#], [ \$], [ % ], [ & ], [ ' ], [ ( ], [ ) ], [ \*], [ \+], [ , ], [ \-], [ . ], [ \/],
    [ 3-], [ 0 ], [ 1 ], [ 2 ], [ 3 ], [ 4 ], [ 5 ], [ 6 ], [ 7 ], [ 8 ], [ 9 ], [ : ], [ ; ], [ < ], [ \=], [ > ], [ ? ],
    [ 4-], [ @ ], [ A ], [ B ], [ C ], [ D ], [ E ], [ F ], [ G ], [ H ], [ I ], [ J ], [ K ], [ L ], [ M ], [ N ], [ O ],
    [ 5-], [ P ], [ Q ], [ R ], [ S ], [ T ], [ U ], [ V ], [ W ], [ X ], [ Y ], [ Z ], [ \[], [ \\], [ \]], [ ^ ], [ \_],
    [ 6-], [ \`], [ a ], [ b ], [ c ], [ d ], [ e ], [ f ], [ g ], [ h ], [ i ], [ j ], [ k ], [ l ], [ m ], [ n ], [ o ],
    [ 7-], [ p ], [ q ], [ r ], [ s ], [ t ], [ u ], [ v ], [ w ], [ x ], [ y ], [ z ], [ { ], [ | ], [ | ], [ ~ ], [DEL],
  )
)

#flags_table

#figure(
  caption: [Unsigned comparison Logic],
  table(
    columns: 2,
    [Logic], [Instructions],
    [A < n], [`BCC yes`],
    [A == n], [`BEQ yes`],
    [A > n], [`BCC no`#linebreak()`BNE yes`],
    [A >= n], [`BCS yes`],
    [A != n], [`BNE yes`],
    [A <= n], [`BCC yes`#linebreak()`BEQ yes`],
  )
)