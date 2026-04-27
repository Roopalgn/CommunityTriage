# Contributing to CommunityTriage

Thank you for your interest in contributing! This project was built for the Google Solution Challenge 2026 under the Smart Resource Allocation theme.

## Getting started

1. Fork and clone the repository.
2. Copy `.env.example` to `.env.local` and add your Gemini API key.
3. Run `npm start` to start the development server on port 3000.
4. Open `http://localhost:3000` in your browser.

## Development workflow

- Run `npm run check:syntax` to validate JavaScript files.
- Run `npm test` to execute unit and integration tests.
- Run `npm run evaluate:offline` to verify extraction quality with the offline baseline.

## Code style

- Use vanilla JavaScript (no transpiler or bundler required).
- Follow existing naming conventions and indentation.
- Keep functions focused and small.
- Use `sanitize()` for all user-facing HTML output.

## Submitting changes

1. Create a feature branch from `main`.
2. Make focused, well-described commits.
3. Ensure all checks pass before opening a pull request.
4. Describe the motivation and impact in your PR description.

## Reporting issues

Open a GitHub issue with a clear description, steps to reproduce, and expected behavior.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
