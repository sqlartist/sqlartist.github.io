---
title: "Bah, Hum-bug! A Christmas Cartoon Rendered by SQL Server"
subtitle: "The AI Scrooge story in seven scenes, three minutes and about 2,100 frames, every one of them drawn by a stored procedure."
date: 2026-11-15T18:00:00.000Z
cover: "/images/bah-hum-bug.png"
tags: ["SQL Server", "Christmas"]
runSteps: "Install 07_cartoon.sql and 09_scrooge_cartoon.sql from Spatial Studio, then run demo pack 17 to render and play each scene."
era: "Today"
draft: false
---

![AI Scrooge meets Brian at the front door](/ai-scrooge-film/03-the-smart-doorbell.gif)
*Watford, 2am. The smart doorbell picks up a 120 dB dachshund.*

**[Watch all seven scenes, with the SQL behind every frame →](/ai-scrooge-film/)**

---

A few weeks ago I made a twenty-second cartoon inside SQL Server. Brian, my dachshund, chases a ball across a park. It was a test, really: could a database do the kind of card cut-out animation I grew up with on 1970s children's TV?

It could. So the obvious next question was whether it could tell a whole story.

I already had one. [The AI Scrooge Tracker](/posts/ai-scrooge-tracker/) follows E.B.E.N.E.Z.E.R. through December: his schemes, his three ghosts, the Christmas Eve chase and Boxing Day in Watford. The tracker tells it a day at a time. I wanted to see it all in one go.

## Seven scenes, not twenty-seven

The tracker has a scheme for every day of December. Animating all of them would have made a twenty-minute film nobody would sit through, me included. So I picked the moments that carry the story:

1. **Slough, midnight.** He boots up. Marley's old server warns him about the spirits. He marks it as spam.
2. **December's schemes.** Drones instead of deer, one-star reviews for the Edinburgh Christmas market, and an attempt to cancel the sunrise at Stonehenge.
3. **The smart doorbell.** A firmware update to stop the carols. Then the door opens.
4. **Three visitors.** A beige 1995 PC, a wardrobe-sized smart speaker, and a loading spinner that never says a word.
5. **The chase.** Santa and AI Scrooge go round the North Pole all night, forty minutes apart.
6. **What day is it?** A prize turkey, delivered by drone.
7. **Boxing Day.** A present for Brian. Brian prefers the box.

About three minutes. Short enough to watch, long enough to land the joke.

## Everything is a row

Every character is a puppet made of `geometry` shapes, each pinned to its parent at a pivot, like card cut-outs with drawing pins. AI Scrooge is twenty-two parts. His hat carries the antenna, the antenna carries the bulb, and when he gets knocked off his feet all of it goes with him.

Every movement is a row in a keyframe table: this part, this channel, this frame, this value. The renderer is a stored procedure. It works out where everything is for every frame, moves the shapes, and adds a little felt-tip wobble so the lines shimmer the way hand-drawn cartoons used to.

The part I like most is that the ending is just data. One of the demos copies the chase scene, changes a single number in AI Scrooge's keyframes and renders it again. This time he gets a tailwind. I'm not saying what happens.

## Show the SQL

When I put the scenes on this site I wanted people to see what was going on under the hood, not just take my word for it. So each scene has a **Show the SQL** checkbox. Tick it and a panel opens beside the animation, showing the render call for the frame on screen, the keyframes that are moving things at that moment, and a row of the geometry that came out.

I'd thought about laying the code over the picture. But too much happens on the right-hand side of the frame: Marley, the ghosts, the speaker. So the code sits next to it instead.

## Made with Claude

Like the tracker, this was a joint effort with Claude. I came up with the scenes, the jokes I'm proudest of and the dog. Claude drew the puppets in WKT, wrote the keyframes, and built a Python copy of the renderer so it could watch the film without a SQL Server to hand. Then I ran the real thing on mine, and every scene came back.

Building a cartoon about an AI villain with an AI is the same irony as last time. I've stopped worrying about it.

## Watch it

**[All seven scenes, with the SQL →](/ai-scrooge-film/)**

**[Track AI Scrooge through December →](/ai-scrooge-tracker/)**

Bah, hum-bug.
