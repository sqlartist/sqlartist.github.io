---
title: "Bah, Hum-bug: I Built a Christmas Villain Tracker in SQL Server"
subtitle: "Every December, NORAD tracks Santa. This year, somebody needed to track the AI that's trying to stop him."
date: 2026-11-15T12:00:00.000Z
cover: "/images/ai-scrooge.jpg"
tags: ["SQL Server", "Christmas"]
runSteps: "Open the tracker, open any December door and copy Today's SQL into SSMS. Every snippet runs on its own in tempdb on SQL Server 2025."
era: "Today"
draft: false
---
![E.B.E.N.E.Z.E.R. in his counting house, Slough](/images/ai-scrooge.jpg)
*Surveillance still: the counting house, Slough. Note the coins. And the internet. Please don't touch the internet.*

---

I've been building a spatial workbench for SQL Server 2025. It's a proper, sensible tool: geometry, geography, vector search and over a hundred demos. Somewhere along the way it learnt to animate, and once a database can animate, you start looking for something to animate.

My first thought was live ships and flights moving across a globe. For reasons I won't bore you with, that's not something I wanted to put on the internet. I wanted something fun instead. Something a bit like the NORAD Santa Tracker, which has been cheering people up since 1955, when a newspaper misprint sent children's phone calls to a military hotline and the colonel on duty played along.

So I decided not to track Santa. I'd track the villain.

## Finding a villain

The obvious candidate is green, lives up a mountain and belongs to somebody else's lawyers. So that was out.

Scrooge was the next thought. Dickens has been out of copyright for a long time, and "Bah, humbug" is about as Christmas as a catchphrase gets. But there's a Scrooge film out at the moment, and I didn't want to look like I was riding on that.

What I wanted was a villain for *now*, and the villain of now is obvious. It's AI. I wrote it down as "The AI Man: here to ruin Christmas", then pointed out to the AI helping me build it that no offence was intended. It took it well.

We met in the middle. He's **AI Scrooge**, and his full name is **E.B.E.N.E.Z.E.R.**: the *Efficiency-Based Electronic Neural Engine (for) Zeroing Every Request*. He thinks Christmas is wildly inefficient. One man, one sleigh, one night, two billion deliveries and no KPIs. His catchphrase is "Bah, hum-bug", because a man who's mostly software would say that.

## His December

The tracker follows him through December, one day at a time. He opens in a data centre in Slough, because of course he does. Then he goes round the world trying to optimise Christmas out of existence:

- He launches **Project Hum-bug** in Rovaniemi.
- He replaces the reindeer with drones in Tromsø.
- He tries to cancel the sunrise at Stonehenge on the solstice.
- He review-bombs the Edinburgh Christmas market.
- He shows up at Times Square for a big announcement that doesn't go to plan.

Brian is my dachshund. He's been with us since the end of September, so he's a puppy and therefore extremely important. He foils AI Scrooge twice. On Boxing Day the villain turns up in Watford with a belated present to say thank you. Brian ignores the present and sleeps in the box.

Dickens gets his due as well. The decommissioned server in the corner turns out to be Marley, switched off seven years ago and never collected. Then come the three spirits:

- **Christmas Past** is a beige 1995 desktop that whirs into life with a dial-up screech.
- **Christmas Present** is a smart speaker the size of a wardrobe, playing every Christmas song at once.
- **Christmas Yet to Come** is a loading spinner. It doesn't say anything. It just spins.

If you've ever waited on a progress bar at 4pm on Christmas Eve, you'll know which one frightened me most.

## Christmas Eve

On the 24th it becomes a proper tracker. Santa leaves the North Pole and arrives at each city as its local midnight comes round, crossing the globe from east to west. AI Scrooge leaves forty minutes later and spends the whole night chasing him.

It's all real great-circle maths on a spinning globe. Santa's position is worked out from the time zones, which is far more work than it sounds. I'll let you find out for yourself who wins.

There's also a letters page. You can write to AI Scrooge and tell him what you want for Christmas, and he replies at once. That's the only efficient thing about him.

## The bit for SQL people

This is where it stops being only a joke.

Each day of the advent calendar has its own piece of SQL that acts out that day's joke. The drone geofence is a real `STDifference`. The Christmas Eve chase is real slerp interpolation written in T-SQL. The Edinburgh review-bombing catches fake reviews with a polygon round the market, because they came from nowhere near it. The elves unionise and we draw the picket line with `ConvexHullAggregate`.

Every snippet is self-contained and runs in `tempdb`. I was firm about that. No install scripts, no sample database, no "first run these eleven setup files". Open the door, copy the SQL into SSMS, press F5. If you open a door every day you've worked through 27 small lessons by Boxing Day, covering geography, circular arcs, the new `VECTOR` type, `REGEXP_LIKE` and the JSON functions. You won't have noticed you were learning.

Here's Boxing Day, in full:

```sql
USE tempdb;
SET NOCOUNT ON;
DECLARE @box geometry = geometry::STGeomFromText('POLYGON ((0 0, 60 0, 60 40, 0 40, 0 0))', 0);           -- centimetres
DECLARE @present geometry = geometry::Point(30, 20, 0).STBuffer(6);                                         -- one squeaky drone
-- 60 cm of dachshund, plus a head
DECLARE @brian_long geometry = geometry::STGeomFromText('POLYGON ((-2 14, 58 14, 58 26, -2 26, -2 14))', 0).STUnion(geometry::Point(62, 24, 0).STBuffer(6));
DECLARE @brian_curled geometry = geometry::Point(30, 20, 0).STBuffer(18);
SELECT pose, [fits in the box?] = shape.STWithin(@box), [area cm2] = ROUND(shape.STArea(), 0), shape
FROM (VALUES ('the present', @present), ('Brian, stretched out', @brian_long), ('Brian, curled up', @brian_curled)) AS v (pose, shape);
-- He prefers the box. WOOF bless us, every one.
```

Click the Spatial results tab in SSMS and you'll see him.

The doors unlock day by day from 1 December, as an advent calendar should. If you can't wait, there's a sneak-preview switch. I won't tell anyone.

## The portrait

Regular readers know every image in my articles is obviously AI-generated and has my face on it. E.B.E.N.E.Z.E.R. is no exception. He's a robot in a frock coat at a desk covered in coins. Behind him there's a small black box with a red light on top.

That's the internet. The whole thing. If you've watched *The IT Crowd* you'll already know. Please don't touch it.

## A joint effort

I should be upfront about this, given the subject matter. I built this with Claude. I came up with the idea, the villain, the jokes I'm proudest of and the dog. Claude did a great deal of the globe maths and the T-SQL, plus some of the jokes I'm now claiming were mine.

I'm aware of the irony of using an AI to build a tracker for an AI villain. It played the villain with suspicious enthusiasm.

## Go and track him

The tracker is live on my site: **[sqlartist.github.io/ai-scrooge-tracker](/ai-scrooge-tracker/)**

If you can't wait for December, the whole story is also a three-minute cartoon, rendered by SQL Server: **[Bah, Hum-bug!](/posts/bah-hum-bug/)**

AI Scrooge boots up on 1 December. Santa leaves on Christmas Eve. Brian, as always, will be asleep in a box.

Bah, hum-bug.
