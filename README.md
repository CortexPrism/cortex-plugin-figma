# cortex-plugin-figma

Read Figma designs, extract design tokens, and generate frontend code.

## Installation

```bash
cortex plugin install marketplace:cortex-plugin-figma
cortex plugin install github:CortexPrism/cortex-plugin-figma
cortex plugin install ./manifest.json
```

## Tools

### figma_get_file

Get a Figma file by key.

- `file_key` (string, required) — Figma file key from URL
- `node_id` (string, optional) — Specific node ID

### figma_extract_tokens

Extract design tokens from a Figma node.

- `file_key` (string, required) — Figma file key
- `node_id` (string, required) — Node ID

### figma_generate_code

Generate frontend code from a Figma design.

- `file_key` (string, required) — Figma file key
- `node_id` (string, required) — Node ID
- `framework` (string, default: "react") — react, vue, svelte, html
- `styling` (string, default: "tailwind") — css, tailwind, styled_components

### figma_list_components

List components in a Figma file.

- `file_key` (string, required) — Figma file key

### figma_get_styles

Get text, color, and effect styles.

- `file_key` (string, required) — Figma file key

## Configuration

Set your Figma personal access token under the "Figma" section in plugin settings.

## Development

```bash
deno cache mod.ts
deno task test
deno fmt
deno lint
```

## License

MIT
