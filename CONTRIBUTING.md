# Contributing to OmniTrade

Thank you for your interest in contributing to OmniTrade! 🎉

## Quick Start

```bash
# Clone the repo
git clone https://github.com/Connectry-io/omnitrade-mcp.git
cd omnitrade-mcp

# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start
```

## Development

### Project Structure

```
omnitrade-mcp/
├── src/
│   ├── cli.ts          # CLI interface and setup wizard
│   ├── index.ts        # MCP server entry point
│   ├── config/         # Configuration management
│   ├── exchanges/      # Exchange connection handling
│   ├── tools/          # MCP tools (trading, portfolio, etc.)
│   └── types/          # TypeScript type definitions
├── dist/               # Compiled output
└── scripts/            # Utility scripts
```

### Adding a New Tool

1. Create a new file in `src/tools/`
2. Export a function that registers the tool with the MCP server
3. Import and call it in `src/index.ts`

Example:
```typescript
// src/tools/my-tool.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerMyTool(server: McpServer) {
  server.tool(
    'my_tool_name',
    'Description of what this tool does',
    {
      param1: z.string().describe('Parameter description'),
    },
    async ({ param1 }) => {
      // Implementation
      return {
        content: [{ type: 'text', text: 'Result' }],
      };
    }
  );
}
```

### Code Style

- Use TypeScript strict mode
- Follow existing patterns in the codebase
- Add JSDoc comments for public APIs
- Keep functions focused and small

### Testing

```bash
# Run the build to check for type errors
npm run build
```

## Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `npm run build` to ensure no errors
5. Commit with a clear message
6. Push to your fork
7. Open a Pull Request

### PR Guidelines

- Keep PRs focused on a single change
- Update documentation if needed
- Add tests for new features
- Reference any related issues

## Reporting Issues

- Check existing issues first
- Use the issue templates
- Include reproduction steps
- Share relevant logs (redact sensitive info!)

## Security

Found a security issue? Please email security@connectry.io instead of opening a public issue.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Questions? Open a [Discussion](https://github.com/Connectry-io/omnitrade-mcp/discussions) or reach out to the team.
