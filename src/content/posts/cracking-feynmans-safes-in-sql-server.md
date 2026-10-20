---
title: "Cracking Feynman’s Safes in SQL Server"
subtitle: ""
date: 2026-10-10T20:02:05.000Z
cover: "/images/medium/1_qU-0gQ8X2lPiwdaHge_jww.jpeg"
tags: ["SQL", "Safecracker", "Physics", "World War Ii", "Mathematics"]
mediumUrl: "https://medium.com/the-academic/cracking-feynmans-safes-in-sql-server-c5469bae2501"
draft: false
---

![](/images/medium/1_iPA-dtDFR9D6HNBWqhHojA.jpeg)

**The puzzle, not the physics**

I build daft things in SQL Server. Doom, Elite, a Boing ball bouncing around inside a result set. The rule’s always the same: pick something that has no business living in a database, and make it live there anyway. You learn more about the engine from one silly project than from a shelf of modelling books.

This one is Richard Feynman cracking safes at Los Alamos.

If you’ve read *Surely You’re Joking, Mr. Feynman!* you know the chapter “Safecracker Meets Safecracker.” Everyone remembers it as Feynman being a genius. It isn’t that. It’s Feynman being patient, and noticing that the locks were far worse than anyone assumed. He didn’t out-muscle the safes. He worked out how little he actually had to try. That’s a database problem if ever I saw one, so I pointed SQL Server 2025 at it.

![](/images/medium/1_qU-0gQ8X2lPiwdaHge_jww.jpeg)

**The thing he actually spotted**

The filing cabinets used Mosler combination locks. Three numbers, 0 to 99, left-right-left. On paper that’s a million combinations, and a million is a comfortable number to hide behind. Nobody’s trying a million of anything by hand.

Feynman took his own lock apart, not to pick it, to *measure* it. And he found the thing the manufacturer would rather you didn’t: the mechanism was sloppy. A number still opened the safe if you were off by two in either direction. So 69 would open on 67, 68, 69, 70 or 71.

That sounds like a footnote. It isn’t. It means you never have to try every number, only every fifth one, 0, 5, 10, 15, and so on. Twenty values per wheel instead of a hundred.

```
| Approach                     | Combinations                |
| ---------------------------- | --------------------------- |
| Try every number             | 100 × 100 × 100 = 1,000,000 |
| Every fifth number (±2 slop) | 20 × 20 × 20 = 8,000        |
```

A million down to eight thousand, and he did it with arithmetic, not a drill. At the rhythm he practised to, eight thousand was a long afternoon, four hours on average, eight at the worst. Tedious, but *possible*, which a million never was. That gap between impossible and merely tedious is the whole chapter.

---

**The bit that makes the story**

Here’s where it stops being arithmetic and starts being mischief, and it’s my favourite part.

When someone leaves a drawer open with the dial resting on ten, the bolt is still sitting down in the slot. Which means the three wheels are still lined up, the safe is open, it just hasn’t been *disturbed* yet. Feynman worked out that he could read the combination off a safe in that state without the owner ever knowing.

He’d lean on an open filing cabinet while chatting about physics and idly wobble the dial. Step away from ten in fives; each time, back to ten. The moment the bolt won’t drop back, you’ve just nudged a wheel off its slot and the step *before* that was the last number. Do it again the other way for the second number. Two of the three numbers, taken off a safe while its owner stood next to you, and written on a scrap of paper he hid inside his own lock.

After that, “cracking it cold” later meant trying twenty first numbers while pretending to read a magazine, so it didn’t look too easy.

That’s the part I most wanted to see move, so it’s the first thing I built. The database wobbles the dial exactly as he describes, logging every step:

![The dial, the three-wheel pack and the back-end probe log reading the last two numbers off Christy’s open cabinet — it settles on 35, 60](/images/medium/1_Z_NLpDgpa0sig5wwSvtOdg.gif)
*The dial, the three-wheel pack and the back-end probe log reading the last two numbers off Christy’s open cabinet — it settles on 35, 60*

That’s Christy’s cabinet from the book. The log on the right shows the bolt holding up at 65, which fixes the last number at 60; the second falls out as 35. “Christy, 35, 60,” which is exactly what Feynman wrote down. I didn’t plan that number; it came out of the geometry, and I’ll admit I was happy when it matched the book.

---

**Three tricks people blur into one**

The popular version of this story mashes everything into “Feynman was good at safes.” He wasn’t, particularly. He had three separate tricks, and they’re worth keeping apart because the database treats each one differently.

The **tolerance** trick is the maths above, the only one that’s really his.

**The open drawer** is the cheat from the last section: read two numbers off anything left open, then finish it later in minutes.

And then the **shortcuts**, which are pure human nature. The safe-cracker books told owners to pick dates and constants, so Feynman tried dates and constants. De Hoffmann’s cabinets, the ones holding the actual bomb secrets, opened on 27–18–28, the first digits of *e*. Kerst’s opened on 0–5–35, which turned out to be his daughter’s birthday, found by sweeping dates in fives. And the locksmith’s dirty secret: half the safes were never changed from the factory settings, 25–0–25 or 50–25–50.

![The database opening the Captain’s safe on the factory setting 50–25–50 in two tries](/images/medium/1_4rkIVMwe1W8M-mWk61m7PA.gif)
*The database opening the Captain’s safe on the factory setting 50–25–50 in two tries*

The Captain had a special heavy safe hauled up to his office on jacks so everyone could see how seriously he took security. He never changed it from the factory number. Two tries in the database and it’s open, forty seconds of pretend effort. I gave each of these a strategy in the schema, so you can watch a safe fall to the cheapest trick that happens to work on it.

![The database opening Kerst’s safe cold by sweeping dates in fives — 0–5–35, a daughter’s birthday](/images/medium/1_6Ulh1kTmuxKjFOIw3kTjNA.gif)
*The database opening Kerst’s safe cold by sweeping dates in fives — 0–5–35, a daughter’s birthday*

---

**Why I modeled the metal, not the maths**

The obvious way to do this is a nested loop. Three counters, a modulo check, done in an afternoon. It would give the right numbers and teach me nothing, and it would be lying, because the ±2 slop isn’t a rule Feynman invented, it’s a physical fact about how a notched wheel sits under a bolt. If I hard-code “tolerance = 2” I’ve thrown away the very thing the story is about.

So I went the long way round and built the actual metal in SQL Server 2025’s spatial types. Every wheel, at every one of its hundred positions, is a real \`geometry\` disc with a gate cut into its rim. The bolt is a little bar sitting above each wheel. And then the entire physics of the lock, the whole question of whether it opens, collapses to one spatial predicate, asked once and stored:

```sql
-- does the bolt clear this wheel at this dial position?
UPDATE wg SET Clear = CASE WHEN wg.Geom.STIntersects(b.Geom) = 1
                          THEN 0 ELSE 1 END
FROM dial.WheelGeom wg
JOIN dial.Bolt b ON b.CabinetId = wg.CabinetId;
```

That’s the whole trick. If the gate overlaps the bolt, the bolt’s blocked. If it doesn’t, the bolt drops. I cut the gate a touch wider than one number and the ±2 slop *falls out on its own*: exactly five dial positions per wheel end up clear. I never typed the number two. The geometry hands it to me, the same way the real mechanism handed it to Feynman.

Once every position knows whether it’s clear, cracking a safe stops being physics and becomes a plain relational search: find the first candidate whose three wheels are all clear. That’s the division of labour I was after, geometry for the mechanism, set-based SQL for the searching. It’s slower to build than a loop and I’d do it again tomorrow, because now the database *disagrees* with you when you’re wrong about the lock, which a loop never would.

---

**Watching the eight thousand shrink**

A number on a page doesn’t land the way watching it does. So every attempt gets logged to a table with a running clock, and each try also carves out the little patch of the search it’s just ruled out. I laid that search out as a grid I’ve been calling Feynman space, twenty panels, one per first number, each a hundred-by-hundred square of the second and third.

![Cracking a cabinet with no clues at all — the wheel pack on the left, Feynman space filling in blue on the right as the attempts are logged](/images/medium/1_KptDxyuSbiSfOIuDwsWDEw.png)
*Cracking a cabinet with no clues at all — the wheel pack on the left, Feynman space filling in blue on the right as the attempts are logged*

That’s a cabinet with no clues, so there’s nothing for it but the full eight thousand. The blue is what’s been eliminated; the bolt drops the instant all three gates line up. The Python front end is drawing exactly what the database computed. The shapes come across the wire as the stored geometry, so I’m not re-faking the picture, I’m showing SQL Server’s own working.

And because every safe is logged the same way, you can line them all up and see the point of the whole exercise:

![A bar chart of how long each safe took, from the Captain’s factory setting at forty seconds up to brute force running off the end of the chart](/images/medium/1_6vA8526YudDWA8vJMFuVgQ.png)
*A bar chart of how long each safe took, from the Captain’s factory setting at forty seconds up to brute force running off the end of the chart*

The Captain’s factory safe: forty seconds. De Hoffmann’s bomb secrets, on the digits of *e*: two minutes. Brute force with the tolerance trick thrown away: off the end of the chart, where a million always was. It’s the methods doing the work, not the muscle, which is the thing people always get backwards about Feynman.

There’s a live mode too: kick the crack off with a small delay and watch the rows appear one at a time, the back-end running in front of you instead of after the fact.

---

**The lock that came after**

Feynman learned to pick ordinary pin-tumbler locks from a chap called Leo Lavatelli, and the way he describes it is pure “slop leaks information” again. A real lock isn’t made perfectly, so one pin holds more of the load than the rest. Lift *that* one to the right height, the plug gives a hair, the pin catches on the edge. Now the load moves to the next pin. Push too far and the springs drop everything back with a *tic-tic-tic*. He called it Sisyphus. Anyone who’s picked a lock knows the feeling.

So the second half of the lab is a see-through practice lock, the kind sold as a clear teaching kit, built the same way, entirely from geometry. A key’s cuts are a profile; each pin rides along it; the plug turns only if every gap lands on the shear line.

![The transparent lock with a near-miss key inserted — four pins reach the shear line, the fifth is cut one step too deep and blocks the plug](/images/medium/1_t1ujJ70ddxD1tjzn5nsURg.gif)
*The transparent lock with a near-miss key inserted — four pins reach the shear line, the fifth is cut one step too deep and blocks the plug*

That’s next door’s key tried in the wrong lock. Four pins sit right on the red shear line; pin four is cut one step too deep, so its driver crosses the line and the plug won’t turn. The database decides that with the same \`STIntersects\` it used on the bolt, chamber by chamber, is anything straddling the line.

Picking is the interesting one to watch, over sets and all:

![Single-pin picking the transparent lock — the pick lifting a binding pin while the others wait](/images/medium/1_9pNE20boDv6WtVXhyJYSqg.gif)
*Single-pin picking the transparent lock — the pick lifting a binding pin while the others wait*

Tension on, find the binding pin, lift until it sets with a click, move to the next. Overshoot at the shear line and it over sets, tension off, every pin drops, start again. I built the overshoot in on purpose, because a picker that never fumbles isn’t telling the truth about the job.

And then the payoff, which is the pin-tumbler cousin of taking the last two numbers off: because the pick records how high each pin had to go, the database can read the biting straight back off a successful pick and cut a working key.

![The lock opening on a key the database cut from its own successful pick](/images/medium/1_J4wH1Go_qtwsJxx7hxX26Q.gif)
*The lock opening on a key the database cut from its own successful pick*

---

**What it’s really about**

Strip away the filing cabinets and the fun of it, and both halves of this say the same thing: a real mechanism has slop, and slop leaks information. The combination wasn’t a million-to-one secret, it was a few hundred once you measured the tolerance. The lock wasn’t picked by force, it was read one binding pin at a time. Feynman didn’t beat the security; he noticed it was never really there.

That’s why it sits so naturally in a database. A spatial predicate isn’t pretending the metal exists, it *is* the metal’s one honest question, asked eight thousand times a second. Build the mechanism properly and the cracking is almost an afterthought, which is exactly the shape of the original story.

One caveat, since I’d want one if I were reading this. The spatial code is written for SQL Server 2025, convert it to other databases if you can. I built and checked the whole thing against a Python model of the same geometry, which reproduces every number in the book, de Hoffmann’s *e* and Kerst’s birthday included.

---

## What’s in the package

Four T-SQL scripts build the whole thing on a SQL Server 2025 instance; a Python front end draws it, either from the live database (geometry crosses the wire as WKT and is drawn exactly as the database computed it) or from a built-in simulator that reproduces every episode, so the visuals run with no server at all.

```
sql/01_schema · 02_geometry · 03_dial · 04_pin_tumbler · 05_demo
python/dial_viz.py · pin_viz.py · feynman_lab/ (geometry mirror, simulators, SQL driver)
out/pre-rendered animations + the scoreboard
```

Run `05_demo.sql` in SSMS with the *Spatial results* tab on to see the wheel pack, Feynman space and the see-through lock; or `python dial_viz.py --source sql --live` to watch `dial.usp_Crack` write rows in real time.

---

Source: “Safecracker Meets Safecracker,” from Surely You’re Joking, Mr. Feynman! (1985). The combinations shown — de Hoffmann’s 27–18–28, Kerst’s 0–5–35, the factory 25–0–25 / 50–25–50, Christy’s 35–60 — are the ones Feynman records. First-number values and a few cabinets are invented to fill out the set; the mechanics are his.

I hope you enjoyed this, I think it might be my favourite Feynman story in the whole of his book. If you did like it please give it some claps.
