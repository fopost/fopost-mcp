---
name: weekly-report
description: Write the weekly FoPost report: what published, how it did, what failed, what the inbox and competitors did. Use when asked for a weekly summary, a performance recap, or how last week went.
---

# Weekly report

One page the person can read in a minute. Numbers first, then what they mean, then what is
broken.

## 1. Gather

Run these for the reporting window, and do not report a number you did not fetch:

| Section       | Tools                                                               |
| :------------ | :------------------------------------------------------------------ |
| What went out | `list_posts` with the date range, `get_calendar`                    |
| How it did    | `get_analytics_summary`, `get_account_insights` per account         |
| Campaigns     | `get_campaign_report` when the week had one                         |
| Inbox         | `get_inbox_analytics`                                               |
| Failures      | `list_delivery_failures`                                            |
| Market        | `get_radar_insights`, `list_competitors`, `get_competitor_activity` |
| Spend         | `get_usage_summary`, `get_credit_balance`                           |

Skip a section rather than pad it. A week with no campaign gets no campaign section.

## 2. Write it

```
## Week of <date>

**Published.** N posts across M accounts. <the one that did best, and its number.>

**Performance.** <reach / engagement, each against the previous week.>

**Inbox.** N received, N answered, <median response time>.

**Failures.** <each failed delivery: account, platform, reason.> Or "None."

**Market.** <what a competitor did that matters. Skip if nothing did.>

**Next.** <two or three things worth doing, each tied to a number above.>
```

Every number carries its comparison. "4,100 impressions" is not a finding; "4,100
impressions, up from 2,800" is.

## 3. Be honest about gaps

- An account whose analytics did not refresh is a gap, not a zero. Say "no data" and say
  why; `get_account_health` usually knows.
- A delivery that failed is the most useful line in the report. Never bury it, never round
  it away, and never describe a week as clean when `list_delivery_failures` returned rows.
- If a number looks wrong, say it looks wrong rather than explaining it away.

## 4. Do not

- Do not invent a benchmark or an industry average.
- Do not turn the report into recommendations. Three next steps is the ceiling.
- Do not publish, schedule or reply to anything while writing a report. This is a read.
