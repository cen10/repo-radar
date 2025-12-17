# Repo Radar

A personalized GitHub repository momentum dashboard that tracks star growth, releases, and issue activity across your starred repositories.

## 📊 Key Features

- Track star growth across starred repositories
- Monitor release cycles and versioning patterns
- Analyze issue/PR velocity and engagement metrics
- Personalized dashboard with customizable views
- GitHub OAuth authentication
- Real-time data synchronization

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Supabase account (for backend)
- GitHub OAuth app credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/cen10/repo-radar.git
cd repo-radar

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local and add your Supabase credentials

# Start development server
npm run dev
```

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS with Headless UI
- **State Management**: TanStack Query (React Query)
- **Authentication**: Supabase Auth with GitHub OAuth
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier

## 📁 Repository Structure

This project uses an intentional directory structure inspired by [GitHub Spec Kit](https://github.com/github/spec-kit), separating application code from project documentation:

```
repo-radar/
├── src/                # Application source code
│   ├── components/     # React components
│   ├── pages/         # Route pages
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API clients
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript interfaces
│   └── test/          # Test utilities and mocks
├── public/            # Static assets
├── specs/             # Project specifications and planning
├── docs/              # Documentation
├── guides/            # User guides and tutorials (future)
└── dist/              # Production build (generated)
```

This structure provides clear separation between executable code and documentation, allowing the project to scale with additional documentation folders without cluttering the application directory.

## 📜 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
npm run typecheck    # Run TypeScript type checking
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup

1. Create a new Supabase project
2. Enable GitHub OAuth in Authentication settings
3. Copy your project URL and anon key to `.env.local`
4. Set up Row Level Security (RLS) policies as needed

### ESLint Configuration (Advanced)

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Remove tseslint.configs.recommended and replace with:
      ...tseslint.configs.recommendedTypeChecked,
      // Or use stricter rules:
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add stylistic rules:
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

## 🧪 Testing

The project uses Vitest for unit and integration testing:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## 📝 Development

### Development Guidelines

- Follow TDD: Write tests first
- Use TypeScript strict mode
- Maintain >80% test coverage
- Implement accessibility (WCAG 2.1 AA)
- Run `npm run format` after creating/editing files
- Update task tracking when completing features

### Key Resources

- **Development Guidelines**: See [CLAUDE.md](./CLAUDE.md) for AI pair programming context
- **Task Tracking**: See [specs/001-develop-a-personalized/tasks.md](./specs/001-develop-a-personalized/tasks.md)
- **Project Specifications**: See [specs/](./specs/) directory

## 🚀 Deployment

The application can be deployed to any static hosting service:

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

The `dist/` directory contains the production-ready files.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC

---

*Built with ❤️ for the GitHub community*