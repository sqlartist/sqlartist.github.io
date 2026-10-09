---
title: "Boing, Boing, Boing"
subtitle: "The Day My Database Learned Physics and I recreated the famous Amiga Boing Ball inside SQL Server."
date: 2026-09-07T15:17:32.901Z
cover: "/images/medium/1_CIBGf4sJ9B7c7T1Liq5Yrw.gif"
tags: ["SQL Server", "Retro Computing"]
mediumUrl: "https://medium.com/@trevor.dwyer/boing-boing-boing-f7ba95007e3f"
repo: "https://github.com/sqlartist/BoingBallSQL"
runSteps: "Clone the repository and run the scripts in SQL Server Management Studio to set the ball bouncing."
era: "1980s"
draft: false
---

![This is the Boing ball Running Inside SQL Server](/images/medium/1_CIBGf4sJ9B7c7T1Liq5Yrw.gif)
*This is the Boing ball Running Inside SQL Server*

I’ve spent the last few months putting things inside SQL Server that have no business being there. Doom renders E1M1 from a database. Elite generates its galaxy, flies its ships and docks at a Coriolis station in T-SQL. Daley Thompson’s Decathlon runs on a Z80 emulator I wrote in stored procedures, loading from a real Microdrive image.

So when I turned to the Amiga Boing ball, I assumed it’d be the easy one. A bouncing chequered sphere. No BSP tree, no galaxy generator, no cycle-accurate anything.

It was the easy one. Right up until I added a second ball and then I wish I hadn’t started.

---

## The History

The Amiga Boing Ball is a mythical object in the computer industry. It was created for a computer show to demonstrate the capabilities of the prototype Amiga (codename ‘Lorraine’). The demo showed a red-and-white spinning ball, bouncing up and down and casting a shadow on a wall behind it while multitasking in the background. The echoing deep ‘boing’ sound and left-right motion was added soon after the show was over.

According to the legend, the Boing Ball demo was written late one night at the Winter CES show in January 1984 by RJ Mical and Dale Luck. At the time it was an amazing achievement that surpassed all current systems of the time. Because the bouncing ball animation was so fast and smooth, attendees did not believe the Amiga prototype was really doing the rendering. Suspecting a trick, they began looking around the booth for a hidden computer or VCR.

The 1984 Boing Ball demo was one of the very first demos shown on the Amiga. It was specifically designed to take advantage of the Amiga’s custom graphics, achieving a level of speed and smoothness not previously seen on an affordable computer. The demo was operating in it’s own screen, allowing the higher resolution Amiga Workbench screen to be dragged down to make the Boing Ball visible from behind, bouncing up above the Workbench while the Workbench remained fully active. Since the Boing Ball used almost no CPU time (only to calculate the bounce angles — animation was handled by playfield vertical and horizontal scrolling tricks, the rotation animation was done with colour cycling in the graphics chip, and of course the sound chip handled the sound), this made a particularly impressive demonstration of multitasking at the time.

If you want to see what it looked like on the Amiga take a look here: [https://amiga.lychesis.net/applications/AmigaBoingBall.html](https://amiga.lychesis.net/applications/AmigaBoingBall.html)

---

## Three ways to do it

The first decision was which version of “the Boing ball” I was actually building, because there are three, and they’re wildly different jobs.

The most faithful option is to emulate a 68000 and the Amiga chipset and boot the original demo from its bootblock. Having just written a Z80 core, I knew roughly what that costs, and it’s an order of magnitude more: a much heavier instruction set, plus the Copper and the Blitter, before a single pixel appears. That is a serious commitment and after the ZX Spectrum Hardware project I don’t think I want to go down that route again.

The most historically accurate option is stranger. The 1984 demo doesn’t render a 3D ball at all. Dale Luck and RJ Mical drew one static checkered sphere and made it appear to spin by cycling the colour registers. The bitmap never changes. Only the palette does.

I loved that, because it’s already a database idea. Rotation isn’t animation, it’s a lookup against a different row set. They were doing a join in 1984; they just didn’t have anywhere to put it.

But I picked the third option: render the thing from scratch. Not because it’s more authentic — it’s less — but because it plays to what SQL is actually good at, and I wanted to see how far that went.

This is the thing about spheres. It’s a closed-form intersection. Under orthographic projection you don’t need a discriminant, you don’t need clipping, you don’t need to rasterise a polygon. You need \`d² = dx² + dy²\`, and if that’s inside the radius, you’ve hit it. Everything else is a normal, two rotations and a checkerboard.

That’s pure maths on a grid of pixels. Which is to say: it’s a \`SELECT\`.

---

## The bit I was pleased with

The ball’s motion is also closed form. Position is a function of the frame number — a triangle wave for the horizontal sweep, a parabola for the bounce, and spin proportional to how far it’s traveled, which means the spin reverses at the walls on its own without me writing any logic for it.

No state. Nothing depends on the previous frame.

So frames aren’t a loop. Frames are just another dimension of the cross product.

The entire animation — 64 frames, 320×256, five and a bit million pixels — comes out of one \`INSERT … SELECT\`. No recursive CTE, no \`WHILE\`, no cursor, no temp table. A chain of \`CROSS APPLY\`s you read top to bottom like a shader.

I sat looking at that for a while. It’s the most SQL-shaped thing I’ve built in this whole series. Doom needed a client and a game loop. Elite needed a flight model with state. This is one query that produces a simple moving ball.

---

## Then: Two balls

![When I got this working I thought to myself “I have achieved everything I set out to achieve in this world I can finally retire”](/images/medium/1_KIQy3q4EO9OgDTnDnHstRQ.gif)
*When I got this working I thought to myself “I have achieved everything I set out to achieve in this world I can finally retire”*

This is where it got interesting, I wanted to take it further and have two balls but colliding. Collision between objects has been the biggest problem I have encountered whilst developing in the 3D world. If you walk through an object it does not have collision. If you bump into an object then you have had to program collision. This may be obvious to some people but I had never heard of it before attempting to develop a scene of my own.

Adding a second ball is still one query. Add \*collision\* between them and the whole edifice comes down.

Not because the physics is hard. It’s relatively easy physics, equal masses, elastic, exchange the normal component of velocity and push them apart if they’ve overlapped. Twenty lines in any language.

It comes down because collision response depends on the \*previous step\*. Where ball one is at frame 40 depends on whether it hit ball two at frame 39. Position is no longer a function of the frame number, and the moment that’s true, frames stop being a dimension you can join to and start being a sequence you have to walk.

One collision. That’s all it took to destroy the property the entire design rested on.

I found that genuinely annoying given the first part had gone rather well. It is the reason I’m writing this up rather than the bigger projects. Every SQL developer gets told “think in sets, not loops” and nobody ever shows them the “Why”. Well here is the “Why”. Closed form: one statement, five million rows, no loop. Add one dependency on prior state: nothing survives.

---

## Embracing the Complexity

My first instinct was to keep everything declarative with a recursive CTE. That’s the trick, and it nearly works. But the recursive member can only reference the CTE once, and pairwise collision needs a self-join.

So I split the thing along the line where the two halves genuinely differ.

Simulation is sequential. It’s a \`WHILE\` loop. It’s also tiny — a handful of rows and a few hundred substeps — so it costs nothing. Four set-based statements per step: gravity and integration, wall reflection, then a pairwise contact resolution written as a self-join with the impulses summed per ball.

Rendering stayed set-based. It’s still one statement. It just no longer works out where the balls are; it joins to where the simulator says they were.

That’s the whole architecture. The worse SQL made the better system.

## Three Balls

Because the collision is written pairwise rather than as a special case for two, it takes any number of balls. I added a third by inserting a row. That’s it. One row in a table, and three balls bounce off each other and off the walls with correct depth ordering, because two spheres at the same depth with the same radius resolve trivially — whichever pixel is deeper into its own silhouette is the one in front.

Getting that for free was the moment the design decision paid for itself.

---

## So what’s it actually for?

As with most of my projects it isn’t a production technique. Nobody should render anything in a database (yet).

It’s useful for three other things

It’s the best teaching device for set-based thinking I’ve come across. Not the concept — everyone’s heard the concept — but the \*edge\* of it. Boing is a perfect mini example. Here’s a closed-form problem, and it’s one beautiful statement. Here’s the same problem with one sequential dependency, and it’s a loop. Nothing else I’ve built shows that transition so cleanly, because in a real system the two are always tangled together.

It finds engine behaviour that every day work never will. The \`CASE\` short-circuit trap is going straight into my mental checklist. Pushing an engine into a shape it was never designed for is how you learn where its real edges are, and those edges show up later in queries that matter.

And it’s a learning challenge in the oldest sense. There’s no spec, no acceptance criteria, and nobody’s asking for it. You just have to work out whether the thing is possible and then find out.

There’s a wider ambition behind it too. If you can emulate a machine inside a database, you can put the games in as data — cartridge images in \`varbinary\`, the machine as stored procedures — and you’ve got an archive that runs what it stores. A shelf of 1980s software living inside the same engine that’s serving your reports. I don’t know yet whether that’s a good idea. I know it’s a good problem.

---

## Where the limit is

People keep asking (I say people, but I mean me, literally no one has asked this question) whether the ceiling is Quake or a C64. I think that’s the wrong angle.

The real question is the ratio of **wide** work to **deep** work. Wide work — per pixel, per vertex, per entity — is what SQL is extraordinary at. Deep work, where each step depends on the last, is what it’s terrible at. Everything I’ve built lands somewhere on that spectrum, and where it lands predicts how well it goes far better than what decade the game came from.

By that measure Quake isn’t the wall people (I) assume. Its renderer is overwhelmingly wide work. Emulating a 68000 with a full custom chipset is almost entirely deep work, and that’s where it dies.

Boing is the extreme wide case, which is why it came out as one query. And the second I introduced a single dependency on prior state, it stopped being one.

Two balls taught me more than Doom did but I do think they are both pretty cool.

Code is avaialbe on Github  
[https://github.com/sqlartist/BoingBallSQL](https://github.com/sqlartist/BoingBallSQL)

If you enjoyed reading this story, give it a few Claps, it helps boost someones pockets — not mine these are all given away for free. In fact I don’t think anyone benefits from a Free story, in fact its costing us money. You owe us…
