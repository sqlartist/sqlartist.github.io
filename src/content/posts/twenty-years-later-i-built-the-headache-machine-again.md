---
title: "Twenty Years Later, I Built the Headache Machine Again"
subtitle: "The Deep Brain Stimulator that fixed my Cluster Headaches and is being used for Parkinsons’ and Tourettes"
date: 2026-10-01T19:20:53.349Z
cover: "/images/medium/1_UYWS9j6VtYFrnnbiVTxi6g.jpeg"
tags: ["Life", "Health"]
mediumUrl: "https://medium.com/@trevor.dwyer/twenty-years-later-i-built-the-headache-machine-again-5ea82b33a2c3"
era: "2000s"
draft: false
---

![Using an archive of Brain Implant data to predict correct placement of electrodes](/images/medium/1_UYWS9j6VtYFrnnbiVTxi6g.jpeg)
*Using an archive of Brain Implant data to predict correct placement of electrodes*

When your only tool is a database

Some people get headaches, some people get migraines, I get Cluster Headaches.

With a headache you can take a tablet and it goes, a migraine you can lie down in the dark and hope it goes and can last a week.

A Cluster headache is not like that, it may last between 15 mins and an hour. At the worst point mine were lasting an hour, of level 10 pain 12 times every day. The condition used to be called Suicide Headaches and for reasons you can begin to understand. You will want to put your head through a wall. Imagine someone’s stuck a hot poker behind your eye and is slowly turning it, on a schedule, for weeks or giving birth 12 times a day. It is regarded as one of the worst pains known to mankind.

Mine started as episodic which mean a few weeks of the year you have the headaches but they quickly turned chronic (less than a year), which means the exact opposite, they are relentless and for two weeks in a year they would disappear. As the seasons change was roughly the worst periods.

Whenever there was a change in the weather, high pressure to low pressure weather patterns would trigger an attack, strong perfume type smells would trigger an attack, and any light would trigger an attack. Going to hospital when it got so bad you literally cannot take it anymore knowing it was going to be worse was a final resort. Only very recently enough medical staff know about Cluster Headaches and offer to turn the lights off in the hospital.

They turn up at the same time of day and night. The first one of the day was always 3 mins after waking up.

About twenty years ago, when they first arrived, I did what any desperate person does. I read everything. Journals, forums, the small print on trial protocols. And then I did what any desperate \*database\* person does. I built a system.

That’s the thing about spending your life in SQL. When the world goes wrong, you don’t reach for a hammer. You reach for a schema.

## Version one: the back of the head

The idea back then was occipital nerve stimulation. You put small electrodes under the skin at the back of the head, over the occipital nerves, and feed them a gentle current. The theory was that you could calm the pain pathway without anyone opening your skull.

I liked that last bit a lot.

It was ex-cranial, so the brain itself stayed out of it. But the question was still the same one I’m asking today: where exactly do you put the thing? A few millimetres either way seemed to decide whether it helped or just gave you a buzzing scalp. So my system tried to line up where the electrodes went with how people actually got on afterwards. Placement in, outcome out, look for the pattern.

Was it any good? It was a desperate man’s database. It asked the right question with not nearly enough data. But it taught me something I’ve carried ever since. The answer isn’t in the textbook diagram. It’s in what happened to the people who went before you.

## Twenty years on, round two

So why pick it up again? Partly because I’ve spent the last few months making SQL Server do silly things. Doom. Elite. A bouncing Amiga ball. A synth. At some point you ask yourself whether the same tricks could do something that matters.

And partly because the tools have finally caught up with the idea. SQL Server 2025 has a native \`VECTOR\` type. Twenty years ago “find me the patients most like this one” meant a pile of hand-rolled maths. Now it’s a function call.

This time I went inside the skull, at least on paper. Deep brain stimulation, or DBS, is a real treatment for Parkinson’s. For cluster headache it’s still very much experimental, aimed at a spot called the posterior hypothalamus. I built it to handle both, because the problem is the same shape.

The first decision was the easiest one: X-ray or 3D scan? I briefly fancied X-ray because it’s cheap and everywhere. Then I remembered an X-ray of a head is mostly a very good picture of a skull. You can’t see deep brain structures on it. Real surgical planning uses a 3D MRI, and a CT afterwards to check where the lead actually landed. So that’s what I modelled. Sometimes the harder option is the right one simply because its a hard problem.

---

## Decisions

***Brains that look alike.  
***Every brain is a slightly different shape. Surgeons stretch each one onto a standard map, but a stretched map still isn’t a person. So each scan becomes a fingerprint of 14 numbers: ventricle widths, brain size, the distance between two landmarks in the middle of the brain, age. The system then finds the 40 previous patients whose fingerprints sit closest. Think of it as a dating app for brains, with worse chat-up lines.

***Let the outcomes do the teaching.***   
This is the lesson from twenty years ago. It doesn’t copy where the neighbours’ electrodes went. It asks where the electrodes went and how well it worked, then works out the spot that best explains the good results. A placement that left someone with side effects counts against that area. There’s a slider for how cautious to be, which felt like the right thing to put in a human’s hands.

***Keep it in the database.***   
Obviously. The search, the scoring and the fitting all run in T-SQL. There’s a Python mirror of the same maths so the Streamlit front end still works on a laptop, but SQL Server does the thinking. Old habits.

***Close the loop.***   
Every new patient’s 12-month result goes back into the library. The next person gets a slightly better answer because of the last one. That’s the bit I wanted most back then.

***Simulated data.***   
I’m not going anywhere near real patient records for a hobby project. So I wrote a simulator that makes up brains, operations and outcomes. The bonus is that with made-up patients you know the right answer. With real ones you never do.

---

## Did it work?

In the simulation, yes. Modestly. To test it, I hid each past patient in turn and re-planned them from everybody else. Then I compared the suggestion with the standard textbook target.

![Results of the simulation](/images/medium/1_t3to9lwF_5pbQL-9upHiKQ.png)
*Results of the simulation*

Half a millimetre doesn’t sound like much. In this part of the brain it’s the difference between “that helped” and “why can I taste rainbows?”

These are made-up patients, and I wrote the rules they follow, so of course the method can learn them. That shows the machinery works. It doesn’t show it would help a real person. The suggestions also drift a touch closer to the areas that cause side effects, which is exactly why the caution slider exists. A real version would need proper brain registration, real post-op imaging, ethics approval and a lot of people much cleverer than me. There’s already serious open-source work in this area, the Lead-DBS toolbox for one. I’m a database man having a go, not a neurosurgeon.

---

## NeuroTarget — Prototype Application

A SQL Server 2025 system that suggests deep brain stimulation (DBS) electrode placement from anatomically similar previous patients and how their operations turned out. It covers cluster headache (posterior hypothalamus) and Parkinson’s disease (subthalamic nucleus and globus pallidus internus), and has a Streamlit + Plotly front end.

*All data is simulated. This is a research/teaching prototype for exploring the idea. It is not a medical device and must not be used for clinical decisions.*

## Why 3D MRI, not X-ray

An X-ray is a flat projection and barely shows brain soft tissue, so deep targets can’t be seen on it. Real stereotactic planning is done on a 3D T1/T2 MRI, often fused with CT. After the operation, a CT (or sometimes X-ray) is used only to confirm where the lead actually ended up. The system follows the same pattern:

```typescript
| Stage         | Imaging              | Stored as                                                                             |
|---------------|----------------------|---------------------------------------------------------------------------------------|
| Planning      | 3D T1 MRI            | 14-number anatomy fingerprint (`VECTOR(14)`), AC/PC landmarks, scaling to AC-PC space |
| After surgery | CT lead localisation | Positions of the 4 contacts (`nt.Contact`)                                            |
| Follow-up     | Clinic scores        | Active contact, efficacy %, side effects, patient rating                              |
```

## How a suggestion is made (nt.usp\_SuggestPlacement)

1.  Fingerprint. At ingest, 14 features are measured from the MRI: brain extents and volume, AC-PC length, third-ventricle width and height, lateral-ventricle volume and span, Evans index, some ratios, and age. They are z-scored against the library and stored as VECTOR(14) (nt.usp\_IngestScan).
2.  Find similar brains. VECTOR\_DISTANCE(euclidean, …) picks the K nearest previous implants for the same target. Left and right leads are pooled by mirroring X.
3.  Fit the sweet spot. Each neighbour gives one observation: where its active contact sat, and how well it worked. A grid search finds the point that best explains those outcomes under the target’s dose–response curve. Similar neighbours count for more, via a Gaussian kernel on anatomy distance. Candidate points are penalised where similar patients reported side effects. The search runs at 1 mm, then refines at 0.25 mm; it’s a CROSS JOIN against nt.GridPoint.
4.  Map it into this patient’s scan (native mm) and log it in nt.Suggestion.
5.  Close the loop. nt.usp\_RecordImplantOutcome stores the actual contacts and the 12-month outcome. From then on, that patient is evidence for everyone after them.

## Does it help?

Each historical implant is hidden in turn and re-planned from everyone else. Because the data is simulated, every patient’s true optimal point is known, so both the suggestion and the plain atlas target can be scored against it.

![](/images/medium/1_t3to9lwF_5pbQL-9upHiKQ.png)

Suggested points sit a little closer to side-effect structures than the atlas target does (for example, CH side-effect score 0.9 → 1.4 out of 10). The “Side-effect caution” slider sets that trade-off.

---

I created a SQL Server 2025 schema and supporting code. It had to be 2025 as this supports the Vector type and gives me Vector Distance.

Reference data was created

```sql
CREATE TABLE nt.Condition
(
    ConditionId     TINYINT       NOT NULL CONSTRAINT PK_Condition PRIMARY KEY,
    Code            VARCHAR(10)   NOT NULL CONSTRAINT UQ_Condition_Code UNIQUE,
    Name            NVARCHAR(100) NOT NULL,
    OutcomeMeasure  NVARCHAR(200) NOT NULL
);

CREATE TABLE nt.Target
(
    TargetId        TINYINT       NOT NULL CONSTRAINT PK_Target PRIMARY KEY,
    ConditionId     TINYINT       NOT NULL CONSTRAINT FK_Target_Condition REFERENCES nt.Condition,
    Code            VARCHAR(20)   NOT NULL CONSTRAINT UQ_Target_Code UNIQUE,
    Name            NVARCHAR(100) NOT NULL,
    Laterality      VARCHAR(12)   NOT NULL,              -- Ipsilateral | Bilateral
    AtlasX          FLOAT         NOT NULL,              -- right hemisphere, template mm
    AtlasY          FLOAT         NOT NULL,
    AtlasZ          FLOAT         NOT NULL,
    -- dose-response model used by the fit: Eff = Floor + (Emax-Floor)*exp(-d^2 / 2 Sigma^2)
    Emax            FLOAT         NOT NULL,
    Floor           FLOAT         NOT NULL,
    SigmaMm         FLOAT         NOT NULL,
    NoGoName        NVARCHAR(200) NULL,                  -- the structure that causes side effects
    NoGo            NVARCHAR(100) NULL                   -- sim only: JSON offset from sweet spot
);

/* One row per image-derived feature. PopMean/PopStd are learned from the historical library
   and used to z-score any new scan; Weight lets you emphasise features that matter. */
CREATE TABLE nt.FeatureDef
(
    FeatureNo       TINYINT       NOT NULL CONSTRAINT PK_FeatureDef PRIMARY KEY,
    Code            VARCHAR(40)   NOT NULL CONSTRAINT UQ_FeatureDef_Code UNIQUE,
    Description     NVARCHAR(200) NOT NULL,
    Unit            VARCHAR(10)   NOT NULL,
    PopMean         FLOAT         NOT NULL,
    PopStd          FLOAT         NOT NULL,
    Weight          FLOAT         NOT NULL CONSTRAINT DF_FeatureDef_Weight DEFAULT (1.0)
);

/* Candidate offsets (mm) for the sweet-spot search. Pass 1 = 1 mm over +-5 mm (1331 pts),
   Pass 2 = 0.25 mm over +-1 mm around the pass-1 winner (729 pts). */
CREATE TABLE nt.GridPoint
(
    GridId  INT      NOT NULL IDENTITY CONSTRAINT PK_GridPoint PRIMARY KEY,
    Pass    TINYINT  NOT NULL,
    DX      FLOAT    NOT NULL,
    DY      FLOAT    NOT NULL,
    DZ      FLOAT    NOT NULL,
    L1      AS (ABS(DX) + ABS(DY) + ABS(DZ)) PERSISTED    -- tie-break: prefer closer to centre
);
CREATE INDEX IX_GridPoint_Pass ON nt.GridPoint (Pass) INCLUDE (DX, DY, DZ, L1);
```

Then Patient and Scan data.

```sql
CREATE TABLE nt.Patient
(
    PatientId       INT           NOT NULL CONSTRAINT PK_Patient PRIMARY KEY,
    ConditionId     TINYINT       NOT NULL CONSTRAINT FK_Patient_Condition REFERENCES nt.Condition,
    Sex             CHAR(1)       NOT NULL,
    AgeAtScan       TINYINT       NOT NULL,
    PainSide        CHAR(1)       NULL,                  -- cluster headache: side of attacks
    Status          VARCHAR(12)   NOT NULL CONSTRAINT CK_Patient_Status CHECK (Status IN ('Historical','Referral')),
    IsSimulated     BIT           NOT NULL CONSTRAINT DF_Patient_IsSimulated DEFAULT (1)
);

CREATE TABLE nt.Scan
(
    ScanId          INT           NOT NULL CONSTRAINT PK_Scan PRIMARY KEY,
    PatientId       INT           NOT NULL CONSTRAINT FK_Scan_Patient REFERENCES nt.Patient,
    Modality        VARCHAR(20)   NOT NULL,              -- MRI_T1_3D
    AcquiredOn      DATE          NOT NULL,
    VoxelMm         FLOAT         NOT NULL,
    ACX FLOAT NOT NULL, ACY FLOAT NOT NULL, ACZ FLOAT NOT NULL,   -- landmarks, native mm
    PCX FLOAT NOT NULL, PCY FLOAT NOT NULL, PCZ FLOAT NOT NULL,
    MCPX AS ((ACX + PCX) / 2.0) PERSISTED,
    MCPY AS ((ACY + PCY) / 2.0) PERSISTED,
    MCPZ AS ((ACZ + PCZ) / 2.0) PERSISTED,
    ScaleX FLOAT NOT NULL, ScaleY FLOAT NOT NULL, ScaleZ FLOAT NOT NULL,  -- native -> template
    RawFeatures     NVARCHAR(MAX) NOT NULL CONSTRAINT CK_Scan_RawFeatures CHECK (ISJSON(RawFeatures) = 1),
    Features        VECTOR(14)    NOT NULL               -- z-scored, weighted anatomy fingerprint
);
CREATE INDEX IX_Scan_Patient ON nt.Scan (PatientId);

/* The image itself normally stays in PACS; for the demo the new referrals' volumes live here. */
CREATE TABLE nt.ScanVolume
(
    ScanId          INT            NOT NULL CONSTRAINT PK_ScanVolume PRIMARY KEY
                                   CONSTRAINT FK_ScanVolume_Scan REFERENCES nt.Scan,
    DimX SMALLINT NOT NULL, DimY SMALLINT NOT NULL, DimZ SMALLINT NOT NULL,
    OriginX FLOAT NOT NULL, OriginY FLOAT NOT NULL, OriginZ FLOAT NOT NULL,  -- native mm of voxel (0,0,0) corner
    Encoding        VARCHAR(20)    NOT NULL,              -- zlib-uint8, C order (x,y,z)
    Data            VARBINARY(MAX) NOT NULL
);
```

Then surgery, programming and outcome data.

```sql
CREATE SEQUENCE nt.seqImplant AS INT START WITH 1000000;

CREATE TABLE nt.Implant
(
    ImplantId       INT           NOT NULL CONSTRAINT PK_Implant PRIMARY KEY
                                  CONSTRAINT DF_Implant_Id DEFAULT (NEXT VALUE FOR nt.seqImplant),
    PatientId       INT           NOT NULL CONSTRAINT FK_Implant_Patient REFERENCES nt.Patient,
    TargetId        TINYINT       NOT NULL CONSTRAINT FK_Implant_Target REFERENCES nt.Target,
    Hemisphere      CHAR(1)       NOT NULL CONSTRAINT CK_Implant_Hemi CHECK (Hemisphere IN ('L','R')),
    ImplantedOn     DATE          NOT NULL,
    PlannedX FLOAT NULL, PlannedY FLOAT NULL, PlannedZ FLOAT NULL,          -- template mm (signed X)
    SuggestionId    INT           NULL,
    CONSTRAINT UQ_Implant UNIQUE (PatientId, TargetId, Hemisphere)
);

/* Post-op CT-localised contact centres, template mm (signed X). Contact 0 = deepest. */
CREATE TABLE nt.Contact
(
    ImplantId       INT     NOT NULL CONSTRAINT FK_Contact_Implant REFERENCES nt.Implant,
    ContactNo       TINYINT NOT NULL,
    X FLOAT NOT NULL, Y FLOAT NOT NULL, Z FLOAT NOT NULL,
    CONSTRAINT PK_Contact PRIMARY KEY (ImplantId, ContactNo)
);

CREATE TABLE nt.Programming
(
    ImplantId       INT     NOT NULL CONSTRAINT PK_Programming PRIMARY KEY
                            CONSTRAINT FK_Programming_Implant REFERENCES nt.Implant,
    ActiveContact   TINYINT NOT NULL,
    AmplitudeMa     DECIMAL(4,1) NOT NULL,
    PulseWidthUs    SMALLINT     NOT NULL,
    FrequencyHz     SMALLINT     NOT NULL
);

CREATE TABLE nt.Outcome
(
    OutcomeId       INT          NOT NULL IDENTITY CONSTRAINT PK_Outcome PRIMARY KEY,
    ImplantId       INT          NOT NULL CONSTRAINT FK_Outcome_Implant REFERENCES nt.Implant,
    MonthsPostOp    TINYINT      NOT NULL,
    EfficacyPct     FLOAT        NOT NULL,   -- condition-specific, see nt.Condition.OutcomeMeasure
    SideEffectScore FLOAT        NOT NULL,   -- 0 (none) .. 10 (intolerable)
    PatientRating   TINYINT      NOT NULL,   -- 0 .. 10 patient-reported
    NetBenefit      AS (EfficacyPct / 100.0 - 0.04 * SideEffectScore) PERSISTED,
    RecordedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_Outcome_RecordedAt DEFAULT (SYSUTCDATETIME())
);
CREATE INDEX IX_Outcome_Implant ON nt.Outcome (ImplantId, MonthsPostOp DESC);

/* Every suggestion made, so the surgeon's decision and the eventual result can be audited. */
CREATE TABLE nt.Suggestion
(
    SuggestionId        INT          NOT NULL IDENTITY CONSTRAINT PK_Suggestion PRIMARY KEY,
    ScanId              INT          NOT NULL CONSTRAINT FK_Suggestion_Scan REFERENCES nt.Scan,
    TargetId            TINYINT      NOT NULL CONSTRAINT FK_Suggestion_Target REFERENCES nt.Target,
    Hemisphere          CHAR(1)      NOT NULL,
    K                   INT          NOT NULL,
    SideEffectPenalty   FLOAT        NOT NULL,
    TemplateX FLOAT NOT NULL, TemplateY FLOAT NOT NULL, TemplateZ FLOAT NOT NULL,
    NativeX   FLOAT NOT NULL, NativeY   FLOAT NOT NULL, NativeZ   FLOAT NOT NULL,
    SdX FLOAT NULL, SdY FLOAT NULL, SdZ FLOAT NULL,
    AtlasShiftMm        FLOAT        NOT NULL,
    EffectiveN          FLOAT        NOT NULL,
    PredictedEfficacy   FLOAT        NULL,
    PredictedSideEffect FLOAT        NULL,
    FitRmse             FLOAT        NOT NULL,
    CreatedAt           DATETIME2(0) NOT NULL CONSTRAINT DF_Suggestion_CreatedAt DEFAULT (SYSUTCDATETIME()),
    AcceptedBySurgeon   BIT          NULL
);

/* SIMULATION ONLY: each patient's hidden true optimal point, used to score the method. */
CREATE TABLE nt.SimTruth
(
    PatientId   INT     NOT NULL CONSTRAINT FK_SimTruth_Patient REFERENCES nt.Patient,
    TargetId    TINYINT NOT NULL CONSTRAINT FK_SimTruth_Target REFERENCES nt.Target,
    Hemisphere  CHAR(1) NOT NULL,
    SweetX FLOAT NOT NULL, SweetY FLOAT NOT NULL, SweetZ FLOAT NOT NULL,   -- template mm, signed X
    CONSTRAINT PK_SimTruth PRIMARY KEY (PatientId, TargetId, Hemisphere)
);
GO
```

Then the evidence.

```sql
/* Evidence = every implant with a known active contact and its latest outcome.
   X is folded to the right hemisphere so left and right leads pool together. */
CREATE VIEW nt.vHistoricalEvidence
AS
SELECT  i.ImplantId, i.PatientId, s.ScanId, i.TargetId, i.Hemisphere,
        ABS(c.X) AS X, c.Y, c.Z,
        o.EfficacyPct, o.SideEffectScore, o.PatientRating, o.NetBenefit,
        s.Features
FROM    nt.Implant      AS i
JOIN    nt.Programming  AS p ON p.ImplantId = i.ImplantId
JOIN    nt.Contact      AS c ON c.ImplantId = i.ImplantId AND c.ContactNo = p.ActiveContact
JOIN    nt.Scan         AS s ON s.PatientId = i.PatientId
CROSS APPLY (SELECT TOP (1) o.EfficacyPct, o.SideEffectScore, o.PatientRating, o.NetBenefit
             FROM nt.Outcome AS o
             WHERE o.ImplantId = i.ImplantId
             ORDER BY o.MonthsPostOp DESC, o.OutcomeId DESC) AS o;
GO

/* Grid of candidate offsets */
WITH n AS (SELECT TOP (21) CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS FLOAT) AS i
           FROM sys.all_objects)
INSERT nt.GridPoint (Pass, DX, DY, DZ)
SELECT 1, x.i - 5, y.i - 5, z.i - 5
FROM   n AS x CROSS JOIN n AS y CROSS JOIN n AS z
WHERE  x.i <= 10 AND y.i <= 10 AND z.i <= 10
UNION ALL
SELECT 2, (x.i - 4) * 0.25, (y.i - 4) * 0.25, (z.i - 4) * 0.25
FROM   n AS x CROSS JOIN n AS y CROSS JOIN n AS z
WHERE  x.i <= 8 AND y.i <= 8 AND z.i <= 8;
GO
```

```sql
/* =====================================================================================
   NeuroTarget — procedures
     nt.usp_IngestScan            z-score raw image features -> VECTOR(14), store scan
     nt.usp_SuggestPlacement      nearest-anatomy neighbours -> fitted sweet spot
     nt.usp_RecordImplantOutcome  close the loop: implant + contacts + programming + outcome
     nt.usp_EvaluateLOO           leave-one-out accuracy vs atlas (simulation ground truth)
   The maths is mirrored line-for-line in python/neurosim/engine.py.
   ===================================================================================== */
```

```sql
/* -------------------------------------------------------------------------------------
   Ingest: RawFeatures is the JSON object produced by the image pipeline, e.g.
   {"brain_w_mm":136.2, "acpc_mm":24.1, ... "age":58}
   ------------------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE nt.usp_IngestScan
    @ScanId      INT,
    @PatientId   INT,
    @Modality    VARCHAR(20),
    @AcquiredOn  DATE,
    @VoxelMm     FLOAT,
    @ACX FLOAT, @ACY FLOAT, @ACZ FLOAT,
    @PCX FLOAT, @PCY FLOAT, @PCZ FLOAT,
    @ScaleX FLOAT, @ScaleY FLOAT, @ScaleZ FLOAT,
    @RawFeatures NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @missing NVARCHAR(400) =
        (SELECT STRING_AGG(f.Code, N', ')
         FROM nt.FeatureDef AS f
         WHERE JSON_VALUE(@RawFeatures, N'$.' + f.Code) IS NULL);
    IF @missing IS NOT NULL
    BEGIN
        DECLARE @msg NVARCHAR(500) = N'RawFeatures is missing: ' + @missing;
        THROW 50010, @msg, 1;
    END;

    -- z-score each feature against the library population, apply its weight, and build the
    -- JSON array literal that SQL Server 2025 casts straight to VECTOR(n)
    DECLARE @vec NVARCHAR(MAX) =
        N'[' + (SELECT STRING_AGG(CONVERT(VARCHAR(40), CAST(
                        f.Weight * (CAST(JSON_VALUE(@RawFeatures, N'$.' + f.Code) AS FLOAT) - f.PopMean)
                        / NULLIF(f.PopStd, 0) AS DECIMAL(18,6))), ',')
                       WITHIN GROUP (ORDER BY f.FeatureNo)
                FROM nt.FeatureDef AS f) + N']';

    INSERT nt.Scan (ScanId, PatientId, Modality, AcquiredOn, VoxelMm,
                    ACX, ACY, ACZ, PCX, PCY, PCZ, ScaleX, ScaleY, ScaleZ, RawFeatures, Features)
    VALUES (@ScanId, @PatientId, @Modality, @AcquiredOn, @VoxelMm,
            @ACX, @ACY, @ACZ, @PCX, @PCY, @PCZ, @ScaleX, @ScaleY, @ScaleZ, @RawFeatures,
            CAST(@vec AS VECTOR(14)));
END;
GO
```

```sql
/* -------------------------------------------------------------------------------------
   Suggest a placement for one scan / target / hemisphere.

   1. Find the @K implants (same target, other patients) whose scans are nearest in the
      anatomy vector space (VECTOR_DISTANCE euclidean).
   2. Weight them with a Gaussian kernel on that distance (bandwidth = mean distance).
   3. Each neighbour is one observation: active contact position -> efficacy, side effects.
      Grid-search the sweet spot s that best explains those outcomes under the target's
      dose-response curve, penalised by side-effect burden reported near s.
      Coarse 1 mm pass around the atlas, then a 0.25 mm pass around the winner.
   4. Map the answer into the patient's own scan (native mm) and log it.

   Result set 1: the suggestion. Result set 2: the neighbours and their weights.
   ------------------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE nt.usp_SuggestPlacement
    @ScanId             INT,
    @TargetId           TINYINT,
    @Hemisphere         CHAR(1) = 'R',
    @K                  INT     = 40,
    @SideEffectPenalty  FLOAT   = 100,
    @Save               BIT     = 1,
    @SuggestionId       INT     = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Hemisphere NOT IN ('L','R') THROW 50020, N'@Hemisphere must be L or R', 1;

    DECLARE @q VECTOR(14), @PatientId INT,
            @mx FLOAT, @my FLOAT, @mz FLOAT, @sx FLOAT, @sy FLOAT, @sz FLOAT;
    SELECT  @q = s.Features, @PatientId = s.PatientId,
            @mx = s.MCPX, @my = s.MCPY, @mz = s.MCPZ,
            @sx = s.ScaleX, @sy = s.ScaleY, @sz = s.ScaleZ
    FROM    nt.Scan AS s
    WHERE   s.ScanId = @ScanId;
    IF @PatientId IS NULL THROW 50021, N'Unknown @ScanId', 1;

    DECLARE @ax FLOAT, @ay FLOAT, @az FLOAT, @Floor FLOAT, @Emax FLOAT, @Sigma FLOAT;
    SELECT  @ax = AtlasX, @ay = AtlasY, @az = AtlasZ, @Floor = Floor, @Emax = Emax, @Sigma = SigmaMm
    FROM    nt.Target WHERE TargetId = @TargetId;
    IF @ax IS NULL THROW 50022, N'Unknown @TargetId', 1;

    /* 1. nearest anatomy */
    CREATE TABLE #nb
    (
        Rn INT NOT NULL, ImplantId INT NOT NULL, PatientId INT NOT NULL, ScanId INT NOT NULL,
        Hemisphere CHAR(1) NOT NULL, X FLOAT NOT NULL, Y FLOAT NOT NULL, Z FLOAT NOT NULL,
        EfficacyPct FLOAT NOT NULL, SideEffectScore FLOAT NOT NULL, PatientRating TINYINT NOT NULL,
        NetBenefit FLOAT NOT NULL, Dist FLOAT NOT NULL, KernelW FLOAT NULL, NearW FLOAT NULL
    );

    INSERT #nb (Rn, ImplantId, PatientId, ScanId, Hemisphere, X, Y, Z,
                EfficacyPct, SideEffectScore, PatientRating, NetBenefit, Dist)
    SELECT TOP (@K)
           ROW_NUMBER() OVER (ORDER BY d.Dist, d.ImplantId),
           d.ImplantId, d.PatientId, d.ScanId, d.Hemisphere, d.X, d.Y, d.Z,
           d.EfficacyPct, d.SideEffectScore, d.PatientRating, d.NetBenefit, d.Dist
    FROM ( SELECT e.ImplantId, e.PatientId, e.ScanId, e.Hemisphere, e.X, e.Y, e.Z,
                  e.EfficacyPct, e.SideEffectScore, e.PatientRating, e.NetBenefit,
                  VECTOR_DISTANCE('euclidean', e.Features, @q) AS Dist
           FROM   nt.vHistoricalEvidence AS e
           WHERE  e.TargetId = @TargetId
             AND  e.PatientId <> @PatientId ) AS d
    ORDER BY d.Dist, d.ImplantId;

    IF NOT EXISTS (SELECT 1 FROM #nb) THROW 50023, N'No historical evidence for this target', 1;

    /* 2. similarity kernel */
    DECLARE @h FLOAT = (SELECT AVG(Dist) FROM #nb);
    IF @h IS NULL OR @h = 0 SET @h = 1.0;
    UPDATE #nb SET KernelW = EXP(-SQUARE(Dist / @h));
    DECLARE @sumW FLOAT = (SELECT SUM(KernelW) FROM #nb);
    DECLARE @twoS2 FLOAT = 2.0 * @Sigma * @Sigma, @twoR2 FLOAT = 2.0 * 1.5 * 1.5;

    /* 3a. coarse pass around the atlas target */
    DECLARE @cx FLOAT, @cy FLOAT, @cz FLOAT;
    SELECT TOP (1) @cx = @ax + g.DX, @cy = @ay + g.DY, @cz = @az + g.DZ
    FROM   nt.GridPoint AS g
    CROSS APPLY (
        SELECT SUM(n.KernelW * SQUARE(@Floor + (@Emax - @Floor) * EXP(-dd.D2 / @twoS2) - n.EfficacyPct)) / @sumW AS Fit,
               SUM(n.KernelW * n.SideEffectScore * EXP(-dd.D2 / @twoR2)) / @sumW AS Risk
        FROM   #nb AS n
        CROSS APPLY (SELECT SQUARE(@ax + g.DX - n.X) + SQUARE(@ay + g.DY - n.Y) + SQUARE(@az + g.DZ - n.Z) AS D2) AS dd
    ) AS s
    WHERE  g.Pass = 1
    ORDER BY s.Fit + @SideEffectPenalty * s.Risk, g.L1, g.DX, g.DY, g.DZ;   -- = np.lexsort + grid order

    /* 3b. fine pass around the coarse winner */
    DECLARE @bx FLOAT, @by FLOAT, @bz FLOAT, @Fit FLOAT;
    SELECT TOP (1) @bx = @cx + g.DX, @by = @cy + g.DY, @bz = @cz + g.DZ, @Fit = s.Fit
    FROM   nt.GridPoint AS g
    CROSS APPLY (
        SELECT SUM(n.KernelW * SQUARE(@Floor + (@Emax - @Floor) * EXP(-dd.D2 / @twoS2) - n.EfficacyPct)) / @sumW AS Fit,
               SUM(n.KernelW * n.SideEffectScore * EXP(-dd.D2 / @twoR2)) / @sumW AS Risk
        FROM   #nb AS n
        CROSS APPLY (SELECT SQUARE(@cx + g.DX - n.X) + SQUARE(@cy + g.DY - n.Y) + SQUARE(@cz + g.DZ - n.Z) AS D2) AS dd
    ) AS s
    WHERE  g.Pass = 2
    ORDER BY s.Fit + @SideEffectPenalty * s.Risk, g.L1, g.DX, g.DY, g.DZ;

    /* spread of good placements, and outcomes seen close to the answer */
    UPDATE #nb SET NearW = KernelW * EXP(-(SQUARE(X - @bx) + SQUARE(Y - @by) + SQUARE(Z - @bz)) / @twoR2);

    DECLARE @SdX FLOAT, @SdY FLOAT, @SdZ FLOAT, @Neff FLOAT, @PredEff FLOAT, @PredSE FLOAT;
    SELECT  @SdX = SQRT(SUM(g.W * SQUARE(X - @bx)) / NULLIF(SUM(g.W), 0)),
            @SdY = SQRT(SUM(g.W * SQUARE(Y - @by)) / NULLIF(SUM(g.W), 0)),
            @SdZ = SQRT(SUM(g.W * SQUARE(Z - @bz)) / NULLIF(SUM(g.W), 0)),
            @Neff = SQUARE(SUM(KernelW)) / SUM(SQUARE(KernelW)),
            @PredEff = CASE WHEN SUM(NearW) > 1e-9 THEN SUM(NearW * EfficacyPct) / SUM(NearW) END,
            @PredSE  = CASE WHEN SUM(NearW) > 1e-9 THEN SUM(NearW * SideEffectScore) / SUM(NearW) END
    FROM    #nb
    CROSS APPLY (SELECT KernelW * CASE WHEN NetBenefit > 0 THEN NetBenefit ELSE 0 END AS W) AS g;

    /* 4. into the patient's own scan */
    DECLARE @sgn FLOAT = CASE @Hemisphere WHEN 'L' THEN -1.0 ELSE 1.0 END;
    DECLARE @tx FLOAT = @sgn * @bx, @ty FLOAT = @by, @tz FLOAT = @bz;
    DECLARE @nx FLOAT = @tx / @sx + @mx, @ny FLOAT = @ty / @sy + @my, @nz FLOAT = @tz / @sz + @mz;
    DECLARE @shift FLOAT = SQRT(SQUARE(@bx - @ax) + SQUARE(@by - @ay) + SQUARE(@bz - @az));

    IF @Save = 1
    BEGIN
        INSERT nt.Suggestion (ScanId, TargetId, Hemisphere, K, SideEffectPenalty,
                              TemplateX, TemplateY, TemplateZ, NativeX, NativeY, NativeZ,
                              SdX, SdY, SdZ, AtlasShiftMm, EffectiveN,
                              PredictedEfficacy, PredictedSideEffect, FitRmse)
        VALUES (@ScanId, @TargetId, @Hemisphere, @K, @SideEffectPenalty,
                @tx, @ty, @tz, @nx, @ny, @nz, @SdX, @SdY, @SdZ, @shift, @Neff,
                @PredEff, @PredSE, SQRT(@Fit));
        SET @SuggestionId = SCOPE_IDENTITY();
    END;

    SELECT  @SuggestionId AS SuggestionId, @ScanId AS ScanId, @TargetId AS TargetId,
            @Hemisphere AS Hemisphere, @K AS K,
            @tx AS TemplateX, @ty AS TemplateY, @tz AS TemplateZ,
            @nx AS NativeX, @ny AS NativeY, @nz AS NativeZ,
            @sgn * @ax AS AtlasX, @ay AS AtlasY, @az AS AtlasZ,
            @SdX AS SdX, @SdY AS SdY, @SdZ AS SdZ,
            @shift AS AtlasShiftMm, @Neff AS EffectiveN,
            @PredEff AS PredictedEfficacy, @PredSE AS PredictedSideEffect,
            SQRT(@Fit) AS FitRmse, @h AS Bandwidth;

    SELECT  Rn, ImplantId, PatientId, ScanId, Hemisphere, X, Y, Z,
            EfficacyPct, SideEffectScore, PatientRating, NetBenefit, Dist, KernelW, NearW
    FROM    #nb
    ORDER BY Rn;
END;
GO
```

```sql
/* -------------------------------------------------------------------------------------
   Close the loop. @ContactsJson: [{"n":0,"x":..,"y":..,"z":..}, ...] template mm, signed X
   (post-op CT localisation). The patient becomes part of the evidence for everyone after.
   ------------------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE nt.usp_RecordImplantOutcome
    @PatientId        INT,
    @TargetId         TINYINT,
    @Hemisphere       CHAR(1),
    @ImplantedOn      DATE,
    @ContactsJson     NVARCHAR(MAX),
    @ActiveContact    TINYINT,
    @AmplitudeMa      DECIMAL(4,1),
    @PulseWidthUs     SMALLINT,
    @FrequencyHz      SMALLINT,
    @MonthsPostOp     TINYINT,
    @EfficacyPct      FLOAT,
    @SideEffectScore  FLOAT,
    @PatientRating    TINYINT,
    @SuggestionId     INT = NULL,
    @ImplantId        INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    SELECT @ImplantId = ImplantId FROM nt.Implant
    WHERE PatientId = @PatientId AND TargetId = @TargetId AND Hemisphere = @Hemisphere;

    IF @ImplantId IS NULL
    BEGIN
        SET @ImplantId = NEXT VALUE FOR nt.seqImplant;
        DECLARE @px FLOAT, @py FLOAT, @pz FLOAT;
        SELECT @px = TemplateX, @py = TemplateY, @pz = TemplateZ
        FROM nt.Suggestion WHERE SuggestionId = @SuggestionId;

        INSERT nt.Implant (ImplantId, PatientId, TargetId, Hemisphere, ImplantedOn,
                           PlannedX, PlannedY, PlannedZ, SuggestionId)
        VALUES (@ImplantId, @PatientId, @TargetId, @Hemisphere, @ImplantedOn, @px, @py, @pz, @SuggestionId);

        INSERT nt.Contact (ImplantId, ContactNo, X, Y, Z)
        SELECT @ImplantId, j.n, j.x, j.y, j.z
        FROM OPENJSON(@ContactsJson) WITH (n TINYINT '$.n', x FLOAT '$.x', y FLOAT '$.y', z FLOAT '$.z') AS j;

        IF @SuggestionId IS NOT NULL
            UPDATE nt.Suggestion SET AcceptedBySurgeon = 1 WHERE SuggestionId = @SuggestionId;
    END;

    MERGE nt.Programming AS t
    USING (SELECT @ImplantId AS ImplantId) AS s ON t.ImplantId = s.ImplantId
    WHEN MATCHED THEN UPDATE SET ActiveContact = @ActiveContact, AmplitudeMa = @AmplitudeMa,
                                 PulseWidthUs = @PulseWidthUs, FrequencyHz = @FrequencyHz
    WHEN NOT MATCHED THEN INSERT (ImplantId, ActiveContact, AmplitudeMa, PulseWidthUs, FrequencyHz)
                          VALUES (@ImplantId, @ActiveContact, @AmplitudeMa, @PulseWidthUs, @FrequencyHz);

    INSERT nt.Outcome (ImplantId, MonthsPostOp, EfficacyPct, SideEffectScore, PatientRating)
    VALUES (@ImplantId, @MonthsPostOp, @EfficacyPct, @SideEffectScore, @PatientRating);

    UPDATE nt.Patient SET Status = 'Historical' WHERE PatientId = @PatientId;
    COMMIT;
END;
GO
```

```sql
/* -------------------------------------------------------------------------------------
   Leave-one-patient-out evaluation for a whole target, set-based.
   For every historical implant: rebuild its suggestion from everyone else, then score
   suggestion and plain atlas against the simulated true sweet spot.
   Result set 1: summary. Result set 2: per implant.
   ------------------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE nt.usp_EvaluateLOO
    @TargetId           TINYINT,
    @K                  INT   = 40,
    @SideEffectPenalty  FLOAT = 100
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ax FLOAT, @ay FLOAT, @az FLOAT, @Floor FLOAT, @Emax FLOAT, @Sigma FLOAT, @NoGo NVARCHAR(100);
    SELECT  @ax = AtlasX, @ay = AtlasY, @az = AtlasZ, @Floor = Floor, @Emax = Emax, @Sigma = SigmaMm, @NoGo = NoGo
    FROM    nt.Target WHERE TargetId = @TargetId;
    DECLARE @gx FLOAT = CAST(JSON_VALUE(@NoGo, '$[0]') AS FLOAT),
            @gy FLOAT = CAST(JSON_VALUE(@NoGo, '$[1]') AS FLOAT),
            @gz FLOAT = CAST(JSON_VALUE(@NoGo, '$[2]') AS FLOAT);
    DECLARE @twoS2 FLOAT = 2.0 * @Sigma * @Sigma, @twoR2 FLOAT = 2.0 * 1.5 * 1.5;

    SELECT e.ImplantId AS QId, e.PatientId, e.Hemisphere, e.X, e.Y, e.Z
    INTO   #q
    FROM   nt.vHistoricalEvidence AS e
    WHERE  e.TargetId = @TargetId;

    SELECT q.QId, nb.ImplantId, nb.X, nb.Y, nb.Z, nb.EfficacyPct, nb.SideEffectScore, nb.NetBenefit, nb.Dist,
           CAST(NULL AS FLOAT) AS KernelW
    INTO   #nb
    FROM   #q AS q
    JOIN   nt.vHistoricalEvidence AS qe ON qe.ImplantId = q.QId
    CROSS APPLY (
        SELECT TOP (@K) e.ImplantId, e.X, e.Y, e.Z, e.EfficacyPct, e.SideEffectScore, e.NetBenefit,
               VECTOR_DISTANCE('euclidean', e.Features, qe.Features) AS Dist
        FROM   nt.vHistoricalEvidence AS e
        WHERE  e.TargetId = @TargetId AND e.PatientId <> q.PatientId
        ORDER BY Dist, e.ImplantId
    ) AS nb;

    WITH b AS (SELECT QId, KernelW, Dist, AVG(Dist) OVER (PARTITION BY QId) AS H FROM #nb)
    UPDATE b SET KernelW = EXP(-SQUARE(Dist / CASE WHEN H > 0 THEN H ELSE 1.0 END));

    SELECT QId, SUM(KernelW) AS SumW, SQUARE(SUM(KernelW)) / SUM(SQUARE(KernelW)) AS Neff
    INTO #w FROM #nb GROUP BY QId;

    /* coarse */
    WITH s AS (
        SELECT n.QId, g.DX, g.DY, g.DZ, g.L1,
               SUM(n.KernelW * SQUARE(@Floor + (@Emax - @Floor) * EXP(-d.D2 / @twoS2) - n.EfficacyPct)) AS FitW,
               SUM(n.KernelW * n.SideEffectScore * EXP(-d.D2 / @twoR2)) AS RiskW
        FROM   #nb AS n
        CROSS JOIN nt.GridPoint AS g
        CROSS APPLY (SELECT SQUARE(@ax + g.DX - n.X) + SQUARE(@ay + g.DY - n.Y) + SQUARE(@az + g.DZ - n.Z) AS D2) AS d
        WHERE  g.Pass = 1
        GROUP BY n.QId, g.GridId, g.DX, g.DY, g.DZ, g.L1
    ), r AS (
        SELECT s.QId, @ax + s.DX AS CX, @ay + s.DY AS CY, @az + s.DZ AS CZ,
               ROW_NUMBER() OVER (PARTITION BY s.QId
                                  ORDER BY (s.FitW + @SideEffectPenalty * s.RiskW) / w.SumW, s.L1, s.DX, s.DY, s.DZ) AS rn
        FROM s JOIN #w AS w ON w.QId = s.QId
    )
    SELECT QId, CX, CY, CZ INTO #c FROM r WHERE rn = 1;

    /* fine */
    WITH s AS (
        SELECT n.QId, c.CX + g.DX AS FX, c.CY + g.DY AS FY, c.CZ + g.DZ AS FZ, g.L1,
               SUM(n.KernelW * SQUARE(@Floor + (@Emax - @Floor) * EXP(-d.D2 / @twoS2) - n.EfficacyPct)) AS FitW,
               SUM(n.KernelW * n.SideEffectScore * EXP(-d.D2 / @twoR2)) AS RiskW
        FROM   #nb AS n
        JOIN   #c  AS c ON c.QId = n.QId
        CROSS JOIN nt.GridPoint AS g
        CROSS APPLY (SELECT SQUARE(c.CX + g.DX - n.X) + SQUARE(c.CY + g.DY - n.Y) + SQUARE(c.CZ + g.DZ - n.Z) AS D2) AS d
        WHERE  g.Pass = 2
        GROUP BY n.QId, g.GridId, c.CX, c.CY, c.CZ, g.DX, g.DY, g.DZ, g.L1
    ), r AS (
        SELECT s.QId, s.FX, s.FY, s.FZ,
               ROW_NUMBER() OVER (PARTITION BY s.QId
                                  ORDER BY (s.FitW + @SideEffectPenalty * s.RiskW) / w.SumW, s.L1, s.FX, s.FY, s.FZ) AS rn
        FROM s JOIN #w AS w ON w.QId = s.QId
    )
    SELECT QId, FX, FY, FZ INTO #b FROM r WHERE rn = 1;

    /* score against the hidden truth (simulation only) */
    SELECT  q.QId AS ImplantId, q.PatientId, q.Hemisphere,
            SQRT(SQUARE(b.FX - t.TX) + SQUARE(b.FY - t.SweetY) + SQUARE(b.FZ - t.SweetZ)) AS SuggestErrMm,
            SQRT(SQUARE(@ax  - t.TX) + SQUARE(@ay  - t.SweetY) + SQUARE(@az  - t.SweetZ)) AS AtlasErrMm,
            SQRT(SQUARE(q.X  - t.TX) + SQUARE(q.Y  - t.SweetY) + SQUARE(q.Z  - t.SweetZ)) AS ActualContactErrMm,
            @Floor + (@Emax - @Floor) * EXP(-(SQUARE(b.FX - t.TX) + SQUARE(b.FY - t.SweetY) + SQUARE(b.FZ - t.SweetZ)) / @twoS2) AS SuggestEfficacy,
            @Floor + (@Emax - @Floor) * EXP(-(SQUARE(@ax  - t.TX) + SQUARE(@ay  - t.SweetY) + SQUARE(@az  - t.SweetZ)) / @twoS2) AS AtlasEfficacy,
            10 * EXP(-(SQUARE(b.FX - t.TX - @gx) + SQUARE(b.FY - t.SweetY - @gy) + SQUARE(b.FZ - t.SweetZ - @gz)) / (2 * 1.8 * 1.8)) AS SuggestSideEffect,
            10 * EXP(-(SQUARE(@ax  - t.TX - @gx) + SQUARE(@ay  - t.SweetY - @gy) + SQUARE(@az  - t.SweetZ - @gz)) / (2 * 1.8 * 1.8)) AS AtlasSideEffect,
            w.Neff AS EffectiveN
    INTO    #res
    FROM    #q AS q
    JOIN    #b AS b ON b.QId = q.QId
    JOIN    #w AS w ON w.QId = q.QId
    CROSS APPLY (SELECT ABS(st.SweetX) AS TX, st.SweetY, st.SweetZ
                 FROM nt.SimTruth AS st
                 WHERE st.PatientId = q.PatientId AND st.TargetId = @TargetId AND st.Hemisphere = q.Hemisphere) AS t;

    SELECT  @TargetId AS TargetId, @K AS K, @SideEffectPenalty AS SideEffectPenalty,
            COUNT(*) AS Implants,
            AVG(SuggestErrMm) AS MeanSuggestErrMm, AVG(AtlasErrMm) AS MeanAtlasErrMm,
            AVG(ActualContactErrMm) AS MeanActualContactErrMm,
            AVG(CASE WHEN SuggestErrMm < AtlasErrMm THEN 1.0 ELSE 0.0 END) AS FractionCloserThanAtlas,
            AVG(SuggestEfficacy) AS MeanSuggestEfficacy, AVG(AtlasEfficacy) AS MeanAtlasEfficacy,
            AVG(SuggestSideEffect) AS MeanSuggestSideEffect, AVG(AtlasSideEffect) AS MeanAtlasSideEffect
    FROM    #res;

    SELECT * FROM #res ORDER BY ImplantId;
END;
GO
```

I then generated some test data

![](/images/medium/1_ounSzQKaKUiJogvNOqeBtA.png)

and load some images.

![](/images/medium/1_Vffgrmb7yAR3gRcT5B-CGA.png)

The to run the app:

1.  simulate the cohort (≈ 1–2 min): 760 implanted patients + 20 new referrals with MRI volumes

```python
cd python
python generate_data.py
```

2\. With SQL Server 2025

```python
export NEUROTARGET_CONN="Driver={ODBC Driver 18 for SQL Server};Server=localhost;UID=sa;PWD=…;TrustServerCertificate=yes"

python load_sql.py # creates NeuroTarget DB, runs sql/01 + sql/02, loads everything

streamlit run app.py # choose "SQL Server 2025" in the sidebar

-- Useful T-SQL
DECLARE @id INT;
EXEC nt.usp_SuggestPlacement @ScanId = 1761, @TargetId = 1, @Hemisphere = 'R', @K = 40, @SuggestionId = @id OUTPUT;
EXEC nt.usp_EvaluateLOO @TargetId = 2, @K = 40;   -- set-based; ~40M row evaluations, allow a minute
```

![Neurotarget 3D](/images/medium/1_WJzzCy6Hs-sgnMmmxCwFIw.png)
*Neurotarget 3D*

![Neurotarget — Plan](/images/medium/1_B00n_NdZHx4rT-wxD0Mk4g.png)
*Neurotarget — Plan*

![Neurotarget — Validation](/images/medium/1_nnYejlxsuQLVVEO_53iI6w.png)
*Neurotarget — Validation*

## App tabs

-   Plan (MRI): axial, coronal and sagittal slices through the suggestion, showing the atlas target and the planned lead trajectory.  
    \- 3D: similar patients’ active contacts mapped into this brain, coloured by benefit and sized by similarity, with ventricles, lead, and a 1-SD spread ellipsoid.  
    \- Similar patients: the neighbours, their weights and outcomes, and how benefit falls away with distance.  
    \- Scan fingerprint: the 14 features and how this brain differs from the library.  
    \- Validation: leave-one-out against the known truth.  
    \- Close the loop: simulates surgery with realistic error, a 12-month outcome, and a matched atlas-aimed counterfactual, then records it.

---

## A note to the bloke from twenty years ago

If I could lean over the shoulder of the version of me hunched over that first database at 2am, eye streaming, I’d tell him three things.

Your question was a good one. Where the electrode goes matters, and the people who went before you hold the answer.

You’ll need a lot more data than you’ve got. Be patient. The tools will come.

And building something, even something that will never go near an operating theatre, is a perfectly reasonable way to feel less helpless. It worked for me then. It still does.

The code, simulator and front end will be on my GitHub. Usual disclaimer, in bold because it matters: **simulated data, not medical advice, please don’t let anyone drill holes in you because of a SQL query.**

If you enjoyed this please give it some Claps.
