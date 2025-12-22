// lint-staged configuration
// See research.md §2 for rationale on function syntax

module.exports = {
  // Type check - runs on full project (tsc needs full context)
  // Function syntax prevents lint-staged from appending file args
  '*.{ts,tsx}': () => 'tsc --noEmit',

  // Lint staged files with auto-fix
  '*.{ts,tsx,js,jsx}': (filenames) => [`eslint --fix ${filenames.map((f) => `"${f}"`).join(' ')}`],

  // Format staged files
  '*.{ts,tsx,js,jsx,json,md,css}': (filenames) =>
    `prettier --write ${filenames.map((f) => `"${f}"`).join(' ')}`,
}
