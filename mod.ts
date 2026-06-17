import type { PluginContext, Tool, ToolCallResult, ToolContext } from './types.ts';

let config: Record<string, string> = {};

export async function onLoad(ctx: PluginContext): Promise<void> {
  config = await ctx.config.get() as Record<string, string>;
}

export async function onUnload(_ctx: PluginContext): Promise<void> {}

function figmaApi(path: string): Promise<Response> {
  return fetch(`https://api.figma.com/v1${path}`, {
    headers: {
      'X-Figma-Token': config.figmaToken || '',
    },
  });
}

const figma_get_file: Tool = {
  definition: {
    name: 'figma_get_file',
    description: 'Get a Figma file by key',
    params: [
      {
        name: 'file_key',
        type: 'string',
        description: 'Figma file key from the URL',
        required: true,
      },
      {
        name: 'node_id',
        type: 'string',
        description: 'Specific node ID to retrieve',
        required: false,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const file_key = args.file_key;
      if (!file_key || typeof file_key !== 'string') {
        return {
          toolName: 'figma_get_file',
          success: false,
          output: '',
          error: 'file_key must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      let path = `/files/${file_key}`;
      if (args.node_id && typeof args.node_id === 'string') path += `?ids=${args.node_id}`;
      const res = await figmaApi(path);
      const data = await res.json();
      if (!res.ok) {
        return {
          toolName: 'figma_get_file',
          success: false,
          output: '',
          error: `Figma API error ${res.status}: ${JSON.stringify(data)}`,
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'figma_get_file',
        success: true,
        output: JSON.stringify(data, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'figma_get_file',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const figma_extract_tokens: Tool = {
  definition: {
    name: 'figma_extract_tokens',
    description: 'Extract design tokens from a Figma node',
    params: [
      {
        name: 'file_key',
        type: 'string',
        description: 'Figma file key from the URL',
        required: true,
      },
      {
        name: 'node_id',
        type: 'string',
        description: 'Node ID to extract tokens from',
        required: true,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const file_key = args.file_key;
      const node_id = args.node_id;
      if (!file_key || typeof file_key !== 'string') {
        return {
          toolName: 'figma_extract_tokens',
          success: false,
          output: '',
          error: 'file_key must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      if (!node_id || typeof node_id !== 'string') {
        return {
          toolName: 'figma_extract_tokens',
          success: false,
          output: '',
          error: 'node_id must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      const res = await figmaApi(`/files/${file_key}/nodes?ids=${node_id}`);
      const data = await res.json();
      if (!res.ok) {
        return {
          toolName: 'figma_extract_tokens',
          success: false,
          output: '',
          error: `Figma API error ${res.status}: ${JSON.stringify(data)}`,
          durationMs: Date.now() - start,
        };
      }

      const node = (data as Record<string, unknown>).nodes?.[node_id]?.document;
      if (!node || typeof node !== 'object') {
        return {
          toolName: 'figma_extract_tokens',
          success: false,
          output: '',
          error: 'Node not found',
          durationMs: Date.now() - start,
        };
      }

      const n = node as Record<string, unknown>;
      const tokens: Record<string, unknown> = {
        name: n.name,
        type: n.type,
      };

      if (n.backgroundColor) {
        const bg = n.backgroundColor as Record<string, number>;
        tokens.color = {
          backgroundColor: `rgba(${Math.round(bg.r * 255)}, ${Math.round(bg.g * 255)}, ${
            Math.round(bg.b * 255)
          }, ${bg.a ?? 1})`,
        };
      }
      if (n.fills && Array.isArray(n.fills) && n.fills.length > 0) {
        const fill = n.fills[0] as Record<string, unknown>;
        if (fill.type === 'SOLID' && fill.color) {
          const c = fill.color as Record<string, number>;
          tokens.color = {
            ...(tokens.color as Record<string, unknown> || {}),
            fill: `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${
              Math.round(c.b * 255)
            }, ${c.a ?? 1})`,
          };
        }
      }
      if (n.fontSize) tokens.fontSize = n.fontSize;
      if (n.fontWeight) tokens.fontWeight = n.fontWeight;
      if (n.fontFamily) tokens.fontFamily = n.fontFamily;
      if (n.cornerRadius) tokens.borderRadius = n.cornerRadius;
      if (n.strokeWeight) tokens.borderWidth = n.strokeWeight;

      return {
        toolName: 'figma_extract_tokens',
        success: true,
        output: JSON.stringify(tokens, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'figma_extract_tokens',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const figma_generate_code: Tool = {
  definition: {
    name: 'figma_generate_code',
    description: 'Generate frontend code from a Figma design',
    params: [
      {
        name: 'file_key',
        type: 'string',
        description: 'Figma file key from the URL',
        required: true,
      },
      {
        name: 'node_id',
        type: 'string',
        description: 'Node ID to generate code from',
        required: true,
      },
      {
        name: 'framework',
        type: 'string',
        description: 'Target framework',
        required: false,
        enum: ['react', 'vue', 'svelte', 'html'],
        default: 'react',
      },
      {
        name: 'styling',
        type: 'string',
        description: 'Styling approach',
        required: false,
        enum: ['css', 'tailwind', 'styled_components'],
        default: 'tailwind',
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const file_key = args.file_key;
      const node_id = args.node_id;
      if (!file_key || typeof file_key !== 'string') {
        return {
          toolName: 'figma_generate_code',
          success: false,
          output: '',
          error: 'file_key must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      if (!node_id || typeof node_id !== 'string') {
        return {
          toolName: 'figma_generate_code',
          success: false,
          output: '',
          error: 'node_id must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      const framework = typeof args.framework === 'string' ? args.framework : 'react';
      const styling = typeof args.styling === 'string' ? args.styling : 'tailwind';

      const res = await figmaApi(`/files/${file_key}/nodes?ids=${node_id}`);
      const data = await res.json();
      if (!res.ok) {
        return {
          toolName: 'figma_generate_code',
          success: false,
          output: '',
          error: `Figma API error ${res.status}: ${JSON.stringify(data)}`,
          durationMs: Date.now() - start,
        };
      }

      const node = (data as Record<string, unknown>).nodes?.[node_id]?.document;
      if (!node || typeof node !== 'object') {
        return {
          toolName: 'figma_generate_code',
          success: false,
          output: '',
          error: 'Node not found',
          durationMs: Date.now() - start,
        };
      }

      const n = node as Record<string, unknown>;
      const name = ((n.name as string) || 'Component').replace(/\s+/g, '');
      const bg = n.backgroundColor as Record<string, number> | undefined;
      const bgColor = bg
        ? `rgba(${Math.round(bg.r * 255)}, ${Math.round(bg.g * 255)}, ${Math.round(bg.b * 255)}, ${
          bg.a ?? 1
        })`
        : '#ffffff';
      const w = (n.absoluteBoundingBox as Record<string, number>)?.width || 300;
      const h = (n.absoluteBoundingBox as Record<string, number>)?.height || 200;

      let code = '';
      if (styling === 'tailwind') {
        const twBg = bgColor === '#ffffff' ? 'bg-white' : `bg-[${bgColor}]`;
        if (framework === 'react') {
          code =
            `export function ${name}() {\n  return (\n    <div className="${twBg} rounded-lg" style={{ width: ${w}, height: ${h} }}>\n      {/* Generated from Figma node */}\n    </div>\n  );\n}\n`;
        } else if (framework === 'vue') {
          code =
            `<template>\n  <div class="${twBg} rounded-lg" :style="{ width: '${w}px', height: '${h}px' }">\n    <!-- Generated from Figma node -->\n  </div>\n</template>\n\n<script setup lang="ts">\n</script>\n`;
        } else if (framework === 'svelte') {
          code =
            `<div class="${twBg} rounded-lg" style="width: ${w}px; height: ${h}px">\n  <!-- Generated from Figma node -->\n</div>\n`;
        } else {
          code =
            `<div class="${twBg} rounded-lg" style="width: ${w}px; height: ${h}px">\n  <!-- Generated from Figma node -->\n</div>\n`;
        }
      } else if (styling === 'styled_components') {
        code =
          `import styled from "styled-components";\n\nconst Wrapper = styled.div\`\n  width: ${w}px;\n  height: ${h}px;\n  background-color: ${bgColor};\n  border-radius: 8px;\n\`;\n\nexport function ${name}() {\n  return <Wrapper>{/* Generated from Figma node */}</Wrapper>;\n}\n`;
      } else {
        if (framework === 'react') {
          code =
            `.${name.toLowerCase()} {\n  width: ${w}px;\n  height: ${h}px;\n  background-color: ${bgColor};\n  border-radius: 8px;\n}\n\nexport function ${name}() {\n  return <div className="${name.toLowerCase()}">{/* Generated from Figma node */}</div>;\n}\n`;
        } else if (framework === 'vue') {
          code =
            `<style scoped>\n.${name.toLowerCase()} {\n  width: ${w}px;\n  height: ${h}px;\n  background-color: ${bgColor};\n  border-radius: 8px;\n}\n</style>\n\n<template>\n  <div class="${name.toLowerCase()}"><!-- Generated from Figma node --></div>\n</template>\n`;
        } else if (framework === 'svelte') {
          code =
            `<style>\n  .${name.toLowerCase()} {\n    width: ${w}px;\n    height: ${h}px;\n    background-color: ${bgColor};\n    border-radius: 8px;\n  }\n</style>\n\n<div class="${name.toLowerCase()}"><!-- Generated from Figma node --></div>\n`;
        } else {
          code =
            `<style>\n.${name.toLowerCase()} {\n  width: ${w}px;\n  height: ${h}px;\n  background-color: ${bgColor};\n  border-radius: 8px;\n}\n</style>\n\n<div class="${name.toLowerCase()}"><!-- Generated from Figma node --></div>\n`;
        }
      }

      return {
        toolName: 'figma_generate_code',
        success: true,
        output:
          `Generated ${framework} component "${name}" with ${styling} styling from node ${node_id}:\n\n\`\`\`\n${code}\`\`\``,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'figma_generate_code',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const figma_list_components: Tool = {
  definition: {
    name: 'figma_list_components',
    description: 'List components in a Figma file',
    params: [
      {
        name: 'file_key',
        type: 'string',
        description: 'Figma file key from the URL',
        required: true,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const file_key = args.file_key;
      if (!file_key || typeof file_key !== 'string') {
        return {
          toolName: 'figma_list_components',
          success: false,
          output: '',
          error: 'file_key must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      const res = await figmaApi(`/files/${file_key}/components`);
      const data = await res.json();
      if (!res.ok) {
        return {
          toolName: 'figma_list_components',
          success: false,
          output: '',
          error: `Figma API error ${res.status}: ${JSON.stringify(data)}`,
          durationMs: Date.now() - start,
        };
      }
      const components = (data as Record<string, unknown>).meta?.components || [];
      return {
        toolName: 'figma_list_components',
        success: true,
        output: JSON.stringify(components, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'figma_list_components',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const figma_get_styles: Tool = {
  definition: {
    name: 'figma_get_styles',
    description: 'Get text, color, and effect styles from a Figma file',
    params: [
      {
        name: 'file_key',
        type: 'string',
        description: 'Figma file key from the URL',
        required: true,
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const file_key = args.file_key;
      if (!file_key || typeof file_key !== 'string') {
        return {
          toolName: 'figma_get_styles',
          success: false,
          output: '',
          error: 'file_key must be a non-empty string',
          durationMs: Date.now() - start,
        };
      }
      const res = await figmaApi(`/files/${file_key}/styles`);
      const data = await res.json();
      if (!res.ok) {
        return {
          toolName: 'figma_get_styles',
          success: false,
          output: '',
          error: `Figma API error ${res.status}: ${JSON.stringify(data)}`,
          durationMs: Date.now() - start,
        };
      }
      const styles = (data as Record<string, unknown>).meta?.styles || [];
      return {
        toolName: 'figma_get_styles',
        success: true,
        output: JSON.stringify(styles, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'figma_get_styles',
        success: false,
        output: '',
        error: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const tools: Tool[] = [
  figma_get_file,
  figma_extract_tokens,
  figma_generate_code,
  figma_list_components,
  figma_get_styles,
];
