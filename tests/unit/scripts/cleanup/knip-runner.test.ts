import { describe, it, expect } from 'vitest'
import type { Finding } from '../../../../scripts/cleanup/types'
import { parseKnipOutput, mapKnipToFindings } from '../../../../scripts/cleanup/knip-runner'

// Sample Knip JSON output for testing
const mockKnipOutput = {
  files: ['tests/e2e/auth.setup.ts'],
  issues: [
    {
      file: 'package.json',
      dependencies: [],
      devDependencies: [
        { name: '@eslint/compat', line: 49, col: 6, pos: 1526 },
        { name: 'supertest', line: 80, col: 6, pos: 2569 },
      ],
      optionalPeerDependencies: [],
      unlisted: [],
      binaries: [],
      unresolved: [],
      exports: [],
      types: [],
      enumMembers: {},
      duplicates: [],
      catalog: [],
    },
    {
      file: 'auth.ts',
      dependencies: [],
      devDependencies: [],
      optionalPeerDependencies: [],
      unlisted: [],
      binaries: [],
      unresolved: [],
      exports: [{ name: 'signOut', line: 14, col: 34, pos: 358 }],
      types: [],
      enumMembers: {},
      duplicates: [],
      catalog: [],
    },
    {
      file: 'types/index.ts',
      dependencies: [],
      devDependencies: [],
      optionalPeerDependencies: [],
      unlisted: [],
      binaries: [],
      unresolved: [],
      exports: [
        { name: 'UserSchema', line: 19, col: 3, pos: 242 },
        { name: 'PublicUserSchema', line: 20, col: 3, pos: 256 },
      ],
      types: [
        { name: 'Flashcard', line: 12, col: 3, pos: 153 },
        { name: 'FSRSCard', line: 13, col: 3, pos: 166 },
      ],
      enumMembers: {},
      duplicates: [],
      catalog: [],
    },
  ],
}

describe('knip-runner', () => {
  describe('parseKnipOutput', () => {
    it('should parse valid JSON output from Knip', () => {
      const result = parseKnipOutput(JSON.stringify(mockKnipOutput))

      expect(result).toHaveProperty('files')
      expect(result).toHaveProperty('issues')
      expect(result.files).toContain('tests/e2e/auth.setup.ts')
    })

    it('should throw on invalid JSON', () => {
      expect(() => parseKnipOutput('not valid json')).toThrow()
    })

    it('should handle empty output', () => {
      const result = parseKnipOutput('{"files":[],"issues":[]}')

      expect(result.files).toEqual([])
      expect(result.issues).toEqual([])
    })

    it('should strip dotenv prefix messages before parsing', () => {
      const outputWithPrefix = '[dotenv@17.2.3] injecting env...\n' + JSON.stringify(mockKnipOutput)

      const result = parseKnipOutput(outputWithPrefix)
      expect(result.files).toContain('tests/e2e/auth.setup.ts')
    })
  })

  describe('mapKnipToFindings', () => {
    it('should map unused files to file findings', () => {
      const findings = mapKnipToFindings(mockKnipOutput)

      const fileFindings = findings.filter(
        (f: Finding) => f.category === 'file' || f.category === 'test'
      )
      expect(fileFindings.length).toBeGreaterThanOrEqual(1)
      expect(fileFindings[0].name).toBe('tests/e2e/auth.setup.ts')
      expect(fileFindings[0].location).toBe('tests/e2e/auth.setup.ts')
    })

    it('should map unused exports to export findings', () => {
      const findings = mapKnipToFindings(mockKnipOutput)

      const exportFindings = findings.filter((f: Finding) => f.category === 'export')
      expect(exportFindings.length).toBeGreaterThanOrEqual(1)

      const signOutFinding = exportFindings.find((f: Finding) => f.name === 'signOut')
      expect(signOutFinding).toBeDefined()
      expect(signOutFinding?.location).toBe('auth.ts:14')
    })

    it('should map unused types to type findings', () => {
      const findings = mapKnipToFindings(mockKnipOutput)

      const typeFindings = findings.filter((f: Finding) => f.category === 'type')
      expect(typeFindings.length).toBeGreaterThanOrEqual(1)

      const flashcardType = typeFindings.find((f: Finding) => f.name === 'Flashcard')
      expect(flashcardType).toBeDefined()
    })

    it('should map unused devDependencies to dependency findings', () => {
      const findings = mapKnipToFindings(mockKnipOutput)

      const depFindings = findings.filter((f: Finding) => f.category === 'dependency')
      expect(depFindings.length).toBeGreaterThanOrEqual(1)

      const supertestDep = depFindings.find((f: Finding) => f.name === 'supertest')
      expect(supertestDep).toBeDefined()
      expect(supertestDep?.isDevOnly).toBe(true)
    })

    it('should assign appropriate risk levels', () => {
      const findings = mapKnipToFindings(mockKnipOutput)

      // Unused files in tests should be lower risk
      const testFileFinding = findings.find(
        (f: Finding) =>
          (f.category === 'file' || f.category === 'test') && f.location.includes('tests/')
      )
      if (testFileFinding) {
        expect(['safe', 'review']).toContain(testFileFinding.riskLevel)
      }

      // devDependencies should typically be safe
      const devDepFinding = findings.find(
        (f: Finding) => f.category === 'dependency' && f.isDevOnly
      )
      if (devDepFinding) {
        expect(devDepFinding.riskLevel).toBe('safe')
      }
    })

    it('should flag exports from index files as needing review', () => {
      const outputWithIndexExport = {
        files: [],
        issues: [
          {
            file: 'lib/index.ts',
            dependencies: [],
            devDependencies: [],
            optionalPeerDependencies: [],
            unlisted: [],
            binaries: [],
            unresolved: [],
            exports: [{ name: 'publicApi', line: 1, col: 1, pos: 0 }],
            types: [],
            enumMembers: {},
            duplicates: [],
            catalog: [],
          },
        ],
      }

      const findings = mapKnipToFindings(outputWithIndexExport)
      const indexExport = findings.find((f: Finding) => f.location.includes('index.ts'))

      // Exports from index files might be public API - should be review
      expect(indexExport).toBeDefined()
      expect(['review', 'dangerous']).toContain(indexExport?.riskLevel)
    })

    it('should mark dev-only items appropriately', () => {
      const findings = mapKnipToFindings(mockKnipOutput)

      // Test files should be marked as dev-only
      const testFileFinding = findings.find((f: Finding) => f.location.includes('tests/'))
      if (testFileFinding) {
        expect(testFileFinding.isDevOnly).toBe(true)
      }

      // devDependencies should be marked as dev-only
      const devDepFinding = findings.find(
        (f: Finding) => f.category === 'dependency' && f.name === 'supertest'
      )
      if (devDepFinding) {
        expect(devDepFinding.isDevOnly).toBe(true)
      }
    })

    it('should generate unique IDs for each finding', () => {
      const findings = mapKnipToFindings(mockKnipOutput)

      const ids = findings.map((f: Finding) => f.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(findings.length)
    })

    it('should include context for each finding', () => {
      const findings = mapKnipToFindings(mockKnipOutput)

      findings.forEach((finding: Finding) => {
        expect(finding.context).toBeDefined()
        expect(finding.context.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Risk Level Assignment (T008)', () => {
    it('should assign safe risk to clearly unused dev dependencies', () => {
      const findings = mapKnipToFindings(mockKnipOutput)
      const devDeps = findings.filter((f: Finding) => f.category === 'dependency' && f.isDevOnly)

      devDeps.forEach((dep: Finding) => {
        expect(dep.riskLevel).toBe('safe')
      })
    })

    it('should assign review risk to exports that might be public API', () => {
      const outputWithIndexExport = {
        files: [],
        issues: [
          {
            file: 'lib/index.ts',
            dependencies: [],
            devDependencies: [],
            optionalPeerDependencies: [],
            unlisted: [],
            binaries: [],
            unresolved: [],
            exports: [{ name: 'publicApi', line: 1, col: 1, pos: 0 }],
            types: [],
            enumMembers: {},
            duplicates: [],
            catalog: [],
          },
        ],
      }

      const findings = mapKnipToFindings(outputWithIndexExport)
      const indexExport = findings.find((f: Finding) => f.location.includes('index.ts'))

      expect(indexExport).toBeDefined()
      expect(['review', 'dangerous']).toContain(indexExport?.riskLevel)
    })
  })

  describe('Dependency Detection (T009)', () => {
    it('should detect unused production dependencies', () => {
      const outputWithProdDeps = {
        files: [],
        issues: [
          {
            file: 'package.json',
            dependencies: [{ name: 'unused-prod-package', line: 20, col: 6, pos: 500 }],
            devDependencies: [],
            optionalPeerDependencies: [],
            unlisted: [],
            binaries: [],
            unresolved: [],
            exports: [],
            types: [],
            enumMembers: {},
            duplicates: [],
            catalog: [],
          },
        ],
      }

      const findings = mapKnipToFindings(outputWithProdDeps)
      const prodDep = findings.find(
        (f: Finding) => f.category === 'dependency' && f.name === 'unused-prod-package'
      )

      expect(prodDep).toBeDefined()
      expect(prodDep?.isDevOnly).toBe(false)
    })

    it('should separate dev from production dependencies', () => {
      const mixedOutput = {
        files: [],
        issues: [
          {
            file: 'package.json',
            dependencies: [{ name: 'prod-pkg', line: 15, col: 6, pos: 300 }],
            devDependencies: [{ name: 'dev-pkg', line: 50, col: 6, pos: 1500 }],
            optionalPeerDependencies: [],
            unlisted: [],
            binaries: [],
            unresolved: [],
            exports: [],
            types: [],
            enumMembers: {},
            duplicates: [],
            catalog: [],
          },
        ],
      }

      const findings = mapKnipToFindings(mixedOutput)

      const prodDep = findings.find((f: Finding) => f.name === 'prod-pkg')
      const devDep = findings.find((f: Finding) => f.name === 'dev-pkg')

      expect(prodDep?.isDevOnly).toBe(false)
      expect(devDep?.isDevOnly).toBe(true)
    })

    it('should assign higher risk to production dependencies', () => {
      const outputWithProdDeps = {
        files: [],
        issues: [
          {
            file: 'package.json',
            dependencies: [{ name: 'possibly-used', line: 20, col: 6, pos: 500 }],
            devDependencies: [{ name: 'definitely-unused', line: 60, col: 6, pos: 2000 }],
            optionalPeerDependencies: [],
            unlisted: [],
            binaries: [],
            unresolved: [],
            exports: [],
            types: [],
            enumMembers: {},
            duplicates: [],
            catalog: [],
          },
        ],
      }

      const findings = mapKnipToFindings(outputWithProdDeps)

      const prodDep = findings.find((f: Finding) => f.name === 'possibly-used')
      const devDep = findings.find((f: Finding) => f.name === 'definitely-unused')

      // Production deps should be review, dev deps should be safe
      expect(prodDep?.riskLevel).toBe('review')
      expect(devDep?.riskLevel).toBe('safe')
    })
  })
})

// Separate describe block for tests that require mocking
describe('knip-runner runKnipAnalysis', () => {
  // These tests would require proper mocking setup
  // For now, we test the integration with real Knip output
  it.skip('should execute Knip with JSON reporter', async () => {
    // This test requires child_process mocking
    // Skipped for now - can be tested with integration tests
  })

  it.skip('should include timing information', async () => {
    // This test requires child_process mocking
  })

  it.skip('should handle Knip execution errors gracefully', async () => {
    // This test requires child_process mocking
  })

  it.skip('should support production mode for dependency analysis', async () => {
    // This test requires child_process mocking
  })

  it.skip('should support dependencies-only mode', async () => {
    // This test requires child_process mocking
  })
})

// T028: Orphaned Test Detection Tests
describe('Orphaned Test Detection (T028)', () => {
  it('should categorize test files as "test" category', () => {
    const outputWithTestFile = {
      files: ['tests/unit/old-feature.test.ts', 'tests/e2e/removed.spec.ts'],
      issues: [],
    }

    const findings = mapKnipToFindings(outputWithTestFile)

    const testFindings = findings.filter((f: Finding) => f.category === 'test')
    expect(testFindings.length).toBe(2)
    expect(testFindings[0].name).toBe('tests/unit/old-feature.test.ts')
    expect(testFindings[1].name).toBe('tests/e2e/removed.spec.ts')
  })

  it('should detect orphaned test files (never imported)', () => {
    const outputWithOrphanedTest = {
      files: ['tests/unit/deleted-component.test.ts'],
      issues: [],
    }

    const findings = mapKnipToFindings(outputWithOrphanedTest)

    const orphanedTest = findings.find(
      (f: Finding) => f.name === 'tests/unit/deleted-component.test.ts'
    )
    expect(orphanedTest).toBeDefined()
    expect(orphanedTest?.category).toBe('test')
    expect(orphanedTest?.isDevOnly).toBe(true)
  })

  it('should detect test files with unresolved imports', () => {
    const outputWithUnresolvedImport = {
      files: [],
      issues: [
        {
          file: 'tests/unit/feature.test.ts',
          dependencies: [],
          devDependencies: [],
          optionalPeerDependencies: [],
          unlisted: [],
          binaries: [],
          unresolved: [{ name: '@/lib/deleted-module', line: 1, col: 20, pos: 20 }],
          exports: [],
          types: [],
          enumMembers: {},
          duplicates: [],
          catalog: [],
        },
      ],
    }

    const findings = mapKnipToFindings(outputWithUnresolvedImport)

    // Unresolved imports in test files indicate orphaned tests
    const unresolvedFinding = findings.find(
      (f: Finding) => f.category === 'test' && f.name.includes('deleted-module')
    )
    expect(unresolvedFinding).toBeDefined()
    expect(unresolvedFinding?.riskLevel).toBe('safe') // Test-only, safe to remove
  })

  it('should mark orphaned tests as dev-only', () => {
    const outputWithTestFile = {
      files: ['tests/integration/api.test.ts'],
      issues: [],
    }

    const findings = mapKnipToFindings(outputWithTestFile)

    const testFinding = findings.find((f: Finding) => f.name === 'tests/integration/api.test.ts')
    expect(testFinding?.isDevOnly).toBe(true)
  })

  it('should assign safe risk level to orphaned tests', () => {
    const outputWithTestFile = {
      files: ['tests/component/Button.test.tsx'],
      issues: [],
    }

    const findings = mapKnipToFindings(outputWithTestFile)

    const testFinding = findings.find((f: Finding) => f.name === 'tests/component/Button.test.tsx')
    expect(testFinding?.riskLevel).toBe('safe')
  })

  it('should match various test file patterns', () => {
    const outputWithVariousTests = {
      files: [
        'tests/unit/utils.test.ts',
        'tests/e2e/auth.spec.ts',
        'src/components/__tests__/Modal.test.tsx',
        'lib/helpers.spec.ts',
      ],
      issues: [],
    }

    const findings = mapKnipToFindings(outputWithVariousTests)

    const testFindings = findings.filter((f: Finding) => f.category === 'test')
    expect(testFindings.length).toBe(4)

    // All should be marked as dev-only and safe
    testFindings.forEach((f: Finding) => {
      expect(f.isDevOnly).toBe(true)
      expect(f.riskLevel).toBe('safe')
    })
  })

  it('should include context explaining why test is orphaned', () => {
    const outputWithTestFile = {
      files: ['tests/unit/legacy.test.ts'],
      issues: [],
    }

    const findings = mapKnipToFindings(outputWithTestFile)

    const testFinding = findings.find((f: Finding) => f.name === 'tests/unit/legacy.test.ts')
    expect(testFinding?.context).toContain('never imported')
  })
})
