# Experiment 4: Personalized cold outreach at scale

You hold every agent's CEA registration, agency, area, score, and rank. That lets you send genuinely personalized 1:1 outreach at scale: their number, their area, their standing. This is the GetAgent supply-acquisition engine, done compliantly.

## Hypothesis

If we send a short, personalized, honest message telling an agent their public profile and score are live and inviting a free claim, then a measurable share will claim, because the message is relevant (their own data), low-pressure (already live, just claim), and lands a real value prop (seller leads in their area).

## Design

- **Audience:** start with claimed-eligible agents who have a score and a known area, sequenced by score band (highest first; they convert and reference best). Batch 1 cap: 100 agents.
- **Channels:** email primary (Klaviyo, your domain is warmed for transactional). LinkedIn connect-note secondary (manual, high-touch for top agents). WhatsApp only where a business number is already on file and clearly business-listed.
- **Sequence:** 3 touches over the experiment window (do not over-contact).
  - Touch 1 (Sat): the "your profile is live" message.
  - Touch 2 (Mon, only non-openers / non-clickers): different angle (lead volume in their area).
  - Touch 3 (Wed, only engaged-not-claimed): the 0.25% founding-rate scarcity.
- **A/B:** subject line on Touch 1 (see below). Hold everything else constant.
- **Volume ramp:** 100 (Sat) -> 250 (Mon) -> 500 (Wed) only if deliverability and complaint rate stay clean. Never blast the full list at once.

## Success metrics

| Tier | Metric | Target |
|------|--------|--------|
| Primary | Verified claims / agents contacted | >= 4% (batch 1) |
| Primary | Reply or click rate | >= 8% |
| Secondary | Open rate | >= 40% |
| Secondary | Cost per verified claim | track (near zero; own data + Klaviyo) |
| Guardrail | Spam complaint rate | < 0.1% (hard stop above 0.3%) |
| Guardrail | Bounce rate | < 3% (clean the list if higher) |
| Guardrail | Unsubscribe | < 2% |

**Ship / iterate / kill:** ramp volume if claims clear 4% and complaints stay under 0.1%; iterate angle and subject if opens are high but claims low; hard-stop the channel if complaints exceed 0.3% or bounces exceed 5% (list quality or reputation problem).

## Build needed

None for execution. Uses Klaviyo + the agent data you already have. Optional later: a one-click "magic claim" link that pre-fills the agent's CEA and email so Touch 1 converts in one click (raises claim rate; small build).

## Segmentation

| Segment | Definition | Angle |
|---------|-----------|-------|
| Top performers | score >= 80, ranked top 10 in area | Rank + "you made the list" |
| Active mid | score 60-79 | "Your profile is live, get leads in {area}" |
| Long tail | score < 60 or thin | Skip in batch 1; lower intent, higher complaint risk |

## Email sequence (ready to send)

### Touch 1 (subject A/B)
- **Subject A:** {first_name}, your FairComparisons profile is live
- **Subject B:** You rank #{rank} in {area} ({score} AgentScore)
- **Preheader:** Built from your public CEA record. Claim it free.

```
Hi {first_name},

I run FairComparisons, an independent site that ranks every
CEA-registered agent in Singapore on real transaction records,
not advertising.

Your profile is already live, built from public CEA data:
{profile_url}?ref=outreach&utm_source=outreach&utm_medium=email&utm_campaign=claim-w24

Right now you rank #{rank} of {areaTotal} agents in {area} with an
AgentScore of {score}.

You can claim it free to respond to seller leads in {area}, add your
photo and bio, and manage how you appear. There is no upfront or
monthly cost. Agents only pay a 0.25% success fee if they close a
sale from a lead we refer.

Claim here: {claim_url}?ref=outreach

If you would rather not hear from me, reply STOP and I will not
contact you again.

{your_name}
FairComparisons, Singapore
```

### Touch 2 (non-engagers, Mon) — lead-volume angle
- **Subject:** Sellers are searching {area} on FairComparisons

```
Hi {first_name},

Quick follow-up. Homeowners in {area} use FairComparisons to find an
agent based on actual transaction records. When one asks to be matched,
we send the request to the top-ranked agents who have claimed their
profile.

You are ranked #{rank} in {area} but have not claimed yet, so you are
not yet receiving these requests. Claiming is free and takes two minutes:
{claim_url}?ref=outreach-t2

Reply STOP to opt out.

{your_name}
```

### Touch 3 (engaged, not claimed, Wed) — founding-rate scarcity
- **Subject:** The 0.25% launch rate closes soon

```
Hi {first_name},

One more note. Agents who claim during our 2026 launch lock in the
0.25% success fee, our lowest rate. It only applies to a completed
sale from a lead we send, and it rises after launch.

Lock it in by claiming your profile: {claim_url}?ref=outreach-t3

Reply STOP to opt out.

{your_name}
```

## LinkedIn connect note (top performers, manual)
```
Hi {first_name}, you rank #{rank} in {area} on FairComparisons (we
rank agents on CEA transaction data, not ads). Your profile is live;
happy to send the link so you can claim it free and get seller leads.
```

## Deliverability + compliance setup (do before sending)

- Send from a real, monitored mailbox on the domain with SPF, DKIM, DMARC passing.
- Every message: clear sender identity, physical/business identity, working opt-out (STOP / unsubscribe), honored within the message itself.
- Use business contact details only. No scraped personal emails.
- Suppress anyone who opts out, permanently.
- Keep batches small and warm up volume. Monitor complaints after every batch.

## PDPA framing (read before sending)

This is B2B outreach to agents about their own public professional profile, with a genuine service offer and an immediate opt-out. Keep it informational and honest ("your profile is live, here is your score, claim it"), never a hard sell or a misleading subject. Honor every opt-out. If unsure about a given contact's source, do not contact. The honest, low-pressure framing is both more compliant and higher-converting.

## Run-of-show

1. Friday: build segments in Klaviyo from the agent export; verify SPF/DKIM/DMARC; load suppression list.
2. Saturday 9am SGT: Touch 1 to batch 1 (100), split subject A/B.
3. Sunday: read opens/clicks; pick winning subject.
4. Monday: Touch 2 to non-engagers; Touch 1 (winning subject) to batch 2 (250) if guardrails clean.
5. Wednesday: Touch 3 to engaged-not-claimed; ramp to 500 if clean.
6. Following Tuesday: report verified claims per batch, cost per claim, complaint rate; decide scale.

## Risks

- Reputation damage from complaints. Mitigation: tiny batches, top segments first, honest subjects, instant opt-out, hard-stop thresholds.
- Agents forwarding to CEA or social with a complaint. Mitigation: never imply CEA endorsement; never overstate; lead with their own real data.
