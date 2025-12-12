# Pre-commit Hooks Setup

This project uses pre-commit hooks to ensure code quality and consistency before commits.

## How It Works

When you run `git commit`, the following happens automatically:

1. **Husky** triggers the pre-commit hook
2. **lint-staged** runs only on the files you're committing
3. For TypeScript/TSX files:
   - ESLint fixes any auto-fixable issues
   - Prettier formats the code
4. For other files (JS, JSON, CSS, MD):
   - Prettier formats the code
5. If all checks pass, the commit proceeds
6. If any check fails, the commit is aborted

## What Gets Checked

- **TypeScript/TSX files** (`app/src/**/*.{ts,tsx}`):
  - ESLint with auto-fix
  - Prettier formatting
- **Other source files** (`app/src/**/*.{js,jsx,json,css,md}`):
  - Prettier formatting
- **Root config files** (`app/*.{js,ts,json}`):
  - Prettier formatting

## Installation

The hooks are automatically installed when you run:
```bash
npm install  # from root directory
```

This triggers the `prepare` script which sets up Husky.

## Bypassing Hooks (Emergency Only)

If you need to bypass the hooks in an emergency:
```bash
git commit --no-verify -m "Emergency fix"
```

⚠️ **Use sparingly** - this defeats the purpose of having hooks!

## Troubleshooting

### Hooks not running?
```bash
# Reinstall husky
npx husky install
```

### Lint-staged not found?
```bash
# Install dependencies at root
npm install
```

### Want to test hooks without committing?
```bash
# Run lint-staged manually
npx lint-staged
```

## Configuration

- **Husky config**: `.husky/pre-commit`
- **Lint-staged config**: `package.json` (root) → `lint-staged` section
- **Prettier config**: `app/.prettierrc` (if exists) or defaults
- **ESLint config**: `app/eslint.config.js`

## Benefits

✅ No more "fix formatting" commits
✅ Consistent code style across team
✅ Catch linting errors before CI
✅ Only checks changed files (fast!)
✅ Automatically fixes what can be fixed