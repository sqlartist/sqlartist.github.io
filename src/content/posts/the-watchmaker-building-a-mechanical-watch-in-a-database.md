---
title: "The Watchmaker: Building a Mechanical Watch in a Database"
subtitle: ""
date: 2026-11-01T02:23:56.000Z
cover: "/images/medium/1_FPlM81GuoAE2dYowsgbChA.gif"
tags: ["Watches", "Postgresql", "SQL", "Time", "Mathematics"]
mediumUrl: "https://medium.com/@trevor.dwyer/the-watchmaker-building-a-mechanical-watch-in-a-database-275dae48e0b5"
repo: "https://github.com/sqlartist/watchmaker-sql"
draft: false
---

![The Complete watch assembly created using SQL Spatial Geometry](/images/medium/1_FPlM81GuoAE2dYowsgbChA.gif)
*The Complete watch assembly created using SQL Spatial Geometry*

![The exploded watch, each part modeled and animated inside a database.](/images/medium/1_2C413VntT80AfM82xnOJpA.png)
*The exploded watch, each part modeled and animated inside a database.*

## This time next year, we’ll be millionaires

In the 1996 Christmas special of *Only Fools and Horses*, “Time on Our Hands”, Del Boy and Rodney clear out the garage and find an old watch. It turns out to be a long-lost timepiece by John Harrison, the man who solved longitude. It goes under the hammer for £6.2 million, and after years of trying, the Trotters finally are millionaires.

I have never found a Harrison in my garage. I’ve found a lot of cables.

I have, though, owned around twenty good watches over the years. If you want my honest league table for keeping time, nothing beat the **Rolex**, with the **Omega** a close second. Neither is worth £6.2 million, before anyone at home gets ideas.

![Did like that watch, had to sell it when I got very ill](/images/medium/1_T5aQjQsEPpJIJgiO1wju5g.jpeg)
*Did like that watch, had to sell it when I got very ill*

![Current timepiece, somewhat spoilt by having 007 on the back.](/images/medium/1_VLm7kXNlqKSE-m9e-gFm2Q.jpeg)
*Current timepiece, somewhat spoilt by having 007 on the back.*

I have always wanted to build a watch. The trouble is my eyes. Even with a 15× magnifier, the moment a screwdriver gets near anything smaller than a grain of rice, my hand starts shaking like it’s had six espressos. So I did the next best thing. **I coded one.**

The spark was Bartosz Ciechanowski’s [Mechanical Watch](https://ciechanow.ski/mechanical-watch/). If you haven’t seen it, stop reading this and go and look. I’ll wait. His first picture is a watch movement you can spin round and pull apart with a slider. I wanted that, but built by a database.

This article was meant to be about SQL Server 2025. It still mostly is. But halfway through I had to pack my bags and move house to PostgreSQL, and I want to explain why. I also want to ask the SQL Server team a straight question.

By the end, a database had designed a 26 mm watch movement of 34 parts, checked that no two parts share space, worked out by itself how to take it apart, and run it for a minute. Every tick was computed in SQL.

Onto the article.

## A watch in five minutes

A mechanical watch is a spring that wants to unwind, and a very clever way of letting it unwind slowly. Everything else is detail. Here’s the detail, in the order the power flows.

![](/images/medium/1_MA2tp7zgpurWq0LhLx1qeg.jpeg)

The balance and the escapement work as a pair: each swing lets one tooth go, and each tooth gives the swing a little kick to keep it going.

-   **Mainspring.** A long strip of steel coiled up tight. Winding the crown coils it tighter. It’s the battery.
-   **Barrel.** The drum the mainspring lives in. The spring turns the drum, and teeth round its edge drive everything else.
-   **Ratchet and click.** A one-way gate on top of the barrel. You can wind the spring, but it can’t unwind backwards. That’s the clicking you hear when you wind a watch.
-   **Going train.** The gears from the barrel to the escapement. The **centre wheel** turns once an hour (it carries the minute hand). The **fourth wheel** turns once a minute (the seconds hand). The **third wheel** sits between them. Big gears are *wheels*, little ones are *pinions*, and a pinion’s teeth are called *leaves*, because watchmakers.
-   **Escapement.** The clever bit. Left alone, the spring would spin the train round in a second. The **escape wheel** and the **pallet fork** let it move one tooth at a time, tick, tock.
-   **Balance and hairspring.** The heartbeat. A little wheel on a spiral spring swings back and forth at a steady rate. Each swing flicks the pallet fork and lets one tooth go. Mine swings 2.5 times a second: 18,000 beats an hour.
-   **Motion works.** Under the dial, a small 12:1 gear set, so the hour hand goes round once while the minute hand goes round twelve times.
-   **Jewels.** Tiny synthetic rubies used as bearings. Less friction, and they don’t wear out.
-   **Bridges and cock.** The plates screwed over the top that hold the wheels in. The one holding the balance is called the cock, and no, I didn’t name it.
-   **Keyless works.** The crown and stem for winding and setting the time. My watch has the stem and crown, and leaves the rest for another day.

That’s it. A spring, some gears, a gate and a heartbeat. Simple, until you try to build one.

## A little bit of history

The balance and hairspring go back to Christiaan Huygens in 1675. Before that, a watch was lucky to be right to within the hour.

Then came the longitude problem. Ships could work out how far north they were from the sun, but not how far east or west. For that you need to know the time back home, exactly, after weeks at sea. In 1714 the British government offered a fortune for a solution. A Yorkshire carpenter called John Harrison spent most of his life on it, and his sea watch, H4, crossed to Jamaica in 1761 and came back only a few seconds out. That’s the Harrison that Del Boy found in the garage, or near enough.

The escapement in almost every mechanical watch today goes back to Thomas Mudge’s lever escapement from the 1750s. The Swiss refined it in the 1800s into the **Swiss lever**, and that’s the one I built. Omega’s co-axial escapement, designed by George Daniels, is a famous cousin of it.

What gets me is this. Two hundred and fifty years later, a few hundred bits of metal and a spring still keep time to a few seconds a day, with no electronics at all. That’s what I wanted a database to understand.

## The plan: model the metal, not the maths

If you read my Feynman safecracker article, you know the trick. I don’t write equations for how a watch works. I draw the parts as shapes and let the database bump them into each other.

Every part is a polygon: a gear, a pallet stone, a click. Then I ask one question, over and over: **do these two shapes overlap?** In SQL Server that’s `STIntersects`.

Take the escapement. Turn the escape wheel a tenth of a degree, turn the pallet fork a tenth of a degree, and ask: do they overlap? Do that for every combination and you get a map of every position where the parts *can* be. Store that map once. After that, running the watch is just a search through a table: from where I am, where can I go next?

Nothing in the code says “the ratio is 8” or “the wheel advances 12 degrees a beat”. Those numbers fall out of the shapes. If I get a tooth wrong, the watch jams, just like a real one.

Two rules:

1.  **The database does the physics.** Python only draws what the database worked out. It never decides anything.
2.  **Everything gets checked twice.** A separate Python copy of every shape and every rule (I call it the mirror) does the same sums with different software. If the two disagree by more than a rounding error, I’ve got a bug.

## Part 1: SQL Server 2025, in 2D

I split the watch into four jobs and gave SQL Server one at a time. All four worked, and all four matched the Python mirror.

## Episode 1: the escapement

The heartbeat first, because it’s the hardest. SQL Server asked about 97,000 “do these overlap?” questions in about 6 seconds and stored the answers as maps. Then a solver drove the balance back and forth and let the fork and the escape wheel go wherever the metal allowed.

What came out was a real escapement. Each beat the wheel locks on a stone, gets pushed back a fraction (the *recoil*, −0.2°), gives the fork its kick (the *impulse*, about 10° of wheel) and then drops on to the other stone. It moves exactly **12° a beat**. Nobody told it 12.

![Episode 1: the escapement, every frame worked out by SQL Server Spatial](/images/medium/1_2dYrKzT8QCr3kEx3Dhn6Kg.gif)
*Episode 1: the escapement, every frame worked out by SQL Server Spatial*

## Episode 2: the going train

Watch teeth are a funny shape for a reason. The sides of a wheel tooth are an *epicycloid*: the curve traced by a point on a coin rolling round another coin. I built proper ones, and some naive straight-sided ones to compare.

The database turned each wheel a sliver at a time and worked out how far the next pinion had to move to stay clear. From that alone the ratios came out at **exactly 8, 7.5 and 10** on average. With the proper teeth the speed wobbles by a percent or so within each tooth. With straight teeth it swings by **±32%**, and the little 8-leaf escape pinion jams solid. So that’s why watch teeth look like that.

![The going train](/images/medium/1_i_avYty2kY2Cr3yxM-qF-Q.gif)
*The going train*

![The Train Ratio](/images/medium/1_R-7WUyRu_lppQGAhiUtBkw.png)
*The Train Ratio*

## Episode 3: power

The click only lets the ratchet turn one way. I never wrote “one way” anywhere: the teeth simply block the other direction. It clicks 36 times a turn, and if you let go mid-wind it slips back 10.9° before it catches.

The mainspring was my favourite. Watchmakers have an old rule of thumb that a spring works best when it fills about half the barrel. The database measured spiral lengths with `STLength`, tried springs of every length, and found the best one filled **49.6%**. It rediscovered an old watchmakers' rule by measuring string. That spring gives 6.36 turns of the barrel, which is about **51 hours** of running.

![Power — racket and click](/images/medium/1_blDzH3xlLhBYCdjxck-ahw.gif)
*Power — racket and click*

![Episode 3: try every length of spring, measure how many turns you get, and the best one fills half the barrel.](/images/medium/1_WwzzgcLNzBeg1f3HiN32oA.png)
*Episode 3: try every length of spring, measure how many turns you get, and the best one fills half the barrel.*

## Episode 4: the motion works

The hour hand sits on a wheel that has to land back exactly on the centre of the watch, after going out to a second arbor and back through two different gear sizes. The database placed it **4.4 × 10⁻¹⁶ mm** off centre. That’s a few billionths of the width of an atom, also known as floating-point dust. The minute hand went round 12.0 times for each turn of the hour hand, and again, nothing in the SQL says 12.

![The motion works — this isn’t faking a watch, it is a watch](/images/medium/1_6hKgfpX1V9QD8Ypnwrw_Qw.gif)
*The motion works — this isn’t faking a watch, it is a watch*

![Episode 4: with proper teeth on both gears, the motion works don’t wobble at all.](/images/medium/1_x-1PiVjgwpuigAmeV4Q4bw.png)
*Episode 4: with proper teeth on both gears, the motion works don’t wobble at all.*

So far, so good. SQL Server did everything I asked. It was just getting slower and slower, and I was writing more and more code to work round things that weren’t there.

## Where SQL Server ran out of road

Here’s the thing, SQL Server 2025 can draw a watch. It can’t build one. And it made me work very hard just to make a gear go round.

## There’s no way to turn a shape

A watch is things going round. To turn a gear by 3° you need a rotate function. SQL Server’s `geometry` type doesn't have one. No rotate, no move, no scale, no affine transform of any kind. So I wrote my own, `dbo.fn_Affine`, and it took three goes:

1.  **Walk the points in a CTE.** One animation took **3 minutes 16 seconds**.
2.  **Walk the points with** `**STPointN**`**.** 90 ms a wheel from a variable, but **600 ms** a wheel from a table column, because every single `STPointN` call re-reads the whole shape.
3.  **Edit the text.** Turn the shape into WKT, split it at the commas, do the sums on every `x y` pair, and glue it back together. **160 ms** a wheel.

Version 3 is the one I kept. Here’s its heart:

```sql
SELECT @out = STRING_AGG(CAST(CONCAT(p.Head,
                  LTRIM(STR(@a * c.X + @b * c.Y + @xoff, 24, 6)), ' ',
                  LTRIM(STR(@d * c.X + @e * c.Y + @yoff, 24, 6)), p.Tail) AS varchar(max)), ',')
              WITHIN GROUP (ORDER BY s.ordinal)
FROM STRING_SPLIT(@g.STAsText(), ',', 1) AS s
-- ... find where each number starts and stops, multiply, put it back
```

Yes, really. In SQL Server 2025, the fastest way I found to rotate a gear is to rewrite it as a string.

## Moving things costs more than working them out

The escapement’s solver ran a whole sequence in **76 ms**. Saving the moving shapes so Python could draw them took **20 seconds**. The gear train was worse: **64 seconds** of `fn_Affine` to store one animation. The thinking was quick. The turning was slow.

## No way to build a shape from points

There’s no “make a line from this list of points”. Every gear tooth, every spring, every spiral was built by gluing numbers into WKT strings and parsing them back. And `STBuffer` chooses its own corners, so even a plain circle had to be built point by point to keep the Python mirror exact.

## And there is no 3D. At all.

This was the one that ended it. SQL Server’s `geometry` will happily *store* a Z value. Then every single method ignores it. There are no solids, no way to extrude a shape into a block, no triangles, no 3D "do these overlap?", no 3D rotation. Nothing.

Bartosz’s watch spins in three dimensions and comes apart in layers. A gear sitting above another gear isn’t a clash, it’s how watches are made, and SQL Server can’t tell the difference.

So I had a choice. Stop at a flat watch, or move house. I moved. I didn’t want to: SQL Server is where I build everything. But the features simply aren’t there.

## Part 2: PostgreSQL and PostGIS, in 3D

I already had PostgreSQL 18 on my machine, with PostGIS 3.6, the spatial extension. Moving in was quick. The first thing I did was rotate the same gear I’d been fighting with in SQL Server. `ST_Rotate`. One line. Done.

## Building the watch

The movement is 26 mm across and seen from the dial, with the crown at 3 o’clock. The barrel sits at 11, the fourth wheel at 6 (it carries the little seconds hand), and the escapement and balance work round to 9. Where each wheel goes comes from the tooth counts, not from me: two gears that mesh have to be exactly their two radii apart.

Every part is made of pieces, and every piece is a flat shape given a thickness. That’s how real watch parts are made: cut out of flat metal. PostGIS turns each one into a proper closed 3D surface made of triangles, which it calls a **TIN**:

-   `ST_TriangulatePolygon` cuts the top and bottom faces into triangles, holes and all.
-   `ST_DumpSegments` walks round the edge, and each edge becomes two triangles of wall.
-   `ST_Affine` puts the finished solid where it belongs in 3D.

That’s **34 parts, 107 pieces and 90,836 triangles**, built in under a second. Every solid is watertight, and every one’s volume, worked out from its triangles, matches area × thickness to twelve decimal places.

## Does anything share space?

The database checks every pair of pieces. The first time I ran it, it found four tiny overlaps. All four were places where something is pressed on to a shaft: the three hands on their pipes, and the hairspring on the balance. A circle in a database is really a polygon with corners. The hole had 48 corners, the shaft had 32, and their corners poked through each other by a couple of thousandths of a millimetre. I made the holes a whisker bigger, the way a watchmaker would. **Zero clashes.**

## The database takes it apart

This is the bit I like, Nowhere did I type in the order to take a watch apart. Every round, each part tries to slide straight out, away from the main plate. If nothing in its way is still in the watch, out it comes.

![The order in which you need to dismantle](/images/medium/1_5rcw8pWuQdQb53fSNSx9Kg.png)
*The order in which you need to dismantle*

Two things it worked out that I never told it. The pallet bridge screw can’t come out with the others, because its head sits underneath the balance wheel. And the centre wheel comes out last, because the barrel and the fourth wheel both lie over it. That’s exactly what a watchmaker would tell you.

The stem lies sideways, so it can’t come out up or down. To spot that, PostGIS needs a real 3D test, `ST_3DIntersects`, because a sideways rod and an upright plate don't line up in any flat view.

Those rounds then become the exploded view. The longer a part has to wait, the closer it stays to the main plate. A small web page using three.js draws exactly the triangles PostGIS made, and you can spin it round and pull it apart with a slider, just like Bartosz’s.

## Then I made it run

I ported Part 1’s escapement solver and gear maths to PostgreSQL, and pointed them at the 3D watch. The balance swings 2.5 times a second. The escapement lets the escape wheel step forward. Every other wheel follows it back through the gears to the barrel, and the motion works carry the hands round.

One minute is 300 beats and 30,901 frames, and PostgreSQL works out every one of them. After exactly one minute:

![](/images/medium/1_I0dWi3Wt5a--PbJ1ja0M-A.png)

Once again, nothing in the SQL says 60. The seconds hand did one exact turn because the teeth said so.

One detail made me smile. A hairspring doesn’t spin with the balance. Its inside end turns and its outside end is pinned, so the coils breathe in and out. The database builds 23 shapes of the spring, one for every 10° of swing, and the viewer picks the right one for each frame.

And the checks? All 30,901 frames are identical to the Python mirror. The first 413 are identical to SQL Server’s run from Part 1, to the last decimal. Two different databases, one escapement.

## Fair’s fair: PostGIS wasn’t perfect either

I don’t want this to read like a fan letter, so here’s where PostgreSQL made me work too.

-   **The 3D add-on was far too slow.** PostGIS has an optional extension, SFCGAL, for true solids: volumes, 3D overlaps, solid booleans. It uses exact arithmetic, which is lovely for correctness. On my machine, the volume of one simple 160-corner prism took **20 seconds**, and testing two gears for overlap didn’t finish in a minute. A watch has 107 pieces. So I didn’t use it at all. PostGIS’s own fast functions did everything instead.
-   **There’s no way to make a triangle from numbers.** To build each solid’s TIN, I had to write it out as text, `TIN Z (((...)))`, and let PostGIS read it back. Yes, that's the same trick as `fn_Affine`. The difference is I do it once per solid, not every time something moves.
-   **Some of the 3D was really 2D.** When two parts are both upright, “do these overlap in 3D?” splits into a flat overlap plus “are they at the same height?”. SQL Server could do that much. The genuinely 3D work is building the solids, placing them, triangulating them, and the sideways stem.

Even so, there’s no contest. Everything I needed was there, and it was quick.

## The race

Turning the same gear 100 times took SQL Server **21 seconds** and PostGIS **under 3 milliseconds**. Here’s everything I could time like for like, on the same machine.

![](/images/medium/1_U7NboglZrgnKOvRlslIv4g.png)

In fairness, the jobs aren’t perfectly identical. I trimmed the gear shapes differently in each, for example. But a gap of 7,500 times isn’t about trimming. It’s about having a rotate function.

## Dear SQL Server spatial team

I love SQL Server. I’ve built everything from Doom to my own head in it. Its spatial types are solid and dependable, and for maps and postcodes they do the job well. But I think they’ve been left behind.

As far as I can tell, the `geometry` type hasn't had a major new feature since SQL Server 2012. SQL Server 2025 brought vectors for AI, a native JSON type and regular expressions, all very welcome. Spatial got nothing. Here's what I needed for this watch, and where I found it:

![What the SQL Server team can improve on](/images/medium/1_EbZALnVoNjkQoUJPsfR2hA.png)
*What the SQL Server team can improve on*

So, my questions, as nicely as I can put them:

1.  **Where are these features?**
2.  **Are any of them on a roadmap?**
3.  If not, **could they be?**

Even just the first two rows would have turned my 21 seconds into milliseconds, and I’d have happily stayed home. The last five rows are the difference between drawing a watch and building one.

If anyone on the team reads this, my inbox is open. I’ll even send you the watch.

## Credit where it’s due: PostgreSQL and PostGIS

A big thank you to the PostgreSQL and PostGIS teams. Many of the people behind them are volunteers, and they’ve quietly built the best spatial database there is, then given it away.

Here’s how it works, as simply as I can put it:

-   **PostgreSQL is built to be extended.** Anyone can add new data types, new functions and new kinds of index, and they work as if they’d always been there.
-   **PostGIS is one of those extensions.** It adds the `geometry` type (2D and 3D, including TINs and solids), a few hundred `ST_` functions, and spatial indexes. You switch it on with one line: `CREATE EXTENSION postgis;`
-   **It doesn’t do all the maths itself.** The heavy 2D geometry goes to **GEOS**, an open-source geometry engine. That’s the same engine inside Python’s shapely, which my mirror uses. **PROJ** handles map projections (a watch doesn’t need those), and the optional **SFCGAL** handles exact 3D solids.
-   **For logic, there’s PL/pgSQL.** The escapement solver is a loop over arrays in PL/pgSQL, and it solved 300 beats in 0.28 seconds.

One footnote. Because shapely and PostGIS share GEOS, my mirror is less independent in Part 2 than it was in Part 1. It still catches mistakes in my SQL, which is most of what it’s for. And the escapement had a fully independent check: its first 413 frames match SQL Server’s run exactly, and SQL Server doesn’t use GEOS at all.

## Wrapping up

I set out to build a watch without picking up a screwdriver, and I’ve ended up with one I can spin, pull apart and watch tick. Every shape, every position, every clash check, the order it comes apart in and every one of the 30,901 frames came out of a database.

What I learned:

-   **Model the metal still works in 3D.** I never told the database how a watch comes apart, and it worked it out like a watchmaker would.
-   **SQL Server 2025 can think in 2D, but it can’t move or build.** No rotate and no 3D meant a lot of clever workarounds and a lot of waiting.
-   **PostgreSQL and PostGIS had everything I needed,** and they were thousands of times quicker at the thing a watch does most: going round.

Next up, maybe the rest of the keyless works: the winding wheels and the crown wheel, whose teeth stick out sideways. That’s genuinely 3D, and I know which database I’ll be using.

All the code is going on GitHub: the SQL for both databases, the Python mirror, the checks and the viewer.

> [https://github.com/sqlartist/watchmaker-sql](https://github.com/sqlartist/watchmaker-sql)

Del Boy found his millions in a garage. I found a rotate function in PostgreSQL. I know which one I’d rather have, but I know which one I’ve actually got. Lovely jubbly. Give the story a few claps if you liked it.

![THe complete watch assembly](/images/medium/1_FPlM81GuoAE2dYowsgbChA.gif)
*THe complete watch assembly*
