# Growth Experiment Results Tracker

Fill this in as you run. One block per experiment. Decision rule: compare the primary metric to its target from the experiment file, then mark Keep / Iterate / Kill.

## Baselines (capture Friday before launch)

| Metric | Value | How measured |
|--------|-------|--------------|
| Unclaimed profile views / week | | `agent_profile_view` count, claimed:false |
| Current claim form view -> submit | | funnel events |
| Current submit -> verified | | sg_claim_requests vs sg_agents.claimed_at |
| Total claimed agents (start) | | `select count(*) from sg_agents where claimed` |
| Email list size (agent) | | Klaviyo "Agent claim W24" |

## Exp 1: Claim hook

| Date | Arm | Profile views | Form views | Submits | Verified | Submit rate | Verified rate | Note |
|------|-----|--------------|-----------|---------|----------|-------------|---------------|------|
| | A (control) | | | | | | | |
| | B (ranked) | | | | | | | |

Target: B submit rate >= 1.5x A, or absolute >= 8%; verified rate >= 3%; verify drop-off < 40%.
Decision: ______

## Exp 2: Leaderboards + outreach

| Date | Area | Agents emailed | Opens | Clicks | Claims (ref=leaderboard) | Open % | Click % | Claim % | Unsub % |
|------|------|---------------|-------|--------|--------------------------|--------|---------|---------|---------|
| | | | | | | | | | |

Target: claims >= 5% of emailed; click >= 12%; open >= 35%; unsub < 1%.
Subject winner: A / B. Decision: ______

## Exp 3: AgentScore badge

| Week | Claimed agents | Badge installs | Install % | badge_view (external) | Claims (ref=badge) | Referring domains |
|------|---------------|----------------|-----------|----------------------|--------------------|-------------------|
| W1 | | | | | | |
| W2 | | | | | | |

Target (4 wk): install rate >= 15%; referral claims > 0 and rising.
Decision: ______

## Exp 4: Cold outreach

| Batch | Date | Sent | Opens | Clicks/replies | Verified claims | Open % | Click % | Claim % | Complaints % | Bounce % |
|-------|------|------|-------|----------------|-----------------|--------|---------|---------|--------------|----------|
| 1 | | 100 | | | | | | | | |
| 2 | | 250 | | | | | | | | |
| 3 | | 500 | | | | | | | | |

Target: verified claims >= 4%; reply/click >= 8%; open >= 40%; complaints < 0.1% (hard stop 0.3%); bounce < 3%.
Subject winner: A / B. Decision: ______

## Weekly summary

| Experiment | Verified claims attributed | Cost / claim | Verdict | Next action |
|-----------|----------------------------|--------------|---------|-------------|
| 1 Claim hook | | ~0 | | |
| 2 Leaderboards | | ~0 | | |
| 3 Badge | | ~0 | | |
| 4 Cold outreach | | ~0 | | |

Total verified claims this push: ______  (vs North Star target)
