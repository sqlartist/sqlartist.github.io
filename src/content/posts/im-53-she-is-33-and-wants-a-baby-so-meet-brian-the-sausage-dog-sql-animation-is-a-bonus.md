---
title: "I’m 53, She is 33 And Wants A Baby, So, Meet Brian The Sausage Dog. (SQL Animation is a bonus)"
subtitle: "This has it all, including the ransom note. SQL is fun, Have fun or the dog gets it.."
date: 2026-10-03T22:52:50.956Z
cover: "/images/medium/1_JcMZZ-vg1k-Fekek3kmdRQ.gif"
tags: ["SQL Server", "Life"]
mediumUrl: "https://medium.com/@trevor.dwyer/im-53-she-is-33-and-wants-a-baby-so-meet-brian-the-sausage-dog-sql-animation-is-a-bonus-e0324508f90f"
era: "Today"
draft: false
---

I struggle where to start with this one but I think I can make it readable, enjoyable and a template for anyone else with a younger partner and of course some never seen before SQL techniques.

![Brian, the Dachshund, Created using SQL Server Spatial](/images/medium/1_JcMZZ-vg1k-Fekek3kmdRQ.gif)
*Brian, the Dachshund, Created using SQL Server Spatial*

I wont beat around the bush, she wants a baby (33), I’m 53 and a dead man walking, so we compromised. We got a dachshund and named him Brian.

Brian is evil reincarnated but is also the cutest little sausage dog you can imagine. We literally get stopped everywhere with people asking about him. When I’m walking him, well I say walking it really is me carrying him to the various green areas near us because he already has a list of things he does and doesn’t like. This is after 4 days.

Rule 1 — he doesn’t come into my office

*We (Brian and me) sat watching Sausage Dog videos for 2 hours yesterday in my office.*

Rule 2 — he doesn’t sleep on the bed or even go near the bed

![Just look at his eyes — he knows what he is up to. Yes this is my side of the bed.](/images/medium/1_EdtBrUk5h6fTYpQyZsoVbw.jpeg)
*Just look at his eyes — he knows what he is up to. Yes this is my side of the bed.*

Rule 3 — he has to be trained properly

*As you can imagine when you have two languages spoken in the house that should be one language spoken to the dog. Sit, Come, Stay etc…. but no its all sorts of Polish, mixed with English (I think) and never just the one word, multiple words to describe the thing he is meant to understand, spoken in Polish very fast. His training is not going well.*

## Moving on

I wanted to write a SQL Server spatial story today and I did, but the end of the spatial stuff I thought to myself, this is all very important, looks actually useful and business relatable. I simply cannot leave the demo code and application just like that, I have to put a swing on it.

So I did what any respectable SQL developer would do when he realised he couldn’t end the weekend doing this:

```sql
RETURN geometry::STGeomFromText(sx.JitterWkt(@g.AsTextZM(), @amp, @seed), @g.STSrid)
```

I wrote a cartoon called “The Dachshund” starring Brian, using SQL Server 2025 Spatial and the Geometry datatype. Now you might be thinking, yes we have seen Christmas Trees rendered in SQL, we have seen Trevor’s head rendered in SQL, we even have Doom running inside SQL Server. But this will be a full animated cartoon coming straight from the SQL Engine.

Here is the code:

```sql
/* ==========================================================================
   Spatial Studio - 07 Toon: cut-out animation inside SQL Server
   Characters are puppets made of geometry parts. Each part hangs off a parent
   at a pivot, like the card cut-outs of 1970s children's TV. Keyframes are
   rows; toon.Render interpolates them, composes the affine transforms down the
   puppet with a recursive CTE, applies them with sx.Affine and adds a felt-tip
   "boil" with sx.Jitter. Starring Brian, a black-and-tan dachshund.
   ========================================================================== */
USE SpatialStudio;
GO
IF SCHEMA_ID(N'toon') IS NULL EXEC (N'CREATE SCHEMA toon AUTHORIZATION dbo;');
GO

/* ---- tables ---- */
DROP TABLE IF EXISTS toon.Frame, toon.[Key], toon.Casting, toon.Part, toon.Scene;
GO
CREATE TABLE toon.Scene
(
    Scene  VARCHAR(40)   NOT NULL CONSTRAINT PK_ToonScene PRIMARY KEY,
    Title  NVARCHAR(100) NOT NULL,
    Frames INT           NOT NULL,
    Fps    INT           NOT NULL DEFAULT 12
);
CREATE TABLE toon.Part
(
    Character VARCHAR(30)  NOT NULL,
    Part      VARCHAR(30)  NOT NULL,
    Parent    VARCHAR(30)  NULL,           -- hangs off this part of the same character
    PivotX    FLOAT        NOT NULL,       -- the drawing pin: rotations happen about this point
    PivotY    FLOAT        NOT NULL,
    Z         INT          NOT NULL,       -- drawing order, low first
    Color     VARCHAR(30)  NOT NULL,
    Shape     GEOMETRY     NOT NULL,       -- rest pose, in the character's own coordinates
    OscPeriod FLOAT        NOT NULL DEFAULT 8,   -- frames per cycle for the 'osc' (swing) and 'bob' channels
    OscPhase  FLOAT        NOT NULL DEFAULT 0,   -- degrees
    Boil      FLOAT        NOT NULL DEFAULT 1,   -- multiplier on the felt-tip wobble
    Label     NVARCHAR(60) NULL,
    FontSize  INT          NULL,
    LineWidth FLOAT        NULL,
    CONSTRAINT PK_ToonPart PRIMARY KEY (Character, Part)
);
CREATE TABLE toon.Casting
(
    Scene     VARCHAR(40) NOT NULL,
    Character VARCHAR(30) NOT NULL,
    CONSTRAINT PK_ToonCasting PRIMARY KEY (Scene, Character)
);
/* Channels: angle (degrees, anticlockwise), dx, dy (move), sx (1 = as drawn, -1 = flipped),
   osc (swing amplitude in degrees, cycling with OscPeriod), bob (hop height), vis (1 shown, 0 hidden).
   Ease on a key says how we arrive at it: smooth, linear or step.                                 */
CREATE TABLE toon.[Key]
(
    Scene     VARCHAR(40) NOT NULL,
    Character VARCHAR(30) NOT NULL,
    Part      VARCHAR(30) NOT NULL,
    Channel   VARCHAR(10) NOT NULL CHECK (Channel IN ('angle', 'dx', 'dy', 'sx', 'osc', 'bob', 'vis')),
    Frame     INT         NOT NULL,
    Value     FLOAT       NOT NULL,
    Ease      VARCHAR(10) NOT NULL DEFAULT 'smooth' CHECK (Ease IN ('smooth', 'linear', 'step')),
    CONSTRAINT PK_ToonKey PRIMARY KEY (Scene, Character, Part, Channel, Frame)
);
CREATE TABLE toon.Frame
(
    Scene     VARCHAR(40)  NOT NULL,
    Frame     INT          NOT NULL,
    Character VARCHAR(30)  NOT NULL,
    Part      VARCHAR(30)  NOT NULL,
    Z         INT          NOT NULL,
    Shape     GEOMETRY     NOT NULL,
    Color     VARCHAR(30)  NOT NULL,
    Label     NVARCHAR(60) NULL,
    FontSize  INT          NULL,
    LineWidth FLOAT        NULL,
    CONSTRAINT PK_ToonFrame PRIMARY KEY (Scene, Frame, Character, Part)
);
GO
```

```sql
/* ---- the boil: nudge every vertex by a hash of its own coordinates ----
   The same input point always gets the same nudge, so closed rings stay closed. */
CREATE OR ALTER FUNCTION sx.JitterWkt (@wkt NVARCHAR(MAX), @amp FLOAT, @seed INT)
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @out NVARCHAR(MAX);
    SELECT @out = STRING_AGG(CAST(p.Piece AS NVARCHAR(MAX)), N',') WITHIN GROUP (ORDER BY s.ordinal)
    FROM STRING_SPLIT(@wkt, N',', 1) AS s
    CROSS APPLY (SELECT L = DATALENGTH(s.value) / 2, lp = CHARINDEX(N'(', REVERSE(s.value))) AS a
    CROSS APPLY (SELECT Prefix = CASE WHEN a.lp = 0 THEN CAST(N'' AS NVARCHAR(MAX)) ELSE LEFT(s.value, a.L - a.lp + 1) END) AS b
    CROSS APPLY (SELECT Rest = SUBSTRING(s.value, DATALENGTH(b.Prefix) / 2 + 1, a.L)) AS c
    CROSS APPLY (SELECT rp = CHARINDEX(N')', c.Rest)) AS d
    CROSS APPLY (SELECT Coord  = CASE WHEN d.rp = 0 THEN c.Rest ELSE LEFT(c.Rest, d.rp - 1) END,
                        Suffix = CASE WHEN d.rp = 0 THEN N'' ELSE SUBSTRING(c.Rest, d.rp, a.L) END) AS e
    CROSS APPLY (SELECT Lead = CASE WHEN LEFT(e.Coord, 1) = N' ' THEN N' ' ELSE N'' END,
                        Ct   = LTRIM(RTRIM(e.Coord))) AS f
    CROSS APPLY (SELECT sp1 = CHARINDEX(N' ', f.Ct)) AS g
    CROSS APPLY (SELECT Xs     = CASE WHEN g.sp1 > 0 THEN LEFT(f.Ct, g.sp1 - 1) END,
                        AfterX = CASE WHEN g.sp1 > 0 THEN SUBSTRING(f.Ct, g.sp1 + 1, a.L) END) AS h
    CROSS APPLY (SELECT sp2 = CHARINDEX(N' ', h.AfterX)) AS i
    CROSS APPLY (SELECT Ys    = CASE WHEN i.sp2 > 0 THEN LEFT(h.AfterX, i.sp2 - 1) ELSE h.AfterX END,
                        Extra = CASE WHEN i.sp2 > 0 THEN SUBSTRING(h.AfterX, i.sp2, a.L) ELSE N'' END) AS j
    CROSS APPLY (SELECT X = TRY_CAST(h.Xs AS FLOAT), Y = TRY_CAST(j.Ys AS FLOAT)) AS k
    CROSS APPLY (SELECT NX = k.X + (sx.Hash01(ROUND(k.X, 3), ROUND(k.Y, 3), @seed) - 0.5) * 2 * @amp,
                        NY = k.Y + (sx.Hash01(ROUND(k.Y, 3), ROUND(k.X, 3), @seed + 17) - 0.5) * 2 * @amp) AS m
    CROSS APPLY (SELECT Piece = CASE WHEN k.X IS NULL OR k.Y IS NULL THEN s.value
                                     ELSE b.Prefix + f.Lead + sx.FormatNum(m.NX) + N' ' + sx.FormatNum(m.NY) + j.Extra + e.Suffix END) AS p;
    RETURN @out;
END;
GO

CREATE OR ALTER FUNCTION sx.Jitter (@g GEOMETRY, @amp FLOAT, @seed INT)
RETURNS GEOMETRY
AS
BEGIN
    IF @g IS NULL OR @amp IS NULL OR @amp = 0 OR @g.STIsEmpty() = 1 RETURN @g;
    RETURN geometry::STGeomFromText(sx.JitterWkt(@g.AsTextZM(), @amp, @seed), @g.STSrid);
END;
GO
```

```sql
/* ---- the renderer ---- */
CREATE OR ALTER PROCEDURE toon.Render
    @Scene     VARCHAR(40),
    @FromFrame INT   = 0,
    @ToFrame   INT   = NULL,
    @Boil      FLOAT = 0.7,     -- felt-tip wobble in drawing units; 0 for a clean line
    @Store     BIT   = 1        -- 1: write toon.Frame; 0: return the rows
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @t0 DATETIME2 = SYSDATETIME();
    IF @ToFrame IS NULL SELECT @ToFrame = Frames - 1 FROM toon.Scene WHERE Scene = @Scene;
    IF @ToFrame IS NULL THROW 50001, 'Unknown scene - add it to toon.Scene first.', 1;

    DROP TABLE IF EXISTS #f, #ch, #loc, #world;
    SELECT Frame = value INTO #f FROM GENERATE_SERIES(@FromFrame, @ToFrame);

    -- 1. every keyed channel, interpolated for every frame
    SELECT f.Frame, c.Character, c.Part, c.Channel,
           Value = CASE WHEN k0.Frame IS NULL THEN k1.Value
                        WHEN k1.Frame IS NULL OR k1.Frame = k0.Frame THEN k0.Value
                        ELSE k0.Value + (k1.Value - k0.Value) *
                             CASE k1.Ease WHEN 'step' THEN 0.0 WHEN 'linear' THEN u.u ELSE u.u * u.u * (3 - 2 * u.u) END END
    INTO #ch
    FROM #f AS f
    CROSS JOIN (SELECT DISTINCT Character, Part, Channel FROM toon.[Key] WHERE Scene = @Scene) AS c
    OUTER APPLY (SELECT TOP (1) k.Frame, k.Value FROM toon.[Key] AS k
                 WHERE k.Scene = @Scene AND k.Character = c.Character AND k.Part = c.Part AND k.Channel = c.Channel AND k.Frame <= f.Frame
                 ORDER BY k.Frame DESC) AS k0
    OUTER APPLY (SELECT TOP (1) k.Frame, k.Value, k.Ease FROM toon.[Key] AS k
                 WHERE k.Scene = @Scene AND k.Character = c.Character AND k.Part = c.Part AND k.Channel = c.Channel AND k.Frame >= f.Frame
                 ORDER BY k.Frame) AS k1
    CROSS APPLY (SELECT u = CASE WHEN k0.Frame IS NULL OR k1.Frame IS NULL OR k1.Frame = k0.Frame THEN 0.0
                                 ELSE CAST(f.Frame - k0.Frame AS FLOAT) / (k1.Frame - k0.Frame) END) AS u;
    CREATE CLUSTERED INDEX cx ON #ch (Frame, Character, Part);

    -- 2. each part's local affine matrix: move, then flip and rotate about its pivot
    SELECT f.Frame, p.Character, p.Part, p.Parent, p.Z,
           la = m.a, lb = m.b, lc = p.PivotX + t.tx - (m.a * p.PivotX + m.b * p.PivotY),
           ld = m.d, le = m.e, lf = p.PivotY + t.ty - (m.d * p.PivotX + m.e * p.PivotY),
           vis = t.vis
    INTO #loc
    FROM #f AS f
    JOIN toon.Casting AS cs ON cs.Scene = @Scene
    JOIN toon.Part AS p ON p.Character = cs.Character
    OUTER APPLY (SELECT angle = MAX(CASE WHEN h.Channel = 'angle' THEN h.Value END),
                        dx    = MAX(CASE WHEN h.Channel = 'dx'    THEN h.Value END),
                        dy    = MAX(CASE WHEN h.Channel = 'dy'    THEN h.Value END),
                        sx    = MAX(CASE WHEN h.Channel = 'sx'    THEN h.Value END),
                        osc   = MAX(CASE WHEN h.Channel = 'osc'   THEN h.Value END),
                        bob   = MAX(CASE WHEN h.Channel = 'bob'   THEN h.Value END),
                        vis   = MAX(CASE WHEN h.Channel = 'vis'   THEN h.Value END)
                 FROM #ch AS h WHERE h.Frame = f.Frame AND h.Character = p.Character AND h.Part = p.Part) AS v
    CROSS APPLY (SELECT th  = RADIANS(ISNULL(v.angle, 0) + ISNULL(v.osc, 0) * SIN(2 * PI() * f.Frame / p.OscPeriod + RADIANS(p.OscPhase))),
                        tx  = ISNULL(v.dx, 0),
                        ty  = ISNULL(v.dy, 0) + ISNULL(v.bob, 0) * ABS(SIN(PI() * f.Frame / p.OscPeriod)),
                        s   = ISNULL(v.sx, 1),
                        vis = CAST(ISNULL(v.vis, 1) AS FLOAT)) AS t
    CROSS APPLY (SELECT a = t.s * COS(t.th), b = -t.s * SIN(t.th), d = SIN(t.th), e = COS(t.th)) AS m;

    -- 3. compose down the puppet: world = parent world x local (a recursive CTE per frame)
    WITH w AS
    (
        SELECT l.Frame, l.Character, l.Part, l.Z, a = l.la, b = l.lb, c = l.lc, d = l.ld, e = l.le, ff = l.lf, vis = l.vis
        FROM #loc AS l WHERE l.Parent IS NULL
        UNION ALL
        SELECT l.Frame, l.Character, l.Part, l.Z,
               w.a * l.la + w.b * l.ld,
               w.a * l.lb + w.b * l.le,
               w.a * l.lc + w.b * l.lf + w.c,
               w.d * l.la + w.e * l.ld,
               w.d * l.lb + w.e * l.le,
               w.d * l.lc + w.e * l.lf + w.ff,
               w.vis * l.vis
        FROM w JOIN #loc AS l ON l.Frame = w.Frame AND l.Character = w.Character AND l.Parent = w.Part
    )
    SELECT * INTO #world FROM w OPTION (MAXRECURSION 64);

    -- 4. draw: move every visible part, then boil it (the boil changes every other frame, four drawings, like felt-tip on cel)
    IF @Store = 1
    BEGIN
        DELETE toon.Frame WHERE Scene = @Scene AND Frame BETWEEN @FromFrame AND @ToFrame;
        INSERT toon.Frame (Scene, Frame, Character, Part, Z, Shape, Color, Label, FontSize, LineWidth)
        SELECT @Scene, w.Frame, w.Character, w.Part, w.Z,
               sx.Jitter(CASE WHEN w.a = 1 AND w.b = 0 AND w.c = 0 AND w.d = 0 AND w.e = 1 AND w.ff = 0 THEN p.Shape
                              ELSE sx.Affine(p.Shape, w.a, w.b, w.c, w.d, w.e, w.ff) END,
                         @Boil * p.Boil, (w.Frame / 2) % 4 + 1),
               p.Color, p.Label, p.FontSize, p.LineWidth
        FROM #world AS w JOIN toon.Part AS p ON p.Character = w.Character AND p.Part = w.Part
        WHERE w.vis > 0.5;
        SELECT scene = @Scene, frames = @ToFrame - @FromFrame + 1, [shapes drawn] = @@ROWCOUNT,
               [render ms] = DATEDIFF(MILLISECOND, @t0, SYSDATETIME());
    END
    ELSE
        SELECT frame = w.Frame, shape = sx.Jitter(sx.Affine(p.Shape, w.a, w.b, w.c, w.d, w.e, w.ff), @Boil * p.Boil, (w.Frame / 2) % 4 + 1),
               color = p.Color, label = p.Label, fontsize = p.FontSize, linewidth = p.LineWidth, opacity = 1.0, part = CONCAT(w.Character, '.', w.Part), z = w.Z
        FROM #world AS w JOIN toon.Part AS p ON p.Character = w.Character AND p.Part = w.Part
        WHERE w.vis > 0.5
        ORDER BY w.Frame, w.Z, w.Character, w.Part;
END;
GO
```

## The Cast List

```sql
/* ---- the cast ---- */
INSERT toon.Part (Character, Part, Parent, PivotX, PivotY, Z, Color, Shape, OscPeriod, OscPhase, Boil, Label, FontSize, LineWidth) VALUES
(N'Park', N'Sky', NULL, 0, 0, 0, N'#bfe6f7', N'POLYGON ((0 0, 1000 0, 1000 450, 0 450, 0 0))', 8, 0, 0, NULL, NULL, 0),
(N'Park', N'Rays', NULL, 130, 380, 1, N'#ffe082', N'MULTIPOLYGON (((173.56 373.80, 196.00 380.00, 173.56 386.20, 173.56 373.80)), ((168.89 400.59, 183.40 418.79, 161.60 410.62, 168.89 400.59)), ((149.36 419.51, 150.40 442.77, 137.56 423.34, 149.36 419.51)), ((122.44 423.34, 109.60 442.77, 110.64 419.51, 122.44 423.34)), ((98.40 410.62, 76.60 418.79, 91.11 400.59, 98.40 410.62)), ((86.44 386.20, 64.00 380.00, 86.44 373.80, 86.44 386.20)), ((91.11 359.41, 76.60 341.21, 98.40 349.38, 91.11 359.41)), ((110.64 340.49, 109.60 317.23, 122.44 336.66, 110.64 340.49)), ((137.56 336.66, 150.40 317.23, 149.36 340.49, 137.56 336.66)), ((161.60 349.38, 183.40 341.21, 168.89 359.41, 161.60 349.38)))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Sun', NULL, 130, 380, 2, N'#ffd54f', N'CURVEPOLYGON (CIRCULARSTRING (96 380, 130 414, 164 380, 130 346, 96 380))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Hills', NULL, 0, 0, 3, N'#a5d6a7', N'CURVEPOLYGON (COMPOUNDCURVE (CIRCULARSTRING (0 120, 250 230, 520 140), CIRCULARSTRING (520 140, 760 215, 1000 130), (1000 130, 1000 60, 0 60, 0 120)))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Grass', NULL, 0, 0, 4, N'#7cb342', N'POLYGON ((0 0, 1000 0, 1000 75, 0 75, 0 0))', 8, 0, 0, NULL, NULL, 0),
(N'Park', N'Trunk', NULL, 0, 0, 5, N'#795548', N'POLYGON ((860 70, 886 70, 880 195, 866 195, 860 70))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Leaves1', NULL, 0, 0, 6, N'#558b2f', N'CURVEPOLYGON (CIRCULARSTRING (802 215, 842 255, 882 215, 842 175, 802 215))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Leaves2', NULL, 0, 0, 7, N'#689f38', N'CURVEPOLYGON (CIRCULARSTRING (853 226, 898 271, 943 226, 898 181, 853 226))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Leaves3', NULL, 0, 0, 8, N'#7cb342', N'CURVEPOLYGON (CIRCULARSTRING (828 262, 868 302, 908 262, 868 222, 828 262))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Flower1', NULL, 0, 0, 9, N'#f06292', N'CURVEPOLYGON (CIRCULARSTRING (65 40, 70 45, 75 40, 70 35, 65 40))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Flower2', NULL, 0, 0, 9, N'#fff176', N'CURVEPOLYGON (CIRCULARSTRING (325 22, 330 27, 335 22, 330 17, 325 22))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Flower3', NULL, 0, 0, 9, N'#f06292', N'CURVEPOLYGON (CIRCULARSTRING (465 50, 470 55, 475 50, 470 45, 465 50))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Flower4', NULL, 0, 0, 9, N'#ba68c8', N'CURVEPOLYGON (CIRCULARSTRING (605 18, 610 23, 615 18, 610 13, 605 18))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Park', N'Flower5', NULL, 0, 0, 9, N'#fff176', N'CURVEPOLYGON (CIRCULARSTRING (945 35, 950 40, 955 35, 950 30, 945 35))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Cloud1', N'Puff1', NULL, 0, 0, 4, N'#ffffff', N'CURVEPOLYGON (CIRCULARSTRING (-22 0, 0 22, 22 0, 0 -22, -22 0))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Cloud1', N'Puff2', N'Puff1', 0, 0, 4, N'#ffffff', N'CURVEPOLYGON (CIRCULARSTRING (7 -4, 24 13, 41 -4, 24 -21, 7 -4))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Cloud1', N'Puff3', N'Puff1', 0, 0, 4, N'#ffffff', N'CURVEPOLYGON (CIRCULARSTRING (-37 -6, -22 9, -7 -6, -22 -21, -37 -6))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Cloud2', N'Puff1', NULL, 0, 0, 4, N'#ffffff', N'CURVEPOLYGON (CIRCULARSTRING (-22 0, 0 22, 22 0, 0 -22, -22 0))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Cloud2', N'Puff2', N'Puff1', 0, 0, 4, N'#ffffff', N'CURVEPOLYGON (CIRCULARSTRING (7 -4, 24 13, 41 -4, 24 -21, 7 -4))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Cloud2', N'Puff3', N'Puff1', 0, 0, 4, N'#ffffff', N'CURVEPOLYGON (CIRCULARSTRING (-37 -6, -22 9, -7 -6, -22 -21, -37 -6))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Brian', N'LegBackFar', N'Body', -57.0, 45.0, 10, N'#1a110c', N'CURVEPOLYGON (COMPOUNDCURVE ((-63 48, -63 7.5), CIRCULARSTRING (-63 7.5, -54.75 -0.75, -46.5 7.5), (-46.5 7.5, -51 48, -63 48)))', 6, 0, 1.0, NULL, NULL, 1.6),
(N'Brian', N'LegFrontFar', N'Body', 63.0, 45.0, 11, N'#1a110c', N'CURVEPOLYGON (COMPOUNDCURVE ((57 48, 57 7.5), CIRCULARSTRING (57 7.5, 65.25 -0.75, 73.5 7.5), (73.5 7.5, 69 48, 57 48)))', 6, 180, 1.0, NULL, NULL, 1.6),
(N'Brian', N'Tail', N'Body', -84.0, 70.5, 15, N'#2b1d16', N'CURVEPOLYGON (COMPOUNDCURVE (CIRCULARSTRING (-84 75, -108 85.5, -126 109.5), (-126 109.5, -130.5 106.5), CIRCULARSTRING (-130.5 106.5, -111 78, -84 66), (-84 66, -84 75)))', 4, 0, 1.0, NULL, NULL, 1.6),
(N'Brian', N'Body', NULL, 0.0, 60.0, 20, N'#2b1d16', N'CURVEPOLYGON (COMPOUNDCURVE ((-67.5 37.5, 67.5 37.5), CIRCULARSTRING (67.5 37.5, 90 60, 67.5 82.5), (67.5 82.5, -67.5 82.5), CIRCULARSTRING (-67.5 82.5, -90 60, -67.5 37.5)))', 6, 0, 1.0, NULL, NULL, 1.6),
(N'Brian', N'Belly', N'Body', 0.0, 60.0, 21, N'#c47a3a', N'POLYGON ((-45 39, 60 39, 70.5 46.5, 60 54, -45 49.5, -54 43.5, -45 39))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Brian', N'Collar', N'Body', 78.0, 78.0, 22, N'#d32f2f', N'POLYGON ((72 60, 82.5 57, 93 90, 82.5 93, 72 60))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Brian', N'Tag', N'Collar', 82.5, 60.0, 23, N'#ffca28', N'CURVEPOLYGON (CIRCULARSTRING (78.6 53.25, 82.5 57.15, 86.4 53.25, 82.5 49.35, 78.6 53.25))', 6, 0, 0.4, NULL, NULL, 1.6),
(N'Brian', N'LegBackNear', N'Body', -48.0, 45.0, 25, N'#2b1d16', N'CURVEPOLYGON (COMPOUNDCURVE ((-54 48, -54 7.5), CIRCULARSTRING (-54 7.5, -45.75 -0.75, -37.5 7.5), (-37.5 7.5, -42 48, -54 48)))', 6, 180, 1.0, NULL, NULL, 1.6),
(N'Brian', N'LegFrontNear', N'Body', 72.0, 45.0, 26, N'#2b1d16', N'CURVEPOLYGON (COMPOUNDCURVE ((66 48, 66 7.5), CIRCULARSTRING (66 7.5, 74.25 -0.75, 82.5 7.5), (82.5 7.5, 78 48, 66 48)))', 6, 0, 1.0, NULL, NULL, 1.6),
(N'Brian', N'PawBackNear', N'LegBackNear', -48.0, 45.0, 27, N'#c47a3a', N'CURVEPOLYGON (CIRCULARSTRING (-51 4.5, -45 10.5, -39 4.5, -45 -1.5, -51 4.5))', 8, 0, 0.5, NULL, NULL, 1.6),
(N'Brian', N'PawFrontNear', N'LegFrontNear', 72.0, 45.0, 27, N'#c47a3a', N'CURVEPOLYGON (CIRCULARSTRING (69 4.5, 75 10.5, 81 4.5, 75 -1.5, 69 4.5))', 8, 0, 0.5, NULL, NULL, 1.6),
(N'Brian', N'Head', N'Body', 84.0, 84.0, 30, N'#2b1d16', N'CURVEPOLYGON (CIRCULARSTRING (81 93, 102 114, 123 93, 102 72, 81 93))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Brian', N'Snout', N'Head', 117.0, 90.0, 31, N'#2b1d16', N'CURVEPOLYGON (COMPOUNDCURVE ((114 102, 150 90), CIRCULARSTRING (150 90, 157.5 82.5, 150 75), (150 75, 114 75, 114 102)))', 8, 0, 1.0, NULL, NULL, 1.6),
(N'Brian', N'Muzzle', N'Snout', 117.0, 90.0, 32, N'#c47a3a', N'POLYGON ((117 75, 150 75, 153.75 79.5, 120 83.25, 117 75))', 8, 0, 0.5, NULL, NULL, 1.6),
(N'Brian', N'Nose', N'Snout', 117.0, 90.0, 33, N'#0d0d0d', N'CURVEPOLYGON (CIRCULARSTRING (149.55 87, 153.75 91.2, 157.95 87, 153.75 82.8, 149.55 87))', 8, 0, 0.3, NULL, NULL, 1.6),
(N'Brian', N'Eye', N'Head', 112.5, 99.0, 34, N'#ffffff', N'CURVEPOLYGON (CIRCULARSTRING (108.3 99, 112.5 103.2, 116.7 99, 112.5 94.8, 108.3 99))', 8, 0, 0.3, NULL, NULL, 1.6),
(N'Brian', N'Pupil', N'Eye', 112.5, 99.0, 35, N'#0d0d0d', N'CURVEPOLYGON (CIRCULARSTRING (111.45 99, 113.85 101.4, 116.25 99, 113.85 96.6, 111.45 99))', 8, 0, 0.2, NULL, NULL, 0),
(N'Brian', N'Brow', N'Head', 111.0, 106.5, 36, N'#c47a3a', N'CURVEPOLYGON (CIRCULARSTRING (108.15 107.25, 111 110.1, 113.85 107.25, 111 104.4, 108.15 107.25))', 8, 0, 0.3, NULL, NULL, 0),
(N'Brian', N'Ear', N'Head', 96.0, 108.0, 37, N'#1f140f', N'CURVEPOLYGON (COMPOUNDCURVE ((93 111, 105 108), CIRCULARSTRING (105 108, 103.5 87, 93 69), CIRCULARSTRING (93 69, 84 78, 85.5 96), (85.5 96, 93 111)))', 6, 0, 1.0, NULL, NULL, 1.6),
(N'Ball', N'Ball', NULL, 0.0, 13.5, 40, N'#e53935', N'CURVEPOLYGON (CIRCULARSTRING (-13.5 13.5, 0 27, 13.5 13.5, 0 0, -13.5 13.5))', 12, 0, 0.5, NULL, NULL, 1.6),
(N'Ball', N'Stripe', N'Ball', 0.0, 13.5, 41, N'#ffffff', N'POLYGON ((-12.75 11.4, 12.75 11.4, 12.75 15.6, -12.75 15.6, -12.75 11.4))', 8, 0, 0.3, NULL, NULL, 0),
(N'Bang', N'Bubble', NULL, 0, 0, 50, N'#ffffff', N'CURVEPOLYGON (CIRCULARSTRING (-22 0, 0 18, 22 0, 0 -18, -22 0))', 8, 0, 1.0, N'!', 28, 2),
(N'Bang', N'Tail', N'Bubble', 0, 0, 49, N'#ffffff', N'POLYGON ((-6 -14, 6 -14, -10 -32, -6 -14))', 8, 0, 1.0, NULL, NULL, 2),
(N'Woof', N'Bubble', NULL, 0, 0, 50, N'#ffffff', N'CURVEPOLYGON (CIRCULARSTRING (-46 0, 0 26, 46 0, 0 -26, -46 0))', 8, 0, 1.0, N'WOOF!', 24, 2),
(N'Woof', N'Tail', N'Bubble', 0, 0, 49, N'#ffffff', N'POLYGON ((10 -20, 22 -18, 34 -44, 10 -20))', 8, 0, 1.0, NULL, NULL, 2),
(N'Title', N'Card', NULL, 0, 0, 60, N'#fff8e1', N'POLYGON ((-215 -40, -200 -58, 200 -58, 215 -40, 215 40, 200 58, -200 58, -215 40, -215 -40))', 8, 0, 1.0, N'BRIAN  in  "The Ball"', 34, 3),
(N'End', N'Card', NULL, 0, 0, 60, N'#fff8e1', N'POLYGON ((-215 -40, -200 -58, 200 -58, 215 -40, 215 40, 200 58, -200 58, -215 40, -215 -40))', 8, 0, 1.0, N'THE END', 40, 3);
GO
```

## The Final Scene — “Brian and The Ball”

```sql
/* ---- episode one: Brian and the Ball (20 seconds at 12 fps) ---- */
INSERT toon.Scene (Scene, Title, Frames, Fps) VALUES ('BrianAndTheBall', N'Brian in "The Ball"', 241, 12);
INSERT toon.Casting (Scene, Character) VALUES
('BrianAndTheBall', 'Park'), ('BrianAndTheBall', 'Cloud1'), ('BrianAndTheBall', 'Cloud2'), ('BrianAndTheBall', 'Brian'),
('BrianAndTheBall', 'Ball'), ('BrianAndTheBall', 'Bang'), ('BrianAndTheBall', 'Woof'), ('BrianAndTheBall', 'Title'), ('BrianAndTheBall', 'End');
INSERT toon.[Key] (Scene, Character, Part, Channel, Frame, Value, Ease) VALUES
('BrianAndTheBall', 'Park', 'Rays', 'angle', 0, 0, 'smooth'),
('BrianAndTheBall', 'Park', 'Rays', 'angle', 240, -90, 'linear'),
('BrianAndTheBall', 'Cloud1', 'Puff1', 'dx', 0, 280, 'smooth'),
('BrianAndTheBall', 'Cloud1', 'Puff1', 'dx', 240, 520, 'linear'),
('BrianAndTheBall', 'Cloud1', 'Puff1', 'dy', 0, 350, 'smooth'),
('BrianAndTheBall', 'Cloud2', 'Puff1', 'dx', 0, 640, 'smooth'),
('BrianAndTheBall', 'Cloud2', 'Puff1', 'dx', 240, 820, 'linear'),
('BrianAndTheBall', 'Cloud2', 'Puff1', 'dy', 0, 400, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'dx', 0, 200, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'dx', 60, 200, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'dx', 150, 615, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'dx', 175, 615, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'dx', 225, 250, 'linear'),
('BrianAndTheBall', 'Brian', 'Body', 'dx', 240, 250, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'dy', 0, 65, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'sx', 0, 1, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'sx', 174, 1, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'sx', 175, -1, 'step'),
('BrianAndTheBall', 'Brian', 'Body', 'bob', 0, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'bob', 60, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'bob', 68, 4, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'bob', 142, 4, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'bob', 150, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'bob', 178, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'bob', 184, 2.5, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'bob', 218, 2.5, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'bob', 225, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'angle', 0, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'angle', 150, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'angle', 158, -8, 'smooth'),
('BrianAndTheBall', 'Brian', 'Body', 'angle', 168, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 0, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 30, 8, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 45, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 52, 14, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 60, 4, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 150, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 157, -24, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 168, -6, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 175, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 226, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 230, 16, 'smooth'),
('BrianAndTheBall', 'Brian', 'Head', 'angle', 240, 16, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'angle', 0, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'angle', 50, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'angle', 53, 18, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'angle', 60, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'angle', 70, -55, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'angle', 145, -55, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'angle', 152, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'angle', 180, -35, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'angle', 220, -35, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'angle', 226, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'osc', 0, 4, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'osc', 70, 12, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'osc', 145, 12, 'smooth'),
('BrianAndTheBall', 'Brian', 'Ear', 'osc', 152, 4, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'angle', 0, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'angle', 62, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'angle', 70, -18, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'angle', 146, -18, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'angle', 152, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'osc', 0, 18, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'osc', 50, 18, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'osc', 53, 35, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'osc', 62, 12, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'osc', 150, 22, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'osc', 226, 22, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'osc', 230, 40, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tail', 'osc', 240, 40, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackFar', 'osc', 0, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackFar', 'osc', 60, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackFar', 'osc', 64, 38, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackFar', 'osc', 146, 38, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackFar', 'osc', 150, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackFar', 'osc', 176, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackFar', 'osc', 180, 26, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackFar', 'osc', 222, 26, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackFar', 'osc', 225, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontFar', 'osc', 0, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontFar', 'osc', 60, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontFar', 'osc', 64, 38, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontFar', 'osc', 146, 38, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontFar', 'osc', 150, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontFar', 'osc', 176, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontFar', 'osc', 180, 26, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontFar', 'osc', 222, 26, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontFar', 'osc', 225, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackNear', 'osc', 0, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackNear', 'osc', 60, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackNear', 'osc', 64, 38, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackNear', 'osc', 146, 38, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackNear', 'osc', 150, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackNear', 'osc', 176, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackNear', 'osc', 180, 26, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackNear', 'osc', 222, 26, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegBackNear', 'osc', 225, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontNear', 'osc', 0, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontNear', 'osc', 60, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontNear', 'osc', 64, 38, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontNear', 'osc', 146, 38, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontNear', 'osc', 150, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontNear', 'osc', 176, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontNear', 'osc', 180, 26, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontNear', 'osc', 222, 26, 'smooth'),
('BrianAndTheBall', 'Brian', 'LegFrontNear', 'osc', 225, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tag', 'osc', 0, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tag', 'osc', 60, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tag', 'osc', 64, 25, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tag', 'osc', 146, 25, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tag', 'osc', 150, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tag', 'osc', 176, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tag', 'osc', 180, 18, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tag', 'osc', 222, 18, 'smooth'),
('BrianAndTheBall', 'Brian', 'Tag', 'osc', 225, 0, 'smooth'),
('BrianAndTheBall', 'Brian', 'Eye', 'vis', 0, 1, 'smooth'),
('BrianAndTheBall', 'Brian', 'Eye', 'vis', 24, 0, 'step'),
('BrianAndTheBall', 'Brian', 'Eye', 'vis', 26, 1, 'step'),
('BrianAndTheBall', 'Brian', 'Eye', 'vis', 110, 0, 'step'),
('BrianAndTheBall', 'Brian', 'Eye', 'vis', 112, 1, 'step'),
('BrianAndTheBall', 'Brian', 'Eye', 'vis', 196, 0, 'step'),
('BrianAndTheBall', 'Brian', 'Eye', 'vis', 198, 1, 'step'),
('BrianAndTheBall', 'Ball', 'Ball', 'dx', 0, 1080, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dx', 20, 1080, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dx', 62, 780, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dx', 168, 780, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dx', 171, 765, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dx', 174, 765, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dx', 175, 465, 'step'),
('BrianAndTheBall', 'Ball', 'Ball', 'dx', 225, 100, 'linear'),
('BrianAndTheBall', 'Ball', 'Ball', 'dx', 240, 100, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dy', 0, 65, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dy', 168, 65, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dy', 171, 129.5, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dy', 226, 129.5, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'dy', 232, 65, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'bob', 0, 0, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'bob', 20, 150, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'bob', 62, 0, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'angle', 0, 0, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'angle', 20, 0, 'smooth'),
('BrianAndTheBall', 'Ball', 'Ball', 'angle', 62, 1273, 'smooth'),
('BrianAndTheBall', 'Bang', 'Bubble', 'dx', 0, 305, 'smooth'),
('BrianAndTheBall', 'Bang', 'Bubble', 'dy', 0, 220, 'smooth'),
('BrianAndTheBall', 'Bang', 'Bubble', 'vis', 0, 0, 'smooth'),
('BrianAndTheBall', 'Bang', 'Bubble', 'vis', 52, 1, 'step'),
('BrianAndTheBall', 'Bang', 'Bubble', 'vis', 64, 0, 'step'),
('BrianAndTheBall', 'Woof', 'Bubble', 'dx', 0, 105, 'smooth'),
('BrianAndTheBall', 'Woof', 'Bubble', 'dy', 0, 240, 'smooth'),
('BrianAndTheBall', 'Woof', 'Bubble', 'vis', 0, 0, 'smooth'),
('BrianAndTheBall', 'Woof', 'Bubble', 'vis', 229, 1, 'step'),
('BrianAndTheBall', 'Title', 'Card', 'dx', 0, 500, 'smooth'),
('BrianAndTheBall', 'Title', 'Card', 'dy', 0, 280, 'smooth'),
('BrianAndTheBall', 'Title', 'Card', 'vis', 0, 1, 'smooth'),
('BrianAndTheBall', 'Title', 'Card', 'vis', 36, 0, 'step'),
('BrianAndTheBall', 'End', 'Card', 'dx', 0, 500, 'smooth'),
('BrianAndTheBall', 'End', 'Card', 'dy', 0, 300, 'smooth'),
('BrianAndTheBall', 'End', 'Card', 'vis', 0, 0, 'smooth'),
('BrianAndTheBall', 'End', 'Card', 'vis', 236, 1, 'step');
GO
```

## Don’t Panic

The referenced database called “SpatialStudio” is the real demo but I will post it separately to this story. I am very pleased with both this little animation and the spatial and vector examples I have put together. I found when spatial got put into the product back in SQL 2005 (I think) I was so happy and waited for it to explode, and it just didnt really go anywhere. Now I think its got as real chance to be used.

IN SQL Server 2025 we now have Vector indexes which are based on the [DiskANN](https://www.microsoft.com/en-us/research/publication/diskann-fast-accurate-billion-point-nearest-neighbor-search-on-a-single-node) algorithm. DiskANN relies on creating a graph to navigate quickly through all the indexed vectors to find the closest match to a given vector. DiskANN is a graph-based system for indexing and searching large sets of vector data. Take a look at the paper linked for a deep dive into DiskANN. The code I will publish tomorrow uses Vector indexes in the final part of the application.

Hope you enjoyed this little detour from the heavy on the SQL stories to look at puppies but I needed to animate him.

If you enjoyed please Clap as its this single metric that makes me lie awake all night wondering if the whole world will have seen my writing, and thinking if everyone clapped multiple times I could be rich beyond my wildest dreams and then I check and see 0 claps. Maybe a different tactic is in order….

![Right Brian is being held hostage….](/images/medium/1_m7TTx28mugahXnyxhRLmqQ.jpeg)
*Right Brian is being held hostage….*
