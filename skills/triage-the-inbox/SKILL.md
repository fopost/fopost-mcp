---
name: triage-the-inbox
description: Work the FoPost social inbox down: comments, mentions and DMs across connected accounts. Use when asked to triage, clear or catch up on the inbox, to draft replies, or to find what still needs an answer.
---

# Triage the inbox

Take the unread pile and turn it into a short list of drafted replies waiting for approval.
Nothing you write here is sent without the person saying so.

## 1. Sort before you read

`list_inbox` is the entry point. Narrow it, because the whole inbox is rarely the job:

- `state: "unread"` for the backlog, which is the usual ask.
- `type` picks `comment`, `mention` or `dm`. DMs are conversations and usually the most
  urgent; mentions are often nothing.
- `platform` or `account_id` when the person named one.

`get_inbox_analytics` gives the shape of the backlog: volume, response time, what is
ageing. Lead with that when the pile is large, so the person knows what they are looking at
before you start.

## 2. Read, then decide

`read_inbox_item` gives the full text and the post it sits under. Read before replying: a
comment is meaningless without the post it answers.

Sort each item into one of four:

| Bucket      | What it is                                         | What to do                     |
| :---------- | :------------------------------------------------- | :----------------------------- |
| Answer      | A real question, a support request, a sales signal | `draft_inbox_reply`            |
| Acknowledge | Praise, a compliment, a low-effort positive        | `like_inbox_item`              |
| Route       | Needs a human decision, a refund, a legal matter   | `apply_label`, leave it unread |
| Drop        | Spam, bait, an obvious bot                         | `reject_inbox_reply`           |

Put the counts in your summary. "41 unread: 12 to answer, 19 liked, 4 routed, 6 dropped" is
the useful sentence.

## 3. Draft replies

`draft_inbox_reply` queues a reply for approval. It does not send. Write in the account's
voice, not yours. A reply is short: answer the question, do not restate it.

- Never invent a fact about the product, an order, a price or a date. If the answer needs
  one you do not have, route it instead.
- Never argue. A hostile comment gets a short neutral reply or a label, not a rebuttal.
- One reply per item. Do not chain.

`list_pending_reviews` shows everything waiting on the person. Finish by naming that number,
because that is the work you handed them.

## 4. Never

- Never call a reply sent. It is drafted until the person approves it.
- Never quote a DM's contents outside the workspace it came from.
- Never mass-reply. If more than a dozen items would get the same text, say so and ask.
  That is usually a signal the post needs an edit, not the inbox a reply.
