---
title: "Running Elite in SQL Server"
subtitle: "“An infinite void wrapped around a core of data entry.”"
date: 2026-09-04T10:53:51.896Z
cover: "/images/medium/1_ZnMQQP43WGkKNas39r9X4w.png"
tags: ["SQL Server", "Retro Computing"]
mediumUrl: "https://medium.com/@trevor.dwyer/elite-in-sql-server-e7833eae6268"
repo: "https://github.com/sqlartist/EliteSQL"
runSteps: "Clone the repository and run the .sql files in the order they're numbered."
era: "1980s"
draft: false
---

---

![](/images/medium/1_ZnMQQP43WGkKNas39r9X4w.png)

I got Doom running inside SQL Server. E1M1 renders out of a stored procedure and you fly around it with a PowerShell client. It runs at 0.7 frames per second, which is exactly as playable as it sounds.

So I went looking for the next one, and landed on Elite. Two versions tempted me — ArcElite on the Archimedes, and the NES port. I assumed it would be the harder job. Doom was a 1993 3D engine with texture mapping and BSP trees; Elite was 1984 wireframes on a machine with 32K.

It also holds the Guinness World Record for being:*“The first game to feature a (3D) procedurally generated world.”*

To say Elite was ground breaking is an understatement, it is one of the most influential games in history. Needless to say I couldn’t run it as I had a Commodore 16 and the ZX Spectrum cassette tape didn’t work. So I was trying to play something by Mastertronic. But my friends Gordon and Gareth were all over this stuff — combining this with of course Warhammer 40k. I don’t think Gareth ever forgave Gordon for one day stomping all over his entire collection of painted minatures in a argument about the rules of Warhammer. They would come into school declaring Elite as the greatest game of all time, they would be playing it for hours.

So, what is so exciting about Elite, well Elite is a database wearing a spaceship costume and we like databases.

---

Doom-in-SQL is dominated by the rasteriser. 320x200 is 64,000 pixels a frame, and every one of them needs a texture lookup, a light level and a depth test. SQL Server is a set-based engine bolted to a storage layer. Asking it to fill spans pixel by pixel is asking it to do the one thing it’s worst at.

Elite’s frame is a few hundred line segments. Twelve ships, twenty-odd vertices each, thirty-odd edges. Transform, cull, project, clip. That’s not a rasterisation problem, it’s a join.

And it goes further than the renderer. Ship blueprints are vertex, edge and face tables with normals and bounty as columns. Face culling is a dot product in a WHERE clause. The galaxy is generated from three 16-bit numbers. The market is seventeen commodities with a base price and a gradient. Elite is a relational database that someone spent forty years pretending was an action game.

Once it’s in tables you can do something no Elite player has ever been able to do. You can query it.

**A quick note on licensing before anyone asks.  
**Doom is easy to port because id GPL’d the engine in 1997. Elite was never shareware and is still copyright Ian Bell and David Braben. What exists is Bell’s own sources on his site and Mark Moxon’s extraordinary annotated disassemblies of the BBC Micro, Master, Electron and NES versions. Moxon publishes those deliberately without a licence. For a personal experiment nobody minds; I’m crediting everyone loudly and I’m not shipping a playable binary of someone else’s game.

---

**Getting the ships out**

I didn’t want to type in vertex coordinates from memory or from a fan wiki. I wrote a parser that walks Moxon’s annotated assembly directly, pulling the \`VERTEX\`, \`EDGE\` and \`FACE\` macro calls and the \`XX21\` lookup tables.

The disc version scatters its roster across sixteen per-galaxy source files, so the parser merges and dedupes them. Out the other end: \*\*31 blueprints, 474 vertices, 709 edges, 306 faces\*\*, with the original 8-bit coordinates, face normals and per-edge visibility values intact.

Two blueprints threw an exception at the parser and turned out to be genuine 1984 engineering rather than a bug. The Thargon has no edge list of its own — it borrows the cargo canister’s. The splinter borrows the escape pod’s. Somebody was 24 bytes over budget and went looking for a ship with the same number of vertices.

![The full ship roster, rendered from the extracted blueprint data](/images/medium/1_DGA_bZs2t-4n4748IlVFwQ.png)
*The full ship roster, rendered from the extracted blueprint data*

\*Every blueprint, straight out of the parser. Coriolis with its docking slot, the Dodo, the Thargoid, and a cargo canister that is quietly doing double duty.\*

---

**The renderer is one view**

The whole thing is a single view. Six CTEs, no cursor, no loop:

The Liang-Barsky is the bit I’m quietly pleased with. It unrolls into four rows per segment through a \`VALUES\` constructor and aggregates them, so a line clip becomes a \`MAX\` and a \`MIN\`. A parallel line that starts outside its boundary gets t0 = 2, which forces t0 > t1 and rejects it without a special case.

Elite pins the player at the origin looking down +z and moves the universe instead. So \`elite.Universe\` coordinates are already camera space, and rotating a blueprint vertex into view is one expression:

> p\_cam = x \* sidev + y \* roofv + z \* nosev + shipPosition

Backface culling needs a point on each face, but the blueprints only store the vertex-to-face direction. I invert that mapping once at load into \`elite.ShipFaceVertex\` rather than doing it every frame.

Before running any of it against SQL Server I wrote the same pipeline in Python, stage for stage, and rendered a turntable. That turned out to be the single best decision in the project.

![Cobra Mk III turntable, verifying backface culling](/images/medium/1_ZWu0h9RdZDtKgR0JAx6RYg.png)
*Cobra Mk III turntable, verifying backface culling*

\*The Cobra through 360 degrees. Edge count swings from 34 nose-away to 17 nose-on, and the engine exhausts on the rear face appear and vanish exactly when they should. A flat edge count would have meant broken culling.\*

---

**Then I spent six files chasing a performance ghost**

This is the part I’d tell you about in the pub and bore you to tears.

First benchmark: 12 ships, 53ms a frame, 18.7fps. Twenty-seven times faster than Doom, so job done? No. A few hundred rows in 53ms is about 130 microseconds per row. That’s nonsense for float arithmetic in SQL Server. Something was wrong.

What followed was five wrong theories in a row.

**Theory 1: fixed overhead.** The CTEs get re-evaluated because SQL Server inlines rather than spools them, and \`elite.Setting\` was CROSS JOINed four separate times, so every supposed constant was really a column reference. Plausible. I ran a scale ladder from 1 to 48 ships. It was linear. Wrong.

**Theory 2: recompilation.** Temp tables inside a procedure carry statistics, and changing row counts between calls crosses a recompile threshold. Very plausible, classic problem. I captured the recompile counter and built a table-variable control version. Counter read zero. Table variables performed identically. Wrong.

**Theory 3: parallelism.** A parallel plan on 700 rows is pure exchange overhead. I forced MAXDOP 1. No change. Wrong.

**Theory 4: memory grants.** Capped the grant. No change. Wrong. (Worse than wrong — I capped the grant on the wrong statement, and made things marginally harder for myself.)

**Theory 5: tempdb.** I pre-sized it. The wait stats came back with 4ms of I/O across an entire run. Wrong, and it saved me a service restart.

Along the way I broke my own benchmark twice. My first harness reported 24 ships costing more than 48, which is impossible, and I’d been tuning against those numbers for two files. My CPU measurement read \`sys.dm\_exec\_sessions.cpu\_time\`, which only updates when a request completes — so inside a long batch it reads zero forever. Both had to be fixed before any of the rest meant anything.

What finally cracked it was stage timing. Instrument each statement in the pipeline separately and report medians rather than means:

```markdown
| Ships | Lines out | Stage 4    |
|-------|-----------|------------|
| 12    | 89        | 6.0ms      |
| 24    | 257       | 44.1ms     |
| 48    | 561       | 120.5ms    |
| 96    | **1,130** | **11.5ms** |
```

96 ships is ten times faster than 48 while producing twice the output. That’s not a scaling problem, it’s plan instability. And the 48-ship case was burning only 13.4% CPU — it wasn’t computing, it was waiting.

The session wait stats said \`SLEEP\_TASK\` with essentially no I/O. And the query stats, once I got the database context right (\`OBJECT\_ID\` returns NULL if you’re pointed at the wrong database, and then your filter silently matches nothing), named it exactly:

```bash
INSERT #edge … AvgMs 118.15 AvgCpuMs 9.75 GrantKB 2656 UsedKB 1632 Spills 96
```

**96 spills.** A hash build sized off a bad estimate, repeatedly running out of workspace and re-partitioning. 108ms of the frame was spill handling. Every other statement in the pipeline was clean.

And the punchline: the statement it was happening in was one *I had created*, in file 9, while trying to optimise the thing. Six files of performance work, and the bug was introduced in the middle of them.

The fix is a \`LOOP JOIN\` hint. At a few hundred rows, nested loops against the clustered keys is correct and a loop join has no workspace to spill. Normally I’d argue against hinting join types, but this pipeline has a fixed shape and a hard ceiling of a couple of thousand rows. There’s no scene where hashing wins.

**Final numbers for a real Elite frame — twelve ships, which is all the original ever put on screen:**

![](/images/medium/1_DH7eLx5f0inZWshhKEmcwA.png)

Four hundred times faster. Not because I’m cleverer than I was last time— because vector graphics are a join and rasterisation isn’t.

---

**The galaxy is three numbers**

This is the part that made the whole project worth doing.

Elite’s 2,048 systems are not stored anywhere. They’re generated by twisting three 16-bit seeds. The twist is four lines of 6502:

```ini
s2_new = s0 + s1 + s2 (mod 65536), then shift the seeds down
```

Four twists move you to the next system. And the four intermediate seeds are also what generate that system’s name, two letters at a time from a 64-character table. So the whole galaxy is one recursive CTE stepping the twist 1,024 times per galaxy, and then a decode that takes every fourth step as a system and the steps between as its name.

Economy, government, tech level, population, productivity, radius and position all fall out of bit manipulation on the seed. Government is bits 3 to 5 of one word. Tech level is the flipped economy plus two bits plus half the government, rounded up.

I checked every constant against the disassembly rather than trusting my memory, which caught two things I’d have got subtly wrong. Tech level uses \`LSR\` then \`ADC\`, so it rounds \*up\* for odd governments. And a name token of zero prints nothing at all rather than producing a character, which is how three-token and four-token names coexist in the same routine.

The validation is unambiguous:

```yaml
Check_FirstSystem: Tibedied (expected Tibedied)
Check_DistinctNames: 256 (expected 256)
Lave #7 (20,173) TL 5 Rich Agricultural Dictatorship
 population 2.5bn productivity 7000 radius 4116km
```

And the neighbour list, which is the real proof:

```lua
| Destination | Light years |
|-------------|-------------|
| Diso        | 3.6         |
| Leesti      | 3.8         |
| Reorte      | 4.4         |
| Zaonce      | 5.7         |
| Orerve      | 6.8         |
| Riedquat    | 7.0         |
```

That’s exactly the six systems reachable from **Lave** on a full tank, in the right order, with **Riedquat** sitting on the absolute edge of range. Anyone who played this in 1984 knows that list by heart. It came out of three numbers and a recursive CTE.

Then I ran a query nobody could have run in 1984:

```lua
| Government       | Systems | Avg tech level |
|------------------|---------|----------------|
| Anarchy          | 32      | 5.0            |
| Feudal           | 32      | 5.8            |
| Multi-Government | 32      | 7.7            |
| Dictatorship     | 32      | 7.7            |
| Communist        | 32      | 8.2            |
| Confederacy      | 32      | 8.9            |
| Democracy        | 32      | 8.3            |
| Corporate State  | 32      | 10.2
```

**Exactly 32 of each.** Not approximately — precisely, because government is three bits and the twist distributes them perfectly over 256 systems. And average tech level climbs monotonically with government type, because the tech formula literally adds half the government value.

**Bell** and **Braben** encoded the political economy of eight galaxies into three bits and an addition. You can only see that if you can aggregate the thing, which is why it took forty years and a \`GROUP BY\`.

Trade route optimisation, incidentally, is now a query. Join Lave’s market to every market within 7 light years, match on commodity, order by profit. Forty years of graph paper and folklore, answered by a SELECT.

---

**Flying it**

The flight model was the most fun and the most humbling.

Elite ships have no yaw. Like the player, they can only roll and pitch. That’s why an Elite pirate lining up on you rolls you into its vertical plane first and \*then\* pitches onto you. It’s not stylistic, it’s a consequence of the control axes.

The AI for every ship in the bubble is a **single UPDATE**. Direction to target, projection onto each ship’s local axes, steering decision, throttle — one statement for the whole scene. The original loops over ship slots one at a time because a 6502 has no alternative. This is the one place where the SQL port is genuinely more natural than the thing it’s porting.

Then I wrote three sign-convention bugs in a row.

The first inverted pitch in the demo pilot, so my ship flew determinedly away from every target. The second was a naive proportional controller that stalls: roll changes x in proportion to y, so once a target is level with you there’s nothing to roll against. The third was in docking, where I controlled the **cosine** of the slot angle instead of the angle — and the sign of the cosine tells you nothing about which way to roll.

All three had the same shape. Maths that converges on something, just not on what I intended. Invisible from the outcome, obvious the instant you simulate the loop and look at the quantity being controlled.

The fix for all three is \`atan2\`, which encodes the two-stage manoeuvre directly:

```vbnet
roll = -k * atan2(X, Y) bring the target to twelve o'clock
pitch = -k * atan2(Y, Z) then pull it down onto the nose
```

Locks on from any starting position in 41 to 76 ticks. Frames stay orthonormal to 5.5e-17 over 400 ticks — worth noting that Elite’s famous \`TIDY\` routine exists because of 8-bit fixed point, and in a float port it’s almost unnecessary. I kept it. It’s cheap.

First proper dogfight after adding throttle management: \*\*47 ticks, two pirates destroyed, eleven shots fired, zero hits taken.\*\* You have to slow down to turn inside someone, because rotation rates in Elite don’t scale with speed — velocity only widens your turn circle. The AI knew that. My demo pilot didn’t, and spent 330 ticks overshooting.

Docking is four independent conditions: on the slot axis, within the opening rather than the hull beside it, rolled to match a slot that never stops turning, and slow enough that arrival is a docking rather than an impact.

---

**Making the failures explain themselves**

The single most useful habit in this project had nothing to do with SQL.

Early on I’d get an empty frame and have no idea why. A ship can be missing for four completely different reasons and a geometry view can’t tell you which. So I wrote a diagnostic view with a \`Verdict\` column:

```vbnet
behind you
too far, all detail culled
off the edge of the screen
ON SCREEN
```

Same for docking. When my first attempt crashed, the output read:

```vbnet
AxisDot 1.000 LateralOff 0 SpeedOK 1 RollMatch 0.042
CRASH: not rolled to match the slot
```

Textbook approach, dead centre, correct speed, rolled ninety degrees wrong. That’s a five-second diagnosis instead of an evening.

Every time I skipped this step I lost hours. Every time I did it I lost minutes.

---

**The cockpit**

The client is Python and tkinter — standard library, no display dependencies at all. All the game logic stays in the database; the client is a screen and a keyboard.

![The Elite cockpit, rendered from SQL Server](/images/medium/1_bQ6w86u5_pWSiW2B1sUvzw.png)
*The Elite cockpit, rendered from SQL Server*

*Vector view, instrument bars, and Elite’s ellipse scanner with the vertical stalks. The scanner is just a different projection of the same \`elite.Universe\` rows the 3D view uses.*

The one thing that makes it viable at 30fps is a single stored procedure returning three result sets — the vector frame, the instruments, and the scanner contacts. A naive client would issue a tick, then a frame query, then a status query. Three round trips a frame, ninety a second, for no reason.

First time I actually flew it, I died instantly whatever I pressed. Two compounding causes, both mine. The client asks for a frame every 33ms, so the game runs at 30 ticks a second where the BBC managed about 12 — everything “per tick” happens two and a half times too fast. And I’d scaled NPC laser damage 6x earlier to make the \*autopilot’s\* fights resolve quickly. Together: 255 shields plus 255 energy at 12 damage a tick is 42 ticks. About 1.4 seconds.

Combat constants now live in a table so they can be tuned while the game is running. It turns out “the numbers I picked to make a script’s fights interesting” and “the numbers a human can survive” are not the same numbers.

---

**Where it got to**

\- 31 ship blueprints, parsed from annotated 6502 source  
\- A renderer that does a real Elite frame in **3.51ms**  
\- 8 galaxies, 2,048 systems, from three 16-bit numbers  
\- Flight model, set-based ship AI, combat, and docking against a rotating station  
\- Trading, cargo, fuel and hyperspace  
\- A Python cockpit

Dock, trade, refuel, jump, repeat. The loop closes.

**What I’d tell you if you’re thinking of doing something like this**

**Write the reference implementation first.** Every geometry bug in this project was caught in seconds by a Python model of the same pipeline, and every one I tried to reason about instead cost me an evening.

**Make failures name themselves.** A boolean that says “no” is worthless. A column that says \*which condition failed\* is the difference between minutes and hours.

**Don’t trust a benchmark you haven’t broken yet.** Mine reported impossible results twice. Report medians, not means. Run the same case twice and see if it agrees with itself. Check that your CPU measurement actually measures CPU.

**Check the constants against the source.** Every value in the galaxy generator came from **Moxon’s** disassembly rather than my memory, and two of them would have been subtly wrong if I’d trusted myself.

**And pick the right problem for the tool.** The reason this runs 400 times faster than my Doom port isn’t cleverness. It’s that vector graphics are a join and rasterisation isn’t. SQL Server was never bad at Doom’s maths. It was bad at Doom’s *shape*.

---

**Credits**

Elite is copyright **Ian Bell** and **David Braben**. It’s one of the great pieces of software engineering and it deserved better than being ported to a database.

Every constant, blueprint and algorithm here was read out of **Mark Moxon’s** annotated disassemblies at \[bbcelite.com\](https://www.bbcelite.com) — a genuinely remarkable act of software archaeology, and the reason this project took weeks rather than years.

The ship blueprint data is extracted from those sources for a personal experiment. Don’t redistribute it, and go and read **Moxon’s** commentary instead. It’s better than this article.

Code is here and just run in the order of the files.

[https://github.com/sqlartist/EliteSQL](https://github.com/sqlartist/EliteSQL)

I can’t imagine there will be too many people reading this that will even know what Elite is or was and what an impact it made on the history of Computer Games but if you do then please give it a clap. Thank you.
