---
title: "SQL Server 2025, an RTX 5090, and the slow death of “Will the hon. Gentleman give way?”"
subtitle: "Two Graphics Cards and 1.7 Million Speeches to Prove a Negative"
date: 2026-10-08T13:52:27.755Z
cover: "https://cdn-images-1.medium.com/max/1400/1*q3O8bPHn_LoOiOrU0BWLiA.jpeg"
tags: ["SQL Server", "AI & Data Science"]
mediumUrl: "https://medium.com/@trevor.dwyer/two-graphics-cards-and-1-7-million-speeches-to-prove-a-negative-fbde793efbd5"
era: "Today"
draft: false
---

![Why do I do this to myself?](https://cdn-images-1.medium.com/max/1400/1*q3O8bPHn_LoOiOrU0BWLiA.jpeg)
*Why do I do this to myself?*

### The question

Do MPs ever change each other’s minds?

Not “do they vote differently” — the whips settle that. I mean something narrower and more interesting: does an argument made from the opposition benches ever end up coming out of a minister’s mouth? Somebody stands up in 1987, says a thing nobody has said before, and four years later the government is saying it back. That happens, surely. Parliament would be a very expensive piece of theatre if it never happened.

I had 1.7 million speeches, a database that can do vector search, and two graphics cards sitting in a machine under my desk doing nothing. It seemed like a fair question to put to them.

The answer, for about a month, was no.

I want to be clear that I did not want the answer to be no. I wanted a lovely little chart with a bump in it. What I got was two independent methods, built weeks apart on entirely different principles, both saying no, for entirely different reasons. Which is — and I have had to talk myself round to this — a much better result than a bump would have been. One method saying yes is a finding. Two methods saying no, where you can explain exactly \*why\* each one couldn’t see what you hoped it would see, is an actual piece of work.

It also means that everything genuinely interesting here was found by accident while I was failing at the main thing. The House of Commons has quietly stopped using its own interruption protocol. Being a minister makes you \*more\* likely to be shouted at, not less. Eighty-five per cent of every six words ever spoken in the Commons since 1979 was spoken exactly once and never again.

And at one point I had a query that proved every single Member of Parliament is funny one hundred per cent of the time. More on that later, because it is the single stupidest bug I have written in thirty years and I am oddly proud of it.

---

### The only appreciating asset I have ever owned

I have been buying computer hardware since the mid-1990s. Tandem systems, AS/400s, a succession of PCs, every category of storage that has ever been invented and several that were quietly withdrawn. In thirty years, every single piece of it started depreciating the moment I got the box open. Some of it was worth less than the box.

Then I bought two RTX 5090s, about a week before the price went up.

They are now worth more than I paid for them. Not notionally, not “if you account for inflation” — actually, demonstrably, go and look, more money than I handed over. I have owned a house, several cars I never learned to drive, and roughly four hundred hard disks, and the only thing in thirty years that has gone \*up\* is a pair of graphics cards I bought to mess about with.

So there was a certain obligation to use them for something.

And here is the thing that nobody writing about GPUs seems to want to say out loud: the interesting work is not the GPU. It is the handover. A 5090 is phenomenally good at a small number of things and completely useless at everything else. SQL Server is phenomenally good at a different small number of things and would take a fortnight to do what the 5090 does in ninety seconds. Put them in the same room and make each one do only what it is good at, and you can answer questions that neither of them can answer alone.

That is the actual article. The parliamentary stuff is just the excuse.

---

### Why Hansard

Everyone building a vector search demo uses the same three datasets. Wikipedia, because it is there. Product reviews, because somebody once wrote a tutorial. Movie plots, because the results are funny in screenshots. You end up with a demo that proves your index works and tells you nothing at all about the world.

Hansard is the official report of everything said in the House of Commons. The version I used covers 1979 onwards — 2,694,375 speeches, of which 1,700,647 are longer than forty words and attached to a real debate heading. That filter matters: below forty words you are mostly collecting “I beg to move”, “The Question is”, and men saying “no” at each other.

I went for post-1979 deliberately. The Victorian material is wonderful and completely irrelevant to anyone alive. If I am going to find something out, I would like it to be about a Parliament people remember.

What makes it a good corpus is not the size — 1.7 million rows is nothing, it fits in memory on a decent laptop. It is that every row is \*attributed\*. Speaker, party, date, debate, and whether they held office. You do not get that with Wikipedia. It means every question you can ask about the text, you can also ask about who said it, when, and from which side of the room.

It is also, bluntly, the best-documented argument in the English-speaking world, conducted continuously for four decades by people who were paid to be persuasive. If there is a signal anywhere for “did somebody change somebody else’s mind”, it is in here.

---

### The division of labour

This is the bit I actually want you to take away, so I am going to be unusually clear about it.

SQL Server 2025 has a \`VECTOR\` type and \`VECTOR\_DISTANCE\`. It can do similarity search. What it cannot do — what no database can do at any sensible speed — is the thing you need \*before\* similarity search is useful: look at 1.7 million 384-dimensional vectors all at once and work out where the clusters are.

That is k-means. It is forty iterations of a 1.7-million-by-41,730 matrix multiply. On a CPU that is a long lunch. On a 5090 it is ninety seconds, because it is exactly the shape of arithmetic a GPU exists to do: the same operation, on every element, with no branching and no conditionals.

### What the GPU does

Plain PyTorch, no libraries beyond torch. Chunked because 1.7M × 41,730 does not fit in 32 GB all at once.

```python
# Assignment step: every speech to its nearest centroid.
# X is (1.7M, 384) L2-normalised, C is (nlist, 384) normalised.
# With both normalised, cosine similarity IS the dot product,
# so the whole thing collapses to one matmul.

assign = torch.empty(N, dtype=torch.int32, device="cuda")

for lo in range(0, N, CHUNK):
    hi = min(lo + CHUNK, N)
    sims = X[lo:hi] @ C.T          # (chunk, nlist)
    assign[lo:hi] = sims.argmax(1)

# Update step: new centroid = mean of its members.
# index_add_ is the scatter-gather that makes this O(N)
# instead of O(N * nlist).
C.zero_()
C.index_add_(0, assign, X)
counts = torch.bincount(assign, minlength=NLIST).clamp(min=1)
C /= counts.unsqueeze(1)
C = torch.nn.functional.normalize(C, dim=1)
```

That is the whole algorithm. Forty of those, and 1.7 million speeches have been sorted into 41,730 topical neighbourhoods. The GPU then hands the database two things: a cluster id per speech, and a 384-bit binary signature per speech — one bit per dimension, sign only.

```python
# 384 floats -> 384 bits -> 6 BIGINTs.
# Throws away the magnitude and keeps the direction.
# 1,536 bytes becomes 48. That is the 32x.
bits = (X > 0).to(torch.uint8)
packed = np.packbits(bits.cpu().numpy(), axis=1)   # (N, 48)
sig = packed.view(np.int64).byteswap()             # (N, 6)
```

And then the GPU is done. It has no further part in this. It cannot store anything, it cannot be queried, it does not know what a Conservative is.

---

### What the database does

SQL Server’s job is everything the GPU cannot touch: persisting it, indexing it so that only the relevant slice is ever read, and — the part everybody forgets — joining it to who said it.

The cluster ids are the whole trick. Order the columnstore by cluster id and put it on a partition scheme, and a query for one neighbourhood touches one partition instead of the table.

```sql
/*  64 partitions over the cluster id space. The boundaries are
    not arbitrary - they come from a second k-means the GPU ran
    over the centroids themselves, so that clusters which are
    NEAR each other get ADJACENT ids and land in the same
    partition. Spatial locality, written into the physical
    layout of the table.                                        */
CREATE PARTITION FUNCTION pf_cluster (INT)
    AS RANGE LEFT FOR VALUES (652, 1304, 1956, /* ... */ 41078);

CREATE PARTITION SCHEME ps_cluster
    AS PARTITION pf_cluster ALL TO ([PRIMARY]);

/*  Declare the table ON the scheme FIRST. SELECT INTO will not
    do this and the index will not be partition-aligned if you
    try to bolt it on afterwards. I found that out the hard way. */
CREATE TABLE dbo.speech_sig (
    speech_id  INT    NOT NULL,
    cluster_id INT    NOT NULL,
    sig0 BIGINT NOT NULL, sig1 BIGINT NOT NULL, sig2 BIGINT NOT NULL,
    sig3 BIGINT NOT NULL, sig4 BIGINT NOT NULL, sig5 BIGINT NOT NULL
) ON ps_cluster (cluster_id);

CREATE CLUSTERED COLUMNSTORE INDEX ccix_speech_sig
    ON dbo.speech_sig ORDER (cluster_id)
    ON ps_cluster (cluster_id);
```

And then the search. This is the part that made me laugh when it worked, because it is a \*vector similarity search\* implemented with an XOR and a population count — an instruction that has been in CPUs since the 1960s and in T-SQL since 2022.

```sql
/*  Hamming distance on the binary signatures. BIT_COUNT(a ^ b)
    per 64-bit lane, summed. Six XORs and six POPCNTs per row,
    all of it integer work the CPU does at absurd speed, and all
    of it in the columnstore batch-mode engine.

    @probe0..5 are the query's own signature.
    @clusters is the nprobe nearest neighbourhoods, which is
    what makes the partition elimination happen.               */
SELECT TOP 100 s.speech_id,
       hamming = BIT_COUNT(s.sig0 ^ @probe0) + BIT_COUNT(s.sig1 ^ @probe1)
               + BIT_COUNT(s.sig2 ^ @probe2) + BIT_COUNT(s.sig3 ^ @probe3)
               + BIT_COUNT(s.sig4 ^ @probe4) + BIT_COUNT(s.sig5 ^ @probe5)
FROM dbo.speech_sig s
WHERE s.cluster_id IN (SELECT cluster_id FROM @clusters)
ORDER BY hamming;
```

Neither half can do the other’s job. The GPU cannot hold the data, cannot join it to a party affiliation, and cannot answer a question six months later without being handed everything again. The database cannot do the matrix arithmetic that works out where the neighbourhoods are in the first place.

The GPU builds the map. The database reads it. That is the entire architecture and it took me three attempts to see it that plainly.

---

### The same thing, explained to a dachshund

My technical review process is a black-and-tan dachshund called Brian who has been in the house about a week.

Brian has two settings. In the first he is asleep, in a shape no animal with a spine should be able to achieve. In the second he has heard me draw breath to speak, and is therefore already airborne. He has never once let me finish a sentence. He has no opinion on partition elimination. He has strong opinions on my shoelaces.

He is, in other words, the perfect sounding board, because the entire value of explaining something out loud has nothing to do with whether the other party understands a word of it.

So. Imagine a library.

1.  7 million books. No shelves. Just books, in a heap.

```

| What I built            | What it is in the library                                        |
| ----------------------- | ---------------------------------------------------------------- |
| The embedding           | Reading each book and writing down what it's *about* on a card   |
| k-means on the GPU      | Sorting all the cards into 41,730 piles of similar books         |
| The cluster id          | Writing a shelf number on every book                             |
| The ordered columnstore | Actually putting the books on the shelves, in shelf order        |
| The partitions          | Grouping the shelves into 64 rooms                               |
| The binary signature    | A tiny sticker on the spine — 48 bytes instead of the whole book |
| nprobe                  | "Only look in the three nearest rooms"                           |
| Hamming distance        | Comparing stickers instead of reading books                      |
```

I got as far as **”and then you only search the three nearest rooms”** before I stopped, because I had heard it.

How do you know which rooms are nearest?

You don’t. Not in the version I had built. k-means numbers its clusters in whatever order it happens to produce them, so cluster 4 and cluster 39,000 could be about exactly the same thing and sit at opposite ends of the building. I had sorted the books onto shelves and then arranged the shelves at random. Every “nearby room” I was searching was nearby in numbering and nowhere near in meaning.

The fix was a second, much smaller k-means — over the 41,730 centroids themselves this time — grouping them into 64 super-clusters and renumbering so that topically adjacent piles get adjacent numbers. Spatial locality written into the physical layout of the table. It is the best idea in the project and it took ninety seconds to run.

Brian, during all of this, was attempting to kill a sock.

I want to be clear that he contributed nothing. He does not know what a vector is. He is a long, low, deeply stupid animal bred to go down holes after badgers, and the badgers were armed. But the obligation to say a thing out loud, in order, to something that is definitely not going to help, is the cheapest code review available and I have yet to find a better one.

If you take one engineering practice from this article, take the dog.

---

### Attempt one: embeddings. Verdict, no.

The idea was obvious enough that I am slightly embarrassed by how long I believed in it.

If a minister adopts an opposition argument, the minister’s later speech should sit *closer in vector space* to that earlier opposition speech than you would otherwise expect. So: take every cross-party pair of speeches on the same subject, measure the cosine distance, bucket by how many months apart they are, and look for the gap closing.

```sql
/*  Mean cross-party distance against mean same-party distance,
    bucketed by lag. If opposition arguments get adopted, the
    cross-party line should fall relative to the same-party one
    as lag increases.                                          */
SELECT lag_months = DATEDIFF(month, a.speech_date, b.speech_date) / 6 * 6,
       cross_party = AVG(CASE WHEN a.party <> b.party
                        THEN VECTOR_DISTANCE('cosine', av.embedding, bv.embedding) END),
       same_party  = AVG(CASE WHEN a.party =  b.party
                        THEN VECTOR_DISTANCE('cosine', av.embedding, bv.embedding) END)
FROM #pairs p
JOIN dbo.speech_role a  ON a.speech_id = p.a_id
JOIN dbo.speech_role b  ON b.speech_id = p.b_id
JOIN dbo.speech_vec av  ON av.speech_id = p.a_id
JOIN dbo.speech_vec bv  ON bv.speech_id = p.b_id
GROUP BY DATEDIFF(month, a.speech_date, b.speech_date) / 6 * 6
ORDER BY 1;
```

The gap did not close. It **widened**, from +0.0124 to +0.0244, consistently, in every bucket. Cross-party pairs were further apart the longer you waited.

I assumed I had a bug. I did have several, but not that one. So I did the thing I should have done first, which was print the actual speeches and read them.

The closest cross-party pair in the entire corpus, at a cosine distance of 0.079, was David Heathcoat-Amory arguing **against** the fuel duty escalator, and Dawn Primarolo, eleven weeks later, defending it.

There it is. That is the whole failure in one row.

An embedding encodes what a document is ***about***. It has no opinion about whether the author approved. Two people on opposite sides of the same question, using the same vocabulary, citing the same figures, are **near-identical** in vector space — and the more fiercely they disagree about something specific, the closer they get, because disagreement is topically narrow and agreement is vague.

So the method was never going to work, and no amount of tuning would have fixed it. I was asking a tool that measures subject matter to measure stance. It is like trying to find out who won a boxing match by weighing the boxers.

I could have discovered this on day one by reading six rows. I discovered it on day nine, after building a very fast index. Make of that what you will.

---

### Attempt two: phrases. Verdict, also no

If embeddings cannot see stance, stop asking them to. Use words instead.

The logic is nicer than the embedding version. If a backbencher coins a distinctive six-word formulation in 1987, and a minister uses *the same six words* four years later, that is evidence — regardless of whether either of them approved of anything. You do not need a stance model. You need only to notice that the words moved.

So: hash every six-word window in all 1.7 million speeches, count them, and keep the rare-but-repeated ones.

```python
# FNV-1a over the joined n-gram, pure Python, which is quite
# slow and completely fine at this scale.
def hash_ngrams(tokens, n):
    out = []
    for i in range(len(tokens) - n + 1):
        h = 0xcbf29ce484222325
        for w in tokens[i:i + n]:
            for b in w.encode():
                h ^= b
                h = (h * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
            h ^= 0x20                       # the space between words
            h = (h * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
        out.append(h)
    return out
```

That produced ***375,802,591 six-grams, of which 319,572,719 were distinct.***

Stop and look at that for a second, because it is the best statistic in this article and I found it by accident. ***Eighty-five per cent of every six consecutive words ever spoken in the House of Commons since 1979 was spoken exactly once and never again.*** For an institution with a reputation for saying the same thing over and over, that is a remarkable amount of novelty. Four decades of people, in a room, mostly not repeating each other.

Only 3,813,616 fell in the useful band — said between four and three hundred times. Rare enough to be distinctive, common enough that reuse is not a coincidence.

## The burstiness filter, which is the only clever thing here

Most of those 3.8 million are procedural furniture. “I beg to move that the Bill” appears constantly and means nothing. The thing that separates a *coined* phrase from a *recurring* one is its shape in time: boilerplate spreads evenly across forty years, a coinage arrives, spikes, and fades.

```python
# Biggest share of a phrase's uses falling in any single year.
# Boilerplate scores low. A coinage scores high.
_, year_counts = np.unique(years[ids], return_counts=True)
burst = year_counts.max() / total_uses
if burst < 0.35:
    continue
```

That took 3.8 million down to 1,086,386, of which 735,073 had a different speaker at each end.

## And the answer

```sql
/*  The control arm is the whole point. Without it, "2.23% of
    opposition coinages reach a minister" sounds like a finding.
    With it, you can see what it is.                           */
WITH coined AS (
    SELECT coiner_side, phrases = COUNT(*)
    FROM dbo.phrase_attr GROUP BY coiner_side
),
crossed AS (
    SELECT coiner_side, to_minister = COUNT(*)
    FROM dbo.phrase_attr
    WHERE later_role = 'minister' AND lag_days > 30
    GROUP BY coiner_side
)
SELECT c.coiner_side, coined = c.phrases,
       reached_a_minister = x.to_minister,
       pct = CAST(100.0 * x.to_minister / c.phrases AS DECIMAL(5,2))
FROM coined c JOIN crossed x ON x.coiner_side = c.coiner_side;
```

```
| Coined by  | Coinages | Reached a minister | Rate      |
| ---------- | -------- | ------------------ | --------- |
| Opposition | 345,948  | 7,705              | 2.23%     |
| Government | 389,125  | 14,907             | 3.83%     |
```

Ministers are ***1.7 times more likely*** to pick up language coined on their own side.

So language does diffuse through the House — but it diffuses downhill, from the frontbench outwards, not across the floor. The opposition is not shaping government vocabulary. The government is shaping its own.

---

### How much of this should you believe

Less than I would like, and I want to say so before somebody checks.

I pulled a random thirty from the cleaned candidate set and read them. About a third are genuine rhetorical constructions — *”it has shone a spotlight on”, ”in the dying days of his”, ”warm words at the beginning of”, ”we have little to show for”.* People choosing words.

The other two thirds are still furniture: *”copy is being placed in the”*, *”meeting with the financial secretary to”, ”health and safety executive for a”*. Procedural language that survived four filters because it happens to burst in a particular year for reasons that have nothing to do with anybody coining anything.

So: a third signal, two thirds noise. That is enough for a candidate list a human reads and judges, which is what I built it for. It is nowhere near enough to say “this particular MP coined this particular phrase” in print.

The 2.23% against 3.83% survives that, because the noise is symmetric — procedural junk is distributed across both sides of the House in roughly equal measure, so it cancels in a ratio even while it ruins the individual rows. A comparison can be sound while every single line of its input is rubbish. That is a property of comparisons that I think more people should find reassuring than do.

Two methods. Two no’s. One blind to stance, one able to see exactly which words moved. Same answer.

---

## A parade of my own stupidity

I promised you the hundred-per-cent-funny bug. Here it is, along with its friends, roughly in order of how long I stared at each one before the penny dropped.

### 1\. Every MP in Britain is funny all of the time

Hansard marks audience reaction inline: \`\[Laughter.\]\`, \`\[Interruption.\]\`, \`\[Hon. Members: “Rubbish!”\]\`. Lovely. Let us count them.

```sql
-- This returns 1,700,647. Every speech in the corpus.
SELECT COUNT(*) FROM dbo.speech
WHERE body LIKE '%[Interruption.]%';
```

Square brackets are LIKE wildcards. \`’%\[Interruption.\]%’\` does not ask for that string. It asks for \*any single character from the set\* \`{I, n, t, e, r, u, p, o, .}\`, with anything either side.

Every speech in Hansard contains the letter “e”.

So I produced a leaderboard showing that every single Member of Parliament makes the House laugh in 100.00% of their speeches, and — this is the part I enjoy — I very nearly believed it for a moment, because the House of Commons is exactly the sort of institution where that might be true.

```sql
-- CHARINDEX does no pattern matching. 39,163 speeches.
SELECT COUNT(*) FROM dbo.speech
WHERE CHARINDEX('[Interruption.]', body) > 0;
```

Thirty years of writing SQL. Beaten by a bracket.

### 2\. Tony Banks, Conservative

Every leaderboard grouped by speaker and took \`MIN(party)\` to label them, because a speaker has one party and \`MIN\` of one value is that value. Except the dataset has the odd mislabelled row, and \`MIN\` on a string is *alphabetical*.

\`’Conservative’ < ‘Labour’\`.

So one bad row anywhere in a career flips the whole career. Tony Banks — Labour member for Newham North West, one of the funniest men ever to stand up in that chamber — came out of my analysis as a Conservative. So did Mr. Smith. So did Mr. Brown. I had accidentally built a swingometer that only swings one way.

```sql
/*  Modal party, not minimum. Should have been obvious.  */
WITH pc AS (
    SELECT speaker_name, party,
           rn = ROW_NUMBER() OVER (PARTITION BY speaker_name
                                   ORDER BY COUNT(*) DESC, party)
    FROM dbo.speech_role
    WHERE role <> 'chair' AND party IS NOT NULL
    GROUP BY speaker_name, party
)
SELECT speaker_name, main_party = party FROM pc WHERE rn = 1;
```

3\. A filter that rewarded phrases for containing their own date

The burstiness filter scores how concentrated a phrase’s uses are in a single year. Beautiful idea. It put this at the top:

\> ***order 1995 which was laid before*** — burstiness 0.870

Of course it did. The year is *inside the phrase*. Statutory instrument boilerplate scores perfectly on a time-concentration metric because the text contains the time. I built a filter that rewarded phrases for being self-dating and then congratulated myself on the elegance of the method.

One line fixes it:

```sql
AND p.phrase NOT LIKE '%19[0-9][0-9]%'
AND p.phrase NOT LIKE '%20[0-9][0-9]%'
```

(Note the square brackets. Here they **are** the wildcards I want. Consistency is not SQL’s strong suit.)

### 4\. Peter Bone, the most prolific phrase-coiner in parliamentary history

The top forty “most concentrated coinages” contained eighteen entries from one man on one day in 2009:

> the recommendations of the badman report about the recommendations of the badman recommendations of the badman report which of the badman report which suggests badman report which suggests closer monitoring

Peter Bone read a petition about home education into the record. The same petition. 144 times. A six-word window sliding along one piece of text produces dozens of overlapping “phrases”, every one of which bursts identically.

I had not discovered a coinage. I had discovered a man with a very long petition and discovered it eighteen times.

```sql
/*  All shingles of one source share both endpoints. One row
    per (first_speech, last_speech) collapses the petition back
    to the single event it always was.                         */
, deshingled AS (
    SELECT *, rn = ROW_NUMBER() OVER (
                   PARTITION BY first_speech, last_speech
                   ORDER BY uses DESC, burstiness DESC)
    FROM filtered
)
SELECT * INTO dbo.phrase_clean FROM deshingled WHERE rn = 1;
```

### 5\. Theresa May, influencer of nobody

The coiner leaderboard showed Theresa May with 2,808 phrases coined and **zero** reaching a minister. David Cameron, 2,357 and zero. A striking finding about the hollowness of modern political language, I thought, for about four minutes.

The corpus ends in 2021. They coined late. Nobody had time to pick anything up.

If your metric has a boundary, somebody is standing on it.

And there is somebody standing on the other edge too, which took me a further day to see.

The per-party coinage table had the Liberals at 2,718 phrases per million words against the Conservatives’ 1,524. Nearly twice as inventive. A lovely little story about the creativity of third parties, which I was composing in my head when I thought to sort the whole column by something other than the number.

```
| Party            | Per million words | Years active in the corpus |
| ---------------- | ----------------- | -------------------------- |
| Liberal          | 2,718             | 1979–1988 only             |
| Ulster Unionist  | 1,895             | heavily early              |
| Labour           | 1,561             | throughout                 |
| Conservative     | 1,524             | throughout                 |
| Plaid Cymru      | 1,411             | throughout                 |
| DUP              | 1,069             | throughout                 |
| Liberal Democrat | 979               | post-1988                  |
| SNP              | 825               | mostly post-2015           |
```

That is not a ranking of linguistic invention. It is a ranking of ***who got here first.***

“First use” in my data means first use **in the corpus**, and the corpus starts in 1979. Every phrase already in circulation before then — which is to say most of the English language — gets credited to whoever happens to say it earliest inside my window. The Liberal Party label stops existing at the 1988 merger, so every Liberal in this dataset is standing at the front of the queue being handed the collected works of several centuries of parliamentary cliche.

So I had built a metric with a boundary at each end. Arrive early and you are credited with inventing everything that was already there. Arrive late and you are recorded as having influenced nobody. Neither has anything to do with the MPs.

If your data has edges — and all data has edges — go and look at who is standing on them before you write a word.

### 6\. Forty-two rows a second

The loader wrote data files at 42 rows per second. Eleven hours for a job that should take two minutes. I confidently diagnosed f-string formatting of numpy scalars. Wrong. I then confidently diagnosed memory pressure. Also wrong — Task Manager showed 58 GB free and the disk at 1%.

It was two things, neither of which I had considered:

\`num\_proc=8\` on a HuggingFace dataset op. On Linux that forks. **On Windows there is no fork**, so Python respawns the whole interpreter per worker, per batch.

\`shuffle()\` leaves an indices map behind, so every subsequent read is a random seek into an Arrow file instead of a sequential scan.

```python
ds = ds.filter(lambda r: ...)   # NO num_proc. Not on Windows.
ds = ds.shuffle(seed=SEED)
ds = ds.flatten_indices()       # random seeks -> sequential scan
```

Two lines. **The job went from eleven hours to 78 seconds.** The text pass hit 165,000 rows per second. That is roughly four thousand times faster, achieved by deleting one argument and adding one call.

I had spent the previous hour profiling string formatting.

### 7\. \`SELECT INTO\`, three separate times

```sql
Msg 8111: Cannot define PRIMARY KEY constraint on nullable column
```

\`SELECT … INTO\` discards nullability from the source column **even when the source is \`NOT NULL\`**. Every table you intend to key has to be declared explicitly. I know this. I have known this for twenty years. I did it three times in one project and was surprised on each occasion.

The fix I settled on is to stop using primary keys for things that are only ever unique lookups:

```sql
CREATE UNIQUE CLUSTERED INDEX ix_speaker_party
    ON dbo.speaker_party (speaker_name);
```

### 8\. The leaderboard that was measuring itself

This one is the most instructive, so I will give it room.

I wanted to find MPs who sound more like the other side than their own. Score each member against a random sample of 400 Conservative and 400 Labour speeches, subtract, sort.

The output was perfect. All thirty at the top were Labour. All thirty at the bottom were Conservative. Beautifully clean separation.

Too clean. \`to\_con\` was lower than \`to\_lab\` for **every single speaker in the House, including all the Labour ones.**

There were 851,967 Conservative speeches in the corpus and 553,250 Labour ones, and the Conservatives spent more of the period in government, which means more subjects covered. The Conservative reference sample is simply **topically broader**, so everybody sits marginally nearer it. My score was \`to\_con — to\_lab\`, which therefore flips sign purely on party membership. I had not produced sixty findings about individual MPs. I had produced one property of my own sample, printed twice, in opposite orders.

The fix is to stop comparing against zero and start comparing against your own colleagues:

```sql
/*  z = how far this MP's gap sits from their OWN party's mean,
    in party standard deviations. Sign flipped for Labour so a
    high score means the same thing on both sides: further from
    my own lot than my colleagues are.                         */
WITH stats AS (
    SELECT own_party, m = AVG(to_con - to_lab),
                      sd = STDEV(to_con - to_lab)
    FROM #gap GROUP BY own_party
)
SELECT g.speaker_name, g.own_party,
       off_message_sd =
         CASE WHEN g.own_party = 'Conservative' THEN 1 ELSE -1 END
         * ((g.to_con - g.to_lab) - st.m) / NULLIF(st.sd, 0)
FROM #gap g JOIN stats st ON st.own_party = g.own_party
ORDER BY off_message_sd DESC;
```

If your results are suspiciously tidy, you are probably measuring your instrument.

### What I found while failing at the thing I meant to do

Once the brackets were fixed, the reaction markers turned out to be real and plentiful: \`\[Interruption.\]\` in 39,163 speeches, “Interruption” in any form in 47,030, “Laughter” in 8,833. There is a genuine record of how the Commons behaves, sitting in the text, and as far as I can tell nobody has counted it.

**Office does not protect you. It makes you a target.**

```sql
SELECT role, speeches = COUNT(*),
       pct_laughter  = CAST(100.0 * SUM(laughter)  / COUNT(*) AS DECIMAL(6,3)),
       pct_interrupt = CAST(100.0 * SUM(interrupt) / COUNT(*) AS DECIMAL(6,3))
FROM #reaction GROUP BY role;
```

```
| Role       | Speeches  | Laughed at | Interrupted |
| ---------- | --------- | ---------- | ----------- |
| Backbencher| 1,565,532 | 0.530%     | 2.738%      |
| Minister   | 47,537    | 0.684%     | 4.222%      |
```

A minister at the despatch box is interrupted **54% more often** than a backbencher, and laughed at 29% more. I had assumed the dignity of office bought a bit of quiet. It buys the opposite. The red box is a target, not a shield.

### The House has stopped giving way

This is the one I would lead with if I were a journalist.

“Will the hon. Gentleman give way?” is the Commons’ interrupt protocol — the formal, courteous mechanism by which one member takes the floor from another mid-speech. It is the single most recognisable thing about British parliamentary debate.

```
| Decade | Interrupted | Gave way | Laughter | "Hear, hear" |
| ------ | ----------- | -------- | -------- | ------------ |
| 1979   | 1.315%      | 1.270%   | 0.316%   | 0.136%       |
| 1980s  | 2.692%      | 1.734%   | 0.385%   | 0.152%       |
| 1990s  | 2.867%      | 1.801%   | 0.784%   | 0.175%       |
| 2000s  | 3.342%      | 1.189%   | 0.619%   | 0.105%       |
| 2010s  | 2.667%      | 0.919%   | 0.447%   | 0.091%       |
| 2020s  | 1.851%      | 0.362%   | 0.367%   | 0.079%       |
```

Giving way peaked at 1.80% of speeches in the 1990s and now runs at 0.36%. **A five-fold collapse.**

The obvious explanation is the pandemic — you cannot intervene on somebody appearing by video link. But look at the 2010s: already at 0.919%, half the 1990s rate, years before anyone had heard of hybrid proceedings. Covid finished it off. It did not start it.

“Hear, hear” has halved over the same period. Interruption, meanwhile, peaked in the 2000s and is still running at roughly the 1980s rate.

So the picture is a chamber that still gets shouted at but has stopped \*negotiating\* interruption. The formal exchange is dying while the informal noise carries on. Speeches written for the clip rather than the room, by people who have no intention of letting anyone in.

### Being interrupted is a measure of importance

I built the “most interrupted MPs” leaderboard expecting to find the chamber’s most irritating people. Here is the top of it:

```
| Member          | Party        | Speeches | Interrupted |
| --------------- | ------------ | -------- | ----------- |
| Neil Kinnock    | Labour       | 226      | 12.83%      |
| Ian Blackford   | SNP          | 1,125    | 12.53%      |
| Peter Dowd      | Labour       | 415      | 10.84%      |
| Rhodes Boyson   | Conservative | 222      | 10.36%      |
| Edward Miliband | Labour       | 1,822    | 9.88%       |
| George Osborne  | Conservative | 3,319    | 9.34%       |
| Tony Blair      | Labour       | 2,233    | 9.05%       |
| Keir Starmer    | Labour       | 984      | 8.54%       |
| Jeremy Corbyn   | Independent  | 2,646    | 8.31%       |
| Tony Benn       | Labour       | 569      | 8.26%       |
```

That is not an irritation ranking. It is a prominence ranking. Leaders of the opposition, chancellors, prime ministers, the people at the despatch box in prime time with the whole other side watching. **Being interrupted a lot means you were worth interrupting.**

Which, if you are an MP reading this, is probably the nicest thing a database has ever said about you.

### Tony Blair does not sound like a Labour MP

Remember the broken leaderboard from the last section, the one where all the Labour members were at one end and all the Conservatives at the other, because I was measuring my own reference sample. Here is what came out once I centred it properly.

First, the thing the artefact was hiding:

```
| Own party    | MPs   | Mean gap | SD      |
| ------------ | ----- | -------- | ------- |
| Labour       | 1,001 | +0.00522 | 0.00204 |
| Conservative | 1,226 | +0.00345 | 0.00203 |
```

The two parties **are** separated by 0.87 standard deviations, which in any other field would be called a decent medium effect. An embedding model that has never been told what a political party is can tell Labour from Conservative purely from how they talk.

But the global offset I was accidentally measuring was +0.00425, which is **two and a half times larger than the real party difference.** The signal was there the whole time. It was buried under an artefact of my own sampling, and the broken version of the query was reporting the artefact with complete confidence and perfect internal consistency.

That is the lesson of this entire project in one table.

And now the fun part. The corrected list of MPs who sound ***less*** like their own side than their colleagues do:

```
| Member          | Party         | Off message (SD) |
| --------------- | ------------- | ---------------- |
| Hywel Francis   | Labour        | 4.07             |
| Ann Keen        | Labour        | 3.97             |
| Patricia Hewitt | Labour        | 2.60             |
| Dr. Liam Fox    | Conservative  | 2.41             |
| Tony Blair      | Labour        | 2.32             |
| David Willetts  | Conservative  | 2.32             |
| Eric Forth      | Conservative  | 2.33             |
| Theresa May     | Conservative  | 2.15             |
```

**Tony Blair, 2.32 standard deviations off message.** The most famously triangulating Labour leader in modern British history, identified as sounding less like Labour than his own backbenchers, by a method that has never heard of triangulation, New Labour, or the Third Way. It just noticed that the subjects he talked about and the way he framed them sat closer to the other lot than his colleagues’ did.

Patricia Hewitt came to Parliament from the IPPR and ran Trade and Industry. David Willetts is the Conservative who wrote a book arguing that his own generation had robbed the next one. Eric Forth spent his career being a nuisance to his own whips. The list is not random.

### The other end is a cohort, not a character trait

The most ***on message*** MPs in forty years of Hansard:

Alan Mak. Nigel Huddleston. Amanda Solloway. Ben Howlett. Andy Carter. Mims Davies. Richard Holden. Greg Smith. Anthony Mangnall. Julia Lopez. Andrea Jenkyns. Wendy Morton. Craig Tracey. Amanda Milling. Edward Argar.

That is not a list of unusually loyal individuals. **That is the 2015, 2017 and 2019 Conservative intakes, almost without exception.** The handful of non-Conservatives who break it up — Frank Allaun, Michael Meacher, Roy Hattersley, Margaret Beckett — are old Labour’s most doctrinally reliable voices, which is its own kind of confirmation.

So the measure is tracking *when you arrived*, not what you are like.

There are two explanations and they make identical predictions. Either message discipline has genuinely professionalised and recent intakes really do sound more alike — which would be a finding worth having — or it is a sampling artefact, because thirty speeches from a four-year career cover a far narrower range of subjects than thirty from a thirty-year one.

Might do more of this digging in the next article.

### Where is Margaret Thatcher?

I went looking for her about halfway through, expecting her to be everywhere. I could not find her, which turned out to be the answer.

She appears **once** in everything I ran — second place in the broken crossover leaderboard, the one that was measuring my own sampling. Fix the query and she vanishes entirely. Not in the most interrupted. Not in the funniest. Not in the most repetitive. The dominant parliamentary figure of the period, absent from every list.

Then I looked at the coiner table again:

```
| Coiner                 | Party        | Phrases   |
| ---------------------- | ------------ | --------- |
| Unknown                | —            | 18,422    |
| The Prime Minister     | Conservative | 6,149     |
| Mr. Clarke             | Conservative | 3,175     |
```

Second biggest coiner in four decades of Hansard, and it is not a person. It is a **job**.

The official report records who was speaking *as what*. When the Prime Minister answers at the despatch box, Hansard writes “The Prime Minister”, and for most of the 1980s it does not bother adding the name in brackets. Later convention does — you get \`The Prime Minister (Mr. Tony Blair)\` — but Thatcher largely predates that.

So eleven years of the most consequential speaker in modern British politics are filed under a job title, and every analysis in this article that groups by \`speaker\_name\` has been quietly ignoring her. So, I would bet, has every other analysis anyone has published on this dataset, because the omission is completely invisible unless somebody asks you a question you cannot answer.

One \`CASE\` expression on the date fixes it, and opens a question nobody has been able to put to the record: **which Prime Minister did the House shout at most?**

```sql
holder = CASE
    WHEN speech_date < '1990-11-28' THEN 'Thatcher'
    WHEN speech_date < '1997-05-02' THEN 'Major'
    WHEN speech_date < '2007-06-27' THEN 'Blair'
    WHEN speech_date < '2010-05-11' THEN 'Brown'
    WHEN speech_date < '2016-07-13' THEN 'Cameron'
    WHEN speech_date < '2019-07-24' THEN 'May'
    ELSE 'Johnson' END
```

So I ran it.

### Nine Margaret Thatchers, one of them male

First, the names. Here is every form the official report uses for the same woman:

```
The Prime Minister (Mrs. Marga...     372
Mrs. Thatcher                          32
Mrs. Margaret Thatcher                  3
The]'rime Minister (Mrs. Marga...       1
The. Prime Minister (Mrs. Marg...       1
The Prime Minister (Mr. Margar...       1     <--
The Prime Minister Mrs. Margar...       1
The Prime Minister (Mrs Margar...       1
The Prime Minister, (Mrs. Marg...       1
```

Nine spellings, most of them differing by a stray apostrophe, a misplaced full stop or a missing bracket. And on **16 January 1986**, the official report of the United Kingdom Parliament recorded the Prime Minister as **Mr.** Margaret Thatcher.

That typo has been sitting in the public record for forty years. I found it at eleven o’clock at night because I went looking for a woman who was not where she should have been.

### Twenty-four times a job title, once a person

Across 1979 to 2001 there are roughly **18,046** speeches filed under the bare string “The Prime Minister”, against **410** under any version of Thatcher’s own name.

And it is not a convention peculiar to her. The bare form runs at 700 to 900 a year straight through Major and into Blair — and then **stops dead in 2001**, after which Hansard records prime ministers by name like everybody else. So any comparison between prime ministers using this data covers 1979 to 2001 only, and Blair’s share of it is his first term.

I am spelling that out because it is exactly the sort of caveat that gets dropped when a number is interesting.

### Nobody laughed at Margaret Thatcher

```
| Prime Minister    | Speeches | Interrupted | Laughter   | Avg words |
| ----------------- | -------- | ----------- | ---------- | --------- |
| Blair (1997–2001) | 3,547    | 7.75%       | 1.015%     | 147.1     |
| Thatcher          | 9,782    | 6.35%       | 0.174%     | 104.2     |
| Major             | 5,303    | 5.98%       | 0.811%     | 120.8     |
```

Raw, she draws a fifth of Blair’s laughter. But the House laughed more in the 1990s than the 1980s generally, so against the decade baselines:

\- **Thatcher: 0.45× her era’s laughter rate**

\- Major: 1.03×. Exactly average.

\- **Blair: 1.29× his**

Even after correcting for the period, the Commons laughed at Thatcher **less than half as much** as it laughed at everyone else at the time — while interrupting her more than it interrupted Major. Shouted at, not laughed at. And she said it in short bursts: 104 words a speech against Blair’s 147.

I have no idea whether that is a fact about her or a fact about the House, and I am not sure the distinction survives contact with eleven years of her being Prime Minister.

### The order paper

There is a story that belongs here, and it is my favourite thing anybody has ever written about her.

Christopher Hitchens — a man of the left who had been publicly and expensively rude about her in print — met Thatcher at a reception in the late seventies, when she was still Leader of the Opposition. They got into an argument about Rhodesia. He lost it. Having lost it, he bowed to her.

She told him that was not low enough. He bowed again, properly this time. And as she swept past she caught him across the backside with a rolled-up parliamentary order paper and said, **”Naughty boy.”**

Hitchens then wrote, in print, about the frankly confusing effect this had on him. Which, for a man of his politics, took a kind of nerve that I am not sure I would have managed.

I mention it because of what happens when you put it next to the number above. The House laughed at her less than half as much as it laughed at anybody else of her era — and the most quoted personal anecdote about her is one where she makes a hostile left-wing journalist look ridiculous, physically, with a procedural document, in under ten seconds.

Those two facts are the same fact.

And there is a pleasing loop in it for this project: the argument Hitchens lost was about Rhodesia, the Lancaster House conference ran from September to December 1979, and the corpus starts in May. So whatever she said to him at that party, I can go and read what she was telling the House about it the same autumn.

The very first row of the very first query I ran in this entire project — the broken one, the one that was measuring my own sampling — was Frank Dobson, 25 July 1979, in a debate headed \`SOUTHERN AFRICA\`.

### And then the best row in the project

```
at the end of the transition
  132 uses  ·  burstiness 0.697
  coined 1979-06-26, EUROPEAN COMMUNITY COUNCIL (STRASBOURG)
  last used by Robert Courts (Con), 41.7 years later
```

Margaret Thatcher said **”at the end of the transition”** in June 1979, about Britain’s transitional arrangements on **joining** the European Community.

The same five words, forty-one years and eight months later, about Britain **leaving** it.

The burstiness of 0.697 means seven in ten of its 132 uses fall inside a single year, and that year is 2020. The phrase sat nearly dormant for four decades and then detonated.

She is not alone in the pattern. *”we will get a good deal”* — 1984, picked up in 2019. *”the principles of democracy and…”* — the Falklands, 1982, picked up in 2019. *”left to us by the labour…”* — 1982, picked up by Theresa May in 2019. Her European vocabulary came back thirty-five years later in the mouths of people making the opposite argument.

The left-censoring caveat applies — she spoke early, so she collects first-mover credit on anything already in circulation. But that one is hers, the dates are in the record, and you can go and check it.

I spent a month trying to measure whether MPs change each other’s minds, and the most interesting thing the whole apparatus produced was a five-word phrase that outlived the argument it was coined for, turned round, and came back pointing the other way.

### The best test in the project came from an idle thought

Somewhere around the fourth failed query I stopped building things and thought about the problem instead, and the question that came out of that is better shaped than anything the apparatus produced.

In the News at Ten era, a minister needed **one line**. One crafted sentence that would survive the cut and go out at ten o’clock. So you would expect them to find that line and repeat it. In a rolling news cycle you need constant fresh material instead, so repetition should fall.

And there is a dated event sitting in the middle of this corpus to test it against. **Television cameras entered the House of Commons in November 1989**. Radio had been there since 1978, but the chamber was not filmed until then — ten years into a forty-two year dataset.

That sets up the only within-subject design in this entire project. Take every MP with at least fifteen substantive speeches on **each** side of November 1989–790 of them — and measure each one’s self-similarity against themselves, before and after. Same people. Same metric. One event in between.

```
| Era     | MPs | Pairs  | Self-distance |
| ------- | --- | ------ | ------------- |
| Pre-TV  | 790 | 86,537 | 0.2600        |
| Post-TV | 790 | 86,766 | 0.2623        |
```

MPs became *marginally more varied* after the cameras arrived — the opposite direction to the prediction, and by an amount that looks small.

For scale: individual MPs in this corpus run from 0.2006 (Ralph Howell, the most repetitive man in forty years of Hansard) to 0.3398. That is a spread of 0.139, and the camera effect is 1.6% of it.

I could have published that as “no meaningful effect” and moved on, and it would have been true. Instead I did the thing I have spent this whole article telling you to do, and ran a placebo.

### The placebo, which was the point all along

Same test, same code, break date moved to a year with nothing behind it. If an arbitrary Tuesday produces the same gap, the cameras are irrelevant.

```
| Break date              | Pre-window length | Pre    | Post   | Gap         |
| ----------------------- | ----------------- | ------ | ------ | ----------- |
| 1984 — nothing happened | 5 years           | 0.2544 | 0.2618 | +0.0074     |
| 1989 — the cameras      | 10.5 years        | 0.2600 | 0.2623 | +0.0023     |
| 1994 — nothing happened | 15 years          | 0.2622 | 0.2628 | +0.0006     |
```

**A meaningless date produced three times the effect of the real one.**

And then the actual answer, which is sitting in the pre-window column if you read it downwards:

\- 5-year window → 0.2544

\- 10.5-year window → 0.2600

\- 15-year window → 0.2622

Monotonic. Self-distance rises **with the length of time you watch somebody**, and then flattens off. Which is obvious the moment you see it — observe an MP for five years and you catch them on fewer subjects than if you observe them for fifteen. All three post-TV figures cluster around 0.262 because every one of them is a long window sitting on the flat part of that curve, and the gap shrinks to nothing at 1994 precisely because that is where the two windows are closest to equal length.

There was no camera effect. There was no career-drift effect either. **I had measured how long I was looking.**

This is my favourite result in the article, and it is a null that nearly got away.

Every other test here compared different people to different people, which leaves all of them exposed to the thing that wrecked the crossover leaderboard — a property of the groups masquerading as a property of the members. This one compared 790 individuals to *themselves*, either side of a dated event. Best design in the project, large sample, clean execution.

And it still produced a number that meant nothing, and I would have believed it if I had not spent twenty minutes testing a date on which nothing happened.

That is the whole lesson. Not “check your work” — everybody says that and nobody means it. **Run your analysis against a thing you know to be nothing, and see what it tells you**. If it tells you something, your method is generating findings out of its own shape, and every result you have is suspect including the ones you like.

Mine was. Twice before this, and I only caught those by accident.

### The honest numbers

The index works. 1,700,647 speeches, 41,730 clusters, 64 partitions, and a signature table of **87.9 MB** standing in for 2.6 GB of raw vectors.

Recall at 10 against brute-force ground truth: **0.920**. Bytes read: **681× fewer** than the full scan.

That 681× is the number I would put on a slide. It is also the number I want to pull apart, because the breakdown is more useful than the headline and nobody ever publishes it.

```
| Where the saving comes from               | Factor  |
| ----------------------------------------- | ------- |
| Binary quantisation (1,536 bytes → 48)    | 32×     |
| Columnstore compression on the signatures | \~12×   |
| Rowgroup and partition elimination        | 1.8×    |
```

The clever bit — the ordered columnstore, the super-cluster renumbering, the partition scheme, the thing I spent most of the project on — contributes **1.8×.** The boring bit, throwing away everything except the sign of each dimension, contributes 32×.

I am telling you this because the industry does not. Every vector index post you will read quotes an aggregate speedup and lets you assume it came from the architecture. Usually it came from the quantisation, which you could have had in an afternoon.

### The experiment where I made it worse

I thought 64 partitions was too coarse, so I rebuilt at 512. More partitions, tighter elimination, fewer rows read. Obviously better.

Rows read fell from 845,000 to 351,000 — a 2.4× improvement, exactly as predicted.

LOB reads went **up**, from 968 to 1,048.

Small rowgroups carry fixed per-segment overhead. I had created four times as many segments, each one too small to amortise its own dictionary and header. I read fewer rows and more bytes. The query plan looked better and the disk worked harder.

I reverted to 64 and wrote it on a sticky note: **measure bytes, not rows**. The row count is what the plan shows you. The byte count is what you pay for.

### Why none of this works in a vector database

Here is the constraint that started the whole design, and it is the sort of thing you only find by trying.

**SQL Server 2025 will not let you put a columnstore index on a table carrying a vector index, or a vector index on a table with a columnstore.** They are mutually exclusive. You get fast vector search, or you get the compression and batch-mode scan, and you do not get both on the same table.

My first reaction was that this was a product gap. My second, after a day of being annoyed once again with a feature that should be there but isn’t (I have met the people at Microsoft developing SQL Server and Microsoft Research and I can honestly say there wasn’t a better, more dedicated group of people I have worked with so if something isn’t in the product there is a good reason for it — having said that they have all mostly left so who knows what teasm is developing it these days ? ), was that it forced the only interesting architecture in the project.

Because I could not have both, I had to split them. The full-precision vectors live in one table with a vector index for the exact work. The 48-byte signatures live in a *separate* table, ordered and partitioned by cluster id, with a columnstore. The search is a funnel: scan the cheap table with integer arithmetic to get a few hundred candidates, then do exact \`VECTOR\_DISTANCE\` on only those.

```sql
/*  Stage 1: the cheap table. Integer XOR + POPCNT, batch mode,
    one partition. Narrows 1.7 million to 500.
    Stage 2: exact cosine on 500 rows. Costs nothing.         */
WITH candidates AS (
    SELECT TOP 500 s.speech_id,
           h = BIT_COUNT(s.sig0 ^ @p0) + BIT_COUNT(s.sig1 ^ @p1)
             + BIT_COUNT(s.sig2 ^ @p2) + BIT_COUNT(s.sig3 ^ @p3)
             + BIT_COUNT(s.sig4 ^ @p4) + BIT_COUNT(s.sig5 ^ @p5)
    FROM dbo.speech_sig s
    WHERE s.cluster_id IN (SELECT cluster_id FROM @probe)
    ORDER BY h
)
SELECT TOP 10 c.speech_id, r.speaker_name, r.party, r.speech_date,
       d = VECTOR_DISTANCE('cosine', v.embedding, @query)
FROM candidates c
JOIN dbo.speech_vec  v ON v.speech_id = c.speech_id
JOIN dbo.speech_role r ON r.speech_id = c.speech_id
WHERE r.party = 'Labour' AND r.role = 'minister'   -- try this in Pinecone
ORDER BY d;
```

Look at that \`WHERE\` clause on the last line, because it is the argument for the whole approach.

A dedicated vector database gives you an approximate nearest-neighbour search and, if you are lucky, metadata filtering that was bolted on afterwards and falls over when the filter is selective. What it does not give you is the ability to say “nearest neighbours, but only Labour ministers, joined to the division lists, grouped by decade, with a window function over the result” — and have the optimiser work out that it should apply the party filter first.

I did not want a vector database. I wanted a **database**, that happens to do vectors, so that the interesting half of every question — who, when, which side, how often — is a join rather than a second system.

The restriction I resented for a day turned out to be the design.

---

### And then I went looking for Tony Benn

I had the index built, the pipeline run, two negative results written up and the article mostly drafted. And then I went back to a question I had been carrying around since before any of this started, for no better reason than that I have always admired the man: **what does the data say about Tony Benn?**

First problem: nothing, because he was split across three names. The leaderboards had “Mr. Tony Benn” at 569 speeches. Resolve the forms properly and he is at **4,814 speeches, 1.4 million words, roughly 180 hours at the despatch box**. The interruption rate I had already put in a table was drawn from a tenth of him.

So I tested the reputation properly.

```
|              | Benn   | The House, 1979–2001 |
| ------------ | ------ | -------------------- |
| Interrupted  | 2.825% | 2.664%               |
| Laughed at   | 0.457% | 0.571%               |
| "Hear, hear" | 0.125% | 0.151%               |
| Gave way     | 2.804% | 1.652%               |
```

Interrupted at almost exactly the House average. Laughed at rather less. And **he gave way seventy per cent more often than anybody else** — far and away the largest deviation in the table.

That is the reputation, and it does not show up as being shouted at. It shows up as letting people in. In a chamber that spent thirty years quietly abandoning the practice, he did more of it than almost anyone.

I had also predicted he would be a broken record — the man with four themes and forty years. Wrong. Self-distance 0.2695 against a Labour average of 0.2684. Completely ordinary range.

### The five questions

Benn’s five questions are the most famous formulation any backbencher produced in the period. He put them to the House repeatedly across eleven years:

*”What power have you got? Where did you get it from? In whose interests do you exercise it? To whom are you accountable? And how can we get rid of you?”*

So I searched for them, mostly as a sanity check on the pipeline. Easiest possible case. I knew the answer in advance.

They are in the corpus. And so is this:

```
Lee Rowley (CONSERVATIVE), 14 October 2019, DEBATE ON THE ADDRESS

  "What power have you got? Where did you get it from? In whose
   interests do you exercise it? To whom are you accountable?
   And how can we get rid of you?"

   - [Official Report, 22 March 2001; Vol. 365, c. 510.]

  "I hope we remember that in the days ahead."
```

A Conservative MP. In the Queen’s Speech debate. At the height of the Brexit crisis. Reading a hard-left Labour backbencher’s words into the record with the column reference, citing a speech Benn gave eighteen years earlier on the election of a Speaker. Rowley sits for North East Derbyshire, which wraps around Benn’s Chesterfield.

He is not alone. Clive Lewis used the full structure against academy trusts in 2015 — not quoting it, **wielding** it. Toby Perkins, the sitting member for Chesterfield, read them out on 20 March 2014, six days after Benn died.

**That is a formulation coined on the opposition benches, crossing the floor, and arriving in the mouth of a government MP eighteen years later.**

It is precisely, exactly the thing I built a GPU index to find. The index failed to find it twice. I found it by typing a man’s name into a search box because I admired him.

### Why 375 million six-grams could not see it

This is the part that should worry anyone doing this kind of work. Here is how Benn opened the questions on each occasion:

```
| Year | Opening                                                   |
| ---- | --------------------------------------------------------- |
| 1990 | "What power have you got? Where did you get it?"          |
| 1991 | "What power do you have? Where did you get it?"           |
| 1998 | "what power do you have; where did you get it"            |
| 2001 | "What power have you got? Where did you get it from?"     |
```

**He never said it the same way twice.** Not once in eleven years.

A six-gram hash requires an exact match. Every variant appears once or twice, below my floor of four, so each was discarded as noise before it ever reached the burstiness filter. The single most quotable thing anybody said in that chamber in forty years was invisible to a method that processed 375,802,591 six-word sequences on a graphics card.

And that explains the junk. It explains all of it.

**The only language said identically enough to survive exact n-gram counting is language nobody is choosing their words for.** Statutory instrument boilerplate. Petitions read verbatim. Procedural furniture. My candidate list was two-thirds rubbish not because my filters were weak, but because furniture is the only thing that holds still long enough to be counted.

Real rhetoric mutates. That is what makes it rhetoric. My method was, by construction, a detector for the absence of rhetoric, and I ran it for forty minutes on a 5090 to discover that.

### Footpaths

One last thing from the Benn data, because it is the funniest result in the project and it is also, I think, the truest.

His most distinctive vocabulary, measured against the House:

```
footpath   177x    stockport   399 uses    promoters  265 uses
tameside   170x    footpaths   225 uses    carry-over  86 uses
walkers     99x    ramblers     93 uses    prerogative 164 uses
```

**Stockport, 399 times. Footpaths, 225. Ramblers, 93.**

The man remembered for the royal prerogative and the sovereignty of Parliament spent an enormous share of his career on Private Bills — Stockport Corporation, Tameside, Felixstowe Dock, Milford Haven, Pembrokeshire — objecting, forcing divisions, grinding through “promoters” and “carry-over” motions about rights of way in Greater Manchester.

Because that is where the constitutional principle actually bit. The grand questions about power got asked in committee rooms, about footpaths.

His nearest neighbours in vector space are not the Labour left. They are Hugh D. Brown, Cowans, Barry Porter, Eleanor Laing — obscure procedural specialists of both parties. The other people who spent their lives on Private Bills. The embeddings cannot see what anybody believed, but they put him in exactly the right room.

### What I would tell you before you try this

**Read the rows before you build the index.** I spent nine days building a very fast way to get a wrong answer. Six printed speeches would have told me on day one that embeddings cannot see stance. Print the data. Print it early. Print it when you think you already know what it says.

**Always build the control arm.** “2.23% of opposition coinages reach a minister” is a finding, a headline, and a plausible story about the health of parliamentary democracy. Next to 3.83% for the government side, it is the opposite story. The comparison is not a nice-to-have, it is the entire analysis. If you cannot think of a control, you do not yet have a question.

**Then run it against a date on which nothing happened.** This is the control arm’s harder older brother and it is the single most useful thing in this article. Take your analysis, point it at something you know to be meaningless, and look at what comes back. When I tested whether television changed how MPs speak, the real date gave me a result — and an arbitrary year five years earlier gave me *three times* as much of it. The method was manufacturing findings out of its own shape, and nothing short of a placebo would have shown me that. If a nothing produces a something, every result you own is suspect, including the ones you are fond of.

**Measure bytes, not rows.** The query plan shows you rows because rows are easy to count. You pay in bytes.

**Suspiciously tidy output is a bug.** Clean separation, round numbers, every member of one group above every member of another — that is almost never nature. It is usually your instrument.

**If your metric has an edge, somebody is standing on it.** Theresa May did not fail to influence anyone. The data stopped.

**Check what your string functions actually mean.** \`LIKE\` is a pattern language, not a search. Thirty years in and a square bracket still had me.

**On Windows, \`num\_proc\` is a trap.** No fork means respawning the interpreter. The default is almost always faster.

**Get the whole thing into the database before you get clever.** Every analysis in this article is a join away from speaker, party, date and office. That is only true because loading it properly was the first thing I did and not the last.

### The code

All of it — the loader, the GPU clustering, the renumbering, the partition scheme, the phrase pipeline, and every query in this article including the broken versions will be here:

*(link to follow)*

I have left the bugs in, in their own files, with comments explaining what each one did. The square bracket one especially. If you are going to learn anything from this it will be from those rather than from the version that works.

You will need SQL Server 2025 for \`VECTOR\_DISTANCE\`, SQL Server 2022 or later for \`BIT\_COUNT\`, and a CUDA card for the clustering. It does not have to be a 5090. It just has to not be a CPU.

---

### One last thing

I set out to prove that parliamentary debate changes minds.

The embeddings said no, because they cannot see stance. The phrases said no, and then it turned out they could only ever have said no, because exact six-grams detect the absence of rhetoric rather than its presence. The one experiment with a decent design — the same 790 MPs, before and after the cameras — said no, and the placebo proved that even that no was a measurement of my own window length.

Three methods. Four hundred lines of SQL. Three hundred and seventy-five million six-word sequences. Two graphics cards that are somehow worth more than I paid for them. All of it, no.

And then I went looking for Tony Benn, because I admire the man and always have, and a Conservative MP turned out to have read his five questions into the Queen’s Speech debate of 2019 with the Hansard column reference attached.

I want to be careful about the moral here, because the obvious one is wrong. The obvious one is “the computer failed and a human succeeded”, and that is not what happened. Nobody reads 1.7 million speeches. The reason I could check Benn’s five questions in about ninety seconds, resolve him across three name forms, measure his giving-way rate against the whole House and find his nearest neighbours in vector space, is that a month of GPU work and columnstore design had already put the corpus in a state where a question like that costs nothing to ask.

The index did not find the answer. The index made the answer **cheap to look for**, so that an idle question cost nothing and I went ahead and asked it. Those are different jobs, and I had quietly assumed they were the same one.

So here is what I actually learned, and it is not about Parliament.

Build the thing properly. Load it all, index it where needed, join it to everything you know about who said it and when. Then stop expecting the apparatus to produce the question. It will not. It will sit there, extremely fast, waiting. The question comes from somewhere else entirely — in my case from a man I have admired since long before I owned a graphics card.

The graphics cards are still worth more than I paid for them. Thirty years of hardware, and the only appreciating asset I have ever owned spent a fortnight sorting 1.7 million speeches into neighbourhoods so that one evening in October I could put an idle question to it about a politician I admire and have the answer inside a minute.

That is a fair trade. And nobody on the News at Ten would have had the faintest idea what I was talking about, which Brian, in fairness, worked out on his first afternoon.

![Brian — My sounding board](https://cdn-images-1.medium.com/max/1400/1*kEiyAaam9iF0qsU1612NLA.jpeg)
*Brian — My sounding board*

If you enjoyed what must have been an ordeal but hopefully you got this far please give it as many claps as you would if you were in the House of Commons.
