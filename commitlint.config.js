module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'refactor',  // Code refactoring (no feature or bug fix)
        'perf',      // Performance improvement
        'docs',      // Documentation updates
        'test',      // Test additions or modifications
        'chore',     // Maintenance tasks (dependencies, etc.)
        'style',     // Code style changes (formatting, etc.)
        'ci',        // CI/CD configuration changes
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'ui',            // UI components
        'api',           // API routes and endpoints
        'db',            // Database, migrations, RLS
        'permissions',   // Permission logic and RBAC
        'admin',         // Admin-only features
        'import',        // Data import functionality
        'slack',         // Slack integration
        'auth',          // Authentication and sessions
        'types',         // TypeScript types and interfaces
        'migrations',    // Database migrations
        'docs',          // Documentation
        'ci',            // CI/CD pipeline
      ],
    ],
    'type-case': [2, 'always', 'lowercase'],
    'scope-case': [2, 'always', 'lowercase'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-empty': [2, 'never'],
    'header-max-length': [2, 'always', 72],
  },
};
