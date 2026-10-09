---
title: "My Potato Mountain"
subtitle: "Rebuilding the Wagon Queen Family Truckster jump, one engine at a time."
date: 2026-09-13T00:03:58.225Z
cover: "/images/medium/1_pSNOu8uqKT84meUuyEQ8fQ.png"
tags: ["Life"]
mediumUrl: "https://medium.com/@trevor.dwyer/my-potato-mountain-9a61d2b98eb3"
era: "1980s"
draft: false
---

![My final version of the Truckster, with the whole family aboard.](/images/medium/1_pSNOu8uqKT84meUuyEQ8fQ.png)
*My final version of the Truckster, with the whole family aboard.*

There’s a scene in Close Encounters of the Third Kind where Richard Dreyfuss builds a mountain out of mashed potato because he can’t stop thinking about it. This is my potato mountain. Except mine is a station wagon, and mine is real.

I came to 3D modelling late. For the last 30 years I’ve worked with SQL databases, written books, won awards and worked on some exciting projects around the world. None of it helped me with the one thing I actually wanted to do: recreate the car jump from National Lampoon’s Vacation.

Worth saying up front, because it comes back later: I’ve never learnt to drive. Not once, not ever. I’m rebuilding the most famous drive in comedy cinema and I’ve never held a licence.

I’ve been obsessed with this car for years. I started in the physical world — 3D printing, painting, building the Truckster at every size I could manage. That rabbit hole ended with eight 3D printers in the house and Trucksters ranging from matchbox-sized models to a two-metre-wide diorama.

![The first decent diorama.](/images/medium/1_fBOeXtk_ZeceRm-DXQVZ8A.png)
*The first decent diorama.*

## From plastic to pixels

After some success in the physical world I thought, why not build the scene in 3D? Unreal, maybe. Or Unity. Or Blender. It started as an idea for a single 2D render. Then it became an animation. Then a game. Then a full scene. That’s how these things go.

![Autodesk 3ds Max render.](/images/medium/1_2VsrAfi5urgjrWYHKUs2-w.png)
*Autodesk 3ds Max render.*

![Another 3ds Max render. I found this tool so hard to learn. The tyFlow module is enormously powerful and I never got on top of it.](/images/medium/1_19vRzRIn4Y9u5_M4uVC15g.png)
*Another 3ds Max render. I found this tool so hard to learn. The tyFlow module is enormously powerful and I never got on top of it.*

## Why I’m in a hurry

I have stage 4 colon cancer. I had major surgery, which was initially successful, but the cancer is returning. So I’m finishing what I can while I can.

The practical effect is smaller and more annoying than you’d think. My memory isn’t what it was. If I read how to do something and don’t apply it I end up learning all over again. Its not that bad but when you have had near ident recall for many years its a bit depressing.

That one fact has shaped how I’ve built everything since.

## What thirty years of SQL actually gave me

For a long time I assumed my database career counted for nothing here. Wrong field, wrong brain, wrong everything. I was wrong, and it took me a while to see why.

I am not as spontaneous as I once was, I can’t afford to hand-place a scene. Click a thousand objects into position, forget how you did it, and the scene is a dead end the first time something breaks. And something always breaks.

So I stopped placing scenes and started writing them. Python builders that generate the mesa geometry, the procedural materials, the multi-camera setup and the particle dust. In Unreal, a Chaos vehicle pawn that detects the collision with the Road Closed sign and launches the car on proper projectile physics. Camera focal lengths computed rather than eyeballed.

Underneath, a scene is just rows. Objects, parents, transforms, materials. Name them properly and you can rebuild them. My model is a hierarchy with a body parent and children named the way a schema should be — wheelFL, wheelFR, wheelRL, wheelRR — with Clark, Ellen, Rusty, Audrey and Aunt Edna as separate objects so they don’t get dragged into a vehicle export.

That isn’t artistry. It’s normalisation. But it means that when I break the scene, I can regenerate it instead of mourning it. Thirty years of databases taught me one transferable thing: never keep the only copy of anything in your head.

## Five engines and a lot of u-turns

3ds Max was the first stop, and the first wall. tyFlow can do everything I needed and I couldn’t get my head into it. I’m not a fundamentals-first learner — I have an urgency to finish what I’ve started, so I try every possible angle at once and hope the best one falls out of the end. Feynman’s path integral as a working method. It doesn’t suit a tool that wants to be learned properly, so I moved on.

![An early Blender animation.](/images/medium/1_ShIbvmVua-ro00P73Mjqbw.png)
*An early Blender animation.*

![The same animation just after the car leaves the ramp — and an early version of the car.](/images/medium/1_vfNTyM2su12vMgguy4FSEA.png)
*The same animation just after the car leaves the ramp — and an early version of the car.*

Twinmotion was the opposite problem. It was the fastest route to something that looked good, and the weather and sunlight modules are genuinely excellent. But custom vehicle animation was too random. I could get a nice result; I couldn’t get the same result twice. Repeatability matters more to me than speed, so Twinmotion became a place I visit for stills rather than the place I build.

![A Twinmotion render. I tried hard to make this one work.](/images/medium/1_NEBJaXC2LASRKb9IGfybrw.png)
*A Twinmotion render. I tried hard to make this one work.*

![Twinmotion render — it does look nice, though.](/images/medium/1_ssakJ1gD9PD7T7V2R1vEdg.png)
*Twinmotion render — it does look nice, though.*

![Twinmotion again. The weather and sunlight modules are very good.](/images/medium/1_2onnlNnQh6UGiG5VaB_gYA.png)
*Twinmotion again. The weather and sunlight modules are very good.*

BeamNG.drive was the detour I regret least and enjoyed least. The plan was sensible: use an existing LTD wagon as a physics donor and swap in my visual mesh, so I’d get real soft-body crash damage for free. What I got instead was “Loaded nil parts from 0 jbeam files”, over and over. I eliminated encoding, file paths, conflicting mod zips, flexbody mesh references and directory placement, one at a time, and never got it loading. In the end I drew a line: the crash work happens in Unreal and Blender, and nowhere else.

There was a Godot version too — a playable one, with the 140-foot gap, the blockade to smash and a repair-and-cash loop. Useful for working out what the jump should feel like, and a dead end for what it should look like.

Where it’s landed is Blender plus Unreal Engine 5.8. Blender for the rendered scene, Unreal for the drivable car and the cinematic. I’ve been through Unreal 4.26 up to 5.8 to get here.

## The wheel that turned itself inside out

Every time the model moves between packages I end up in texture and material hell. Every piece of documentation tells you it’s an easy process. Trust me, it isn’t, and I genuinely cannot work out how designers put up with this level of incompatibility — it’s a whole article on its own. Fix one thing and another appears. The best of them was a wheel that inverted itself on import — no error, no warning, just a wheel pointing into its own arch. I never did work out why.

The current one is more interesting. I have a Blender crash setup working properly — the car drives, hits a rock, rolls, the glass shatters and the metal deforms as it lands on its roof. I have the Truckster animated along its own spline from the same start point, jumping and landing. Transferring the shatter onto the Truckster’s path is the bit that isn’t right yet: the simulation fires far too early, so the glass explodes while the car is still in the air. It needs holding back until touchdown. That’s the sort of problem that sounds trivial and eats a fortnight.

Camera work and raw render time have been the other two hurdles. Both are solvable with patience, which is the one resource I’m careful with.

## The car itself, and what I got wrong about it

The Wagon Queen Family Truckster is a fictional station wagon built for the 1983 film, based on a 1979 Ford LTD Country Squire and modified into something deliberately hideous. Eight headlights in two inverted clusters. Wood panelling over most of the available surface. A grille mostly covered by bodywork. A separate oil-cooler grille with no oil cooler behind it. Crown hubcaps. A fuel filler flap in the front passenger wing, which is the joke that keeps giving — in the film Clark rips the rear number plate off looking for it. And an airbag made from a household bin liner.

![Fictional Wagon Queen Family Truckster advertisement — a fan-made parody graphic featuring a replica built by Gary Schneider, using dialogue attributed to John Hughes.](/images/medium/1_KDxA0Qw0SqqaEgVHpQT3eg.png)
*Fictional Wagon Queen Family Truckster advertisement — a fan-made parody graphic featuring a replica built by Gary Schneider, using dialogue attributed to John Hughes.*

Three things I found while researching it that I hadn’t known, and that are worth knowing if you’re building one yourself.

First, the colour has a name: Metallic Pea. Ford never sold it. It exists only on this car, which means there’s no swatch and no hex code to work from — only film stills, shot on 1983 stock, in desert sun, then graded.

What I ended up doing was collecting every high-quality still I could find, lining them up against the physical models I’ve built, and running an eyedropper over all of them. It’s a fool’s errand. The paint is metallic, so it changes with every angle, and every still carries its own shadows and grade — there is no single right answer in any of them. In the end I took a pea green somebody had made for GTA: #47783CAA. That’s RGBA, by the way — #47783C with an alpha of AA — so drop the last two characters if your tool wants six. Every replica builder, physical or digital, is picking their own green and calling it right. Mine is still the thing I fiddle with most.

Second, George Barris probably didn’t build it. Nearly every source online credits him, including Wikipedia, and I repeated it myself. The replica community says otherwise: Gary Schneider dug into it while building his own car and concluded the Trucksters were modified by Warner Bros’ own transportation department, and that the Barris attribution is an internet myth that got copied until it looked like fact. I’m not going to settle it here. But it’s a useful reminder that a good half of what you find when you research a film car is other people’s guesses, repeated confidently.

Third, five cars were built, so the crew could rotate them as the damage piled up through the film. I laughed when I read that, because it’s exactly what I’ve ended up doing in software — separate versions of the same model at different stages of destruction. And none of the five survive. They were either destroyed during filming or converted back into ordinary LTD wagons for other Warner Bros productions. Every Truckster you see today is a replica. A good one made $91,000 at Barrett-Jackson in 2019.

Which is worth sitting with for a moment. Between all those 3D printers, the wasted filament that comes with the territory, the software and the time, I could probably have bought the one that came up at auction and had it shipped to the UK with change to spare. I’m glad I didn’t. I’d have had to take driving lessons, pass a test and insure the thing — and as I said at the top, I’ve never learnt to drive. I’m building the Griswolds’ road trip and I’ve never driven a car.

One last detail, for anyone who’s read the fan-written brochure that does the rounds — the one promising a “huge, large block” V8 that “drinks the gas like nobody’s business”:

*“Yes, it got it all and safe too, with its large size it can run over and smash through most standard size cars and built like a tank… The Truckster eliminates that with its eight head lights that cuts through the darkness, and your only worry is that oncoming cars are blinded by all that light and might hit you head on.”*

What was under the bonnet was a standard 130 horsepower 302 with a four-speed automatic. The most over-described car in cinema was, mechanically, a completely ordinary Ford.

## The jump

This is the scene I set out to build. Clark is lost on the way to the Grand Canyon, too busy arguing with Ellen to notice the road is closed, and takes the entire family off the end of it at speed — blowing the tyres, bending the axles and destroying the front end.

Two things I learned about it changed how I approached mine.

The stunt coordinator bet the crew he could launch the car more than 50 feet, and won. I’m targeting a 140-foot gap in Unreal, worked out with projectile maths rather than guessed at. Having a real number from the real stunt to argue with turned out to be worth more than any amount of reference footage.

And the place doesn’t exist. The driving shots were filmed at Baby Rocks on US-160 east of Kayenta, Arizona. The walk through the desert with the skeleton is Great Sand Dunes in Colorado. The hotel is El Tovar at the Grand Canyon. The film cuts several states into one road. A faithful recreation is therefore impossible, and once I accepted that mine is an interpretation rather than a copy, the whole thing got easier.

Which didn’t stop me trying. I spent months tracking down the real locations, pulling satellite imagery and fighting it into a form I could export as an elevation model for the Unreal and Blender scenes. For the record, the jump itself is at 36°58'02.11"N 110°04'14.82"W — about two miles south of the Utah line, whatever the tour blogs tell you.

If I ever went back to the USA — which is now unlikely — I’d be Clark Griswold and I’d seek this exact spot out. Given I can’t drive, it would be a very expensive taxi ride.

![The spot itself.](/images/medium/1_W16ZXN1ZGwU6xvEnNFutvg.png)
*The spot itself.*

![A Blender still. I like the scale on this one — it’s about the level of quality I’m aiming for.](/images/medium/1_CeC4m2_rHta9psAS9aVZZw.png)
*A Blender still. I like the scale on this one — it’s about the level of quality I’m aiming for.*

## Where it is now

Near-working versions in Blender, Unity and Unreal. A car model that finally renders, drives, carries its passengers and survives the trip between Blender and Unreal without falling apart. The target is a rendered scene in Blender and a drivable vehicle with a cinematic render in Unreal 5.8. It isn’t quite there. It’s very close.

If I started again tomorrow I’d do three things differently: pick the target renderer first and model to it, rather than modelling and then shopping for an engine; impose the naming discipline on day one instead of retrofitting it; and write every scene as a script from the beginning, even when clicking would be quicker. The clicking is always quicker right up until the moment you need to do it twice.

## Here, take it

There’s no money in any of this. It’s a hobby and a long learning exercise. I’ve always given my work away in the hope it’s useful to somebody, and I’m doing the same here — the Blender builder script, the Unreal level scripts and the model itself. Reducing over 9,416 files and 554 GB on one machine down to a few files on GitHub is its own small act of violence, but that’s the way it goes.

***\[GitHub Link to Follow.\]***

There’s a reason I’d like it archived properly. Years ago I was on my way to meet Bill Gates in London. I’d just pulled up at the hotel where he was speaking when my office rang: they needed me in LA, in a meeting with the Head of Warner Bros Studio in Burbank. I never got out of the taxi. I turned round, went home, packed, and flew to Burbank for one of the strangest meetings of my career.

Going into a huge boardroom with Clint Eastwood and Daffy Duck posters all round was surreal, and then you notice the actual Oscars and Emmys everywhere. For someone from Watford, England, that was something special. Then the head of Warner Bros came in and he looked just like Don Johnson out of Miami Vice. I must have said three words in the whole meeting — I was there as the technical expert, and the meeting wasn’t technical. They did take us out to dinner that evening, which must have been good because I don’t remember a single thing about it.

So when the scene is finally finished and uploaded, who knows. The 45th anniversary of the film’s release comes round in 2028, and Warner Bros may want something extra for the archive. Stranger things have happened to me in Burbank.

If you know tyFlow properly, or you’ve ever persuaded a Blender fracture simulation to hold off until the exact frame you wanted, I’d genuinely like to hear from you.

**This is my potato mountain. I’d like to finish it.**  
   
 Re — Mi — Do — Do — So

---

If you enjoyed this story, or just love the car or the movie, get in touch, but first, give it some claps. Thank you for reading.
