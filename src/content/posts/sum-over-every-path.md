---
title: "Sum Over Every Path"
subtitle: "A spelling corrector in pure T-SQL, and what Feynman’s postulate had to do with it"
date: 2026-09-01T22:25:26.461Z
cover: "https://cdn-images-1.medium.com/max/1400/1*tx4x9QpjKSMu4fLXE74Dog.jpeg"
tags: ["SQL Server", "AI & Data Science"]
mediumUrl: "https://medium.com/@trevor.dwyer/sum-over-every-path-b4d21610efb4"
repo: "https://github.com/sqlartist/feynman-sql"
runSteps: "Run the scripts from the repository in order. Here's how each step between two words is priced:"
runSql: "CASE\n    WHEN sem.BigramAction IS NOT NULL           THEN sem.BigramAction\n    WHEN n1.POSTag = N'CD' OR n2.POSTag = N'CD' THEN @LiteralAdjacentCost\n    WHEN (n1.InLexicon = 0 AND n1.HasCandidate = 0)\n      OR (n2.InLexicon = 0 AND n2.HasCandidate = 0) THEN @OovAdjacentCost\n    ELSE @UnknownBigramCost\nEND\n  + ISNULL(pos.FieldPenalty, @UnknownGrammarCost)"
era: "Today"
draft: false
---

I’ve spent a while building things inside SQL Server that have no business being there. This one started with a question I could not get rid off: what would it take to score a line of text data not by checking it against rules, but by considering every possible reading of it at once and letting the best one fall out?

That question came from Feynman.

---

## 1\. The idea

Feynman’s formulation of quantum mechanics rests on a move that still feels like cheating the first time you hear about it. Typically, a particle going from A to B takes one trajectory — the one that makes the action stationary. Feynman’s postulates say something different: the particle takes *every* path. Each contributes an amplitude of equal magnitude, and the phase of that contribution is the classical action in units of ħ. Add them all up and the paths that disagree cancel; the ones near the classical trajectory reinforce. The single path you observe isn’t chosen. It’s what’s left standing once everything else has interfered itself out of existence.

What grabbed me wasn’t the physics. It was the *procedural* shape of it. Don’t decide early. Don’t prune. Enumerate everything, cost everything, and let the winner emerge from the sum.

That’s a strange way to write a parser. Most text processing is a pipeline of early commitments — tokenise, then tag, then match, then correct — each stage throwing away information the next stage might have wanted. Feynman’s move is the opposite. Carry all the possibilities forward and settle at the end.

Its pretty similar to the way I learn anyway, not having the interest in maths at school because they just didn’t teach it in context. Not once did a teacher say why you needed COS, TAN, SIN and why we were doing the calculations and angle measurements — not once did they say the reason for all this is because if you look at the Earth which is nearly round you can work out all this amazing stuff. The only thing that sunk in at school was Pythagoras’ theorem, but they never said where it would be useful. So with this lack of knowledge I stopped doing 4 A Levels and got a job in a Company that made ATM software and never looked back.

So this idea of Feynman’s was appealing to me because its the way I have been working ever since — try every possibility there can possibly be and based on the statistics I have kept, we will see what falls out the end. So with that…

I wanted to see what that looked like in T-SQL.

---

## 2\. What it does

Given a line of firewall log text, the engine produces the most likely reading of it with misspellings corrected, and a score for how coherent that reading is.

`Firewalz oftehn blok malicius payloadds` comes back as `firewalls often block malicious payloads`, with all five corrections marked and a note that the input was heavily repaired. `kubernetes reconciled the deployment manifest successfully` — perfect English, entirely outside its vocabulary — comes back unchanged, with a score reflecting that.

Everything runs in SQL Server. No CLR, no external process, no Python scripts. Stored procedures, temp tables, one scalar function, and a lot of set-based work. Like before I should have stopped and just had a nice cup of tea and a lie down. I didn’t and here we are.

---

## 3\. How it’s built

## 3.1 The lattice

Each token position gets several **candidate readings**: the word as written, plus lexicon entries it might be a misspelling of. Candidates come from two text processing favorites — a phonetic match on `SOUNDEX`, or a shared initial letter within a tight length window — and are then priced by edit distance.

That gives a lattice. Position one might read `Firewalz` or `firewalls`; position two `oftehn` or `often`. A path through it picks one candidate per position, which makes it a complete reading of the sentence.

![Trust me, this is the most basic of text processing you can do…](https://cdn-images-1.medium.com/max/1400/1*tx4x9QpjKSMu4fLXE74Dog.jpeg)
*Trust me, this is the most basic of text processing you can do…*

Each node carries a cost for being read that way:

```sql
INSERT INTO #LatticeNodes (PositionID, ObservedToken, CandidateToken, POSTag, NodePenalty, IsCorrection, InLexicon)
SELECT
    d.SequenceID,
    d.Token,
    d.Token,
    COALESCE(lex.POSTag, d.LiteralTag, N'NN'),
    CASE
        WHEN lex.Token    IS NOT NULL THEN 0.0   -- in lexicon as written
        WHEN d.LiteralTag IS NOT NULL THEN 0.0   -- a number or version string
        ELSE @OovPenalty                          -- unknown, and staying that way
    END,
    0,
    CASE WHEN lex.Token IS NOT NULL THEN 1 ELSE 0 END
FROM #InputDocument d
LEFT JOIN dbo.LexiconToken lex
       ON lex.Domain = @DomainContext AND lex.Token = d.Token;
```

The observed reading is always present, so the decoder can always decline to correct. Correction candidates go in alongside it, priced at `@CorrectionWeight × edit distance`, plus an extra penalty if the observed word was *already* in the lexicon.

## 3.2 The costs

Transitions run strictly from position *i* to position *i+1*, so every path covers the whole sentence. Each one prices the pairing:

```less
CASE
    WHEN sem.BigramAction IS NOT NULL           THEN sem.BigramAction
    WHEN n1.POSTag = N'CD' OR n2.POSTag = N'CD' THEN @LiteralAdjacentCost
    WHEN (n1.InLexicon = 0 AND n1.HasCandidate = 0)
      OR (n2.InLexicon = 0 AND n2.HasCandidate = 0) THEN @OovAdjacentCost
    ELSE @UnknownBigramCost
END
  + ISNULL(pos.FieldPenalty, @UnknownGrammarCost)
```

An verified bi-gram is best evidence — `-log P(w₂|w₁)` fitted from a training corpus. Failing that, if either side is a number or a version string, no bi-gram table could ever have contained it, so allocating 100% would punish every log line containing an IP address. Failing that, an out-of-lexicon word with no near neighbour is unverified for the same reason. Only when both words are known and the pairing genuinely wasn't seen, do you pay the full unverified cost. The grammar penalty, `-log P(tag₂|tag₁)`, is added on top.

## 3.3 The trellis

Then the Feynman move: weight every complete path by `e^{-αS}` where `S` is its total cost, and normalise across the whole data set. Low-cost paths will dominate, high-cost paths vanish exponentially, and the winner is whatever survives.

The naive way to do that is to enumerate the paths. Don’t (see 5.2). One pass over positions computes both the best path and the sum over all paths, without recording any of it:

```sql
DECLARE @p INT = 2;
WHILE @p <= @MaxSequence
BEGIN
    WITH Incoming AS (
        SELECT tr.ToNodeID, tr.FromNodeID,
               prev.BestCost + tr.StepCost                 AS CandCost,
               prev.LogAlpha - @SoftmaxAlpha * tr.StepCost AS LogTerm
        FROM #Transitions tr
        INNER JOIN #Trellis prev ON prev.NodeID = tr.FromNodeID
        WHERE tr.ToPosition = @p
    ),
    Agg AS (
        SELECT ToNodeID, MIN(CandCost) AS MinCost, MAX(LogTerm) AS MaxTerm
        FROM Incoming GROUP BY ToNodeID
    ),
    Summed AS (
        -- shift by MaxTerm before exponentiating: no underflow
        SELECT a.ToNodeID, a.MinCost, a.MaxTerm,
               SUM(EXP(i.LogTerm - a.MaxTerm)) AS ExpSum
        FROM Agg a INNER JOIN Incoming i ON i.ToNodeID = a.ToNodeID
        GROUP BY a.ToNodeID, a.MinCost, a.MaxTerm
    ),
    BestBack AS (
        SELECT ToNodeID, FromNodeID,
               ROW_NUMBER() OVER (PARTITION BY ToNodeID
                                  ORDER BY CandCost ASC, FromNodeID ASC) AS rn
        FROM Incoming
    )
    INSERT INTO #Trellis (NodeID, PositionID, BestCost, BackNodeID, LogAlpha)
    SELECT n.NodeID, @p,
           s.MinCost + n.NodePenalty,
           b.FromNodeID,
           s.MaxTerm + LOG(s.ExpSum) - @SoftmaxAlpha * n.NodePenalty
    FROM #LatticeNodes n
    INNER JOIN Summed   s ON s.ToNodeID = n.NodeID
    INNER JOIN BestBack b ON b.ToNodeID = n.NodeID AND b.rn = 1
    WHERE n.PositionID = @p;
      SET @p += 1;
  END
```

Three things happen in that one insert. `MinCost` plus a backpointer is Viterbi — the cheapest way to reach this node. `LogAlpha` is the forward algorithm in log space — the total weight of *every* path reaching this node. And subtracting `MaxTerm` before exponentiating is the log-sum-exp trick, which matters because a twenty-token sentence can accumulate an action in the hundreds and `EXP(-400)` is zero in floating point. Without the shift, every path scores zero, the denominator is zero, and the whole thing silently returns nothing.

It’s O(n·N²) in tokens and candidates. No recursion, no enumeration.

Reading the answer back is a walk down the backpointers, which is the only recursion left and is linear in sentence length:

```sql
;WITH Walk AS (
    SELECT t.NodeID AS TerminalNodeID, t.NodeID, t.BackNodeID
    FROM #Trellis t WHERE t.PositionID = @MaxSequence
    UNION ALL
    SELECT w.TerminalNodeID, p.NodeID, p.BackNodeID
    FROM Walk w INNER JOIN #Trellis p ON p.NodeID = w.BackNodeID
)
SELECT
    CAST(STRING_AGG(CAST(CASE WHEN n.IsCorrection = 1
                              THEN n.ObservedToken + N'->' + n.CandidateToken
                              ELSE n.CandidateToken END AS NVARCHAR(MAX)), N' ')
         WITHIN GROUP (ORDER BY n.PositionID) AS NVARCHAR(MAX)) AS DecodedText,
    ...
```

`ObservedToken` and `CandidateToken` are both kept deliberately. A log-analysis tool that silently rewrites your logs is worse than useless — you need to see that `oftehn` became `often`, not just the tidied result. Although having said that, it would make a fine “cover your tracks” tool.

---

## 4\. Where the physics stops

Remember when I started the article I said Feynman's work inspired me to write this, I am not claiming to have solved Quantum mechanics or done anything other than used the idea of parsing everything at once and seeing from all possible paths which one succeeds.

**This is not a quantum process and it is not a path integral.** Feynman’s amplitudes are complex: `e^{iS/ħ}`. The entire content of the path integral is that phases can *cancel* — destructive interference is what kills the non-classical paths. My weights are real and positive. Nothing ever cancels. Paths only ever add.\*

What I actually built is a Boltzmann-weighted sum over paths, which is a softmax over path costs, which is — to say it plainly although its actually not any plainer — the forward algorithm over a linear-chain conditional random field. An Hidden Markov Mode (HMM) decoder in a physicist’s coat. That’s is work that has been used in NLP for many years and once again I am thwarted by those pesky scientists and their meddling ways of thinking of everything possible many years ago.

![You can’t teach a monkey new tricks](https://cdn-images-1.medium.com/max/1400/1*Yi5ov3M5aSd6QPAqw2l1XA.jpeg)
*You can’t teach a monkey new tricks*

So in all honesty my claim is weak: Feynman’s postulate is where the *design template* came from. Include everything, cost everything, let the sum decide. The maths I ended up with is more thermal, not quantum. The inspiration was real; the isomorphism isn’t. Considering I self taught this stuff I think I’m doing as well as those kids with iPhones.

\*If anyone has access to a server that could actually do some quantum processing that would be nice…

---

## 5\. Seven things that were wrong

Most of these produced absolutely plausible output for many runs of this code, but its because the sample data is just way too small.

## 5.1 `STRING_SPLIT` doesn't guarantee order

I was assigning token positions from an `IDENTITY` column populated by `INSERT ... SELECT FROM STRING_SPLIT(...)`. Token order is the entire basis of a sequence model. The optimiser is free to return those rows in any order it likes and will change its mind under a different plan or parallelism. It worked on my test data by luck. Fixed with `OPENJSON` and an explicit `ROW_NUMBER()` over the array index.

## 5.2 The engine was deleting evidence

My early versions enumerated paths literally, with a recursive CTE that could skip ahead up to five tokens. Two problems.

Path count grew as a Pentanacci sequence: five tokens gave eight paths, twenty gave 1.4 million, forty wouldn’t finish.

Worse than that was routing *through* a token cost two transitions while skipping *over* it cost one, so skipping was almost always cheaper. When the engine met a word it didn’t recognise, its cheapest available explanation was to pretend the word wasn’t there. It was deleting evidence to lower its own score. On a log-analysis tool. Again one for the actual hackers.

## 5.3 The ensemble was empty

Requiring every transition to advance exactly one position fixed the deletion bug and immediately exposed a deeper one: with full coverage and one candidate per token, there is *exactly one path*. The probability is 1.0 by definition. All the recursion was doing was summing over a set with one member.

That’s what forced the lattice. Real alternatives have to come from competing *actual counts* at each position, not from skipping them. Once the lattice existed the recursion became unnecessary, because a trellis gets the same answer without enumerating anything.

So the naive implementation of “consider every path” died, and the postulate survived it. I think that’s the actual lesson: the physics gave me the right instinct, and I was correct eventually…

## 5.4 Normalising edit distance hid whole edits

I was dividing edit distance by token length, so `conection → connection` (one edit) scored 0.100 and `conection → connections` (two edits) scored 0.182. A whole extra edit was worth 0.08.

Meanwhile the bigram model had a strong opinion. The training corpus attested `inbound connections` but never `inbound connection`, a difference worth about 0.93. So the language model dragged the decoder onto the wrong inflection and the channel model was too quiet to object. Raw edit distance fixed it. Normalising by length is not standard for a channel cost, and this is why.

## 5.5 Plain Levenshtein double-charges transpositions

After that fix, recall dropped from 94% to 80%. Five of the six new misses were transpositions: `friewalls`, `unauthoirzed`, `connectiosn`, `immedaitely`, `endopint`.

Levenshtein scores an adjacent swap as two edits — a deletion and an insertion — so the single most common human typo was priced at double. Damerau-Levenshtein counts it as one:

```sql
-- Damerau: an adjacent transposition is ONE edit.
IF @i > 1 AND @j > 1
   AND @Ch     = SUBSTRING(@Right, @j - 1, 1)
   AND @ChPrev = SUBSTRING(@Right, @j,     1)
BEGIN
    SET @Trans = UNICODE(SUBSTRING(@Row2, @j - 1, 1));
    IF @Trans < @Best SET @Best = @Trans;
END
```

The DP row is packed into an `NVARCHAR`, one code unit per cell, offset by one because `NCHAR(0)` returns `NULL`. Damerau needs two previous rows rather than one, hence `@Row2`. That change alone recovered every transposition miss.

## 5.6 My back-off was subsidising typos

I’d added a discount so transitions involving out-of-vocabulary words weren’t charged as though the pairing had been contradicted. Reasonable I thought — an IP address can never appear in a bigram table.

But it also meant *keeping* a misspelling got the discount while *correcting* it paid full price. `ibound → inbound` is a single edit and the engine still refused, because leaving the typo alone saved 1.2 on transitions and only cost 1.0 on the node. It was cheaper to be wrong.

The fix is the `HasCandidate` clause in 3.2: a word one edit from a real word is a suspected typo, not a legitimately unknown one, and doesn't get the discount.

## 5.7 `SELECT` assignment doesn't null out

This issue cost me an entire evening watching a query never finish.

```sql
-- broken: loops forever
SELECT TOP 1 @DocID = DocumentID FROM dbo.DocumentQueue
WHERE ProcessedStatus = 'Pending' AND DocumentID > @DocID ORDER BY DocumentID;
```

When a `SELECT` assignment matches no rows it leaves the variable **unchanged**. So after the last document, `@DocID` keeps its value, `WHILE @DocID IS NOT NULL` stays true, and the final document is re-parsed forever.

```sql
-- correct: SET with a scalar subquery assigns NULL on an empty result
SET @DocID = (SELECT MIN(DocumentID) FROM dbo.DocumentQueue
              WHERE ProcessedStatus = 'Pending');
```

That difference between `SET` and `SELECT` is the entire bug. I now also keep a guard counter, so if the termination condition ever breaks again it raises rather than hangs.

---

## 6\. Measuring it

I got tired of judging this by eye, so I built a harness.

A 45-line training corpus of firewall log phrasings supplies the fitted costs: 150 lexicon tokens, 158 bigrams, 24 POS transitions. A separate 49-line test corpus — different sentences, same domain, 87% bigram coverage — supplies the evaluation. Typos are generated by deterministic single-character mutation.

Crucially, every intended correction is verified by the candidate generator *before* it goes into the corpus. That check found three targets — `ibound → inbound`, `ivalid → invalid`, `deied → denied` — that were impossible by construction, because `SOUNDEX` codes consonants positionally and dropping an early one moves every subsequent code. Without the check they'd have shown up as decoding failures that no amount of tuning could fix. They're the reason the candidate generator has a second, non-phonetic recall channel.

Scoring is token-level: a token that was wrong and got fixed is a true positive, one that was right and got broken is a false positive.

## 7\. Results

```sql

Category                 TP FP FN TN Precision Recall
Single typo              10 0 0 56    100%     100%
Multiple typos           25 0 0 13    100%     100%
Clean                    0  0 0 66    —         —
Out of vocabulary        0  0 0 29    —         —
Scrambled word order     0  0 0 23    —         —
Literals / punctuation / 
multi-sentence           0  0 0 89    -         —
All                      35 0 0 285   100%      100%

-- And the coherence score separates cleanly by category:

Category                 Min   Avg   Max
Clean                   0.247 0.380 0.789
Single typo             0.247 0.380 0.789
Multiple typos          0.247 0.391 0.789
Short lines             0.250 0.555 0.675
Literals (IPs, versions)0.640 0.785 0.956
Punctuation-heavy       1.068 1.234 1.474
Scrambled word order    1.384 1.426 1.479
Out of vocabulary       2.522 2.928 3.342
```

---

## 8\. Two different questions

Look at the first three rows of that table. Clean, single-typo and multi-typo lines have *identical* ranges. That’s deliberate, and it took me a while to see why it should be.

Originally the score included the cost of the corrections, so a line with four typos that decoded perfectly still read as low coherence. Arguably defensible — the input really was degraded — but it meant the number couldn’t answer the question I actually cared about, which is *how good is the reading I just produced*.

So the engine now tracks three costs: the total, the part spent repairing spelling, and the remainder. The verdict reads the remainder.

```sql
TotalActionCost    FLOAT NOT NULL,   -- how degraded was the input?
CorrectionCost     FLOAT NULL,       -- what did the repairs cost?
DecodedActionCost  FLOAT NULL,       -- how coherent is the result?The effect is exact. Every typo line now scores identically to the clean line it was derived from — test 16 went from 1.0972 to 0.7895, matching clean line 2 to four decimal places; test 25, five typos in five words, went from 2.1482 to 0.3300, matching clean line 1. Input quality is reported separately via the correction count.
```

It also removed an overlap that was making the verdict bands impossible to calibrate. Before the split, corrected lines ran up to 1.097 while punctuation-heavy lines started at 1.068, so no single threshold separated them. Afterwards everything that should read green tops out at 0.956 and everything that shouldn’t starts at 1.068. An actual gap.

---

## 9\. The parameter sweep

Two constants control the correction behaviour, and they’re coupled. `@CorrectionWeight` is the cost per edit; `@OovPenalty` is the cost of leaving a token alone. I'd picked 2.0 and 3.0 by educated guess work and wanted to know whether that was a real optimum or just lucky, so I swept a 5×5 grid, re-running the whole corpus in each cell.

F1 by cell, rows `@CorrectionWeight`, columns `@OovPenalty`:

![](https://cdn-images-1.medium.com/max/1400/1*0C8im4DDpYXKEnDodV3AVw.png)

**The control variable is O − W.** Line the cells up by the difference rather than the values and the recall side is almost perfectly determined:

![THE CONTROL VARIABLE & WEIGHTS](https://cdn-images-1.medium.com/max/1400/1*x4uviu4MOoqb3ceHGOuyOw.png)
*THE CONTROL VARIABLE & WEIGHTS*

Identical along each diagonal. Which makes sense: O − W is the margin by which correcting a token is better leaving it alone, so it decides whether a one-edit fix fires at all. Below +0.5 it doesn’t, and recall falls off a cliff — 2 misses at zero margin, 12 at −1.0, 25 at −1.5.

***But there’s a second, independent constraint.*** *The* `*W = 1.0*` *row breaks the diagonal pattern and never reaches 100% at any OOV penalty, carrying a floor of 2 false negatives that no amount of O fixes. That's not a margin problem. It's the channel model being too quiet to outvote the bigrams — exactly the inflection failure from §5.4, reappearing on its own from a completely different direction.*

*False positives tell the other half. They occur only at low W with high O: five at (1.0, 3.0), three at (1.5, 3.5), zero anywhere with W ≥ 2.0. A three-edit correction costs 3W and becomes attractive once that drops below O plus the bigram saving. At W = 1.5 that’s 4.5 against roughly 4.6, so* `*resumed → reset*` *sneaks back in. At W = 2.0 it's 6.0 against 5.1 and stays out.*

*So:* ***W ≥ 1.5 for the channel model to be heard, W ≥ 2.0 to be immune to over-correction, and O − W ≥ 0.5 for corrections to fire at all.*** *Eight cells satisfy all three. (2.0, 3.0) is the most interior of them, with three of four orthogonal neighbours also at 100%.*

*The hand-derived values turned out to be right, but I’d have had no way of knowing that without the grid — and more importantly, no way of knowing why.*

---

## 10\. Making it fast enough to sweep

The first sweep attempt didn’t finish. Twenty-five cells at several minutes each is an afternoon, and I killed it so many times before working out where the time was going.

`fnEditDistance` is a scalar UDF with a nested loop, called for every lexicon word that survives blocking. It sat inside a `CROSS APPLY` over a derived table, and a derived table is not an optimisation fence — SQL Server flattens them routinely. If the blocking predicates don't get pushed below the function, the UDF runs against all 150 lexicon rows per token instead of the six that survive. That's 48,000 calls per cell instead of 2,000.

The fix is one that should have been obvious from the start: **edit distances don’t depend on the cost weights at all.** All 25 cells were recomputing byte-identical distances. So they’re computed once per distinct token, ever, and cached.

The population is deliberately split into two statements, which is the part that matters:

```sql
-- Step 1: blocking only. Lands in a real table.
INSERT INTO #Blocked (Token, LexToken, POSTag)
SELECT n.Token, lex.Token, lex.POSTag
FROM #NewTokens n
INNER JOIN dbo.LexiconToken lex
        ON lex.Domain = @DomainContext
       AND lex.Token <> n.Token
       AND ABS(LEN(lex.Token) - LEN(n.Token)) <= @CacheCeiling
       AND ( DIFFERENCE(lex.Token, n.Token) >= 3
             OR ( LEFT(lex.Token, 1) = LEFT(n.Token, 1)
                  AND ABS(LEN(lex.Token) - LEN(n.Token)) <= 2 ) );
```

```sql
-- Step 2: separate statement, so the function can only ever see survivors.
INSERT INTO dbo.CandidateCache (Domain, ObservedToken, CandidateToken, POSTag, RawEdit)
SELECT @DomainContext, b.Token, b.LexToken, b.POSTag, e.RawEdit
FROM #Blocked b
CROSS APPLY (SELECT dbo.fnEditDistance(b.Token, b.LexToken) AS RawEdit) e
WHERE e.RawEdit > 0 AND e.RawEdit <= @CacheCeiling;
```

Inside one query the optimiser may reorder. Across two statements it cannot. Roughly 1,500 distance computations now cover the entire sweep, against 1.2 million in the flattened worst case. Cells went from minutes to under a second, and the output is byte-identical to the uncached run — which is the check that matters for a pure optimisation.

---

## 11\. What this doesn’t show

A perfect score on a corpus I built myself is the point at which I should be *more* suspicious, not less.

The lexicon is 150 tokens in one domain. The corruptions are synthetic and uniform; real typists produce a messier distribution than four deterministic mutation rules. Every correction was pre-verified as reachable, which removes an entire failure mode that real text will happily supply. And 49 lines is small enough that one example moves the numbers several points — with 35 true positives.

The score also measures vocabulary coverage more than it measures coherence. `kubernetes reconciled the deployment manifest successfully` is flawless English and scores worse than anything else in the corpus. That's the model reporting it has no vocabulary for the sentence, but read the number as "is this good English" and you'll be misled.

And I know of at least three things that will break on real data:

-   **The** `**HasCandidate**` **fix inverts at scale.** With 150 words, few tokens have a lexicon neighbour. With 30,000, almost everything has one within three edits, so almost nothing gets the out-of-vocabulary discount and hostnames start being charged full price on both sides. The predicate probably needs tightening to "no neighbour within one edit".
-   **Blocking becomes a scan.** `DIFFERENCE(lex.Token, ...)` and `LEFT(lex.Token, 1)` are functions on the column, so there's no seek. Invisible at 150 rows, painful at 30,000. Wants persisted computed columns and indexes.
-   **Candidate ranking gets crowded.** At this size the nearest word by edit distance is almost always the right one. At scale there will be a dozen words at distance one, and the ordering will need unigram frequency.

The next step isn’t more tuning. It’s real firewall log lines, with real errors in them, and finding out which of those three predictions was right.

---

## 12\. Why bother

![Sometimes, just sometimes I wish I never started these things.](https://cdn-images-1.medium.com/max/1400/1*HgcMCD0Vd9RMGZLHs6XmtA.png)
*Sometimes, just sometimes I wish I never started these things.*

None of this belongs in a database. You could write it in fifty lines of Python with a library better than mine.

But the constraint keeps teaching me things. Forcing a sequence model into set-based SQL made the exponential blow-up impossible to ignore, because a recursive CTE that fans out to a million rows doesn’t degrade gracefully — it stops. It made the ordering assumption visible, because SQL is the one language that will cheerfully reorder your data and be entirely within its rights. It made every cost explicit, because there’s nowhere to hide a heuristic in a `CASE` expression. And it produced at least two bugs — the `SELECT`\-assignment loop, the flattened derived table — that simply don't exist in other languages.

The Feynman thing was never a claim. It was a way in: a specific, unusual instruction about how to organise a computation, borrowed from somewhere it had already proved itself. Consider everything. Cost everything. Let the sum decide.

The maths I ended up with has a different name, and I should use that name. But I wouldn’t have got there any other way.

As Promised: [https://github.com/sqlartist/feynman-sql](https://github.com/sqlartist/feynman-sql)

If this was interesting, a few claps help other people find it. Follow me for more on Data.
