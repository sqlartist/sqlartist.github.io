---
title: "Running Doom Inside SQL Server"
subtitle: "Not a raycaster. Not a tribute. Actual Doom — real WAD, real BSP, real E1M1 — rendered by a relational database."
date: 2026-08-13T15:47:46.659Z
cover: "/images/medium/1_eVSN5jLFSrWpRL7FtV8hIw.png"
tags: ["SQL Server", "Retro Computing"]
mediumUrl: "https://medium.com/@trevor.dwyer/running-doom-inside-sql-server-e8afaf408894"
repo: "https://github.com/sqlartist/DoomSQL"
runSteps: "Run the numbered .sql files in order in SQL Server Management Studio, starting with E1M1_freedoom.sql. Then draw the level:"
runSql: "SELECT * FROM v_map_plan;\n-- then click the Spatial results tab in SSMS"
era: "1990s"
draft: false
---

---

This idea is a continuation of my first article “Building an LLM in SQL Server” and using a SQL database for unusual, one might say “pointless” exercises. But this one is dear to me as I do remember playing Doom when it was released, being amazed at how well it run on the work network, the fact this software company — Id Software was just blowing everyone else out of the water with their game engine skills, maths and business model of making it Shareware.

I also remembering teaching my mum to play Doom and then later Quake. She was always adamant on playing Quake with keys only even though I had made a cfg file for her to use a mouse or a controller. I gave her own “Quakemum” online alias, but she never liked playing online — too fast for her. \[Well use the mouse then!!\] Leaving her for hours in the kitchen annoying my dad in the other room with her shrieks and the noise of the game, you know what, she actually completed both games. I don’t think I ever managed to do that.

Onto the article.

![](/images/medium/1_eVSN5jLFSrWpRL7FtV8hIw.png)

> ***The money shot: E1M1 starting room, full status bar, pistol drawn, running in SQL Server***

## The sport of running Doom on things

There is a long-running internet tradition of getting Doom to run on hardware that has no business running anything. A pregnancy test. A washing machine’s control panel. An ATM. A digital camera. A calculator. A John Deere tractor. A treadmill. Someone got it onto the little LCD screen on a Peloton. Someone else onto a McDonald’s cash register. The rule is loose but generally understood: the device has to do the actual computing, and pointing a video stream at a screen doesn’t count.

Databases have been quietly missing from that list, and it always struck me as an odd gap. A database is a computer. It has memory, storage, a query engine that can do arithmetic and, in SQL Server’s case, a cost-based optimiser that will happily parallelise work across cores without being asked. If a pregnancy test can do it, so can a relational engine.

So: could SQL Server run Doom? Not “render something that looks a bit like Doom” — actually load id Software’s data and draw it.

## What’s been tried before, and where it stops

Two people have got close, and both are worth crediting.

Patrick Trainer built **DuckDB-DOOM**, which implements raycasting, enemy behaviour, collision and rendering as SQL running against DuckDB in the browser. Lukas Vogel at CedarDB went further with **DOOMQL**, a multiplayer shooter written entirely in SQL — game state in tables, rendering as a stack of views, and a shell script firing a SQL file about thirty times a second.

Both are genuinely clever. But both are grid-based raycasters, and the comments under Trainer’s post made the obvious point immediately: it looks like *Wolfenstein 3D*, not Doom. A grid raycaster has square rooms at a single height, no floors or ceilings to speak of, and no arbitrary geometry. That’s the 1992 engine, not the 1993 one.

More to the point, **neither loads a WAD**. The levels are hand-built for the demo. And that’s the gap I wanted to close, because closing it turns out to depend on an observation that I think is genuinely interesting rather than merely silly.

## A WAD file is already a relational database

Here is the thing that makes the whole project work.

When John Carmack designed Doom’s level format in 1993, he needed to store a 3D world compactly and read it back very fast on a 486. What he produced — probably without thinking of it in these terms — is a **normalised relational schema**. Fixed-width records. Integer primary keys. Foreign keys between tables. No nulls. Third normal form, more or less.

Open a WAD and you find, per level:

```python
Doom calls it        It is

VERTEXES             vertex(id, x, y)

LINEDEFS             linedef(id, v1, v2, flags, special, right_sidedef, left_sidedef)

SIDEDEFS             sidedef(id, x_off, y_off, upper_tex, lower_tex, middle_tex, sector_id)

SECTORS              sector(id, floor_h, ceil_h, floor_tex, ceil_tex, light)

SEGS/SSECTORS/NODES  the pre-computed BSP tree, as three more tables

THINGS               thing(id, x, y, angle, type, flags)
```

A `LINEDEF` holds two integers pointing into `VERTEXES` and two pointing into `SIDEDEFS`. A `SIDEDEF` holds an integer pointing into `SECTORS`. Those are foreign keys. Nobody wrote them down as constraints because C doesn't have constraints, but they're there, and they hold — I checked every one of them across all 68 maps in both FreeDoom IWADs and found no violations.

Even the lighting is relational. Doom’s `COLORMAP` is a 34 × 256 lookup table mapping *(light level, palette index)* to *palette index*, and `PLAYPAL` maps *palette index* to RGB. Compose those two once and **Doom's entire lighting model becomes a two-column join**. Texture mapping is a join. Distance shading is a join.

So the first stage of the project wasn’t a port at all. It was a `BULK INSERT`. A Python script reads the binary lumps and emits T-SQL — 3.7 MB of `INSERT` statements for one level, which is exactly what a WAD is anyway: a compressed pile of table rows.

```sql
SELECT layer = 'wall',
       shape = geometry::STGeomFromText('LINESTRING('
             + CONVERT(varchar(12), a.x) + ' ' + CONVERT(varchar(12), a.y) + ','
             + CONVERT(varchar(12), b.x) + ' ' + CONVERT(varchar(12), b.y) + ')', 0)
FROM dbo.linedef l
JOIN dbo.vertex a ON a.id = l.v1
JOIN dbo.vertex b ON b.id = l.v2
WHERE l.left_sidedef IS NULL
UNION ALL
SELECT 'portal',
       geometry::STGeomFromText('LINESTRING('
             + CONVERT(varchar(12), a.x) + ' ' + CONVERT(varchar(12), a.y) + ','
             + CONVERT(varchar(12), b.x) + ' ' + CONVERT(varchar(12), b.y) + ')', 0)
FROM dbo.linedef l
JOIN dbo.vertex a ON a.id = l.v1
JOIN dbo.vertex b ON b.id = l.v2
WHERE l.left_sidedef IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.door_special d WHERE d.special = l.special)
UNION ALL
SELECT 'door',
       geometry::STGeomFromText('LINESTRING('
             + CONVERT(varchar(12), a.x) + ' ' + CONVERT(varchar(12), a.y) + ','
             + CONVERT(varchar(12), b.x) + ' ' + CONVERT(varchar(12), b.y) + ')', 0)
FROM dbo.linedef l
JOIN dbo.vertex a ON a.id = l.v1
JOIN dbo.vertex b ON b.id = l.v2
JOIN dbo.door_special d ON d.special = l.special
UNION ALL
SELECT 'monster',
       geometry::Point(t.x, t.y, 0).STBuffer(20)
FROM dbo.thing t
JOIN dbo.death_type dt ON dt.doomednum = t.type
UNION ALL
SELECT 'you are here',
       geometry::Point(p.x, p.y, 0).STBuffer(40)
FROM dbo.player p WHERE p.id = 1;
```

![](/images/medium/1_kOsIqlO6_X58dXkLgCoGHA.png)

> ***SSMS spatial results tab showing the E1M1 floorplan, the moment the schema was proved correct***

## Building it

The renderer went through three stages, and the interesting parts were all mistakes.

## The BSP tree is a recursive CTE

Doom’s speed came from a binary space partition tree: a pre-computed structure that, given where you’re standing, tells you the exact order to draw the walls in so that nearer things paint over further ones. Walking it is a textbook recursive descent.

Recursive CTEs in SQL can’t do depth-first descent — they go a level at a time, breadth-first. So instead of descending, I let it walk the whole tree and accumulate a **path string**: a `0` at each split for the near side, a `1` for the far side. Then `ORDER BY path`.

Sorting those strings alphabetically gives you *exactly* the depth-first order. It’s a small trick and it felt good, so I tested it properly — comparing the path-sort against a real recursive walk from several viewpoints on all 68 maps. Zero mismatches.

Which is where I got my first real lesson, because that test was **worthless**. It compared my two implementations against each other, and both used the same side-convention — which was backwards. So it proved they agreed, not that they were right. Every frame rendered with the camera somehow above every ceiling and I spent an evening on it.

The test that actually settled it was a property that had to be true regardless of my code: *every point must land in a region whose walls all face it*. Under my convention, 0 out of 400 random points satisfied that. Under the other, 204 out of 400 (the rest fall outside the map). One line changed, and the room appeared.

![](/images/medium/1_dppFvwtcmqoK-02CKMYKVg.png)

> ***four views with the BSP side test inverted. Every wall sits below the horizon and the sky floods the top of every frame.***

![](/images/medium/1_yLcoZkPVTwhPzS6PNNQEng.png)

*(This one is reproduced rather than recovered — flipping the comparison back and re-rendering gives the identical failure, which is a small reassurance that the diagnosis was right. Note that the sky was written much later than this bug; at the time the top of the screen was simply black.)*

## Doom’s clipping is a window function

The second lesson was better, because it was a wrong idea replaced by a right one.

Doom maintains two arrays as it draws — the running top and bottom of what’s still visible in each screen column — and updates them wall by wall. My plan was to throw all that away. Emit every surface independently, and let a per-pixel “nearest wins” comparison sort it out. Modern engines have a depth buffer; SQL has `ROW_NUMBER() OVER (PARTITION BY x, y ORDER BY depth)`, which is the same idea.

It doesn’t work, and the render showed me why in about four seconds. A distant room’s ceiling can be physically *nearer* to your eye than the ceiling you’re standing under. Depth alone doesn’t tell you a surface is actually visible. The far room’s ceiling won the comparison and painted over the entire top of the screen.

What replaced it is nicer than what I’d proposed. Doom’s clip arrays, updated one wall at a time, are a **prefix scan** — the bounds in force when you draw a wall are the running maximum and minimum of every nearer wall in that column. And a running aggregate over an ordered set is precisely a window function:

```sql
MAX(opening_top) OVER (PARTITION BY screen_x ORDER BY depth
                       ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)
```

Doom’s clipping list is a window frame. Nobody in 1993 was thinking in those terms, but that’s what it is. And because the bounds come out exact, every pixel is written exactly once — there’s no depth buffer in the finished renderer at all.

The depth-buffer idea did eventually earn its place, though: it’s exactly right for **sprites**, which are flat billboards at a single depth. Same operator, sound in one case and not the other, for a reason about the geometry rather than about SQL.

## The primary key that found a bug I’d argued couldn’t exist

I put a primary key on the framebuffer — one row per `(x, y)` — and stated in the file header that the clip bounds guaranteed no pixel would ever be written twice.

Then SQL Server told me otherwise: *Violation of PRIMARY KEY constraint. Duplicate key (71, 224).*

Two surfaces met at an exact integer boundary and both claimed the same row. It was a real correctness bug, a few pixels a frame. My reference implementation in Python couldn’t have caught it, because writing twice to an array just silently overwrites.

That’s a small thing that I keep thinking about. **The constraint turned an invisible bug into a hard error.** It’s the ordinary argument for database constraints, arriving from a very strange direction.

![](/images/medium/1_ILK2Bh_3LB1E5-w1DY-_1Q.png)

> ***walls, floors, ceilings, a doorway with the room beyond visible through it, and distance shading falling off toward the back. No sprites, no sky, no weapon — this is the renderer with nothing but geometry and textures.***

![](/images/medium/1_NlrE-QCBNGD88ejSM8LbEg.png)

> ***shows four angles from the same spot.***

## Then everything else

Once walls worked, the rest came in stages, each one mostly a matter of noticing that Doom’s data was already shaped like tables:

-   **Textures.** Doom stores pictures column-major, run-length encoded with gaps for transparency. One row per pixel would be 1.4 million rows for one level, so each texture *column* is one row holding a binary blob — which is how Doom stores them anyway, because its renderer is column-based.
-   **Sprites.** The tricky part isn’t drawing them, it’s that the mapping from “thing type 3001” to “imp” lives in Doom’s C source, not in the WAD. So it became a table. Sprite lump names encode frame and rotation, and one picture often serves two directions — one of them mirrored.
-   **Doors.** This was the architecturally interesting one. Up to that point the renderer was a pure function of position: same coordinates, same picture. A door breaks that. Sector heights become *state*, updated once per tic. **The renderer needed no changes at all** — it already read the sector table, so when a ceiling rises the frame just shows it. Doom walks a linked list of moving doors; here every door in the level moves in a single `UPDATE`.
-   **Weapons.** Doom’s `info.c` is a giant static array of animation states — sprite, frame, duration, pointer to the next one. It is a table pretending to be C. Made it an actual table and advancing the animation became one `UPDATE` joined to it. Pulling the trigger doesn't fire; it starts the animation, and the shot happens when the animation reaches the state marked `fire`, which is why the muzzle flash lines up with the bang.
-   **The status bar.** An afternoon. Same picture format, same storage. The only new idea was right-aligned numbers, which set-based means: take the decimal string, join a numbers table over its characters, place character *i* at `right_edge - (length - i) × digit_width`.

![](/images/medium/1_awrTyvNOnM9OvsWo-9I69g.png)

> ***a demon with its lower half cut off by the ledge in front of it. Measured rather than eyeballed: 2,469 of the sprite's 4,347 pixels survive the occlusion test, so 43% of it is correctly hidden by geometry that is nearer than it is.***

![](/images/medium/1_Ymqq8VFwz7iWgQ2fC2lRJA.png)

> ***the same viewpoint with the door shut (left) and open (right), the second room and one of its occupants visible through the opening.***

![](/images/medium/1_OnEEevJGb-rLkrUorQyUtQ.png)

> ***Here is the open frame on its own, larger.***

## Did we use SQL Server’s spatial features?

Yes — but honestly, and this is the interesting part, **only for one thing, and I deliberately chose not to use them for the thing you’d expect**.

## Where they were used

The map is exposed as a spatial view. Every linedef becomes a `LINESTRING`, every thing becomes a buffered `POINT`:

```sql
CREATE VIEW dbo.v_map_plan AS
SELECT l.id,
       layer = CASE WHEN l.left_sidedef IS NULL THEN 'wall' ELSE 'portal' END,
       shape = geometry::STGeomFromText('LINESTRING(...)', 0)
FROM dbo.linedef l
JOIN dbo.vertex a ON a.id = l.v1
JOIN dbo.vertex b ON b.id = l.v2;
```

Run `SELECT * FROM v_map_plan` in SSMS, click the **Spatial results** tab, and the level draws itself. That view was the single most useful thing in the project, and it was written on day one. The moment a recognisable floorplan appeared, I knew the WAD parser and every foreign key in the schema were correct. Everything after that was maths, and I could debug it knowing the data underneath was sound.

**Choosing** `**geometry**` **and not** `**geography**` **matters here.** They look interchangeable and they are not. `geography` models an ellipsoid — the Earth — and expects latitude and longitude, with real limits on what coordinates it accepts and edges that curve. Doom's world is a flat plane in arbitrary "map units" spanning roughly ±32,000 in each direction, with no relationship to anything on Earth. `geometry` with SRID 0 (planar, unitless) is the right type; `geography` would have rejected most of the coordinates outright and curved the ones it accepted. Anyone tempted to reach for the "more advanced" type because it sounds more capable will hit that wall immediately.

The other wrinkle is small but annoying: building geometry from integer columns means composing WKT strings, so there’s a fair bit of `CONVERT(varchar, ...)` and string concatenation in a view that is otherwise pure arithmetic. Fine for a visualisation, ugly in a hot path.

## Where I chose not to use them

Doom has a structure called BLOCKMAP: a grid dividing the level into cells, each listing which walls pass through it, so collision detection only tests nearby walls. It is, unmistakably, a hand-rolled spatial index from 1993. The obvious move is to delete it and use `STIntersects` against a spatial index instead.

I built it the boring way instead — a plain B-tree index on the four bounding-box columns — and I think that was right for three reasons.

First, **scale**. A spatial index earns its cost on large, complex, irregular geometries. E1M1 has about 1,200 straight line segments. A B-tree on `(minx, maxx, miny, maxy)` filters that to a handful of candidates in microseconds, and the exact test afterwards is one line of arithmetic. A spatial index would have added machinery without adding speed.

Second, **query shape**. Collision here asks “is a 16-unit circle overlapping any wall”, and the “use” key asks “what’s the first special line along a 64-unit ray”. Both are cheap closed-form maths once you have the candidates. Spatial predicates are built for genuinely hard geometric questions, and these aren’t hard — they’re just numerous.

Third, and most usefully: **doors broke the cache and taught me something**. I’d originally stored each wall’s walkable gap — the vertical opening between floor and ceiling — as precomputed columns. That’s fine in a static world. The instant a door moves, those numbers are lies. The fix was to cache only the *geometry* (which never changes) and join to the sector table for the *heights* (which do). Had I encoded everything into a spatial column, that separation would have been much harder to unpick, because the fast bit and the volatile bit would have been welded into one object.

So: spatial types earned their place as a **development and debugging tool**, and stayed out of the game loop. That’s a slightly un-glamorous answer, but I think it’s the honest one, and the reasoning generalises — the exotic feature is often the right tool for looking at your data and the wrong tool for the inner loop.

![](/images/medium/1_pr7EMGYzGamQUCc9jNQrkw.png)

> ***the v\_map\_plan spatial view in SSMS, showing the E1M1 floorplan***

## How fast is it?

About three frames a second at 320×200, on an ordinary desktop instance.

That’s slower than a 486 managed in 1993, which is a humbling number. But look at what’s happening: roughly 64,000 pixels per frame, each one produced by joining a texture table, a lighting table and a palette table, with occlusion resolved by a window function. It is doing the work honestly, in set logic, with no shortcuts.

Two things about the performance are worth noting.

**It parallelises for free.** CPU time comes in at about five times elapsed time, which means the optimiser is spreading the pixel work across cores without a single hint in the query. A per-column rasteriser happens to be exactly the shape of workload a columnar engine likes.

**The one bad number was my fault, and diagnostic.** Sprites initially cost a full second a frame — far more than their pixel count justified. The cause: I’d called a small user-defined function inside the query to work out which floor each monster was standing on. That function contains a loop, so SQL Server can’t inline it, and **a non-inlinable scalar function forces the entire query plan to run single-threaded**. It wasn’t the per-row cost that hurt; it was losing the parallelism. Monsters don’t move (yet), so the answer was to compute it once at load time into a table and join. That’s a general lesson about SQL Server that has nothing to do with Doom.

## Was any of this a good idea?

The honest answer is that probably not, but who doesn’t want Doom running on their SQL platform, but really it was an exercise to see if it could be done. When I used to play these games I could not imagine the brains behind it, then John Carmack told us how it worked and it was all down to triangles.

But a few things surfaced that I didn’t expect, and they’re the reason I’d argue this sort of exercise has some value beyond the novelty:

**Old data formats are often relational and nobody notices.** The reason this project was possible at all is that Carmack designed a normalised schema and shipped it as a binary file. That’s not unique to Doom. There is an enormous amount of legacy binary format out there — industrial telemetry, scientific instruments, financial message formats, government data exchanges — that is structurally a set of tables with integer foreign keys, being processed one record at a time by procedural code because nobody looked at it and thought “this is a join”. Recognising that shape is a transferable skill and this was good practice at it.

**Constraints catch what tests can’t.** The framebuffer primary key found a bug I had explicitly argued was impossible, in code my own reference implementation couldn’t fault. Declaring what must be true and letting the engine enforce it caught something that reasoning and testing both missed.

**Set-based thinking transfers to strange places.** Doom’s clip arrays are a prefix scan. Its animation tables are, well, tables. Its lighting is a join. Its BSP traversal is a sort key. The 1993 code is procedural because C is procedural, not because the problems are. A surprising amount of “obviously imperative” code is a set operation that hasn’t been recognised yet.

**And SQL Server is a more capable general-purpose engine than its reputation suggests.** Window functions, recursive CTEs, binary manipulation and a parallelising optimiser are enough to build a 3D renderer. Nobody should, but the fact that you can says something about the headroom sitting unused in a tool most people only ever point at line-of-business queries.

Doom now runs in a relational database. Actual Doom — E1M1 from a real WAD, BSP-ordered, textured, lit, with sprites, doors you can open, a gun you can fire and a status bar keeping score.

My mum would have finished it. I probably won’t.

---

## Appendix: RUN.md

## Running Doom in SQL Server

Fourteen steps, in this order. Each owns a disjoint set of objects, so any one of them can be re-run on its own afterwards without disturbing the others.

`doom_schema.sql` is NOT in the list: `E1M1_freedoom.sql` already embeds it. Running it separately would drop the map data.

```markdown
# File                   Creates

1 E1M1_freedoom.sql      schema + E1M1 geometry + 158 textures

2 doom_render.sql        render_frame, sector_at, framebuffer

3 doom_present.sql       frame_bmp, le4, screen_pixel, render_and_time

4 doom_game.sql          player, input_state, line_collide, 
                         p_tick, game_loop

5 doom_sprites.sql       sprite tables + render_sprites

6 E1M1_sprites.sql       sprite frames and columns

6b doom_sprites_fast.sql replaces render_sprites, adds thing_sector

7 doom_client.sql        p_frame, p_input_set

8 doom_doors.sql         door, p_use, p_door_tick; 
                         takes over build_collision, 
                         move_blocked, p_frame

9 doom_sky.sql           render_sky; final p_frame 
                         (all later stages are OBJECT_ID-guarded, 
                         so nothing redefines it again)

10 E1M1_sprites.sql      reload it: now 444 frames, 
                         including the weapon HUD sprites

11 doom_weapons.sql      inventory, pickups, firing, render_psprite

12 doom_statusbar.sql    hud_patch, hud_column, render_hud

13 hud.sql               37 status bar patches (map-independent)
```

```css
sqlcmd -S . -d doom -i E1M1_freedoom.sql
sqlcmd -S . -d doom -i doom_render.sql
sqlcmd -S . -d doom -i doom_present.sql
sqlcmd -S . -d doom -i doom_game.sql
sqlcmd -S . -d doom -i doom_sprites.sql
sqlcmd -S . -d doom -i E1M1_sprites.sql
sqlcmd -S . -d doom -i doom_sprites_fast.sql
sqlcmd -S . -d doom -i doom_client.sql
sqlcmd -S . -d doom -i doom_doors.sql
sqlcmd -S . -d doom -i doom_sky.sql
sqlcmd -S . -d doom -i E1M1_sprites.sql      # reload: weapon sprites added
sqlcmd -S . -d doom -i doom_weapons.sql
sqlcmd -S . -d doom -i doom_statusbar.sql
sqlcmd -S . -d doom -i hud.sql
```

`doom_doors.sql` must come after `doom_game.sql` and `doom_client.sql`: it redefines `build_collision`, `move_blocked` and `p_frame`.   
Re-running either of those later reverts the world to static. After loading it, run `EXEC dbo.build_collision;` — `line_collide` now stores sector ids rather than cached opening heights, so doors can move without invalidating it.

After `doom_sprites_fast.sql`, run `EXEC dbo.build_thing_sector;` once — it precomputes which sector each thing stands in, which keeps a scalar UDF out of the per-frame query.

`doom_sprites.sql` creates the tables and DELETEs their contents, so `E1M1_sprites.sql` must follow it. `p_frame` calls `render_sprites` only if it exists, so the game still runs without either.

**Play**

```typescript
.\doom_client.ps1 -Server . -Database doom
```

W/S move,   
A/D turn,   
Q/E strafe,   
Shift run,   
SPACE open doors,   
CTRL fire,   
1–4 select weapon,   
R respawn,   
Esc quit.

`-Tics 12` advances more simulation per displayed frame; `-Scale 4` for a bigger window.

## Healthcheck

```sql
EXEC dbo.doom_healthcheck;   -- optional but recommended
EXEC dbo.render_and_time;    -- run twice; the first pays a ~780ms compile
EXEC dbo.render_and_time;
```

Expect roughly: `render_ms` ~290, `present_ms` ~35, and `pixels_lit` close to 64,000 — with sky and the status bar in, the frame is fully covered.

`pixels_lit = 0` means the texture tables are empty — the rasteriser INNER JOINs them, so it completes silently with no rows. Re-run `E1M1_freedoom.sql`.

## Other maps

```css
python wad2sql.py FREEDOOM1.WAD --list
python wad2sql.py FREEDOOM1.WAD E1M3 -o E1M3.sql
python gen_sprites.py FREEDOOM1.WAD E1M3 -o E1M3_sprites.sql
```

Sprite data is per-map: only the sprites that map’s things reference are extracted, plus the player’s weapons. The status bar graphics (`hud.sql`) are map-independent and do not need regenerating.

Needs `wad2sql.py`, `wadtex.py`, `wadsprite.py`, `doom_schema.sql` and `doom_textures.sql` in the same directory. Works on any vanilla-format IWAD or PWAD; extended (ZDBSP-compressed) nodes are detected and rejected.

## Known gaps

-   No monster AI: things are drawn, collide and can be shot, but nothing moves or fights back.
-   Lifts, switches and walk-triggered lines: only manual (use) doors so far.
-   Locked doors refuse: there is no key inventory yet.
-   The status bar face is static; Doom’s reacts to damage and health.
-   Masked middle textures on two-sided lines (grates, vines) aren’t drawn, though their alpha masks are stored.
-   `game_loop` runs at ~12-15 tics/sec, not 35: `WAITFOR DELAY` rounds up to SQL Server's ~15.6ms timer resolution. The client's `p_frame` avoids this by batching tics per frame instead.

---

*Tested against FreeDoom (BSD-licensed) so the whole thing can be shared without redistributing commercial game data. It works with a retail* `*DOOM.WAD*` *too — same parser, same schema.*

*Sourcecode is now available:* [https://github.com/sqlartist/DoomSQL](https://github.com/sqlartist/DoomSQL)
