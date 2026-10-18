import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

const automationId = z.string().uuid().describe('Automation id (uuid)');
const versionNumber = z.number().int().min(1).describe('Version number');

/** Every tool here needs the `automations` scope. */
export function automationsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_automations',
      description:
        'List the automations the key can reach: trigger type, whether each is active, run count and when it last fired.',
      inputSchema: z.object({}),
      async execute() {
        return client.get('/v1/automations');
      },
    },

    {
      name: 'get_automation',
      description: 'Read one automation in full, with its trigger config, graph and steps.',
      inputSchema: z.object({
        id: automationId,
      }),
      async execute(input) {
        return client.get(`/v1/automations/${input.id}`);
      },
    },

    {
      name: 'list_automation_versions',
      description:
        'List every saved version of an automation graph, newest first, with the nodes each save added and removed. Use before restoring one.',
      inputSchema: z.object({
        id: automationId,
        page: z.number().int().min(1).optional(),
        per_page: z.number().int().min(1).max(100).optional(),
      }),
      async execute(input) {
        return client.get(`/v1/automations/${input.id}/versions`, {
          page: input.page,
          per_page: input.per_page,
        });
      },
    },

    {
      name: 'get_automation_version',
      description: 'Read an automation graph as it was saved at one version.',
      inputSchema: z.object({
        id: automationId,
        version: versionNumber,
      }),
      async execute(input) {
        return client.get(`/v1/automations/${input.id}/versions/${input.version}`);
      },
    },

    {
      name: 'restore_automation_version',
      description:
        'Restore an automation version: its graph is saved as a new version on top of the history, nothing is rewritten. The old graph must still validate under the current trigger.',
      inputSchema: z.object({
        id: automationId,
        version: versionNumber.describe('Version number to restore'),
      }),
      async execute(input) {
        return client.post(`/v1/automations/${input.id}/versions/${input.version}/restore`);
      },
    },
  ];
}
