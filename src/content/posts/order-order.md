---
title: "Order! Order!"
subtitle: ""
date: 2026-10-14T10:32:20.000Z
cover: "/images/medium/1_mPZLv8icTl8C05RLe-Dqiw.jpeg"
tags: ["House Of Commons", "Data Analysis", "SQL", "Government", "Statistics"]
mediumUrl: "https://medium.com/@trevor.dwyer/order-order-a3cfa542dbaa"
draft: false
---

![I wouldn’t trust any one of them.](/images/medium/1_mPZLv8icTl8C05RLe-Dqiw.jpeg)
*I wouldn’t trust any one of them.*

## The question

When I put 1.7 million speeches through two graphics cards to see whether ministers ever steal the Opposition’s ideas, one thing kept nagging at me. It wasn’t the speeches. It was the man in the big chair, shouting “Order!” every few minutes.

How often does the Speaker actually have to step in? Leave the parties to their own devices and they become a rabble. Everyone knows that. But how much of a rabble, and has it changed?

So I asked SQL Server.

## Why a hypercube

My website already has a toy on it: every story I’ve written, placed inside a rotating four-dimensional cube. I wanted to give it something worth looking at.

![The Hypercube — a 4D OLAP Cube analysing articles on my website.](/images/medium/1_wxmxdBCWzJ2DbKUje1uaPg.png)
*The Hypercube — a 4D OLAP Cube analysing articles on my website.*

Here’s the thing most people don’t know. SQL Server has had a hypercube built in since 2008. `GROUP BY CUBE` takes a list of dimensions and works out every combination of them in one statement. Give it five (year, Speaker, type of business, party, Government or Opposition) and it computes all 32 ways of slicing the House, from the finest detail right up to the grand total.

I made one rule for myself. The database does the thinking. The viewer only draws what SQL Server worked out, and it never adds anything up itself.

## My Visit to the Chambers

I almost forgot about this, but I have been to the House of Commons as a guest of a friend and his charitable work. We were to have dinner with Peter Lilly, one of the MP’s who sat in Margret Thatchers cabinet. It was an interesting visit.

I arrive and go through the many security gates and arrive in the main building, we then have a quick tour — first to the House of Commons where we weren’t allowed to sit on the seats — by this time my back had gone and I was in terrible pain so I just kept thinking — whats the harm, but I observed the rules.

Before we went into the chamber there is a life size statue of Sir Winston Churchill in Bronze, its aged but his left foot is shiny, I asked why and apparently people touch his foot for luck when they enter the chamber.

The House of Lords was closed that day so we went down into the depths of the building and ended up in a dinning room over looking the Thames. It was at this point I realised I was the only person in the entire group of 20 that wasn’t wearing a tie. Londoners don’t wear ties these days, except in a few places and this was one of them.

I sat directly opposite the [Rt Hon Lord Lilley](https://www.peterlilley.co.uk/about/), and it was interesting as I only eat bread at these functions — I never want to eat under cooked lamb or a shrimp starter so I stick with bread. towards the end of the meal I want to smoke, so I go to leave and it turns out I need an escort. An armed Police Officer with an MP5 machine gun escorted me all the way to the main entrance, I smoked and he escorted me all the way back. At this point I saw people were chatting and I happened to be standing next to Peter Lilly and I remarked to him that I though his body of work was astounding. He was quite taken back. I had read every one of his ministerial papers the night before and back then I had a very decent memory. So I ended up chatting, with no tie to Margret Thatchers’ Minister for quite some time. All because regardless what he was actually like as an MP, but because he quite obviously believed in the data and that was evident in the huge amount of papers he had published and that meant in my eyes he was “a decent guy”.

## My first numbers were wrong

I started with the data I already had, the 1.7 million speeches from the vector search work. The first results came back and looked lovely. Bercow intervened more than anyone. Opposition and Government were treated much the same. I nearly wrote it up.

Then the cracks showed. The years 2002 to 2004 were almost empty. The speeches weren’t in the order they were spoken. And when I went back to the source, Evan Odell’s *Hansard Speeches 1979–2021*, it had 2.7 million rows, not 1.7.

The missing million told the story. To build embeddings, I’d thrown away every speech too short to mean anything. And what’s the shortest speech in Parliament? “Order.” My cleaned-up dataset had quietly kept about a quarter of everything the Chair ever said. I was measuring the Speaker with most of the Speaker removed.

That’s the lesson I’d pass on. Data you prepared for one question will happily answer a different one, and it won’t tell you it’s wrong. It’ll give you a neat answer.

Getting it back was satisfying. Every row in the source carries a TheyWorkForYou ID that records the sitting, the column and the paragraph, which is the true order of speaking. I matched my speeches back to it by date and their first 80 characters. 1,700,614 out of 1,700,647 paired up, in 34 seconds. Then I loaded the whole source instead, all 2.7 million rows, procedural lines and all.

I also wrote a second version of the counting rules in Python, whose only job was to disagree with the SQL. It found a bug on day one. “Order. Order.” was being counted once, because the full stop that ends the first call is also the one that starts the second. Two implementations, one argument, one fix. It’s the same trick that saved me on the AS/400.

```sql
/* =====================================================================
   Order! Order!  -  Commons Hypercube
   00_adapter.sql : maps the HANSARD database onto what the build needs.

   Source tables (already in HANSARD from the Hansard vector work):
     dbo.speech         one row per Commons speech, 1979 onwards
     dbo.speaker_party  each speaker's main party - fills in speeches
                        where dbo.speech.party is NULL
     dbo.gov_period     who governed when - the same definition of
                        "Government" the Hansard article used

   Seq: speech_id is NOT in sitting order (diagnostic H). The real
     order comes from the source dataset (Odell, Hansard Speeches
     1979-2021, biglam/hansard_speech): each row's TheyWorkForYou id
     carries sitting, column and paragraph. python/load_source_order.py
     loads those ids into hc.SourceOrder, EXEC hc.usp_MatchOrder (07)
     pairs them with dbo.speech into hc.SpeechOrder. Until then Seq is
     NULL and "who had the floor" is left Unknown rather than guessed.
   Also check:
     - The table is Commons only. If Lords rows are in there, filter
       them out in the WHERE clause below.
   ===================================================================== */
USE [HANSARD];
GO

IF SCHEMA_ID('hc') IS NULL EXEC('CREATE SCHEMA hc');
GO

/* The source's own order, loaded by python/load_source_order.py.
   Created here (and never dropped by later scripts) because the view
   below needs it to exist. */
IF OBJECT_ID('hc.SourceOrder') IS NULL
CREATE TABLE hc.SourceOrder
(
    Gid          varchar(100)  NOT NULL PRIMARY KEY,  -- uk.org.publicwhip/debate/1979-05-24a.1254.1
    SittingDate  date          NOT NULL,
    Sitting      varchar(4)    NOT NULL,              -- the 'a' after the date
    ColNum       int           NULL,
    Para         int           NULL,
    SpeechClass  varchar(20)   NULL,                  -- Speech | Procedural | ...
    SpeakerName  nvarchar(400) NULL,
    TextKey      nvarchar(80)  NOT NULL               -- first 80 non-space characters
);
GO
IF OBJECT_ID('hc.SpeechOrder') IS NULL
CREATE TABLE hc.SpeechOrder
(
    speech_id   int          NOT NULL PRIMARY KEY,
    Seq         bigint       NOT NULL,                -- position within the sitting day
    Gid         varchar(100) NOT NULL
);
GO

CREATE OR ALTER VIEW hc.vSpeech
AS
SELECT
    SpeechId     = CAST(s.speech_id AS bigint),
    SittingDate  = s.speech_date,
    Seq          = o.Seq,                             -- NULL until hc.usp_MatchOrder has run
    SpeechClass  = CAST('Speech' AS varchar(20)),      -- dbo.speech holds speeches only
    -- headings arrive wrapped in tabs and line breaks ('\n\tPRIME MINISTER\n  ')
    MajorHeading = TRIM(NCHAR(9) + NCHAR(10) + NCHAR(13) + N' ' FROM CAST(LEFT(s.major_heading, 400) AS nvarchar(400))),
    MinorHeading = TRIM(NCHAR(9) + NCHAR(10) + NCHAR(13) + N' ' FROM CAST(LEFT(s.minor_heading, 400) AS nvarchar(400))),
    SpeakerName  = CAST(LEFT(s.speaker_name, 400)  AS nvarchar(400)),
    PersonId     = CAST(s.person_id AS nvarchar(100)),
    Party        = CAST(COALESCE(NULLIF(LTRIM(RTRIM(s.party)), ''), sp.main_party) AS nvarchar(200)),
    -- the post they held when they spoke: the reliable way to spot a
    -- Deputy Speaker who is printed under their own name
    ParlPost     = CAST(LEFT(pp.parl_post, 500) AS nvarchar(500)),
    Body         = CAST(s.body AS nvarchar(max))
FROM dbo.speech AS s
LEFT JOIN dbo.speech_post AS pp
  ON pp.speech_id = s.speech_id
LEFT JOIN hc.SpeechOrder AS o
  ON o.speech_id = s.speech_id
LEFT JOIN
(   -- one main party per name; the biggest wins if a name appears twice
    SELECT speaker_name, main_party,
           rn = ROW_NUMBER() OVER (PARTITION BY speaker_name ORDER BY rows_in_main DESC)
    FROM dbo.speaker_party
) AS sp
  ON sp.speaker_name = s.speaker_name
 AND sp.rn = 1;
GO

/* "Government" comes from dbo.gov_period, inclusive at both ends as
   in dbo.usp_who_said_it_later. One party per period: if 2010-15 is
   stored as Conservative only, Lib Dems count as Opposition then.   */
CREATE OR ALTER VIEW hc.vGovernment
AS
SELECT FromDate = date_from,
       ToDate   = date_to,
       Party    = CAST(gov_party AS nvarchar(100))
FROM dbo.gov_period;
GO

/* Sanity check: one row per speech, sensible dates. */
-- SELECT COUNT_BIG(*) AS Speeches, MIN(SittingDate) AS FirstDay, MAX(SittingDate) AS LastDay,
--        COUNT(DISTINCT SittingDate) AS SittingDays
-- FROM hc.vSpeech;
```

```sql
/* =====================================================================
   Order! Order!  -  Commons Hypercube
   00b_adapter_full.sql : the alternative to 00_adapter.sql.

   Points hc.vSpeech at hc.SourceSpeech - the whole of Odell's
   "Hansard Speeches 1979-2021", loaded by python/load_source_full.py.
   Every speech and procedural line, 2001-04 included, in sitting order,
   with party and parliamentary posts as they were at the time.

   Run order:  00b (creates the table)  ->  load_source_full.py
               ->  00b again is harmless  ->  01, 02, 03  ->  06
   To go back to dbo.speech, just run 00_adapter.sql again.
   ===================================================================== */
USE [HANSARD];
GO

IF SCHEMA_ID('hc') IS NULL EXEC('CREATE SCHEMA hc');
GO

IF OBJECT_ID('hc.SourceSpeech') IS NULL
CREATE TABLE hc.SourceSpeech
(
    Id           bigint        IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Gid          varchar(100)  NOT NULL UNIQUE,       -- uk.org.publicwhip/debate/1979-05-24a.1254.1
    SittingDate  date          NOT NULL,
    Seq          bigint        NOT NULL,              -- sitting letter, column, paragraph
    SpeechClass  varchar(20)   NULL,                  -- Speech | Procedural | ...
    SpeakerName  nvarchar(400) NULL,                  -- as printed: 'Mr. Speaker'
    DisplayAs    nvarchar(400) NULL,
    PersonId     nvarchar(100) NULL,
    Party        nvarchar(200) NULL,
    MajorHeading nvarchar(400) NULL,
    MinorHeading nvarchar(400) NULL,
    ParlPost     nvarchar(500) NULL,
    Body         nvarchar(max) NULL,
    INDEX ix_day (SittingDate, Seq)
);
GO

CREATE OR ALTER VIEW hc.vSpeech
AS
SELECT
    SpeechId     = s.Id,
    SittingDate  = s.SittingDate,
    Seq          = s.Seq,
    SpeechClass  = s.SpeechClass,
    MajorHeading = TRIM(NCHAR(9) + NCHAR(10) + NCHAR(13) + N' ' FROM s.MajorHeading),
    MinorHeading = TRIM(NCHAR(9) + NCHAR(10) + NCHAR(13) + N' ' FROM s.MinorHeading),
    SpeakerName  = s.SpeakerName,
    PersonId     = s.PersonId,
    Party        = NULLIF(LTRIM(RTRIM(s.Party)), N''),
    ParlPost     = s.ParlPost,
    Body         = s.Body
FROM hc.SourceSpeech AS s;
GO

CREATE OR ALTER VIEW hc.vGovernment
AS
SELECT FromDate = date_from, ToDate = date_to, Party = CAST(gov_party AS nvarchar(100))
FROM dbo.gov_period;
GO
```

## From keeping order to keeping time

With the whole record in place, the Chair intervened about 61,000 times in 42 years. Here’s how often, per 1,000 speeches by Members:

-   **Bernard Weatherill (1983–92): 36.** Nearly 13 interventions on an average sitting day. The most policed House of the lot.
-   **Betty Boothroyd (1992–2000): 30.**
-   **Michael Martin (2000–09): 26.**
-   **George Thomas (1976–83): 24.**
-   **John Bercow (2009–19): 19.**

So the man everyone remembers shouting “Order!” was, by this measure, the least interventionist of the lot. That’s the opposite of what my first, broken numbers said.

But Bercow was busy with something else. Telling people to get on with it: “short questions and short answers”, “be brief”, “there is a lot of interest”. Under Thomas, Weatherill and Boothroyd that came up less than once per 1,000 speeches. Under Martin it was about one. Under Bercow it was 3.6, and in 2018 it hit 4.8.

The job changed. In the 1980s the Chair was keeping order. By the 2010s it was keeping time, trying to get as many Members in as possible before the clock ran out. Whatever else you think of Bercow, and there’s a lot to think, he was known for trying to call everyone who stood up.

![](/images/medium/1_zZCbEdkZFqoXjvJHUnPU8g.jpeg)

## The Government lost its protection

This was the finding I didn’t expect, and it only appeared once the speeches were back in their proper order.

For every intervention I worked out who had the floor at the time: the last Member to speak before the Chair stood up. Then I compared Government and Opposition, per 1,000 of their own speeches.

-   **Thomas:** the Opposition was pulled up **2.0 times** as often as the Government.
-   **Weatherill:** **2.1 times.**
-   **Boothroyd:** **1.6 times.**
-   **Martin:** **1.3 times.**
-   **Bercow:** **1.1 times.**

Forty years ago, sitting opposite the Government roughly doubled your chances of hearing “Order!”. By the Bercow years it barely mattered which side you sat on.

And it’s the side, not the party. Labour MPs were told off most under Weatherill, when they were in opposition. Under Martin, with Labour in government, the Conservatives took over. Whoever sits opposite gets the shouting.

There’s a caveat here. The Opposition raises most of the points of order, and “That is not a point of order” counts as an intervention. Some of the old gap is just the machinery of opposition. But points of order are a small slice of the total, and the gap closes steadily across five Speakers. Something real changed.

## Two casts

Averages over 2.7 million speeches smooth everything out. The good stuff is in the people. So I split the Chair’s interventions in two. **Personal** means sit down, withdraw that remark, or being named. **At the House** means the Chair telling everyone else to be quiet. Then there’s Hansard’s own little stage direction, *\[Interruption.\]*, which tells you the House was shouting while someone spoke.

```sql
/* =====================================================================
   Order! Order!  -  Commons Hypercube
   02_build.sql : hc.usp_Build turns hc.vSpeech into two fact tables.

     hc.Speech     one row per speech, no body: who, when, what kind of
                   business, their party and side, and - for the Chair -
                   who had the floor when it spoke.
     hc.ChairFlag  one row per (Chair speech, Category) that matched.

   EXEC hc.usp_Build;          -- full rebuild
   ===================================================================== */
USE [HANSARD];
GO

DROP TABLE IF EXISTS hc.ChairFlag, hc.Speech;
GO

CREATE TABLE hc.Speech
(
    SpeechId     bigint        NOT NULL PRIMARY KEY,
    SittingDate  date          NOT NULL,
    Yr           smallint      NOT NULL,
    Seq          bigint        NULL,      -- NULL = position in the day unknown
    Role         varchar(10)   NOT NULL,   -- Member | Speaker | Deputy | Committee | Floor | Procedural
    RoleSource   varchar(6)    NOT NULL,   -- Title | Post | Party | None
    Interrupts   int           NOT NULL,   -- '[Interruption.]' marks in the speech
    SpeakerName  nvarchar(400) NULL,
    PersonId     nvarchar(100) NULL,
    Party        nvarchar(100) NOT NULL,   -- canonical; 'Chair'/'House' for non-members
    Side         varchar(10)   NOT NULL,   -- Government | Opposition | Unknown | Chair | House
    Reign        nvarchar(60)  NOT NULL,
    DebateType   nvarchar(30)  NOT NULL,
    -- who had the floor (the last Member to speak that day before this one)
    TargetName   nvarchar(400) NULL,
    TargetPerson nvarchar(100) NULL,
    TargetParty  nvarchar(100) NULL,
    TargetSide   varchar(10)   NULL,
    INDEX ix_day (SittingDate, Seq)
);
GO

CREATE TABLE hc.ChairFlag
(
    SpeechId bigint      NOT NULL,
    Category varchar(12) NOT NULL,
    Family   varchar(12) NOT NULL,
    Hits     int         NOT NULL,
    PRIMARY KEY (SpeechId, Category)
);
GO

CREATE OR ALTER PROCEDURE hc.usp_Build
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @t0 datetime2 = SYSDATETIME();

    TRUNCATE TABLE hc.ChairFlag;
    TRUNCATE TABLE hc.Speech;

    /* -----------------------------------------------------------------
       1. Classify every distinct heading pair once, not 1.7M times.
       ----------------------------------------------------------------- */
    DROP TABLE IF EXISTS #Heading;

    SELECT h.MajorHeading, h.MinorHeading,
           DebateType = COALESCE(t.DebateType,
                          CASE WHEN h.MinorHeading <> N''
                                AND h.MajorHeading LIKE N'%[A-Z]%'
                                AND h.MajorHeading COLLATE Latin1_General_CS_AS
                                  = UPPER(h.MajorHeading) COLLATE Latin1_General_CS_AS
                               THEN N'Questions' END,
                          N'Other debate')
    INTO   #Heading
    FROM  (SELECT DISTINCT MajorHeading = ISNULL(MajorHeading, N''),
                           MinorHeading = ISNULL(MinorHeading, N'')
           FROM hc.vSpeech) AS h
    OUTER APPLY (SELECT TOP (1) p.DebateType
                 FROM hc.DebateTypePattern AS p
                 WHERE (p.Field IN ('Major','Either') AND h.MajorHeading LIKE p.Pattern)
                    OR (p.Field IN ('Minor','Either') AND h.MinorHeading LIKE p.Pattern)
                 ORDER BY p.Priority) AS t;

    CREATE UNIQUE NONCLUSTERED INDEX ix ON #Heading (MajorHeading, MinorHeading);  -- nonclustered: 1,700-byte key limit

    /* -----------------------------------------------------------------
       2. One row per speech: role, party, side, reign, debate type.
       ----------------------------------------------------------------- */
    INSERT hc.Speech (SpeechId, SittingDate, Yr, Seq, Role, RoleSource, Interrupts,
                      SpeakerName, PersonId, Party, Side, Reign, DebateType)
    SELECT v.SpeechId, v.SittingDate, YEAR(v.SittingDate), v.Seq,
           r.Role, r.Source,
           Interrupts = CASE WHEN v.Body LIKE N'%[[]Interruption%'
                             THEN (DATALENGTH(v.Body) - DATALENGTH(REPLACE(v.Body, N'[Interruption', N'')))
                                  / DATALENGTH(N'[Interruption')
                             ELSE 0 END,
           v.SpeakerName, v.PersonId,
           p.Party,
           Side = CASE
                    WHEN r.Role IN ('Speaker','Deputy','Committee') THEN 'Chair'
                    WHEN r.Role IN ('Floor','Procedural')            THEN 'House'
                    WHEN p.Party = N'Unknown'                        THEN 'Unknown'
                    WHEN EXISTS (SELECT 1 FROM hc.vGovernment AS g
                                 LEFT JOIN hc.PartyAlias AS ga ON ga.Raw = g.Party
                                 WHERE COALESCE(ga.Canon, g.Party) = p.Party
                                   AND v.SittingDate BETWEEN g.FromDate AND g.ToDate)
                                                                     THEN 'Government'
                    ELSE 'Opposition'
                  END,
           rg.Speaker,
           h.DebateType
    FROM hc.vSpeech AS v
    LEFT JOIN hc.PartyAlias AS a
           ON a.Raw = v.Party
    JOIN hc.Reign AS rg
      ON v.SittingDate >= rg.FromDate AND v.SittingDate < rg.ToDate
    /* Who is in the Chair, in order of trust:
         1. the printed title    'Mr. Deputy Speaker', 'The Chairman'
         2. the post they held   parl_post 'Speaker of the House of Commons' / 'Deputy Speaker ...'
         3. party 'Speaker' - only if the name is the reigning Speaker's, because
            older rows carry party 'Speaker' on the wrong people ('Mr. Denzil Davies') */
    OUTER APPLY (SELECT TitleRole = (SELECT TOP (1) c.Role FROM hc.ChairName AS c
                                     WHERE v.SpeakerName LIKE c.Pattern
                                     ORDER BY c.Priority),
                        PostRole  = CASE WHEN v.ParlPost LIKE N'%Speaker of the House of Commons%' THEN 'Speaker'
                                         WHEN v.ParlPost LIKE N'%Deputy Speaker%'                  THEN 'Deputy' END,
                        PartyRole = CASE WHEN a.Canon = N'Speaker'
                                          AND v.SpeakerName LIKE N'%' + rg.Speaker + N'%'           THEN 'Speaker' END) AS rr
    -- unattributed procedural lines ('Question put and agreed to.') are nobody's speech
    CROSS APPLY (SELECT Role   = COALESCE(rr.TitleRole, rr.PostRole, rr.PartyRole,
                                          CASE WHEN v.SpeechClass = 'Procedural' THEN 'Procedural' END,
                                          'Member'),
                        Source = CASE WHEN rr.TitleRole IS NOT NULL THEN 'Title'
                                      WHEN rr.PostRole  IS NOT NULL THEN 'Post'
                                      WHEN rr.PartyRole IS NOT NULL THEN 'Party'
                                      ELSE 'None' END) AS r
    CROSS APPLY (SELECT Party = CASE
                    WHEN r.Role IN ('Speaker','Deputy','Committee') THEN N'Chair'
                    WHEN r.Role IN ('Floor','Procedural')            THEN N'House'
                    ELSE LEFT(COALESCE(a.Canon, NULLIF(LTRIM(RTRIM(v.Party)), N''), N'Unknown'), 100)
                 END) AS p
    JOIN #Heading AS h
      ON h.MajorHeading = ISNULL(v.MajorHeading, N'')
     AND h.MinorHeading = ISNULL(v.MinorHeading, N'');

    /* -----------------------------------------------------------------
       3. Who had the floor? For every speech, the most recent Member
          to speak that day. LAG ... IGNORE NULLS (SQL Server 2022+)
          skips over the Chair and the shouting.
       ----------------------------------------------------------------- */
    -- everyone off the floor starts as 'Unknown'; placed speeches get a real target below
    UPDATE hc.Speech SET TargetParty = N'Unknown', TargetSide = 'Unknown'
    WHERE Role <> 'Member';

    WITH t AS
    (
        SELECT SpeechId, Role,
               TName   = LAG(CASE WHEN Role = 'Member' THEN ISNULL(SpeakerName, N'?') END) IGNORE NULLS
                             OVER (PARTITION BY SittingDate ORDER BY Seq, SpeechId),
               TPerson = LAG(CASE WHEN Role = 'Member' THEN ISNULL(PersonId, N'?') END) IGNORE NULLS
                             OVER (PARTITION BY SittingDate ORDER BY Seq, SpeechId),
               TParty  = LAG(CASE WHEN Role = 'Member' THEN Party END) IGNORE NULLS
                             OVER (PARTITION BY SittingDate ORDER BY Seq, SpeechId),
               TSide   = LAG(CASE WHEN Role = 'Member' THEN Side END) IGNORE NULLS
                             OVER (PARTITION BY SittingDate ORDER BY Seq, SpeechId)
        FROM hc.Speech
        WHERE Seq IS NOT NULL          -- no guessing: unplaced speeches keep 'Unknown'
    )
    UPDATE s
       SET TargetName   = NULLIF(t.TName, N'?'),
           TargetPerson = NULLIF(t.TPerson, N'?'),
           TargetParty  = ISNULL(t.TParty, N'Unknown'),
           TargetSide   = ISNULL(t.TSide,  'Unknown')
    FROM hc.Speech AS s
    JOIN t ON t.SpeechId = s.SpeechId
    WHERE t.Role <> 'Member';

    /* -----------------------------------------------------------------
       4. What did the Chair say? Only Chair speeches are scanned, and
          each is normalised once and tested against every pattern.
          Hits = occurrences, counted with the REPLACE length trick.
       ----------------------------------------------------------------- */
    INSERT hc.ChairFlag (SpeechId, Category, Family, Hits)
    SELECT s.SpeechId, p.Category, MIN(p.Family),
           SUM((DATALENGTH(n.Norm) - DATALENGTH(REPLACE(n.Norm, p.Pattern, N'')))
               / DATALENGTH(p.Pattern))
    FROM hc.Speech AS s
    JOIN hc.vSpeech AS v ON v.SpeechId = s.SpeechId
    CROSS APPLY hc.fnNorm(v.Body) AS n
    JOIN hc.InterventionPattern AS p
      ON n.Norm LIKE (N'%' + p.Pattern + N'%') COLLATE DATABASE_DEFAULT
    WHERE s.Role IN ('Speaker','Deputy','Committee')
    GROUP BY s.SpeechId, p.Category;

    /* -----------------------------------------------------------------
       5. Report.
       ----------------------------------------------------------------- */
    SELECT Step = 'built',
           Speeches       = (SELECT COUNT_BIG(*) FROM hc.Speech),
           ChairSpeeches  = (SELECT COUNT_BIG(*) FROM hc.Speech WHERE Role IN ('Speaker','Deputy','Committee')),
           Interruptions  = (SELECT SUM(CAST(Interrupts AS bigint)) FROM hc.Speech),
           ChairByPost    = (SELECT COUNT_BIG(*) FROM hc.Speech WHERE RoleSource = 'Post'),
           PlacedInOrder  = (SELECT COUNT_BIG(*) FROM hc.Speech WHERE Seq IS NOT NULL),
           Interventions  = (SELECT COUNT(DISTINCT SpeechId) FROM hc.ChairFlag WHERE Family = 'Discipline'),
           OrderCalls     = (SELECT SUM(CAST(Hits AS bigint)) FROM hc.ChairFlag WHERE Category = 'ORDER'),
           Seconds        = DATEDIFF(second, @t0, SYSDATETIME());
END;
GO
```

The building the cube itself.

```sql
/* =====================================================================
   Order! Order!  -  Commons Hypercube
   03_cube.sql : GROUP BY CUBE over five dimensions.

   SQL Server has had a hypercube built in since 2008. GROUP BY CUBE
   computes every combination of the dimensions in one statement:
   five dimensions = 2^5 = 32 grouping sets, from "every year, every
   Speaker, every party..." down to the single grand total.

   Dimensions : Year, Reign (which Speaker), DebateType, Party, Side
   Measures   : member speeches (the denominator), Chair interventions
                and their kinds, outbursts from the floor, and rates
                per 1,000 member speeches - all computed here, so the
                viewer only ever draws what the database worked out.

   EXEC hc.usp_BuildCube;
   EXEC hc.usp_ExportCube;             -- one row, one JSON document
   ===================================================================== */
USE [HANSARD];
GO

DROP TABLE IF EXISTS hc.CubeCell, hc.CubeDim;
GO

CREATE TABLE hc.CubeCell
(
    GroupingId     int           NOT NULL,   -- GROUPING_ID bitmask, 0 = finest grain
    Dims           tinyint       NOT NULL,   -- how many dimensions this cell keeps
    Yr             nvarchar(4)   NULL,
    Reign          nvarchar(60)  NULL,
    DebateType     nvarchar(30)  NULL,
    Party          nvarchar(100) NULL,
    Side           varchar(10)   NULL,
    MemberSpeeches bigint        NOT NULL,
    ChairSpeeches  bigint        NOT NULL,
    Interventions  bigint        NOT NULL,   -- Chair speeches with any Discipline flag
    BySpeaker      bigint        NOT NULL,   -- ... of which the Speaker personally
    OrderCalls     bigint        NOT NULL,   -- every "Order." counted
    SitDown        bigint        NOT NULL,
    Withdraw       bigint        NOT NULL,
    Named          bigint        NOT NULL,
    Suspended      bigint        NOT NULL,
    Noise          bigint        NOT NULL,
    Hurry          bigint        NOT NULL,   -- "be brief", "short questions"
    FloorOutbursts bigint        NOT NULL,   -- '[Interruption.]' marks + "Hon. Members:" rows
    RateInterventions decimal(12,3) NULL,    -- per 1,000 member speeches
    RateOrder         decimal(12,3) NULL,
    RateHurry         decimal(12,3) NULL,
    RateFloor         decimal(12,3) NULL
);
GO

CREATE TABLE hc.CubeDim
(
    Dim     varchar(12)  NOT NULL,
    Value   nvarchar(100) NOT NULL,
    SortKey int          NOT NULL,
    PRIMARY KEY (Dim, Value)
);
GO

CREATE OR ALTER PROCEDURE hc.usp_BuildCube
AS
BEGIN
    SET NOCOUNT ON;
    TRUNCATE TABLE hc.CubeCell;
    TRUNCATE TABLE hc.CubeDim;

    WITH flags AS
    (
        SELECT SpeechId,
               Disc     = MAX(CASE WHEN Family   = 'Discipline' THEN 1 ELSE 0 END),
               OrderHit = SUM(CASE WHEN Category = 'ORDER'      THEN Hits ELSE 0 END),
               SitDown  = MAX(CASE WHEN Category = 'SEAT'       THEN 1 ELSE 0 END),
               Withdraw = MAX(CASE WHEN Category = 'WITHDRAW'   THEN 1 ELSE 0 END),
               Named    = MAX(CASE WHEN Category = 'NAME'       THEN 1 ELSE 0 END),
               Susp     = MAX(CASE WHEN Category = 'SUSPEND'    THEN 1 ELSE 0 END),
               Noise    = MAX(CASE WHEN Category = 'NOISE'      THEN 1 ELSE 0 END),
               Hurry    = MAX(CASE WHEN Family   = 'Hurry'      THEN 1 ELSE 0 END)
        FROM hc.ChairFlag
        GROUP BY SpeechId
    ),
    facts AS
    (
        -- the denominator: every Member's speech, under their own party
        SELECT Yr, Reign, DebateType, Party, Side,
               Msp = 1, Csp = 0, Itv = 0, Bsp = 0, Ord = 0, Sdn = 0, Wdr = 0, Nmd = 0, Sus = 0, Nse = 0, Hry = 0,
               Flr = Interrupts                     -- '[Interruption.]' while they spoke
        FROM hc.Speech WHERE Role = 'Member'

        UNION ALL

        -- the Chair, filed under whoever had the floor
        SELECT s.Yr, s.Reign, s.DebateType, s.TargetParty, s.TargetSide,
               0, 1,
               ISNULL(f.Disc, 0),
               CASE WHEN s.Role = 'Speaker' THEN ISNULL(f.Disc, 0) ELSE 0 END,
               ISNULL(f.OrderHit, 0), ISNULL(f.SitDown, 0), ISNULL(f.Withdraw, 0),
               ISNULL(f.Named, 0), ISNULL(f.Susp, 0), ISNULL(f.Noise, 0), ISNULL(f.Hurry, 0),
               s.Interrupts
        FROM hc.Speech AS s
        LEFT JOIN flags AS f ON f.SpeechId = s.SpeechId
        WHERE s.Role IN ('Speaker','Deputy','Committee')

        UNION ALL

        -- the House shouting, filed under whoever had the floor
        SELECT Yr, Reign, DebateType, TargetParty, TargetSide,
               0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1
        FROM hc.Speech WHERE Role = 'Floor'
    )
    INSERT hc.CubeCell
        (GroupingId, Dims, Yr, Reign, DebateType, Party, Side,
         MemberSpeeches, ChairSpeeches, Interventions, BySpeaker, OrderCalls,
         SitDown, Withdraw, Named, Suspended, Noise, Hurry, FloorOutbursts)
    SELECT GROUPING_ID(Yr, Reign, DebateType, Party, Side),
           5 - (GROUPING(Yr) + GROUPING(Reign) + GROUPING(DebateType)
                + GROUPING(Party) + GROUPING(Side)),
           CAST(Yr AS nvarchar(4)), Reign, DebateType, Party, Side,
           SUM(CAST(Msp AS bigint)), SUM(CAST(Csp AS bigint)), SUM(CAST(Itv AS bigint)), SUM(CAST(Bsp AS bigint)),
           SUM(CAST(Ord AS bigint)), SUM(CAST(Sdn AS bigint)), SUM(CAST(Wdr AS bigint)), SUM(CAST(Nmd AS bigint)),
           SUM(CAST(Sus AS bigint)), SUM(CAST(Nse AS bigint)), SUM(CAST(Hry AS bigint)), SUM(CAST(Flr AS bigint))
    FROM facts
    GROUP BY CUBE (Yr, Reign, DebateType, Party, Side);

    /* Every base row has a real value on every dimension (hc.usp_Build
       fills gaps with 'Unknown'), so a NULL here always means "rolled up". */

    UPDATE hc.CubeCell
       SET RateInterventions = CAST(1000.0 * Interventions  / NULLIF(MemberSpeeches, 0) AS decimal(12,3)),
           RateOrder         = CAST(1000.0 * OrderCalls     / NULLIF(MemberSpeeches, 0) AS decimal(12,3)),
           RateHurry         = CAST(1000.0 * Hurry          / NULLIF(MemberSpeeches, 0) AS decimal(12,3)),
           RateFloor         = CAST(1000.0 * FloorOutbursts / NULLIF(MemberSpeeches, 0) AS decimal(12,3));

    /* Axis order for the viewer: years in order, Speakers in order,
       business from PMQs downwards, parties by how much they speak. */
    INSERT hc.CubeDim (Dim, Value, SortKey)
    SELECT 'Year', Yr, CAST(Yr AS int)
    FROM hc.CubeCell WHERE GroupingId = 15 /* Year only */ AND Yr IS NOT NULL
    UNION ALL
    SELECT 'Reign', r.Speaker, r.ReignId
    FROM hc.Reign AS r WHERE EXISTS (SELECT 1 FROM hc.Speech AS s WHERE s.Reign = r.Speaker)
    UNION ALL
    SELECT 'DebateType', c.DebateType,
           ISNULL((SELECT MIN(p.Priority) FROM hc.DebateTypePattern AS p WHERE p.DebateType = c.DebateType), 99)
    FROM hc.CubeCell AS c WHERE c.GroupingId = 27 /* DebateType only */
    UNION ALL
    SELECT 'Party', c.Party, ROW_NUMBER() OVER (ORDER BY c.MemberSpeeches DESC)
    FROM hc.CubeCell AS c WHERE c.GroupingId = 29 /* Party only */
    UNION ALL
    SELECT 'Side', c.Side, CASE c.Side WHEN 'Government' THEN 1 WHEN 'Opposition' THEN 2 ELSE 3 END
    FROM hc.CubeCell AS c WHERE c.GroupingId = 30 /* Side only */;

    SELECT Step = 'cube built',
           Cells        = COUNT_BIG(*),
           GroupingSets = COUNT(DISTINCT GroupingId)
    FROM hc.CubeCell;
END;
GO

/* ---------------------------------------------------------------------
   The whole cube as one JSON document for the viewers.
   Rolled-up dimensions are NULL, and FOR JSON leaves NULLs out, so
   each cell's "d" object holds exactly the dimensions it keeps.
   @MinSpeeches drops cells too small to have a meaningful rate.
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE hc.usp_ExportCube
    @MinSpeeches int = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CubeJson =
    (
        SELECT
            title     = N'Order! Order!',
            source    = N'Hansard, House of Commons',
            generated = CONVERT(varchar(19), SYSDATETIME(), 126),
            dimensions = JSON_QUERY((
                SELECT name = d.Dim,
                       [values] = JSON_QUERY((
                            SELECT [value] = v.Value
                            FROM hc.CubeDim AS v
                            WHERE v.Dim = d.Dim
                            ORDER BY v.SortKey
                            FOR JSON PATH))
                FROM (VALUES ('Year',1),('Reign',2),('DebateType',3),('Party',4),('Side',5)) AS d(Dim, Ord)
                ORDER BY d.Ord
                FOR JSON PATH)),
            measures = JSON_QUERY(N'[
                {"key":"rateInterventions","label":"Interventions per 1,000 speeches"},
                {"key":"rateOrder","label":"\"Order!\" per 1,000 speeches"},
                {"key":"rateHurry","label":"\"Be brief\" per 1,000 speeches"},
                {"key":"rateFloor","label":"[Interruption] per 1,000 speeches"},
                {"key":"interventions","label":"Interventions (count)"}
            ]'),
            cells = JSON_QUERY((
                SELECT [d.Year]       = c.Yr,
                       [d.Reign]      = c.Reign,
                       [d.DebateType] = c.DebateType,
                       [d.Party]      = c.Party,
                       [d.Side]       = c.Side,
                       speeches          = c.MemberSpeeches,
                       chair             = c.ChairSpeeches,
                       interventions     = c.Interventions,
                       bySpeaker         = c.BySpeaker,
                       orderCalls        = c.OrderCalls,
                       sitDown           = c.SitDown,
                       withdraw          = c.Withdraw,
                       named             = c.Named,
                       suspended         = c.Suspended,
                       noise             = c.Noise,
                       hurry             = c.Hurry,
                       [floor]           = c.FloorOutbursts,
                       rateInterventions = c.RateInterventions,
                       rateOrder         = c.RateOrder,
                       rateHurry         = c.RateHurry,
                       rateFloor         = c.RateFloor
                FROM hc.CubeCell AS c
                WHERE c.MemberSpeeches >= @MinSpeeches
                FOR JSON PATH))
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );
END;
GO
```

```sql
/* =====================================================================
   Order! Order!  -  Commons Hypercube
   04_findings.sql : the questions the article asks. Run after
   hc.usp_Build and hc.usp_BuildCube. Each query stands alone.
   ===================================================================== */
USE [HANSARD];
GO

/* 0. Is there anything to report? Rerunning 02 or 03 recreates their
      tables empty, so the builds have to be run again afterwards. */
SELECT ViewRows   = (SELECT COUNT_BIG(*) FROM hc.vSpeech),
       SpeechRows = (SELECT COUNT_BIG(*) FROM hc.Speech),
       ChairFlags = (SELECT COUNT_BIG(*) FROM hc.ChairFlag),
       CubeCells  = (SELECT COUNT_BIG(*) FROM hc.CubeCell);

IF NOT EXISTS (SELECT 1 FROM hc.Speech)
    RAISERROR('hc.Speech is empty: run EXEC hc.usp_Build; then EXEC hc.usp_BuildCube;', 16, 1);
ELSE IF NOT EXISTS (SELECT 1 FROM hc.CubeCell)
    RAISERROR('hc.CubeCell is empty: run EXEC hc.usp_BuildCube;', 16, 1);
GO

/* 1. Which Speaker had the rowdiest House?
      Per 1,000 member speeches and per sitting day, with the Speaker's
      own interventions split from the deputies'. */
SELECT c.Reign,
       Speeches        = c.MemberSpeeches,
       SittingDays     = d.Days,
       Interventions   = c.Interventions,
       PerThousand     = c.RateInterventions,
       PerSittingDay   = CAST(1.0 * c.Interventions / NULLIF(d.Days, 0) AS decimal(9,2)),
       SpeakerOwnShare = CAST(100.0 * c.BySpeaker / NULLIF(c.Interventions, 0) AS decimal(5,1)),
       OrderPerK       = c.RateOrder,
       HurryPerK       = c.RateHurry,
       FloorPerK       = c.RateFloor,
       Named           = c.Named,
       Suspended       = c.Suspended
FROM hc.CubeCell AS c
JOIN (SELECT Reign, Days = COUNT(DISTINCT SittingDate) FROM hc.Speech GROUP BY Reign) AS d
  ON d.Reign = c.Reign
JOIN hc.Reign AS r ON r.Speaker = c.Reign
WHERE c.GroupingId = 23   -- Reign only
ORDER BY r.ReignId;

/* 2. Is PMQs louder than everything else? Each Speaker, each kind of business. */
SELECT c.Reign, c.DebateType, c.MemberSpeeches, c.RateInterventions, c.RateFloor
FROM hc.CubeCell AS c
JOIN hc.Reign AS r ON r.Speaker = c.Reign
WHERE c.GroupingId = 19   -- Reign x DebateType
  AND c.MemberSpeeches >= 500
ORDER BY r.ReignId, c.RateInterventions DESC;

/* 3. The cameras. The Commons was first televised on 21 November 1989,
      in the middle of Weatherill's time - same Speaker, before and after.
      Three years before, and the rest of his time after (about 2.5 years),
      so the comparison isn't a change of Chair. */
WITH w AS
(
    SELECT Era = CASE WHEN s.SittingDate < '1989-11-21' THEN '1 Before cameras' ELSE '2 After cameras' END,
           s.Role, s.SpeechId, s.Interrupts
    FROM hc.Speech AS s
    WHERE s.SittingDate >= '1986-11-21' AND s.SittingDate < '1992-04-27'
)
SELECT w.Era,
       Speeches      = SUM(CASE WHEN w.Role = 'Member' THEN 1 ELSE 0 END),
       Interventions = COUNT(DISTINCT CASE WHEN f.Family = 'Discipline' THEN w.SpeechId END),
       PerThousand   = CAST(1000.0 * COUNT(DISTINCT CASE WHEN f.Family = 'Discipline' THEN w.SpeechId END)
                        / NULLIF(SUM(CASE WHEN w.Role = 'Member' THEN 1 ELSE 0 END), 0) AS decimal(9,3)),
       InterruptPerK = CAST(1000.0 * SUM(CASE WHEN w.Role = 'Member' THEN w.Interrupts ELSE 0 END)
                        / NULLIF(SUM(CASE WHEN w.Role = 'Member' THEN 1 ELSE 0 END), 0) AS decimal(9,3))
FROM w
OUTER APPLY (SELECT TOP (1) cf.Family FROM hc.ChairFlag AS cf
             WHERE cf.SpeechId = w.SpeechId AND cf.Family = 'Discipline') AS f
GROUP BY w.Era
ORDER BY w.Era;

/* 4. Who gets told off: Government or Opposition? Under each Speaker.
      Needs hc.usp_MatchOrder (or the full source) - depends on who had the floor. */
SELECT c.Reign, c.Side, c.MemberSpeeches, c.Interventions, c.RateInterventions, c.RateFloor
FROM hc.CubeCell AS c
JOIN hc.Reign AS r ON r.Speaker = c.Reign
WHERE c.GroupingId = 22   -- Reign x Side
  AND c.Side IN ('Government','Opposition')
ORDER BY r.ReignId, c.Side;

/* 5. Year by year: the line for the article's main chart. */
SELECT Yr, MemberSpeeches, Interventions, RateInterventions, RateOrder, RateHurry, RateFloor
FROM hc.CubeCell
WHERE GroupingId = 15     -- Year only
ORDER BY Yr;

/* 6. The rowdiest days in the Commons since 1979. */
SELECT TOP (25)
       s.SittingDate,
       s.Reign,
       Interventions = COUNT(DISTINCT CASE WHEN f.Family = 'Discipline' THEN s.SpeechId END),
       OrderCalls    = SUM(CASE WHEN f.Category = 'ORDER' THEN f.Hits ELSE 0 END),
       Interruptions = (SELECT SUM(x.Interrupts) FROM hc.Speech AS x
                        WHERE x.SittingDate = s.SittingDate),
       Business      = (SELECT TOP (1) x.DebateType FROM hc.Speech AS x
                        JOIN hc.ChairFlag AS y ON y.SpeechId = x.SpeechId
                        WHERE x.SittingDate = s.SittingDate
                        GROUP BY x.DebateType ORDER BY COUNT(*) DESC)
FROM hc.Speech AS s
JOIN hc.ChairFlag AS f ON f.SpeechId = s.SpeechId
GROUP BY s.SittingDate, s.Reign
ORDER BY Interventions DESC;

/* 7. The nuclear option: every naming, and who had the floor.
      ("I name the hon. Member for ..." - then a vote to suspend.)
      Check each one by eye: the pattern can catch "I name names". */
SELECT s.SittingDate, s.Reign, s.SpeakerName AS Chair, s.TargetName, s.TargetParty, s.DebateType
FROM hc.Speech AS s
JOIN hc.ChairFlag AS f ON f.SpeechId = s.SpeechId AND f.Category = 'NAME'
ORDER BY s.SittingDate;

/* 8. Each party, under each Speaker: interventions per 1,000 of their speeches.
      Needs hc.usp_MatchOrder (or the full source) - depends on who had the floor. */
SELECT c.Reign, c.Party, c.MemberSpeeches, c.RateInterventions, c.RateFloor
FROM hc.CubeCell AS c
JOIN hc.Reign AS r ON r.Speaker = c.Reign
WHERE c.GroupingId = 21   -- Reign x Party
  AND c.MemberSpeeches >= 2000
ORDER BY r.ReignId, c.RateInterventions DESC;

/* 9. "Be brief": which Speaker nagged most about time? */
SELECT c.Reign, c.Hurry, c.RateHurry
FROM hc.CubeCell AS c
JOIN hc.Reign AS r ON r.Speaker = c.Reign
WHERE c.GroupingId = 23
ORDER BY r.ReignId;
```

## The ones the Chair had to rein in

The House got more forgiving over time. Personal rebukes ran at about 1.6 per 1,000 speeches in the late 1980s and about 0.4 in the 2010s. So I measured everyone against the years they actually sat. A score of 1 means normal for your era, and 10 means ten times the norm. Minimum 500 speeches:

1.  **Ron Brown: 21 times** his era’s rate, and named three times. Yes, the mace man.
2.  **Ian Blackford: 19 times.** Hold that thought.
3.  **Andrew Faulds: 13 times.**
4.  **David Shaw: 12 times**, a rare Conservative near the top.
5.  **George Galloway: 11 times.**

The rest of the list is mostly the Labour awkward squad of the 1980s: Eric Heffer, Dick Douglas, Norman Buchan, Allan Rogers. That’s the old Opposition gap again, seen from the other end. Tam Dalyell holds the record for being named, four times.

And Dennis Skinner? Named three times, and more than 10,000 speeches over 40 years. But measured against his era he scores 6, not even top 25. The Beast of Bolsover’s reputation is bigger than his record. He was just there, every day, for a very long time.

## The ones the House wouldn’t let speak

Now rank by *\[Interruption\]*, adjusted the same way, and a completely different cast appears. Party leaders, and especially Opposition leaders.

-   **David Owen: 5.0 times** the House’s norm. That’s what the two big parties thought of the SDP.
-   **Neil Kinnock: 5.0.** Thatcher, across 16,000 speeches, was well below him.
-   **Ed Miliband: 4.7.** He’s also the leader the Chair most often stepped in to protect.
-   **Keir Starmer: 4.5.** Boris Johnson: 2.9.

It’s the same pattern every time. The Prime Minister gets the protection of the despatch box and the Leader of the Opposition gets the noise.

The House as a whole got noisier too. Hansard recorded 9 interruptions per 1,000 speeches in 1979 and 33 in 1989, and it has mostly stayed in the twenties since. So these figures are era-adjusted. A leader in 2019 doesn’t get credit just for living in loud times.

## The man in both lists

One name sits at the top of both tables. **Ian Blackford**, SNP leader at Westminster from 2017, was interrupted at **6.6 times** the norm for his era. That’s 155 per 1,000 speeches, the highest of anyone since 1979, Prime Ministers and Opposition leaders included. He’s also second on the personal list, at 19 times his era’s rate, behind only Ron Brown. And on 13 June 2018 Bercow ordered him out of the chamber during Prime Minister’s Questions, and the SNP walked out behind him.

The House shouted him down more than anyone, and the Chair pulled him up more than almost anyone. Nobody else comes close on both counts.

The database found him twice, from two different directions. I like it when that happens.

![Blackford (Me) actually being escorted out of the commons. The entire SNP benches (All me) following.](/images/medium/1_LL304wcpGVelYYgBjXoQbA.jpeg)
*Blackford (Me) actually being escorted out of the commons. The entire SNP benches (All me) following.*

## Did the cameras change anything?

The Commons was first televised on 21 November 1989, halfway through Weatherill’s time. So there’s a neat experiment sitting in the data: same Speaker, same Parliament, with and without an audience.

In the three years before, the Chair intervened 40.6 times per 1,000 speeches. Afterwards it was 38.4. Interruptions fell from 31.8 to 25.4. So MPs behaved slightly better with the nation watching, and then, as the trend shows, got used to it.

## What I’d want you to know before quoting any of this

-   **Hansard is an edited record.** Not every heckle gets written down, and the habits of the people writing it have changed over 42 years.
-   **“Who had the floor” is a proxy.** “Order!” is often aimed at the benches opposite, not the person speaking. That’s why I kept *rein in* and *drown out* separate.
-   **Lindsay Hoyle gets no verdict here.** The data stops in April 2021, so his time in it is mostly the Covid hybrid Parliament. Most of his 300-odd suspensions were breaks “to allow the safe exit of hon. Members”, not disorder.
-   **The counting is pattern matching.** I read hundreds of matches by eye and tuned the rules until the misfires were rare. Rare isn’t never.

## Next: the House with nobody to say it

The House of Lords has no one to call order. The Lord Speaker can’t rule on it. The peers police themselves, calling “Order!” from the benches. That’s the control group this article was missing: a chamber left entirely to its own devices.

And hundreds of MPs have made the move from one House to the other. So the next question is whether, with no seat to lose and nobody in a wig to shout at them, they behave any differently.

The code is on GitHub \[link to follow\], and the hypercube is on my website. Go and turn it through the fourth dimension, and see if you can spot Ron Brown.

![Being kicked upstairs — The House Of Lords](/images/medium/1_xM6UpO-2PSh-oDoaVfef3g.jpeg)
*Being kicked upstairs — The House Of Lords*

I have included parts of the code used in the article as it shows what was run to get the analysis. But all the source code is on the github page and you run the files in order to obtain the result. There is a python script which downloads from Huggingface the Hanson dataset. Takes about 15 mins.

Code will be up in a few days.

If you enjoyed this please give it a thunderous round of applause.
