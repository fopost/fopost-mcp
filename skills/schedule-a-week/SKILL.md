---
name: schedule-a-week
description: Plan and schedule a week of social posts in FoPost. Use when asked to fill next week's calendar, build a content plan, draft a batch of posts across accounts, or top up the posting queue.
---

# Schedule a week

Fill a week of the FoPost calendar without publishing anything. Everything that reaches a
network waits for the person to approve it.

## 1. Read the ground first

Never draft into an empty picture. In order:

1. `list_accounts`: which accounts exist, and which are healthy enough to post from. A
   disconnected or rate-limited account is not a slot; `get_account_health` says which.
2. `get_calendar` for the target week, which says what is already scheduled. Existing posts are the
   constraint, not a starting point to replace.
3. `get_queue_slots`, the workspace's posting times. A queue slot is the default place for
   a new post; only pick a literal time when the person names one.
4. `list_brand_voices` and `get_brand_kit` if the person named a brand, so the drafts carry
   its voice, palette and fonts.

Report what you found in two or three lines before drafting. If the week is already full,
say so and stop rather than stacking posts on top of each other.

## 2. Draft

- `draft_post_variants` writes one variant per target platform from a single idea. Prefer it
  over writing the same caption for every network: a thread, a caption and a title are
  different shapes.
- `score_draft` gives advisory signals on a draft (length, links, readability). Use it on
  anything going to more than one account. It advises; it does not block.
- `create_draft_post` stores the post. Keep it a draft at this stage.
- `show_post_preview` renders what the post will look like on each network. Show the person
  the preview before asking for approval, not after.

## 3. Place it

- `add_to_queue` drops the draft into the next free queue slot. This is the default.
- `reschedule_post` moves a post to a literal time when the person asked for one.
- `propose_plan` presents the whole week at once when you drafted more than two or three
  posts. One approval for the plan beats one per post.

## 4. Hand over

Nothing publishes on its own. `propose_publish` asks for approval on a single post; the
person approves in FoPost or in the conversation. Never describe a post as scheduled until
the tool result says it is.

Close with the week as a list: day, time, account, first line of the caption. If anything
was skipped, whether an unhealthy account, a full day, or a platform the idea did not suit, name it.

## Watch for

- **Time zones.** Queue slots are in the workspace's time zone. A literal time from the
  person is in theirs unless they say otherwise; ask rather than guess.
- **A platform's limits.** `score_draft` catches most of it, but a video idea aimed at a
  text-only account is a drafting mistake, not a validation failure.
- **Approval fatigue.** Batch the approval. Twelve separate proposals for one week is worse
  than one plan.
