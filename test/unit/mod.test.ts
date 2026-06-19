// deno-lint-ignore-file require-await, no-unused-vars
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext, ToolContext } from '../../types.ts';

// Mock PluginContext
const mockContext: PluginContext & ToolContext = {
  pluginId: 'cortex-plugin-figma',
  pluginDir: '/tmp/plugins/cortex-plugin-figma',
  state: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    list: async () => ({}),
  },
  config: {
    get: async () => null,
    set: async () => {},
    getAll: async () => ({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
  sessionId: 'test-session',
  workingDir: '/tmp',
  agentId: 'test-agent',
  workspaceDir: '/tmp',
};

function findTool(name: string) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

Deno.test('tools array — exports all tools', () => {
  assertEquals(tools.length, 5);
  assertEquals(tools[0].definition.name, 'figma_get_file');
  assertEquals(tools[1].definition.name, 'figma_extract_tokens');
  assertEquals(tools[2].definition.name, 'figma_generate_code');
  assertEquals(tools[3].definition.name, 'figma_list_components');
  assertEquals(tools[4].definition.name, 'figma_get_styles');
});

Deno.test('figma_get_file — rejects empty file_key', async () => {
  const tool = findTool('figma_get_file');
  const result = await tool.execute({ 'file_key': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('figma_extract_tokens — rejects empty file_key', async () => {
  const tool = findTool('figma_extract_tokens');
  const result = await tool.execute({ 'file_key': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('figma_generate_code — rejects empty file_key', async () => {
  const tool = findTool('figma_generate_code');
  const result = await tool.execute({ 'file_key': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('figma_list_components — rejects empty file_key', async () => {
  const tool = findTool('figma_list_components');
  const result = await tool.execute({ 'file_key': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('figma_get_styles — rejects empty file_key', async () => {
  const tool = findTool('figma_get_styles');
  const result = await tool.execute({ 'file_key': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('all tools return durationMs', async () => {
  for (const tool of tools) {
    const args: Record<string, unknown> = {};
    const result = await tool.execute(args, mockContext);
    assertEquals(typeof result.durationMs, 'number');
    assertEquals(result.durationMs >= 0, true);
  }
});
