/**
 * Guards the Claude Code plugin manifests, which ship in the repo rather than
 * the npm tarball and so are never exercised by the build.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('..', import.meta.url).pathname;
const readJson = (path: string) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

const SKILLS = ['schedule-a-week', 'triage-the-inbox', 'weekly-report'];

describe('claude code plugin', () => {
  it('declares the plugin and the marketplace entry that installs it', () => {
    const plugin = readJson('.claude-plugin/plugin.json');
    const marketplace = readJson('.claude-plugin/marketplace.json');
    expect(plugin.name).toBe('fopost');
    expect(marketplace.plugins).toHaveLength(1);
    expect(marketplace.plugins[0].name).toBe(plugin.name);
    expect(marketplace.plugins[0].source).toBe('./');
  });

  it('installs the hosted server over streamable HTTP, not the stdio package', () => {
    const { mcpServers } = readJson('.mcp.json');
    expect(Object.keys(mcpServers)).toEqual(['fopost']);
    expect(mcpServers.fopost).toEqual({ type: 'http', url: 'https://api.fopost.com/mcp' });
  });

  it('ships every skill with the frontmatter the loader reads', () => {
    expect(readdirSync(join(ROOT, 'skills')).sort()).toEqual([...SKILLS].sort());
    for (const skill of SKILLS) {
      const body = readFileSync(join(ROOT, 'skills', skill, 'SKILL.md'), 'utf8');
      const [, frontmatter] = body.split('---\n', 2);
      expect(frontmatter).toContain(`name: ${skill}`);
      expect(frontmatter).toMatch(/^description: \S.*$/m);
    }
  });

  it('never names an AI provider, a model or an email address in a skill', () => {
    for (const skill of SKILLS) {
      const body = readFileSync(join(ROOT, 'skills', skill, 'SKILL.md'), 'utf8');
      expect(body).not.toMatch(/OwlStack/i);
      expect(body).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    }
  });
});
