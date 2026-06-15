# Supply-activation kit: get active seller-agents to claim

Goal: turn the agent side on. Right now zero agents have claimed despite ~100 banner views, so the seller-lead loop has no supply. The lever is direct outreach to the agents who genuinely sell, with a hook they cannot ignore: their own public record and rank.

## The target

Active, unclaimed seller-agents, sized two ways:
- **661 agents** with 6 or more seller-side home sales in the last 12 months (the high-value core, start here).
- **1,789 agents** with 3 or more (the full reachable list).

These are the only agents for whom "get seller leads" resonates, so do not spray the whole 38,000 register. Go direct to this finite, nameable list.

## The hook (why it converts)

It is loss-aversion plus ego, both true and verifiable:
1. Their CEA transaction record is **already public on FairComparisons whether they claim or not**, and they already rank on it.
2. Sellers comparing agents in their area **see that record now**.
3. So the rational move is to claim the free profile, control the narrative (photo, bio), and capture the seller interest already pointed at them.

No discount, no gimmick. The message is "you are already here and ranked, come own it."

## The one real blocker: contact details

We do **not** hold agent emails or phone numbers in our database (every `email` is null, which is exactly why claims route to manual review). So the list tells you *who* to contact, not *how*. Sourcing options, in order of effort:
- Agency websites and PropertyGuru / 99.co agent profiles list public contact numbers. A Firecrawl or Apify pass keyed on agent name + CEA number can pull most of them. I can build that scrape if you want the contacts auto-sourced.
- The CEA public register page per agent (we already deep-link to it) shows registration, sometimes contact.
- WhatsApp is the realistic channel in SG; most active agents publish a mobile number.

Decide the channel before sending; the copy below has an email and a WhatsApp version.

## Export the full list

Run in Supabase (service role). Swap `>= 6` to `>= 3` for the full 1,789.

```sql
with mx as (select max(to_date(transaction_date,'MON-YYYY')) dmax from sg_agent_transactions),
recent as (
  select salesperson_reg_num reg, count(*) seller_sales_12m
  from sg_agent_transactions, mx
  where to_date(transaction_date,'MON-YYYY') > mx.dmax - interval '12 months'
    and represented='SELLER' and transaction_type in ('RESALE','NEW SALE','SUB-SALE')
  group by salesperson_reg_num
  having count(*) >= 6
)
select a.name, a.cea_registration, a.agency_name, round(a.score) as score, a.slug,
       r.seller_sales_12m,
       (select min(rank) from sg_area_top_agents t where t.agent_slug = a.slug) as best_rank,
       (select area_name from sg_area_top_agents t where t.agent_slug = a.slug order by rank limit 1) as best_area
from recent r join sg_agents a on a.cea_registration = r.reg
where coalesce(a.claimed,false) = false
order by r.seller_sales_12m desc;
```

Top of the list (examples, all real):

| Agent | Agency | Score | Seller sales (12m) | Best area rank |
|---|---|---|---|---|
| Sandy Hong X M | ERA | 96 | 74 | #1 Bukit Batok |
| Aden Pang | Huttons | 94 | 90 | #1 Pasir Panjang / Clementi |
| Alvin Ong | PropNex | 95 | 44 | #2 Serangoon / Hougang / Punggol |
| Yuna Lim | Singapore Estate Agency | 92 | 69 | #3 Serangoon / Hougang / Punggol |
| Kenneth Chua | Bluenest | 88 | 68 | #2 Bedok / Upper East Coast |

## Message copy

Merge fields: `{first_name}`, `{rank}`, `{area}`, `{score}`, `{seller_sales_12m}`, `{profile_url}` (= `fair-comparisons.com/property-agents/agent/{slug}`).

### Email (agents with an area rank)

Subject: You rank #{rank} for sellers in {area}

> Hi {first_name},
>
> Quick heads up, not a sales pitch. We run FairComparisons, an independent site that ranks every CEA-registered agent on their actual transaction record, not on advertising. Your record is already public on it, and on real sale data you rank **#{rank} in {area}** with an AgentScore of {score}.
>
> Sellers comparing agents in {area} see that record right now, claimed or not. Claiming is free, takes no cut of any sale, and you cannot pay to rank higher. It just lets you add your photo and bio and respond to sellers who pick you.
>
> Your profile is here: {profile_url}. Worth two minutes to own it.
>
> [Your first name], FairComparisons

### Email (agents without an area rank, lead on volume)

Subject: Your CEA record ranks you among Singapore's active sellers

> Hi {first_name},
>
> We run FairComparisons, an independent site that ranks CEA-registered agents on their real transaction record. You stand out: {seller_sales_12m} seller-side home sales in the last year puts you among the genuinely active agents, with an AgentScore of {score}.
>
> Your record is already public on the site and sellers are comparing it. Claiming is free, no cut of any sale, no paid placement. It lets you add your photo and bio and receive sellers who choose you. Your profile: {profile_url}.
>
> [Your first name], FairComparisons

### WhatsApp / short

> Hi {first_name}, this is [name] from FairComparisons, an independent agent-ranking site built on the public CEA record. You already rank #{rank} for sellers in {area} on real sale data. Your profile is live whether you claim it or not: {profile_url}. Claiming is free, no cut, no paid placement, it just lets you add your photo and reply to sellers. Worth a look.

## Guardrails
- Sign first name only plus FairComparisons. Do not name the founder.
- No em dashes. Every claim traces to the CEA data.
- Do not promise leads you cannot yet deliver. The honest pitch is "own your record and be reachable," not "we will send you N leads."
- Some of these top names carry data flags (team-attributed, new-launch). That is fine for outreach, they are still active, but do not build the pitch on a number that the flag undercuts.

## Sequencing
1. Pick the channel and source contacts for the top 50 of the 661.
2. Send the area-rank version to those with a rank, the volume version to the rest.
3. One short follow-up after 5 to 7 days.
4. Track claims against sends. If even 2 to 3% claim, that seeds the supply side and the subscription funnel.
