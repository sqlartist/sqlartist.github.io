---
title: "ZX Spectrum in SQL & Daley Thompson’s Decathlon"
subtitle: "The Database is the Machine. Memory is a Table. The CPU is a Stored Procedure. The Display is a Join."
date: 2026-09-18T21:54:56.310Z
cover: "https://cdn-images-1.medium.com/max/1400/1*g39pc0gqZsAk6VhUZOdtog.jpeg"
tags: ["SQL Server", "Retro Computing"]
mediumUrl: "https://medium.com/@trevor.dwyer/zx-spectrum-48k-in-sql-server-running-daley-thompsons-decathlon-e5abfd1f3c3d"
repo: "https://github.com/sqlartist/ZXSpectrumSQL"
runSteps: "Run the scripts from the repository in order. This is one real Z80 instruction, DAA, as the emulator runs it:"
runSql: "-- opcode 27h\nBEGIN\n    -- DAA\n    SET @v = 0; SET @c = 0;\n    IF (@r_F & 16) <> 0 OR (@r_A & 15) > 9 SET @v = 6;\n    IF (@r_F & 1) <> 0 OR @r_A > 153 BEGIN SET @v = @v + 96; SET @c = 1; END;\n    IF (@r_F & 2) <> 0\n    BEGIN\n        SET @t = (@r_A - @v) & 255;\n        SET @res = CASE WHEN (@r_F & 16) <> 0 AND (@r_A & 15) < 6 THEN 16 ELSE 0 END;\n    END\n    ELSE\n    BEGIN\n        SET @t = (@r_A + @v) & 255;\n        SET @res = CASE WHEN (@r_A & 15) > 9 THEN 16 ELSE 0 END;\n    END;\n    SET @r_A = @t;\n    SELECT @nn = f FROM dbo.z80_szp WHERE v = @r_A;\n    SET @r_F = (@r_F & 2) | @c | @res | (@nn & 236);\nEND"
era: "1980s"
draft: false
---

![I was not going to be writing the dis-assembler myself.](https://cdn-images-1.medium.com/max/1400/1*g39pc0gqZsAk6VhUZOdtog.jpeg)
*I was not going to be writing the dis-assembler myself.*

A 48k Sinclair ZX Spectrum running inside SQL Server 2025. Then loading “Daley Thompson’s Decathlon” (Ocean, 1984) from its Original Micro-drive cartridge.

![It took a huge effort to get to this point](https://cdn-images-1.medium.com/max/1400/1*bp6Ngz7nADmSrScULoWMnA.gif)
*It took a huge effort to get to this point*

This was a computer I did not own, having established in other articles I had a Commodore 16, so once again I only saw this a few times but it was the closest you could get to Konami’s Track & Field, a classic Joystick Waggler and always in the local Youth Centre or Chip shop.

Eventually it did come out for the Commodore 16 but restricted from ten events down to six and because Decathlon literally means 10, it was renamed to “Daley Thompson’s Star Events”.

One of the absolute best games ever made, it must have earned so much money for manufacturers of joysticks. More joysticks were broken by this game than I think any other.

I didn’t have a joystick…

![Sinclair 48k ZX Spectrum computer (1982) —Photo: Bill Bertram](https://cdn-images-1.medium.com/max/1400/1*ZvOIL0FlBvFrfgwm_HFS_Q.jpeg)
*Sinclair 48k ZX Spectrum computer (1982) —Photo: Bill Bertram*

I started this idea wanting to emulate this game based on the Commodore 64, I very quickly changed my mind and decided to emulate the hardware for the ZX Spectrum to be run inside Microsoft SQL Server 2025. This would then allow me to load up the Copy Protection-less version of the game stored on a micro-drive.

In my life and without a doubt, millions of middle aged humans and a few Chimpanzees around the world, in fact anyone that remembers this era of Computing, will know the exact sound of a Computer Game loading from a Cassette. It was similar to an old school modem.

But not just that era, their parents will know that sound, and their neighbours will know that sound. It was hated except for a very specific group of people — siblings. They could hear you loading a game a mile away whilst still at school and would rush home just so they could open the front door the wrong way.

Depending on your relationship with your siblings meant one of two things happened. If you got on well they would sit and watch “YOU” play for hours all the time expecting “THEIR” turn would be coming up

Yes, of course you’ll be next…

But if you didn’t get along as nicely as your family thought you did, well they knew the exact moment to “breathe funny” or “dance up the stairs” which caused the loading of that game to fail.

By simply existing in this world, they would cause some level of Quantum Fluctuation and 100% would make the loading of that cassette fail an indescribable number of times.

When I said I was bored during these years in an earlier story on Medium, it wasn’t quite the truth, I would go a step further with the 1980’s and specifically the loading of any software onto any computer back then and say mummification was closer to the feeling and these cassettes loaders did not help one bit.

They would hypnotise you with their weird sounds and because of your sister deliberately flapping her arms “hoping” to cause “The Butterfly Effect” from another part of the house and making me “start all over again” for the 100th time

*I̶ ̶n̶o̶w̶ ̶k̶n̶o̶w̶ ̶t̶h̶i̶s̶ ̶w̶a̶s̶ ̶i̶n̶ ̶f̶a̶c̶t̶ ̶p̶r̶e̶p̶a̶r̶a̶t̶i̶o̶n̶ ̶f̶o̶r̶ ̶b̶̶̶e̶̶̶i̶̶̶n̶̶̶g̶̶̶ ̶̶̶m̶̶̶a̶̶̶r̶̶̶r̶̶̶i̶̶̶e̶̶̶d̶̶̶.̶ ̶T̶h̶e̶ ̶e̶x̶a̶c̶t̶ ̶m̶o̶m̶e̶n̶t̶ ̶y̶o̶u̶ ̶s̶t̶a̶r̶t̶ ̶t̶o̶ ̶d̶o̶ ̶s̶o̶m̶e̶t̶h̶i̶n̶g̶ ̶f̶o̶r̶ ̶y̶o̶u̶r̶s̶e̶l̶f̶ ̶o̶r̶ ̶a̶ ̶h̶o̶b̶b̶y̶ ̶e̶v̶e̶n̶ ̶a̶n̶d̶ ̶a̶ ̶c̶u̶r̶i̶o̶u̶s̶ ̶l̶o̶v̶i̶n̶g̶ ̶p̶a̶r̶t̶n̶e̶r̶ ̶a̶s̶k̶s̶ ̶”̶W̶h̶a̶t̶ ̶y̶o̶u̶ ̶u̶p̶ ̶t̶o̶?̶”̶*

*(Which is why Men die earlier than women — they give up :))*

But this was going to be far easier. Why?

Because I am going to use a Micro-drive, not a cassette. Micro-drives were as rare as the 3" floppy disk used in an Amstrad PCW8256 machines. (The world standard was 3.5" floppy disks) but good old Sir Alan Sugar must have got hold of a job lot from the back of a van and built his genuinely incredible machine around these disks.

Micro-drives do not have the brutal Copy Protection software embedded into many Game Cassette tapes from that era.

Side Note: I’m 53 and never once heard of copy protection on a cassette before this project. People used to tape music all the time. But now it makes a bit more sense and perhaps it wasn’t the nightmare siblings of this world causing these load failures, perhaps it was the copy protection kicking in due to you using “a friends copy of the game”.

## First, the honest bit about firsts

I nearly opened this with “nobody has ever done this.” Then I checked, which I recommend doing before you put a claim like that on the internet.

**Peter Negenborn built an Intel 8080 emulator in T-SQL and ran CP/M on it.**

He emulated the Altair 8800’s processor as stored procedures, emulated the  
serial ports, ran Altair BASIC — Microsoft’s first product — and then  
emulated the floppy controller with the disk image sitting in a table so it  
could boot a real operating system.

\[Running an 8080 emulator (and CP/M) on SQL Server\]([https://www.linkedin.com/pulse/running-8080-emulator-cpm-sql-server-peter-negenborn](https://www.linkedin.com/pulse/running-8080-emulator-cpm-sql-server-peter-negenborn))

That’s the same shape as what I’ve done, and the 8080 is the Z80’s direct  
ancestor. So no, not a first, and I’m glad to be in that company rather than  
alone in a field.

As far as I can tell nobody’s done a ZX Spectrum this way, and nobody’s  
loaded a commercial game off its original Micro-drive cartridge into a  
database and played it. But absence of search results isn’t proof, and  
somebody probably did a 6502 in PL/SQL in 2009 and never told anyone.

## Why the Spectrum matters, and why it’s a good target

![](https://cdn-images-1.medium.com/max/1400/1*D4lBAmr2foYPK7DiZ75E7Q.jpeg)

Clive Sinclair built the world’s first slimline pocket calculator in 1972,  
then spent the early eighties making computers cheap enough that ordinary families bought them. The ZX80 was the UK’s first mass-market home computer under £100. The ZX Spectrum followed in 1982–48K of RAM, a Z80 running at 3.5MHz, and those rubber keys.

It did something no spec sheet captures. It put a programmable machine into hundreds of thousands of British living rooms at a price that didn’t require a family conference, and a generation of us learned to code on it because there was nothing else to do with the thing. The British games industry came out of those bedrooms more or less directly. Sinclair was knighted in 1983 and died in 2021, aged 81.

The engineering is also \*frugal\* in a way that makes it a lovely emulation  
target. There’s no video chip worth the name. The screen is a bitmap sitting  
in RAM at 0x4000, with a daft interleaved layout that saves a few gates at  
the cost of making programmers do sums. One interrupt, fifty times a second.

That’s the machine.

Which matters, because my first instinct was the Commodore 64.

I got talked out of it inside about a minute, and the argument was better  
than mine. The 64 means a VIC-II with sprites and raster interrupts and  
badlines, plus CIA timers, and Ocean-era code leans on all of it. Get it  
subtly wrong and you don’t get an error — you get output that looks nearly  
right and costs you a fortnight. The Spectrum’s frugality is the whole  
point: on that machine 100% of your cost is the CPU, and a CPU is the  
boring mechanical bit you already know how to write.

I’ve been at this long enough to know that changing your mind quickly on  
someone else’s better reasoning is a skill rather than a concession. There’s  
a new wrinkle when the reasoning comes from an AI, though, which is that  
it’ll argue just as confidently when it’s wrong. That came up later.

The bit that was genuinely mine

**Daley Thompson’s Decathlon** is the game that destroyed joysticks across  
Britain. Ocean, 1984. The entire thing is how fast you can waggle, which  
makes it the worst possible fit for an emulator running at a fraction of  
real time. That appealed.

The tape release is Speedlock protected, and emulating a fast loader’s  
timing games buys you nothing once the code’s in memory. The obvious dodge is to load it in a normal emulator and take a snapshot — which works, but it’s starting from someone else’s already-solved problem.

I had the Micro-drive cartridge image. Micro-drive cartridges are unprotected, and it turned out this one had the whole story in it: a BASIC loader with machine code hidden inside a REM statement, jumping into itself, copying a stub into the printer buffer, restoring a saved register set popped off a fake stack it had built in the middle of a program line.

There’s a moment where you decode those saved registers out of the cartridge bytes and IY comes out as \`0x5C3A\` — the standard Spectrum system variable pointer. That’s when you know you’ve read it correctly rather than plausibly. Nobody handed us that. It was sitting in a 137KB file that’s been on the internet for thirty years, waiting for someone curious enough to look.

Knowing that file existed, and why it beat the tape, is the sort of thing  
that comes from having lived through it the first time.

## Ten deploys that didn’t work

Here’s the part nobody puts in the article.

The first version wouldn’t parse. Nor the second. T-SQL has a trap where  
\`IF x SET [@a](http://twitter.com/a "Twitter profile for @a") = 1; ELSE …\` is a syntax error — the semicolon terminates the  
\`IF\` and orphans the \`ELSE\` — and the generator was emitting that pattern  
several hundred times. Fixed that, and the ROM image wouldn’t load, because a \`0x\` binary literal can’t contain whitespace and someone had prettily wrapped 32,768 hex digits into neat rows. Fixed that, and the error handler checking the fix was itself invalid, because \`RAISERROR\` won’t take a function call as an argument.

Then three runs produced byte-identical results because the file on disk had changed and the copy on my server hadn’t, and neither of us could tell.

My contribution through all of that was un-glamorous and, I think,  
irreplaceable: I pasted everything back verbatim. Every error, every line  
number, full register dumps, disassembly listings, screenshots when words  
wouldn’t do. No summarising, no “it didn’t work”. The exact text. The reason I didn’t try to understand the disassembly is shown in the code below.

1.  **DAA — the hardest instruction on the Z80**

```sql
-- opcode 27h
BEGIN
    -- DAA
    SET @v = 0; SET @c = 0;
    IF (@r_F & 16) <> 0 OR (@r_A & 15) > 9 SET @v = 6;
    IF (@r_F & 1) <> 0 OR @r_A > 153 BEGIN SET @v = @v + 96; SET @c = 1; END;
    IF (@r_F & 2) <> 0
    BEGIN
        SET @t = (@r_A - @v) & 255;
        SET @res = CASE WHEN (@r_F & 16) <> 0 AND (@r_A & 15) < 6 THEN 16 ELSE 0 END;
    END
    ELSE
    BEGIN
        SET @t = (@r_A + @v) & 255;
        SET @res = CASE WHEN (@r_A & 15) > 9 THEN 16 ELSE 0 END;
    END;
    SET @r_A = @t;
    SELECT @nn = f FROM dbo.z80_szp WHERE v = @r_A;
    SET @r_F = (@r_F & 2) | @c | @res | (@nn & 236);
END
```

Decimal Adjust Accumulator. It fixes up the accumulator after BCD  
arithmetic, and its behaviour depends on the carry flag, the half-carry  
flag, the subtract flag and both nibbles of A at once. It is the instruction  
that catches out every emulator author, and here it is as T-SQL. There another 700 of these.

**2\. The \`DD\`/\`FD\` prefix — how IX and IY get faked**

```sql
WHILE @op = 221 OR @op = 253
BEGIN
    SET @ixy = CASE WHEN @op = 221 THEN 1 ELSE 2 END;
    SET @ea = @r_PC;
    SELECT @op = val FROM dbo.z80_mem WHERE addr = @ea;
    SET @r_PC = (@r_PC + 1) & 65535;
    SET @r_R = (@r_R & 128) | ((@r_R + 1) & 127);
    SET @ts = @ts + 4;
END;

IF @ixy = 1
BEGIN
    SET @t = @r_H; SET @r_H = @r_IXH; SET @r_IXH = @t;
    SET @t = @r_L; SET @r_L = @r_IXL; SET @r_IXL = @t;
END
ELSE IF @ixy = 2
BEGIN
    SET @t = @r_H; SET @r_H = @r_IYH; SET @r_IYH = @t;
    SET @t = @r_L; SET @r_L = @r_IYL; SET @r_IYL = @t;
END;
```

The Z80’s index registers are handled by a trick: when a \`DD\` or \`FD\` prefix  
byte turns up, swap H and L with IXh and IXl, execute the next instruction  
normally, then swap back. Every \`HL\` operation silently becomes an \`IX\` one for exactly one instruction.

**3\. The bug that halved the machine’s speed**

```sql
/* EI defers interrupt acceptance by one instruction. That delay
   has to expire here, at the end of an instruction. Clearing it at
   the start of the next call -- after the interrupt gate has
   already been tested -- suppresses every interrupt that follows a
   frame ending in EI/HALT, which halves the machine's speed. */
IF @ei_pending = 2
BEGIN SET @ei_pending = 0; END
ELSE IF @ei_pending = 1
BEGIN SET @ei_pending = 2; END
```

Every frame of a game loop ends \`EI\` / \`HALT\`. This flag was being cleared  
one step too late, so every other interrupt was suppressed and the machine ran at exactly half speed — from the very first boot.

Two lines, in the middle of the fetch/execute loop. \`EI\` defers interrupt  
acceptance by one instruction, and that delay has to expire at the end of an  
instruction — not at the start of the next call, after the interrupt gate has  
already been tested.

The model can’t see my instance. It has no idea what happened unless I tell  
it precisely, and paraphrasing is the fastest way to send the whole thing  
down a wrong path. Half the wins in this project came from a number I copied across without understanding it.

The T-SQL Linter that which is in the code repository is a good example of how you can use the constant failures to your advantage.

It can catch the structural mistakes that only surface when SQL Server parses 7,500 generated lines.

```sql
1. ORPHANED ELSE - a ';' between a statement and its ELSE terminates
 the IF, so the ELSE has nothing to attach to.
 'IF x SET @a=1; ELSE SET @a=2;' is a syntax error;
 'IF x SET @a=1 ELSE SET @a=2;' is fine, and
 'IF x BEGIN SET @a=1; END ELSE …' is better.
 
2. END; ELSE - the same thing with a block body.
3. EMPTY BLOCK - BEGIN followed only by comments then END. T-SQL
 requires at least one statement.
4. SPLIT LITERAL - a 0x binary literal broken across lines. Literals
 cannot contain whitespace, so wrapping 32k hex
 digits for readability makes the script invalid.
5. RAISERROR ARG - substitution arguments must be constants or
 variables. RAISERROR('%d', 16, 1, DATALENGTH(@x)) is a syntax error.
6. UNBALANCED - BEGIN/CASE vs END across the file.
```

## The moment it worked

150 frames of ROM execution, and then I rendered the bottom of the screen as text, straight out of the database:

![Finally The Boot loader](https://cdn-images-1.medium.com/max/1400/1*02lxdu6hvfnNfacpNgYnng.png)
*Finally The Boot loader*

None of that was re-implemented. Sinclair’s own ROM, running its own memory test — which takes 640,000 instructions and eighty-two frames, something I’d completely forgotten about the Spectrum boot — and then its own character routines, setting individual bits in a table.

![You will never feel the excitement of seeing this on a screen, both from back when it came out and also when it lived once again.](https://cdn-images-1.medium.com/max/1400/1*SpS0w7VdN8LVzqvC6XRiZg.png)
*You will never feel the excitement of seeing this on a screen, both from back when it came out and also when it lived once again.*

Just in case you wanted to see what the code looks like for a ZX Spectrum without installing it this is the SQL code which loads it.

![Do not try to read this, the actual code is in the Github project. It is just showing the shape.](https://cdn-images-1.medium.com/max/1400/1*d2jbdkjwH2z-V3V2ar3zEg.png)
*Do not try to read this, the actual code is in the Github project. It is just showing the shape.*

I sat and looked at that for a while and thought never again…

To see the process for loading the game onto the ZX Spectrum running inside SQL Server have a look at the RUNBOOK.md

## Where I earned my keep

Late on, the game hit a black screen and stopped responding. I was told,  
confidently, that it had probably timed out into an attract mode.

I wasn’t sure. So I asked: *does this game actually go into a demo after a  
few seconds of nothing happening?*

It did, but what was actually happening this time was the input system was holding keys down permanently, and the game was sitting in a loop waiting for a key to come back *up*. Six hundred frames with a joystick jammed on.

The other thing only I could do was decide what mattered. Half real time is  
fine, because input is recorded at a true 50Hz and replayed, so emulator  
speed never affects the result. Knowing that meant not chasing performance we didn’t need.

## What’s left

The waggle rate is a parameter. The race result is a byte in memory. Which  
makes an event’s outcome a function of one number, and a function of one  
number can be searched — from T-SQL, on the same instance, in the same  
session.

A stored procedure that hill-climbs its way to a world record in the long  
jump.

That’s next, and I’m looking forward to it more than any of the above. Not  
because it’s difficult, but because it’s where the database stops being a place the game lives and becomes the thing that plays it.

Forty-three years after Sinclair sold the thing for £175, it’s running inside a relational database, being played by a query. I think he’d have found that funny.

![10.48s](https://cdn-images-1.medium.com/max/1400/1*7vSKo9pKXF3vxjHut_z3Mw.jpeg)
*10.48s*

---

Code is available on GitHub.

[https://github.com/sqlartist/ZXSpectrumSQL](https://github.com/sqlartist/ZXSpectrumSQL)

I cannot imagine anyone will try this but genuinely when that ZX Spectrum message appears and you realise that is a piece of tin running as software inside the wrong place, and then your loading a tape into this emulation and it works, you have to smile.

You’ll need your own copy of the game; the Sinclair ROM is included, as Amstrad permit redistribution for emulation. The Z80 core was written by Claude from a Python generator rather than by hand. The bugs were found by both of us, in roughly equal measure.

If you got to this part of the story then to be honest I should be Clapping you but the system doesn’t work that way so Clap like you have never Clapped before.
