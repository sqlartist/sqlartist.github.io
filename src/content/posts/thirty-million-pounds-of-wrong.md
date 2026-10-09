---
title: "Thirty Million Pounds of Wrong"
subtitle: "How a warehouse with the plan upside down taught me everything I know about data and why I’m rebuilding an AS/400 inside SQL Server thirty years later"
date: 2026-09-15T12:36:04.070Z
cover: "https://cdn-images-1.medium.com/max/1400/1*H8u5J3oKUGsI8xn2PZEs9w.jpeg"
tags: ["SQL Server", "Retro Computing", "Life"]
mediumUrl: "https://medium.com/@trevor.dwyer/thirty-million-pounds-of-wrong-f7e212603138"
era: "1990s"
draft: false
---

The warehouse moved, and the planners got the plan upside down.

![One can dream can’t they…](https://cdn-images-1.medium.com/max/1400/1*H8u5J3oKUGsI8xn2PZEs9w.jpeg)
*One can dream can’t they…*

That’s the whole story. Everything after it is consequences. Three million computer parts went into a new building back to front — the heavy, awkward stuff upstairs in bins that were never sized for it, and the small, light, valuable components downstairs by the doors. Easy to find. Easy to walk off with.

Nobody did it maliciously. Someone drew a layout, someone else read it the wrong way round, and by the time anyone noticed, three million items were already in the wrong place. You can’t flip a warehouse. You live with it.

Here’s the part that mattered. The brand new inventory system recorded all of it faithfully.

## The gap

We’d just gone live on an AS/400. It knew where every part was meant to be, and it was completely confident about it. What it didn’t know was where anything actually was.

I’ve got the sort of memory that holds pictures. It’s not a skill, I didn’t earn it, it just happens to be how my head works — and in a warehouse with the plan upside down it turned out to be worth something. I could walk to a bin. I didn’t need to look it up, and more to the point I’d learnt not to trust it when I did.

So for a while I was the reconciliation layer between a computer and a building. The system was the authority. I was the correction.

That’s why I got promoted to Team Leader, and then put in charge of two areas. Not because I was good with computers. Because I could tell you what was true.

## Peter

I got good with the AS/400 too — and I got good at it before everyone else did, which was its own quiet advantage. When you’re the person who understands the system in a room full of people who don’t, you stop being a storeman fairly quickly.

But I didn’t get there on my own, and I’m not going to pretend otherwise. Peter Kerrison was the manager of Inventory Control and he showed me everything. His knowledge seemed to have no bottom to it. Every time I thought I’d found the edge of what he knew there was more behind it, and he never once made me feel stupid for asking.

I’m still grateful. Years later, when I had my first brush with cancer, it was Peter’s wife Dawn who gave me advice and what I needed to know. You don’t repay that. You just try to be the person who does it for somebody else.

## Just under thirty million pounds

At twenty I was handed the job of getting the stock into shape. I ended up adjusting nearly £30 million off the stock holding.

I want to be precise about that number, because the exciting version is wrong. Most of it wasn’t theft. The bulk of it was onsite balances that hadn’t carried across correctly through the changeover of the main systems; stock that the ledger insisted was ours, sitting in a location that had never really been true in the first place.

Some of it had genuinely gone. High-value kit turning up in engineers’ lockers. Things left in the pocket of an anti-static coat and honestly forgotten about. That happens in any warehouse and it’s mostly absent-mindedness rather than villainy.

But the headline is the boring bit, and the boring bit is the whole point: the system was confidently reporting something that had never been the case. My job wasn’t to find thirty million pounds of missing kit. It was to stop the books lying.

I’ve been doing some version of that job ever since.

## Sixteen thousand, three hundred and eighty-four

Excel 5.0 would hold 16,384 rows. My extracts from the AS/400 were longer than that.

That’s it. That’s why I learnt SQL Server. Not vision, not a career plan — an arbitrary limit somebody in Redmond picked because it’s two to the fourteenth, and it happened to sit exactly between what I had and what I needed. Thirty years of my working life turn on that constant.

I was the first person in the company to get a 486 on my desk. I used it to build my own inventory system, deliberately air-gapped from the AS/400, to model where the losses were coming from. That air gap was a decision, not an accident. If you’re the man telling everyone the system of record is wrong, you cannot also be the man with his hands in it. I needed my numbers to be arguable on their own.

Then I got round the AS/400 team.

Everybody’s process at the time was to ask them for a CSV extract and wait. I connected to it directly with OLE-DB instead and pulled the data myself, overnight, automatically. Nobody had done that. It reads like a technical footnote and it wasn’t — it was a political act. I stopped requesting the data and started taking it.

## The beta version

I was also the first person in the company to be given a personal laptop: a Toshiba Tecra running Windows 3.1. Stephen McKenna — the management accountant, and the man I sat directly in front of — banned me on the spot from installing anything that so much as resembled Windows 95.

He wasn’t being a dinosaur about it. Stephen loved technology as much as I did. But it was a work machine, and he was the one accountable for it, and he was right.

Over one weekend, with no internet, no documentation and very nearly no idea what I was doing, I dual-booted that laptop anyway. Work image on Windows 3.1, an early Windows 95 build alongside it. I built the dashboard at night on 95 and came in each morning to a machine that would boot into the forbidden operating system in full view of the man who’d forbidden it.

My habit until then had been to walk in, hit the power button and go straight for a coffee. I had to break it. Every single morning the first thing I did was stand at my own desk waiting for a boot menu, because the alternative was Windows 95 quietly appearing on a screen a few feet in front of Stephen’s face.

The dashboard was an automated overnight extract from the AS/400 — every stat from the night before, laid over a map of the UK, animated. I finished it and demonstrated it, and on the same day, in the same breath, I told them the whole thing had been built on the Windows 95 they’d banned. Which by then was the biggest software launch the world had seen.

I’d like to say I planned the timing. I did.

## Where you sit

The demonstration went up the chain to Sean Francombe — Stephen’s boss, and the main man. What came back wasn’t a bonus or a certificate. It was a desk.

I got a seat next to him.

That’s a strange thing to be proud of until you’ve been a storeman. In my first proper job, in a blue uniform, in a building where the plan was upside down, the reward for being right about the data was that I got moved to sit next to the person who ran the place. I don’t think anything since has meant as much.

## The car I never drove

Computacenter’s colours were silver and blue.

A friend of mine was selling a Lotus Sunbeam — a Talbot Sunbeam with a Lotus engine in it — and it was silver and blue. So I bought it.

I can’t drive. I have never learnt to drive. I did not, at any point in this process, learn to drive.

It sat on my driveway for two years. I started it once.

![Not my actual car, but this was it. Company colours.](https://cdn-images-1.medium.com/max/1400/1*AB0wyDarTK9BhB8bx8l0MA.jpeg)
*Not my actual car, but this was it. Company colours.*

## April 1999

In April 1999 Bill Gates launched a Microsoft initiative called Shift, aimed at a UK IT skills shortage — 600,000 internet-related jobs to fill by 2002. The BBC covered it, and I was one of the case studies.

![BBC News Online screenshot, “UK shifting into IT skills”, 28 April 1999](https://cdn-images-1.medium.com/max/1400/1*s7yO2zjs7ZbA23EmtfgAsg.png)
*BBC News Online screenshot, “UK shifting into IT skills”, 28 April 1999*

> Trevor Dwyer was a warehouse storeman who transferred to Inventory Control and learned about databases. Four years later, he is one of the most experienced database designers in the country and has been commissioned to write three books on the technology.

![the printed case-study list](https://cdn-images-1.medium.com/max/1400/1*ze56MEjsQQIqQ-yqBLO-yQ.png)
*the printed case-study list*

Around the same time I got a phone call from Redmond telling me I’d been given the MVP award. They’d been watching my contributions online and noticed I’d gone from asking a few questions to answering a great many.

The email I kept from that week isn’t from Microsoft. It’s from Peter:

> “Trevor ‘Storeman to award winning author’ Dwyer. Very good article but missing 1 key sentence.”

> After one year at Computacenter, Peter Kerrision, then manager of Inventory Control, recognised that behind the blue uniform which Trevor wore with pride, was an Essex Boy suit trying to get out. The gamble paid off, Trevor ignored convention and decided against sleep for 4 years. The result was a ghostly pale appearance but proved to be the foundation on which Trevor would progress through the company…..  
> It should finish.

Stephen replied to it:

> I’m with Peter on this one… where are our names… after the amount of time we spent cleaning up the stores after your time in there surely the article should be about us!!!!!

Fair, honestly.

![Printed from Lotus Notes in 1999. I’ve still got it.](https://cdn-images-1.medium.com/max/1400/1*kw-G0ycCOFF8vPHP1uhfHw.png)
*Printed from Lotus Notes in 1999. I’ve still got it.*

Philip Hulme, who’d founded the company with Peter Ogden, took an interest after that. He’d bought a majority stake in Marcos in 1991 — the sports car outfit — apparently after remarking to Chris Marsh how nice it must be to make cars for a living. Which tells you something about him. At one point I found myself sat on a grass bank at Silverstone next to him, watching his team go round.

## Thirty years on

I’m at \[Somewhere that cannot be named\] now, on a team that takes what the source systems say and works out what’s actually true before anyone downstream gets to see it.

It’s the same job. It’s the warehouse. Something upstream is confidently wrong, and somebody has to sit between the system and reality and do the reconciliation.

So a few weeks ago I started rebuilding the AS/400 inside SQL Server 2025.

## You can’t emulate one, so don’t try

A real machine is TIMI over SLIC — a technology-independent machine interface sitting on top of the Licensed Internal Code. Programs compile to a virtual instruction set and get translated underneath. To boot OS/400 objects you’d need the machine interface fully specified and the Licensed Internal Code itself. The first is only partly public. The second is IBM’s and not mine to run.

So: a clean-room re-implementation from IBM’s published DDS, CL and RPG references. Which sounds like a compromise but it turned out to be the better project, because what made that machine interesting was never the instruction set.

## DDS has no grammar

Here’s the thing that stopped me.

Screens and files are defined in DDS, and DDS is column-positional. Not “mostly fixed format” — the meaning of a character is decided entirely by where it sits.

![One DDS statement. The meaning of a character is decided by where it sits.](https://cdn-images-1.medium.com/max/1400/1*XUGKd395X6Y72tTYSAHlPg.png)
*One DDS statement. The meaning of a character is decided by where it sits.*

So the DDS parser is six \`SUBSTRING\` calls. There’s no tokeniser, no grammar, no error recovery. I’ve spent an embarrassing share of my career writing parsers. This one took an afternoon.

It’s worth sitting with why. In 1988 you typed source into SEU on a block-mode terminal with a column ruler across the top. Columns weren’t a limitation of the format. Columns \*were\* the interface.

## A 5250 screen is a projection, not a drawing

Every field in a display file already carries its own line and position. So rendering a screen isn’t painting, it’s a query: turn every field into a write, explode each write into characters, let later writes win where they overlap, left join onto the full 24×80 grid and aggregate each row back into a string.

Nothing draws anything. No loop, no buffer, no cursor.

And subfiles — the scrolling record lists that make a green screen feel like a green screen — fall straight out of it. Subfile record \*n\* is the same fields one line further down. The page size is a \`WHERE\` clause. I’d budgeted days for subfiles. They were about twenty lines.

The same thing happened with record-level access. \`CHAIN\`, \`SETLL\`, \`READE\` aren’t a rival access method I had to bolt onto a relational engine — they’re an index-positioning API. A keyed physical file is an index. When \`SETLL\` runs it isn’t faking one, it’s driving the real one.

![The INQ100 screen](https://cdn-images-1.medium.com/max/1400/1*C96ynUmGSP4nHYz_4dx7LQ.png)
*The INQ100 screen*

## The same bug, thirty years later

Then I wrote a bug that stopped me cold, because I had encountered it before.

Deleting a record left the file pointer sitting on the record it had just deleted. The next read then had nothing to compare against, so it returned nothing and reported end of file.

Think about what that does. A read-and-delete loop processes its first record, deletes it, and stops. No error. No exception. Nothing in the log. It looks exactly like a loop that ran correctly and found one record to do. You would only ever catch it by counting rows afterwards, and you’d probably assume your filter was wrong.

A system confidently reporting something that was never true.

That is the warehouse. That is the thirty million pounds. Same failure, thirty years and one career apart, and this time I wrote it myself.

I want to be honest about how it was caught, because it wasn’t by running the thing. I couldn’t run SQL Server where I was building this, so I’d written a second implementation of the same logic in another language whose only job was to disagree with the first. It disagreed. That’s the whole technique and I’d recommend it — not tests that confirm what you meant, a second opinion that doesn’t know what you meant, almost like having Peter back in the room questioning my logic.

## Why this one is different

I’ve put Doom inside SQL Server. Elite. The Amiga Boing ball. Those work because SQL is the wrong tool, and the wrongness is the joke.

This isn’t.

In 1988 IBM shipped a database-centric operating system. Everything is a typed object in a system catalog. The database isn’t a product installed onto the OS — it’s part of it. Programs are objects. Files are objects. Commands are objects with parameter lists, which is how the machine could prompt a command you’d never seen before with F4.

So modelling an object catalog as tables, or resolving a name against an ordered library list, or driving a keyed access path — none of that is translation into something foreign. It’s the design expressed in roughly the terms it was conceived in.

Putting an AS/400 inside a database isn’t parody. It’s closer to restoration.

## The screen I wanted to see

I’m not finished. Logical files next — a second access path over the same data, with select and omit. Then the real one: parsing fixed-format RPG, storing an intermediate representation inside the program object, and generating a stored procedure from it. Which isn’t a shortcut, incidentally — it’s exactly what TIMI does, keeping the translatable template inside the object so the machine can re-translate it for hardware that doesn’t exist yet.

But the part I actually wanted is done.

You can type into it. Position to a part, roll through the file, put a 5 against a line and drop into that part’s movement history. The host sends a screen and then sits there knowing absolutely nothing while you type — it only hears from you when you press a key that matters. Thirty years on, that still strikes me as the right way round.

And I knew which screen I wanted first. It wasn’t a demo.

An inventory enquiry. Part number, bin location, quantity.

Every field correct. Every one of them wrong.

![The second AS/400 Screen.](https://cdn-images-1.medium.com/max/1400/1*X2HxsdQqya4inaBVvPcB1Q.png)
*The second AS/400 Screen.*

If you enjoyed this story please give it as many Claps as you think worthy.
