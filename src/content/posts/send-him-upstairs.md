---
title: "Send Him Upstairs"
subtitle: ""
date: 2026-10-30T00:43:42.000Z
cover: "/images/medium/1_NZbSRccxPV4xt_qPyGyvcQ.png"
tags: ["Politics", "Data Science", "Data Analysis", "SQL", "Government"]
mediumUrl: "https://medium.com/@trevor.dwyer/send-him-upstairs-e961affc1306"
draft: false
---

![Lords are Leaping… Oh Come On Its Not a Bad Pun](/images/medium/1_NZbSRccxPV4xt_qPyGyvcQ.png)
*Lords are Leaping… Oh Come On Its Not a Bad Pun*

## The question

The **Yes Minister** joke is that when a minister becomes an embarrassment, they send him upstairs. He leaves the Commons and reappears in ermine, and everybody is spared.

My last two pieces were about the House of Commons, and both ran into the same wall. **Odell’s Hansard Speeches 1979–2021**, the dataset behind them, covers the Commons only. You can count every time the Speaker told an MP to sit down. What you can’t do is follow that MP through the door at the end of the corridor and see what happens next.

So this one is about building the other half, and then joining the two. Every interesting result in the short version depends on knowing that the John Prescott who spoke 4,701 times in the Commons is the same person as the Lord Prescott who spoke 120 times in the Lords. Getting that right turned out to be most of the work, and getting it wrong is what sank a previous project of mine. I’ll come to that.

### Why the Lords is easier than the Commons, and also harder

It’s easier because the data is better. TheyWorkForYou, run by the volunteers at mySociety, has published a structured XML file for every sitting day of the Lords since 1999. Each speech has a stable identifier, a speaker identifier, and its position in the day. The divisions (the votes) are in the same file, with every peer’s vote and their identifier attached. In the Commons, I had to rebuild the order of speeches from scratch. In the Lords, the order is just the order of the file.

It’s harder because the Lords doesn’t behave like the Commons, so the tools from **Order! Order!** don’t transfer:

***There’s no Speaker calling “Order!”.*** The Lord Speaker presides, but the House polices itself, by shouting from the floor. My Commons rebuke detector, built on the Chair’s interventions, has nothing to detect.

***Deputy Speakers appear under their own names.*** In 2010, only four speeches in the whole year were printed as “The Lord Speaker”. Everything else the Chair said is filed as “Baroness Somebody”, indistinguishable from her speaking for herself.

***Grand Committee isn’t in the daily files.*** It’s a second chamber within the chamber, published separately.

And it starts in 1999. The House of Lords Act that year removed most of the hereditary peers, and the electronic record starts within weeks. Anything earlier is on the Millbank historic Hansard site, which would need its own scraper. That’s a job for another month.

---

## What’s in the box

Everything goes into the same SQL Server 2025 database, \`HANSARD\`, under a new schema \`hl\`, so nothing from the earlier articles is touched.

```
| Table             | What it holds                                             | Rows             |
| ----------------- | --------------------------------------------------------- | ---------------- |
| `hl.SourceSpeech` | Every Lords speech, 1999–2026                             | 713,963          |
| `hl.Division`     | Every division, with the totals Hansard printed           | 3,306            |
| `hl.Vote`         | Every peer's vote in every division                       | one per vote     |
| `hl.Person`       | Everyone who sat in either House                          | from people.json |
| `hl.Membership`   | Every seat they held: House, party, dates, how it ended   | from people.json |
| `hl.PersonName`   | Every form of everyone's name (see below)                 | rebuilt each run |
| `hl.CommonsName`  | Odell's Commons speaker name, by year, linked to a person | built in SQL     |
```

The second source is ParlParse’s \`people.json\`, also from mySociety. I had assumed I would need the parliamentary Members API for the details of each peer. I didn’t. \`people.json\` already has peerage type (life, hereditary, bishop, law lord), party with a new row every time they switch, start and end dates, the reason they left (died, retired, resigned, excluded), and every Commons seat the same person ever held. It even carries the Members API identifier, if you want to go further.

The loader is about 450 lines of Python. It downloads the XML (once: it’s 1.6 GB), keeps only the latest version of each day’s file, parses everything, and bulk-loads it. The full load of 4,000 sitting days took one evening.

### The join, and the Florida problem

Here’s the wall.

The README I wrote for the first version of this project said, that Odell’s \`person\_id\` column uses the same ParlParse identifiers as \`people.json\`, so linking the Commons to the Lords would be a single join. I wrote a check query for it, ran it, and got this:

```sql
SELECT TOP (5) DisplayAs, PersonId FROM hc.SourceSpeech WHERE PersonId IS NOT NULL;
 - (0 rows affected)
```

Every one of the 2.7 million rows had an empty person id. The join I had promised was a join against nothing.

That left matching by name, which is where I need to confess something. A while ago (25 years) I worked on something relatable — a piece about the Florida election, joining voter records to other records by name, and the fuzzy matching in it was, lets say, not good enough. It produced matches that looked plausible but combined that with the events that happen meant history was changed forever. I will post that article someday, it is written but I am hesitant to show the data. So this time I wanted to do it properly and measure the difference.

The trouble with names in Hansard is that Odell’s \`DisplayAs\` uses the name an MP was *formally* known by, not the one anybody used. Tony Newton is “Antony Newton”. Paddy Ashdown is “Jeremy Ashdown”. Margaret Beckett appears under her maiden name, Jackson, for her first Parliament. And there are, at various points, several John Smiths.

So the first step generates every plausible form of every person’s name from \`people.json\`:

```python
names.update(f"{f} {fam}" for f in firsts for fam in families)
initials = {w[0] for n in p.get("other_names", [])
 for w in (n.get("additional_name") or "").split()[1:]}
names.update(f"{f} {i}. {fam}" for f in firsts for i in initials for fam in families) # 'John M. Taylor'
names.update(re.sub(r"\b([A-Z])\b(?!\.)", r"\1.", x) for x in list(names)) # 'Brian H' -> 'Brian H.'
```

That’s every given name, every formal additional name, a table of nicknames (Tony/Antony, Tom/Thomas, Jeff/Jeffrey…), every family name they’ve ever had, and middle-initial forms in both the dotted and undotted styles Hansard can’t decide between.

The second step is the one that matters. A name only counts as a match if that person ***held a Commons seat in that year***. The link is made per name, per year, so the two John Smiths split cleanly at the point one leaves and the other arrives. Where two people still fit, the one in the speaker’s party wins. And where that doesn’t settle it, the year is left ***unlinked*** rather than guessed:

```sql
SELECT n.DisplayAs, n.Yr, pn.PersonId,
 PartyFit = MAX(CASE WHEN REPLACE(LOWER(n.Party), N' ', N'-') = m.Party THEN 1 ELSE 0 END)
INTO #cand
FROM #names AS n
JOIN hl.PersonName AS pn ON pn.Name = n.Clean
JOIN hl.Membership AS m
 ON m.PersonId = pn.PersonId AND m.House = 'Commons'
 AND ISNULL(m.StartDate, '1900–01–01') <= n.LastSpoke
 AND ISNULL(m.EndDate, '9999–12–31') >= n.FirstSpoke
GROUP BY n.DisplayAs, n.Yr, pn.PersonId;
```

Then I ran the method I should have used for Florida against the methods I did use, on the same 2.7 million speeches:

```
| Method                      | Linked correctly | Linked wrongly | Couldn't decide | No match |
| --------------------------- | ---------------- | -------------- | --------------- | -------- |
| Naive: first name + surname | 88.0%            | 0.3%           | 5.0%            | 6.7%     |
| Loose: surname only         | 39.1%            | 0.1%           | 60.1%           | 0.7%     |
| Ours: any name form         |                  |                |                 |          |
|  + seat that year           |                  |                |                 |          |
|  + party, refuse if unsure  | 97.8%            | 0.0%           | 0.0%            | 2.2%     |
```

The naive method looks respectable at 88%, and that’s the danger. Its 0.3% wrong includes giving Sir George Young’s 2011 speeches to a George Young who left the Commons in 1874, and John MacGregor’s 1991 speeches to a John Macgregor who sat from 1847 to 1857. Nothing in the output tells you which 0.3% is wrong.

The loose method is the one that feels kind. Surely being forgiving about first names finds more matches? It finds more **candidates**, and then can’t choose between them 60% of the time.

The lesson isn’t about fuzzy string distance at all. Our method doesn’t do any. It’s about having ***a second key that isn’t the name*** (was this person actually an MP that year?) and being willing to output “I don’t know”.

---

## Party lines, and what “rebel” means

To say a peer rebelled, you need a party line, and the Lords doesn’t publish one. So I defined it from the votes: in each division, the party line is however the majority of that party’s peers voted, provided at least five of them voted and they didn’t split exactly evenly. A rebel vote is one cast the other way.

```sql
SELECT DivisionGid, Party, N = COUNT(*),
 Line = CASE WHEN SUM(CASE WHEN Vote = 'content' THEN 1 ELSE 0 END)
 > SUM(CASE WHEN Vote = 'not-content' THEN 1 ELSE 0 END)
 THEN 'content' ELSE 'not-content' END,
 Share = 1.0 * ABS(SUM(CASE WHEN Vote = 'content' THEN 1 ELSE -1 END)) / COUNT(*)
INTO #line
FROM #v WHERE Party IS NOT NULL
GROUP BY DivisionGid, Party
HAVING COUNT(*) >= 5
 AND SUM(CASE WHEN Vote = 'content' THEN 1 ELSE 0 END)
 <> SUM(CASE WHEN Vote = 'not-content' THEN 1 ELSE 0 END);
```

\`Share\` is the cohesion: 1.0 if everyone voted together, 0 if they split down the middle. Crossbenchers and bishops have no whip, so for them cohesion is the only measure that means anything.

A note against myself: in my first draft I described the crossbenchers’ average cohesion of 0.49 as “what you’d see from a coin toss”. It isn’t. If thirty peers each tossed a coin, cohesion would average around 0.15. A cohesion of 0.49 means a typical crossbench vote splits about three to one. That’s what independence looks like: not random, just not whipped. The parties, for comparison, run at 0.96–0.99.

The results:

```
|                                        | Rebellion rate |
| ---------------------------------------| -------------- |
| Labour, Conservative, Lib Dem, overall | 0.7–1.8%       |
| Conservatives in government / out      | 1.81% / 1.07%  |
| Labour in government / out             | 1.32% / 0.66%  |
| Lib Dems in coalition                  | 4.39%          |
```

Party cohesion also tracks the politics. Conservative cohesion fell to 0.77 in 2019. Lib Dem cohesion sagged to 0.87 in 2013–14, the middle of the coalition. Labour’s has been above 0.99 since 2023.

### Do they mellow?

I measured rebellion by how long each peer had sat at the time of the vote. Rebellion rises steadily with tenure, from 0.72% in a peer’s first two years to 1.41% after ten. Former MPs follow a curve of their own: 0.72% at first, a peak of 2.14% in years two to five, then 1.28% after ten. I like to think that dip-then-peak is the moment they realise the whips can’t deselect them any more.

---

## Send him upstairs

The timing question is easy once the join exists. For every former MP who reached the Lords, compare the date their last Commons seat ended with their first Lords membership. Of 215, 63 arrived within three months and 150 within a year.

The *embarrassment* question needs the hypercube from **Order! Order!**. That project flagged every intervention from the Chair by category: telling a member to sit down, to withdraw, or naming them. The trick is attributing each rebuke to the MP who was rebuked, rather than to the Speaker who said it. In the Commons the rebuke comes straight after the offence, so the culprit is the last ordinary member to have spoken before the Chair. In SQL Server 2022 and later, that’s one window function:

```sql
SELECT x.SpeechId, x.Role,
 PersonId = LAG(CASE WHEN x.Role = 'Member' THEN x.PersonId END) IGNORE NULLS
 OVER (PARTITION BY x.SittingDate ORDER BY x.Seq, x.SpeechId)
FROM #x AS x
```

\`IGNORE NULLS\` is what makes it work. The \`CASE\` blanks out everyone who isn’t an ordinary member, and \`LAG … IGNORE NULLS\` skips back over the blanks to the last real person. Before 2022 you would have needed a self-join or a cursor.

Then, for every MP who left the Commons, count their rebukes and check whether they became a peer, within bands of how much they spoke. The bands matter. The most prominent MPs get both more rebukes and more peerages, and without the bands you would just be measuring fame twice:

```
| Commons speeches | Never rebuked | 1–4 rebukes    | 5+ rebukes    |
| ---------------- | ------------- | -------------- | ------------- |
| Under 500        | 4.3% (of 736) | 3.6% (of 112)  | 0.0% (of 2)   |
| 500–2,000        | 13.5% (of 446)| 9.5% (of 304)  | 3.2% (of 31)  |
| Over 2,000       | 22.9% (of 83) | 33.1% (of 157) | 25.5% (of 47) |
```

For the middle band, trouble costs you. For the top band, a little trouble goes with reward, which makes sense once you think about who gets pulled up by the Chair in the top band: front-benchers, at the despatch box, in prime time.

The result splits in two:

**Backbenchers who get rebuked are passed over.** In the middle band, peerage rates fall from 13.5% to 9.5% to 3.2% as rebukes rise.

**Big beasts who get rebuked are rewarded.** Among MPs with more than 2,000 speeches, those rebuked one to four times are a third more likely to reach the Lords than those never rebuked (33.1% against 22.9%). Front-benchers clash at the despatch box, and the Chair pulls them up, but it doesn’t hurt their careers.

So you can say it: a little trouble helps if you’re already important, and hurts if you’re not.

**The single best line:** of the 16 MPs ever named by the Speaker who later left the Commons, exactly one went to the Lords, **Ian Paisley, as Lord Bannside**.

**The most rebuked MP to reach the Lords** is Dale Campbell-Savours, with 52 rebukes, far ahead of Wigley (20), Stratford (18) and Foulkes (14). Thatcher has 6 and Gove 6.

“Resigned or recalled” (13.2%, 53 MPs) is too small a group, and too mixed, to read anything into. It includes people like Cameron, who stood down for ordinary reasons.

Two cautions. First, the “Over 2,000, never rebuked” cell has only 83 people in it, so I wouldn’t lean on the exact percentage. Second, people.json rarely records **why** an MP left. Only 8 of the 215 are flagged as having lost their seat, which can’t be right. The “rewarded for losing” story needs election results, not this field.

---

### The Lords shouts back

The Lords doesn’t have a Commons-style Chair, but Hansard records shouts from the floor, so the same per-1,000-speeches approach works. I attributed each shout to whoever held the floor at the time, and split by how each peer got there:

```
| Route                  | Peers | Speeches | Shouts per 1,000 | Told to wrap up, per 1,000 |
| ---------------------- | ----- | -------- | ---------------- | -------------------------- |
| Bishop                 | 101   | 7,726    | 4.53             | 0.26                       |
| Former MP              | 210   | 78,754   | 9.13             | 0.41                       |
| Hereditary             | 148   | 73,407   | 6.77             | 0.18                       |
| Life peer, never an MP | 1,039 | 478,589  | 7.54             | 0.25                       |
```

That leaves out 2016–18, for a reason worth knowing. Recorded interjections collapse in those years, in **both** Houses at once, from about eight per thousand speeches to under two. When two independent chambers suddenly become polite in the same month, it’s the recording that changed, not the manners.

**Ex-MPs get shouted at 21% more than other life peers, and told “Too long!” 64% more often.** That’s the closest the data gets to “MPs are looked down on”. The Lords tells former MPs, politely, that they’re not in the Commons any more. One caveat: ex-MPs are more often front-benchers speaking in combative debates. A fair check would be to compare front-bench and back-bench speeches separately.

---

## Ermine changes the voice

![The Ermine* Take Revenge — Human Skin Suits By Fasionista Buffalo Bill](/images/medium/1_WureHq1-Rr_X-6SiTroUIQ.jpeg)
*The Ermine\* Take Revenge — Human Skin Suits By Fasionista Buffalo Bill*

An Ermine is a stoat, but no ordinary stoat, its white fur is a symbol of wealth, rank and purity

For everyone with at least 200 speeches in the Commons and 100 in the Lords, I compared their average speech length and the share of their speeches containing a question, Commons against Lords.

Taking the 136 people with at least 100 speeches in each House, and leaving out former Speakers and deputies:

**119 of 136 make longer speeches in the Lords,** with a median of 1.5 times their Commons length.

**Most ask more questions, not fewer:** the median share of speeches that ask a question rises from 44% to 58%. My prediction was wrong. The Lords’ format is the reason: most backbench contributions there are supplementary questions to a minister.

**Ministers are the exception, because they answer rather than ask.** Hanson (4.7%), Goldsmith of Richmond Park (0.9%), Benyon (2.9%) and Cameron (7.0%) all fall.

**Leave the top of the raw list out.** Boothroyd (6.5 times longer), Martin of Springburn, Framlingham and Winterton are former Speakers and deputies. Their “Commons speeches” were mostly “Order”, so the ratio is meaningless. The first real entries are **John MacGregor (5.3 times longer)**, **Estelle Morris (3.5 times)** and **John Prescott (3.0 times)**. Prescott’s question share also rises from 25% to 76%. Even in the Lords, he’s still interrupting.

---

## Stephen Benn: the answer to “has he disgraced the legacy?”

**He voted to abolish his own seat.** The House of Lords (Hereditary Peers) Bill reached seven divisions he took part in, on 2 and 9 July 2025. He voted Not Content on all seven. On a government bill, that means voting against changing it, so each time he backed the bill as drafted, and the bill as drafted removed him. (The 2018–19 divisions in the grid were Lord Grocott’s earlier private member’s bill, before Stephen joined.) The House defeated the government on three of those seven votes: Amendment 2 (280–243), 13A (284–239) and 17 (265–247). He was on the losing, abolitionist side each time.

**He’s more loyal than the average Labour peer.** His rebellion rate is 0.24% over 817 votes, against 0.42% for other Labour peers. He also turns up a lot: 817 votes in five years, against an average of 344 per Labour peer.

**He never trades on his father.** There are no speeches by him mentioning Tony Benn, the Peerage Act or disclaiming. He made no speeches in the debates on the bill that removed him. He voted silently.

**What he does talk about is science.** He has made 455 speeches since July 2021, about 240 words each. His most frequent debates are Horizon Europe (19 speeches), the Advanced Research and Invention Agency, the European Research Council, Framework Programme 10, near-earth satellites, space debris and undersea cables. Tony Benn was Minister of Technology from 1966 to 1970, so the son speaks about the brief the father held.

**The verdict the data supports:** he’s the opposite of a chancer. He inherited a seat his father had fought to escape, used it as a quiet, loyal science backbencher, voted to abolish it, and came back five weeks later as a life peer. The fifth question finally got an answer: you *can* get rid of a hereditary peer, by Act of Parliament, and he voted for it himself. The awkward detail is the life peerage that followed. That’s fair to raise, but it’s a question about the 26 hereditaries who came back, not about him personally.

There’s one more row worth reading in full. On 2 November 2021, in Stephen Benn’s first months, Lord Patten replied to him in the ARIA debate with the line…

> *“I enjoyed it very much, as I enjoyed what his father said a long time back when I was a new Tory MP on the green Benches in the other place, making my maiden speech back in 1979. When I sat down, the then right honourable Tony Benn MP stood up as the next speaker and said all those nice things that you say to a new boy or girl. Very welcome they were, and I thought, “That was very kind”, sat down and thought no more about it until, on the way to the station to go down to the constituency for the weekend, I got a slightly panicky message from my constituency party saying that there was trouble in the party about my maiden speech. I had been a Member of Parliament for only a moment or two and had no idea what I could have said that would have caused any trouble at all until I got off the platform at Oxford station and saw the billboards for the Oxford Times saying, “New Tory Member Makes Maiden Speech Praised by Tony Benn” ”*

My theory and I can’t tell you what was in his head, but given Tony Benn was actually one of the good ones its not out the realm of possibilities his Son will have picked up some of this? and the record fits it.

Here’s my favourite detail: on 11 December 2024, while peers debated the bill to remove the hereditaries, Lord Hacking said Stansgate “has avoided having to speak to the House by taking the chair for one hour as Deputy Chairman”. He spent an hour chairing the debate on his own abolition instead of speaking in it, voted for that abolition seven times, and came back five weeks after it took effect.

That’s either very principled or very clever, and probably both. I hope he gets to read this.

So my reason for a section on Stephen Benn was to point out how someone could adopt the very thing his own father worked so hard to abolish and what on earth made him do that. Now I think I understand.

![Data can change your mind about a person and this really did do that.](/images/medium/1_v4GOleorzX3lmDC7k-G5Ow.png)
*Data can change your mind about a person and this really did do that.*

---

## Sitcoms in Hansard

This is a pattern search across both Houses, built as a small table of patterns joined against every speech with \`LIKE\`. It’s the slowest query in the project, because every speech is checked against every pattern, but it only has to run once.

```sql
INSERT #show VALUES
 (N'Spitting Image', N'%Spitting Image%'),
 (N'Alan B''Stard', N'%B''Stard%'), (N'Alan B''Stard', N'%Bstard%'), (N'Alan B''Stard', N'%B''stard%'),
 (N'Yes Minister', N'%Yes Minister%'), (N'Yes Minister', N'%Sir Humphrey%'), (N'Yes Minister', N'%Jim Hacker%'),
 (N'The Thick of It', N'%Thick of It%'), (N'The Thick of It', N'%Malcolm Tucker%'),
```

There are two mistakes in that list, and they’re both in the result below.

```
| Show                                      | Commons | Lords |
| ------------------------------------------| ------- | ----- |
| Yes Minister (incl. Sir Humphrey, Hacker) | 594     | 345   |
| Monty Python (incl. the dead parrot)      | 153     | 85    |
| Dad's Army                                | 115     | 25    |
| Spitting Image                            | 48      | 5     |
| Only Fools and Horses (Del Boy)           | 47      | 10    |
| Blackadder                                | 42      | 27    |
| Fawlty Towers                             | 38      | 27    |
| Alan B'Stard                              | 10      | 0     |
| House of Cards                            | 7       | 9     |
```

**Yes Minister wins by a distance:** 594 Commons mentions and 345 Lords mentions, which is more than every other show put together. Across both Houses, mentions peaked in 2000, with 44, the first year the Lords data covers and the first full year after the House of Lords Act. Split that year by House before claiming it was peers asking whether Sir Humphrey had written the reform.

**Dennis Skinner is the House’s top sitcom quoter,** with 25 mentions. They’re mostly Monty Python and Only Fools, plus six Spitting Image references, including “the big fat slug on Spitting Image” (6 May 1992). In the Lords, Baroness Smith of Basildon and Lord Marlesford tie on 22 each, almost all Yes Minister.

**Spitting Image** gets 48 Commons mentions, clustered in 1985–96 while it was on air, plus a small revival of 4 in 2020 when it came back. Three to read: Paul Boateng, 9 November 1988 (“A ‘Spitting Image’ show — or a sea…”); Dennis Skinner, 1 November 1989 (“Is that the man whose Spitting Image…”); and Geoffrey Lofthouse from the Chair, 25 June 1996 (“Order. I do not know what ‘Spitting Image’…”). That last one is the Deputy Speaker claiming never to have seen it.

**Alan B’Stard turns up in 10 Commons speeches,** all of them accusations. The first is Dave Nellist on 18 November 1987, weeks after The New Statesman started on ITV. Nellist did it again in 1990, so he’s the B’Stard specialist. Two to read in full:

**David Blunkett, 7 February 2002:** “Why does the hon. Gentleman remind me…”.

**Stephen Crabb asking Tony Blair at PMQs on 22 March 2006, with Blair replying “I am not in a position to comment…”.** March 2006 was the height of the cash-for-peerages affair. If Crabb asked whether B’Stard was in line for a peerage, that’s your scandal-to-ermine link, said out loud in the chamber.

---

## The coded-message test

This used the embeddings from my first article. Each of the 1.7 million Commons speeches is a vector of 384 numbers, stored in SQL Server’s \`VECTOR(384)\` type. The topic clusters the GPU found are stored as centroids.

A speech that carries a hidden message has to be made in a debate about something else, so it should be far, in meaning, from everything around it.

For every debate (same day, same heading and subheading, between 6 and 150 substantive speeches), the query:

1.  finds the debate’s dominant topic cluster
2.  measures each speech’s cosine distance from that cluster’s centroid, and turns it into a z-score within the debate
3.  for the 20,000 most extreme, finds the distance to the *nearest* other speech in the same debate, and compares that with how close a typical speech in that debate is to its own nearest neighbour

```sql
SELECT s.speech_id, s.DebateId,
 Dist = VECTOR_DISTANCE('cosine', v.embedding, c.embedding)
INTO #dist
FROM #sp AS s
JOIN #dom AS d ON d.DebateId = s.DebateId
JOIN dbo.speech_vec AS v ON v.speech_id = s.speech_id
JOIN dbo.centroid AS c ON c.cluster_id = d.cluster_id;
SELECT *, Z = (Dist - AVG(Dist) OVER (PARTITION BY DebateId))
 / NULLIF(STDEV(Dist) OVER (PARTITION BY DebateId), 0)
INTO #z FROM #dist;
```

Step 3 is the one that does the real work. A speech can be far from its debate’s average and still have a close neighbour: one MP raising a fair point that another picks up. A speech that is far even from its **nearest** neighbour is alone in the room. I called the ratio “Lonely”, and a speech scoring 2.0 is twice as far from anything else in its debate as a typical speech is.

The final step finds the centroid each outlier is actually closest to, labelled with the heading most common among that cluster’s speeches. That gives you rows like “said in the Horses (Protective Headgear for Young Riders) Bill; sounds like Points of Order”.

The results, once cleaned, are in the short version: the jokes, Kerry McCarthy’s birthday message, and Tam Dalyell, twice. What I want to record here is how dirty the first run was, because it’s the most instructive failure in the project.

---

## A parade of my own stupidity

### 1\. A connection string that was literally “…”

The first time the loader ran, it failed with \`IM002: Data source name not found\`. The README told you to pass the connection string as \` — sql “…”\`. I had meant the dots as “your connection string goes here”. The command, as written, did exactly what it said, and asked ODBC for a data source called \`…\`.

### 2\. £ became Â£

The daily XML files declare themselves as ISO-8859–1. My parser read them as UTF-8, because everything is UTF-8 now, isn’t it? Every pound sign, every accented name and every em-dash in 27 years of debate came out as two characters of mojibake. The parser now reads the declared encoding off the first line, and believes it.

### 3\. Every person id was empty

See above. I had written a confident caveat in my own README saying that a join “assumes Odell’s person\_id uses the same form” and that I should “check one known ex-MP first”. Then I didn’t check one known ex-MP first. Nobody had a person id. The whole name-matching section of this article exists because of that.

### 4\. McAvoy and Mcavoy are the same person, says SQL Server

\`hl.PersonName\` had a primary key on (Name, PersonId). The loader generated “Thomas McAvoy” and “Thomas Mcavoy” as two distinct name forms, because to Python they are. To SQL Server, under a case-insensitive collation, they are one value, and the second insert violated the key. Then it did the same with an accented name and its unaccented twin, and with a name that people.json had stored as \`&ouml;\`.

The fix was to fold case and normalise Unicode in Python, keeping only one form per case-folded spelling, and to drop the primary key in favour of a clustered index. The lesson is that your keys follow the database’s collation, not the language that produced the rows.

Worse, the failed run had already truncated the speech tables before it fell over, so “just rerun the people bit” became “reload all 4,000 days”.

### 5\. An aggregate that SQL Server won’t do

\`Msg 130: Cannot perform an aggregate function on an expression containing an aggregate or a subquery.\` I had written a \`SUM\` over a correlated subquery. SQL Server won’t do that, and it says so. The fix is to move the subquery into an \`OUTER APPLY\` and aggregate the result. It’s a two-minute fix, once you’ve read the error message properly rather than at a glance.

### 6\. Two collations, one comparison

Odell’s table uses \`Latin1\_General\_100\_CI\_AS\_SC\_UTF8\`. My new tables, and tempdb, use the server default \`Latin1\_General\_CI\_AS\`. Comparing a column from one with a column from the other gives you \`Msg 468: Cannot resolve the collation conflict\`. That would be mildly irritating, except it happened in the sitcom query, which had just spent forty minutes scanning every speech before falling over at the final \`SELECT\`. The fix is an explicit \`COLLATE\` on both sides of the \`LIKE\` and on the selected columns. And a note to self: when a query is slow, put the cheap failure modes first.

### 7\. The Thick of It, first broadcast 2005, quoted in 1981

The sitcom table had **The Thick of It** turning up in the Commons in 1981, 1982, 1987, 1989… “In the thick of it” is an ordinary English phrase. An MP being in the thick of a crisis doesn’t make them Malcolm Tucker. The pattern now only counts from the first broadcast, on 19 May 2005.

### 8\. B’Stard, twice

Every Alan B’Stard speech appeared twice in the excerpt list. I’d searched for both \`B’Stard\` and \`B’stard\`, to be safe. Under a case-insensitive collation they are the same pattern, so every speech matched both. The summary counts were right, because they counted distinct speeches. The excerpt list wasn’t, because it listed matches. Being careful about case in a case-insensitive database is a way of counting things twice.

### 9\. A lookup that ran once for every MP in Britain

The chamber graphic needs each MP’s party at each election. people.json has it from 1997. Before that, I took it from the party Odell gives the MP in the year after the election. I wrote that as a common table expression, aggregating 2.7 million speeches, and referred to it inside an \`OUTER APPLY\`:

```sql
WITH odell AS (
 SELECT c.PersonId, c.Yr, Party = MAX(s.Party)
 FROM hl.CommonsName AS c
 JOIN hc.SourceSpeech AS s ON s.DisplayAs = c.DisplayAs AND YEAR(s.SittingDate) = c.Yr
 …
)
SELECT …
OUTER APPLY (SELECT TOP (1) Party FROM odell AS o WHERE o.PersonId = m.PersonId …) AS o;
```

A CTE isn’t a table. It’s a macro. The optimiser was entitled to re-evaluate it for every one of the ~7,000 MP-elections, and it did. \`YEAR(s.SittingDate)\` also made the date join unindexable, so each evaluation was a scan. It ran long enough for me to give up and kill it.

The fix: build it once into a temp table, restricted to the 1979–92 elections that actually need it, with a sargable date range and an index:

```sql
SELECT c.PersonId, c.Yr, Party = MAX(s.Party)
INTO #odell
FROM hl.CommonsName AS c
JOIN hc.SourceSpeech AS s
 ON s.DisplayAs = c.DisplayAs COLLATE Latin1_General_100_CI_AS_SC_UTF8
 AND s.SittingDate >= DATEFROMPARTS(c.Yr, 1, 1) AND s.SittingDate < DATEFROMPARTS(c.Yr + 1, 1, 1)
…
CREATE CLUSTERED INDEX cx ON #odell (PersonId, Yr);
```

Seconds…

### 10\. The spies were division lists

The first run of the coded-message test came back with 614 out-of-place speeches by a single member, “Unknown”, who rose in debates on everything from the Kiribati Bill to potato marketing. The text began “Division №89\] \[10.40 pm AYES Aitken, Jonathan; Biffen, Rt Hon John…”. These were the printed lists of how everybody voted. A list of 300 surnames is genuinely unlike any speech in its debate, so the embedding was right that it was out of place. It just wasn’t a speech.

Behind them came Deputy Speakers. Nigel Evans, Eleanor Laing, Rosie Winterton and Dawn Primarolo announced time limits and read out amendment groupings under their own names, because the speaker table only knew them as the Chair when they were printed as “Mr Deputy Speaker”.

And at the very top, scoring a Lonely of 178, was the Merchant Shipping (Salvage and Pollution) Bill of 15 April 1994. That debate is in the source data ***twice***. Every speech in it had an identical twin at distance zero, so the “typical nearest neighbour” for that debate was zero, and dividing by nearly zero produces enormous numbers. The fix was to remove duplicate speeches before scoring, and to refuse to score any debate whose yardstick is too small to trust.

That’s the same lesson as the Florida problem, from the other direction. A method that refuses to answer when its denominator is bad is worth more than one that always answers.

---

## The chamber, in SQL Spatial

Peter Snow made election night into geometry, so I wanted the same thing from the database: every MP returned at every general election since 1979, sitting on the real benches and coloured by party.

The layout is simple once it’s written down. The government sits on the Speaker’s right, the opposition opposite, five rows deep, filling outward from the Speaker’s end with the largest party nearest the chair. So seat **k** on a side goes to column **k** / 5 and row **k** % 5, and each seat becomes a small circle in SQL Server’s \`geometry\` type:

```sql
SELECT Election, Grp, PersonId, DisplayName, Side, k,
 Shape = geometry::Point(CASE WHEN Side = 0 THEN -4.0 ELSE k / 5 * 1.0 END,
 CASE WHEN Side = 0 THEN 0.0 ELSE Side * (2.0 + k % 5) END, 0).STBuffer(0.42)
INTO hl.ChamberSeat
FROM placed;
```

Run a \`SELECT Shape, Grp FROM hl.ChamberSeat WHERE Election = ‘1997–05–03’\` in SSMS, open the **Spatial results** tab, and the 1997 chamber appears. A second function, \`hl.fnChamberSvg\`, turns the same rows into an SVG in real party colours, and the animated web version steps through the elections so you can watch the benches turn.

![The result in SSMS, the Speaker is the Single dot on the Left Side](/images/medium/1_dt8vHD_y7DK55sgFolIs_g.png)
*The result in SSMS, the Speaker is the Single dot on the Left Side*

![The same data in a timeline of results.](/images/medium/1_uJRHpFfo1y5COEwxlH2ldA.gif)
*The same data in a timeline of results.*

The full animated version is included in the Github project, I also allow any extra year to be added so you can get a full timeline of results. I wanted to render the House in 3D and have a full fly through whilst the data was being built seat by seat, but I thought better of it and the 3 people that will read this will be happy with the animated version above.

For actually reading this far and for referencing another article of mine I have to say asking for the animation in Lego was one members immediate request of me, perhaps less than a few hours of publishing !

And in less than 12 hours with a day job…

![I very nearly started to have all the little MiniFigs walk in..](/images/medium/1_tiTIk1eEUpAvcsi9RMxuiA.gif)
*I very nearly started to have all the little MiniFigs walk in..*

## The numbers

What I’d want a reader to know before quoting anything:

**The Lords data starts in November 1999.** Anything about “ever” means “since 1999”. The Commons data is 1979–2021, with a gap from mid-2001 to 2004 in the vector table.

**Former-MP counts are a floor.** people.json splits some people into two records: Michael Morris MP and Lord Naseby are separate, and so are Quintin Hogg and Lord Hailsham. Mostly these are peers created before 1999.

**”Lost their seat” is badly undercounted** in people.json. Use election results for that.

**2016–18 shouts are a recording artefact**, and are excluded.

**The “pointless peers” list needs filtering**. Supreme Court justices are barred from sitting, and the Lord Great Chamberlain’s role is ceremonial. The Archbishop of York showing no speeches for 2005–15 is a name-matching gap, not silence.

**The 3 hereditary peers still showing in 2026** are probably a lag in people.json.

**Divisions list slightly more voters than the printed totals**, mostly the four tellers, whom Hansard doesn’t count.

---

## The code

The loader, the schema, and every query in this article are in eight SQL scripts and two Python files:

```
| File                          | What it does                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `python/load_lords.py`        | Downloads and loads the Lords XML and people.json                                   |
| `sql/00_lords_schema.sql`     | Creates the `hl` tables                                                             |
| `sql/01_lords_views.sql`      | Each speech with the peer's party and type on the day                               |
| `sql/02_commons_link.sql`     | The name-and-seat join to Odell's Commons data                                      |
| `sql/03_questions.sql`        | Hereditaries, rebellion, "send him upstairs", heckling, defeats                     |
| `sql/04_matching_lessons.sql` | The Florida comparison                                                              |
| `sql/05_new_angles.sql`       | Stephen Benn, sitcoms, rebuked-then-rewarded, the Lords shouting back, ermine voice |
| `sql/06_chamber.sql`          | The chamber in SQL Spatial and SVG                                                  |
| `sql/07_out_of_place.sql`     | The coded-message test                                                              |
```

[https://github.com/sqlartist/house-of-lords-sql](https://github.com/sqlartist/house-of-lords-sql)

You’ll need SQL Server 2025 for \`VECTOR\_DISTANCE\`, SQL Server 2022 or later for \`LAG … IGNORE NULLS\`, and about 2 GB of disk for the XML.

---

## One last thing

The **Yes Minister** joke turns out to be half true, which I think is the most British possible result. You are sent upstairs for misbehaving, but only if you mattered. When you arrive, the House of Lords notices that you used to be an MP, and tells you, from the floor, that you are going on too long.

And the son of the man who fought hardest to get out of that chamber voted to abolish his own seat in it, then came back five weeks later.

None of that was find-able until the two Houses were joined, and the join only worked because it was willing to say “I don’t know”. If there’s a single thing I’d want someone to take from this, it’s that. Not the GPU, the vectors or the spatial types. The refusal to guess.

There will be a followup as this all produced the structures and some questions and some answers, but a bit bland. I want to know the juicy stuff so will make another article with all the extra questions. The code is already in the code mentioned.

## One Very Last Thing

![Just couldn’t resist the challenge](/images/medium/1_cYM2u-rffZ8rOGAVHda1cw.gif)
*Just couldn’t resist the challenge*

If you enjoyed this article and indeed the third and final part of this dive into politics please give it some claps, or not as it is your right to do.
