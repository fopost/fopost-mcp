/**
 * MCP prompts: the ready-made requests a client shows as slash commands
 * (Claude Code, Claude Desktop, Cursor, VS Code). Each one is a plain request
 * in the user's words; the model picks the tools.
 *
 * A copy of the hosted server's list (fopost/fopost, apps/api/src/services/mcp-prompts.ts);
 * change both together. Prompts describe the goal and the rules, never a tool
 * name: the hosted server and this stdio server expose different tool sets.
 */

export type PromptArgument = { name: string; description: string; required?: boolean };

export type PromptSpec = {
  name: string;
  title: string;
  description: string;
  arguments: PromptArgument[];
  render: (args: Record<string, string>) => string;
};

/** Longest argument value accepted; a prompt is a request, not a document upload. */
export const MAX_PROMPT_ARG_CHARS = 4000;

const RULES = `Rules for this request:
- Do not publish, send, reply to or enable anything until I approve it in this conversation.
- Use only connected accounts that are healthy; tell me about any that are not.
- Never invent facts, numbers, prices, dates or quotes.
- Write in the brand voice saved in FoPost when there is one.`;

const or = (value: string | undefined, fallback: string) =>
  value?.trim() ? value.trim() : fallback;

export const PROMPTS: PromptSpec[] = [
  {
    name: 'draft-post',
    title: 'Draft a post',
    description: 'Turn one idea into a post shaped for each network, ready for your approval.',
    arguments: [
      { name: 'idea', description: 'What the post is about', required: true },
      { name: 'networks', description: 'Which networks or accounts, e.g. "LinkedIn and X"' },
    ],
    render: (a) => `Draft a social post about: ${a.idea}

Networks: ${or(a.networks, 'every connected account the idea suits')}.

Write one version per network, shaped for it: a thread for X, a fuller post for LinkedIn, a short post for Bluesky, Mastodon and Threads. Show me a preview of each, then save them as drafts. Ask me before scheduling.

${RULES}`,
  },
  {
    name: 'schedule-week',
    title: 'Schedule a week',
    description: 'Plan and fill a week of posts in your posting slots, approved in one go.',
    arguments: [
      { name: 'focus', description: 'Theme, product or campaign for the week' },
      { name: 'week', description: 'Which week, e.g. "next week" or "Nov 16"' },
    ],
    render: (a) => `Plan a week of posts for ${or(a.week, 'next week')}.

Focus: ${or(a.focus, 'pick from my recent posts, my brand and what performed best')}.

First tell me what is already scheduled and which accounts can post. Do not stack posts on a full day. Draft each post per network, place them in my posting slots, and show me the whole week as one plan: day, time, account, first line.

${RULES}`,
  },
  {
    name: 'repurpose',
    title: 'Repurpose content',
    description: 'Turn an article, video or link into posts for every network.',
    arguments: [
      { name: 'source', description: 'A URL, or the text to repurpose', required: true },
      { name: 'networks', description: 'Which networks, if not all' },
    ],
    render: (a) => `Repurpose this into social posts: ${a.source}

Networks: ${or(a.networks, 'every connected account it suits')}.

Read the source first and pull out the two or three points worth sharing. Write a version per network that stands on its own without the click, and link back to the source where the network allows it. Suggest an image for the posts that need one. Show me the drafts before anything is scheduled.

${RULES}`,
  },
  {
    name: 'launch-feature',
    title: 'Launch a feature',
    description: 'A launch pack for one feature: posts per network, an image and a video script.',
    arguments: [
      { name: 'feature', description: 'The feature or product being launched', required: true },
      { name: 'link', description: 'Page to send people to' },
      { name: 'audience', description: 'Who it is for, e.g. "developers"' },
    ],
    render: (a) => `Prepare a launch for: ${a.feature}

Link: ${or(a.link, 'ask me for it before writing the call to action')}.
Audience: ${or(a.audience, 'the audience my brand already speaks to')}.

Lead with the result for the user, not the feature list. Make:
1. A LinkedIn post and an X thread.
2. Short posts for the other connected networks.
3. One image for the launch.
4. A 30 to 45 second video script: hook in the first 3 seconds, the result, one proof, the call to action.

Spread the posts over the launch week as one plan and show it to me before scheduling.

${RULES}`,
  },
  {
    name: 'create-workflow',
    title: 'Create a workflow',
    description:
      'Describe an automation in plain words and get it built, switched off until you approve.',
    arguments: [
      {
        name: 'description',
        description:
          'What should happen, e.g. "when I publish a blog post, post it to LinkedIn and X"',
        required: true,
      },
    ],
    render: (a) => `Build a FoPost workflow for this: ${a.description}

Before building, restate it as trigger, steps and destinations, and list anything missing (which accounts, what time, whether each run needs my approval). Ask me about the gaps.

Then create it switched off and show me what it will do on its next run. Only switch it on when I say so.

${RULES}`,
  },
  {
    name: 'triage-inbox',
    title: 'Triage the inbox',
    description: 'Sort unread comments, mentions and DMs and draft the replies that need one.',
    arguments: [{ name: 'scope', description: 'Narrow it, e.g. "DMs only" or "Instagram"' }],
    render: (a) => `Triage my FoPost inbox. Scope: ${or(a.scope, 'all unread items')}.

Sort every item into answer, acknowledge, route to me, or spam. Draft short replies for the ones to answer, in the account's voice. Route anything about money, refunds or legal matters to me instead of answering it.

End with the counts per bucket and the number of replies waiting for my approval.

${RULES}`,
  },
  {
    name: 'weekly-report',
    title: 'Weekly report',
    description: 'What published, how it did, what failed and what to do next.',
    arguments: [{ name: 'period', description: 'Which week, if not the last one' }],
    render: (a) => `Write my FoPost report for ${or(a.period, 'the last 7 days')}.

Cover what was published, how it performed against the previous period, the inbox, failed deliveries and anything competitors did that matters. Every number gets its comparison. Report missing data as missing, not as zero. Finish with at most three next steps, each tied to a number.

This is a read: do not publish, schedule or reply to anything.`,
  },
  {
    name: 'check-accounts',
    title: 'Check accounts',
    description: 'Which connected accounts are healthy and which need reconnecting.',
    arguments: [],
    render: () => `Check every connected account in this FoPost workspace.

List each one with its network and its status: healthy, needs reconnecting, or limited. For any that need action, say what is wrong and give me the link to reconnect it. Do not change anything.`,
  },
];

export class PromptError extends Error {}

export function listPrompts() {
  return PROMPTS.map(({ name, title, description, arguments: args }) => ({
    name,
    title,
    description,
    arguments: args,
  }));
}

export function getPrompt(name: string, args: Record<string, string> | undefined) {
  const spec = PROMPTS.find((p) => p.name === name);
  if (!spec) throw new PromptError(`Unknown prompt: ${name.slice(0, 100)}`);

  const values: Record<string, string> = {};
  for (const arg of spec.arguments) {
    const value = args?.[arg.name];
    if (typeof value === 'string' && value.length > MAX_PROMPT_ARG_CHARS) {
      throw new PromptError(`${arg.name} is longer than ${MAX_PROMPT_ARG_CHARS} characters`);
    }
    if (arg.required && !value?.trim())
      throw new PromptError(`Missing required argument: ${arg.name}`);
    if (typeof value === 'string') values[arg.name] = value.trim();
  }

  return {
    description: spec.description,
    messages: [
      { role: 'user' as const, content: { type: 'text' as const, text: spec.render(values) } },
    ],
  };
}
