module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation
        "style", // Formatting, no code change
        "refactor", // Code change that neither fixes bug nor adds feature
        "perf", // Performance improvement
        "test", // Adding tests
        "chore", // Maintenance
        "revert", // Revert commit
        "ci", // CI/CD changes
        "build", // Build system changes
        "wip", // Work in progress
      ],
    ],
    "subject-case": [0], // Allow any case in subject
    "body-max-line-length": [0], // No limit on body line length
  },
};
