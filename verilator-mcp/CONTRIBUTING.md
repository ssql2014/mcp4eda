# Contributing to Verilator MCP

We welcome contributions to the Verilator MCP project! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/verilator-mcp.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests: `npm test`
6. Commit your changes: `git commit -m "feat: Add new feature"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run in development mode
npm run dev
```

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Add JSDoc comments for public APIs
- Write tests for new features

## Commit Messages

We follow the Conventional Commits specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions or modifications
- `chore:` Build process or auxiliary tool changes

## Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Add integration tests for complex features

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the NATURAL_LANGUAGE_GUIDE.md if adding new NL queries
3. Ensure your PR description clearly describes the problem and solution
4. Link any relevant issues

## Adding New Tools

To add a new Verilator tool:

1. Create a new tool class in `src/tools/`
2. Extend the `AbstractTool` base class
3. Implement required methods
4. Add tool to `src/index.ts`
5. Update documentation
6. Add tests

## Adding Natural Language Queries

1. Update the classifier training in `natural-language.ts`
2. Add handler for new query type
3. Update `NATURAL_LANGUAGE_GUIDE.md` with examples
4. Add tests for the new queries

## Questions?

Feel free to open an issue for any questions about contributing!