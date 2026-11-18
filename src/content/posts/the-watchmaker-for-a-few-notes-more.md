---
title: "The Watchmaker: For a Few Notes More"
subtitle: I built the musical pocket watch from For a Few Dollars More in a
  database, and made it play the tune.
date: 2026-11-17T23:59
cover: /images/uploads/for-a-few-notes-more/pocket_open.png
tags:
  - Watches
  - Postgresql
  - SQL
  - Music
  - Database
era: Today
pinned: true
draft: true
---
## A watch, a film and my mum

This part of the watch project is personal, so let me start with the background.

My mum loved Clint Eastwood. When I was six, I wrote him a letter for her, and about 6 months later he sent her a signed photo for her birthday. Now one might think it was a studio-signed card, but even at 6 years old I worked out that that was what everyone would do, so I sent it to his bar in Carmel, California. Years later, on a trip to the USA, I went to his bar and phoned her to tell her where I was. It was 3 am in the UK. She loved him so much.

Where I live now, the first restaurant I walked into is owned by a man who used to be Sergio Leone's chef. He once cooked for Leone and Ennio Morricone together, in Italy.

And I have the watch. Not the one from the film, of course, but a replica of the musical pocket watch from *For a Few Dollars More*.

In [Parts 1 and 2](/posts/the-watchmaker-building-a-mechanical-watch-in-a-database/) of this series, I built a mechanical watch in SQL Server and then in PostgreSQL. After all that, there was only one way this could go: **make the database play the tune.**

## The watch in the film

In *For a Few Dollars More,* the watch is not a prop: it is the entire timing for the final showdown. When the music stops, you draw.

Sergio Leone's sequel to "*A Fistful of Dollars*" (1964), "*For a Few Dollars More*" (1965), with music by Ennio Morricone. Clint Eastwood plays Manco, the Man with No Name. Lee Van Cleef plays Colonel Douglas Mortimer, and Gian Maria Volonté plays the bandit El Indio ([source](https://en.wikipedia.org/wiki/For_a_Few_Dollars_More)).

- **The watch.** El Indio carries a musical pocket watch with a photo of a young woman inside the lid. He took it from her, and what happened to her haunts him.
- **Its twin.** Colonel Mortimer carries an identical watch.
- **The duel.** At the end, Indio knocks Mortimer's gun away, opens the watch and tells him to go for it when the music stops. As the tune winds down, the same tune starts again from the matching watch, in Eastwood's hand. Manco hands Mortimer his gun belt: "Now we start." When the music ends, Mortimer draws first.
- **The reveal.** Mortimer takes the watch. Manco notices the family likeness to the woman in the photo, and Mortimer tells him she was his sister.

The chime's tune runs right through Morricone's score. As Morricone put it, "The music that the watch makes transfers your thought to a different place." The soundtrack lists a short track called "Carillon", and the recording I worked from is called *Watch Chimes (Carillon's Theme)*. It is a perfect example of how sound in a film can be part of the story. 

That is why my watch had to do more than play the tune. It had to **run down**, because in the film, the end of the music is the end of the story.

## How a musical watch makes music

A musical watch has a tiny music box built into it, with its own spring, so playing a tune does not affect the main function of the watch - the timekeeping.

![One spring plays the tune, and air keeps its time: the music spring, the pinned disc, the tuned comb and the sound; the gear train and the air-vane fly; and the lid that lets it go](/images/uploads/for-a-few-notes-more/how_it_plays.png)

Press the crown and the lid springs open, which releases the music. The music spring turns a disc covered in tiny steel pins, and each pin plucks one blade of a tuned steel comb as it passes. Through a train of gears, the disc also spins a little fan, the fly. Air pushes back on its vanes, the harder the faster it goes, and that keeps the tempo steady.

## The full orchestra, or just the chime?

There are two reproduction versions of the watch, one which plays the music and one which plays the chimes. The music version is simply too long to have a classic mechanism and actually uses an internal MP3 player. The classical is one that could exist, and this is the one I went for.   
I would be weird to explode such a beautiful item and to see a battery and wires, so the classical version wins.

The orchestra is glorious, but no pocket watch ever played a trumpet. So the choice was easy: just go with the chimes. It's mechanical, as a watch should be.

First, the tune had to become a list of notes, so a little Python program listened to the chimes and wrote down every note it heard.

It turned out to be a short, simple tune on just **eight notes**, played over and over. I played the list back as a music box next to the film's chimes, and it sounded perfect.

![The film's chimes above, my transcription played as a music box below](/images/uploads/for-a-few-notes-more/chimes_check.png)
*The film's chimes (top) and the transcription played back as a music box (bottom). Each line is one note ringing; the two match note for note.*

## How it plays, in 2D

All the code for this is in the GitHub project as normal.

**Cutting the comb.** A strip of steel held at one end rings when you pluck it, and the shorter the strip, the higher the note. So the database works out exactly how long each blade must be to play its note.

The blades fan in over the disc, and each tip dips down to meet its own ring of pins.

**Pinning the disc.** There's a pin for every note, and one turn of the disc plays the tune once.

**Playing it.** Nobody tells the watch when a note sounds. The database turns the disc and works out where each pin catches its blade and where it lets go, and the note sounds as it lets go. Every note comes out in the right place.

![The pinned disc and the tuned comb, seen from above, playing the tune, with a close-up of the pins meeting the blade tips](/images/uploads/for-a-few-notes-more/disc_plays.mp4)
*The disc the database pinned, and the comb it cut, playing the tune. The close-up shows the pins meeting the tips of the blades.*

Pins near the middle of the disc move more slowly, so they let go of their blades a fraction later, and the low notes would have dragged behind. So the database sets those pins a touch earlier, just as a watchmaker would.

**Running down.** The music has its own spring, and a little fan whirring at the end of the gears keeps the tempo steady. The database worked out how big the fan's blades should be. As the spring weakens, the tune slows down and stumbles on the harder chords, until the spring can't push the next pin past its blade and the music stops, mid-tune.

The film's watch slows down in just the same way, though it stops sooner than mine: a real watch spring loses its pull more quickly at the end.

![How long one beat of the tune takes as the spring runs down, the database's watch against the film's](/images/uploads/for-a-few-notes-more/run_down.png)
*Running down: the higher the line, the slower the tune. The blue dots are the film's watch.*

![The disc running down: the tune slows, stumbles and stops](/images/uploads/for-a-few-notes-more/run_down.mp4)
*And here it is running all the way down, until it stops.*

## The watch in 3D

Then the music went into a pocket watch built round it: a hunter case, the dial and crest of my own watch, its hands, and my photo in the lid. As is tradition in most of my posts, I assume the role of anyone who might be annoyed at their image being used in my articles.

**A case off the lathe.** Most of a watch case is turned on a lathe, so I taught PostGIS to do the same: spin a shape round and make a solid from it. A rule from about 1,700 years ago checks the size of every part it makes, and they all agree.

![The whole pocket watch exploded: case back, music plate and disc, movement, case band, dial, bezel, and the open lid with the photo](/images/uploads/for-a-few-notes-more/pocket_exploded.png)
*Every part apart: the case back and the music disc on the left, then the movement, the dial and bezel, and the lid with my photo.*

**The dial, from my watch.** Roman numerals are only straight strokes, so the database draws them itself, thick strokes and thin ones, just like the real thing. Four is the watchmaker's IIII. Around them sit the white scalloped rings, the waves, and a small seconds dial at 6 o'clock. That is exactly where it sits on my watch, and the gear train had placed it there before the dial was copied from my watch.

![The dial artwork as the database drew it: Roman numerals, scalloped rings, waves and the small seconds](/images/uploads/for-a-few-notes-more/dial_art.png)
*The dial as the database drew it, flat.*

**The crest, from a photo.** A script picked out the bright engraved lines in a photo of the watch's lid. The database then made the crest exactly symmetrical, sized it to the lid and cut it in.

![The photo of the real crest beside its trace](/images/uploads/for-a-few-notes-more/crest_trace.png)
*The crest on my watch (left) and the trace taken from it (right).*

![The closed pocket watch, pendant up, with the traced crest engraved on the lid](/images/uploads/for-a-few-notes-more/pocket_closed.png)
*And cut into the lid, pendant up, as the real one hangs.*

**The hands.** They are black Louis XV hands, each with a little butterfly ornament. The tiny pin the seconds hand sits on sticks up through the dial, higher than the hour hand. So the database swings every hand right round to prove it never hits anything, and when I tried a slightly longer hour hand, it caught it straight away.

![Close-up of the 3D dial with the black Louis XV hands and their butterfly ornaments](/images/uploads/for-a-few-notes-more/pocket_hands.png)
*The dial in 3D, with the hands: the hour hand's butterfly near its tip, the minute hand's halfway along.*

**And my photo in the lid**, the right way up when it opens, just where the film's watch keeps its picture.

![The open pocket watch: my photo in the lid above the champagne dial](/images/uploads/for-a-few-notes-more/pocket_open.png)
*Lid open: my photo above, the dial below.*

![Press the crown: the lid springs open and the music plays](/images/uploads/for-a-few-notes-more/pocket_watch.mp4)
*Press the crown: the lid springs open and the music plays.*

## Taken apart, and put back together

The last film takes the whole watch apart while the music plays, circles every part, then slowly puts it back together.

1. The crest, with the pendant up.
2. The watch turns over, and the crown is pressed.
3. The lid springs open, and the chimes begin.
4. Every part flies apart: the case, the dial and hands, the movement, and the music disc and comb behind it.
5. The camera circles the lot.
6. It all comes slowly back together, and the lid closes on the last note.

![The musical pocket watch opening, coming fully apart while the camera circles it, then going back together](/images/uploads/for-a-few-notes-more/pocket_apart.mp4)
*Taken apart and put back together, with the chimes.*

Every note in the video is played by the watch itself, not taken from the soundtrack (see the music credit at the end).

## Wrapping up

It started with a six-year-old's letter to Clint Eastwood, and it ends with a database playing Morricone.

Along the way, the database cut a comb to pitch, pinned a disc, found every note, ran a spring down, turned a case on a lathe, set Roman numerals and traced a crest. 

I still can't build a real watch: even under a 15x magnifier, my hands start to shake. But this one plays every time I press the crown. And the next time I'm in that restaurant, the one whose owner cooked for Leone and Morricone, I might just have it in my pocket.

Just don't reach for anything until the music stops.

## Music credit

The chime tune is **Ennio Morricone's**, from his score for *For a Few Dollars More* (1965). All rights in it remain with its rights holders.

What you hear is not the soundtrack. It was recreated.

- **The recording was only a reference.** A script listened to the film's chimes and wrote down the notes. The recording appears just once here, as the top half of the picture comparing the two.
- **Every sound is the watch's own.** The database cut each blade to its pitch, pinned the disc, and found when each pin lets go of its blade. Python then turned those plucks into sound, ringing each blade at the pitch its length gives.

This short recreation is shared for commentary and education, which I believe makes it fair use (fair dealing, here in the UK). If you hold the rights and would like anything changed, please get in touch.