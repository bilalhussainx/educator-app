# Contributing to CoreZenith

Thank you for your interest in contributing to CoreZenith! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Set up the development environment** following the [README.md](./README.md)
4. **Create a branch** for your feature or fix

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Python 3.11+ (for AI services)

### Quick Start

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/corezenith.git
cd corezenith

# Backend setup
cd educators-edge-backend
npm install
cp .env.example .env
npm run dev

# Frontend setup (new terminal)
cd educators-edge-frontend
npm install
cp .env.example .env.local
npm run dev
```

## Code Style

### TypeScript (Frontend)

- Use strict mode
- Prefer functional components with hooks
- Use meaningful variable and function names
- Add TypeScript types for all props and state

### JavaScript (Backend)

- Use async/await over callbacks
- Handle errors appropriately
- Use meaningful variable names
- Add JSDoc comments for complex functions

### General Guidelines

- Keep functions small and focused
- Write self-documenting code
- Add comments only when necessary to explain "why"
- Follow existing patterns in the codebase

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add essay export to PDF
fix: resolve WebSocket connection timeout
docs: update installation instructions
refactor: simplify AI pipeline orchestration
test: add unit tests for essay service
```

Format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features
3. **Ensure all tests pass** before submitting
4. **Update the README** if needed
5. **Request review** from maintainers

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
How was this tested?

## Screenshots (if applicable)
```

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

### Feature Requests

Include:
- Clear description of the feature
- Use case / problem it solves
- Proposed implementation (if any)

## Project Structure

```
corezenith/
├── educators-edge-frontend/    # React TypeScript frontend
├── educators-edge-backend/     # Node.js/Express backend
├── docs/                       # Documentation
│   ├── guides/                # Setup guides
│   ├── features/              # Feature docs
│   └── troubleshooting/       # Troubleshooting
└── scripts/                   # Utility scripts
```

## AI Services Development

When working on AI services:

1. **Test locally** before deploying
2. **Use mock responses** for development to save API costs
3. **Add rate limiting** for any exposed endpoints
4. **Log AI interactions** for debugging
5. **Handle API failures gracefully**

## Questions?

- Open an issue on GitHub
- Check existing documentation in `/docs`
- Review the [Architecture docs](./docs/ARCHITECTURE.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
