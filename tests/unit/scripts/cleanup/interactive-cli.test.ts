import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Finding } from '../../../../scripts/cleanup/types'

// Hoist mock functions to be available in vi.mock factories
const { mockExecFileSync, mockWriteFileSync, mockReadFileSync, mockExistsSync } = vi.hoisted(
  () => ({
    mockExecFileSync: vi.fn(),
    mockWriteFileSync: vi.fn(),
    mockReadFileSync: vi.fn(),
    mockExistsSync: vi.fn(),
  })
)

// Mock child_process for git operations
vi.mock('child_process', () => ({
  execFileSync: mockExecFileSync,
  default: { execFileSync: mockExecFileSync },
}))

// Mock fs for session persistence
vi.mock('fs', () => ({
  writeFileSync: mockWriteFileSync,
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
  default: {
    writeFileSync: mockWriteFileSync,
    readFileSync: mockReadFileSync,
    existsSync: mockExistsSync,
  },
}))

import {
  formatFindingDisplay,
  executeRemoval,
  executeUndo,
  type RemovalResult,
  type SessionState,
  saveSession,
  loadSession,
  batchRemoveSafeFindings,
} from '../../../../scripts/cleanup/interactive-cli'

// Sample findings for testing
const sampleFindings: Finding[] = [
  {
    id: 'export-unusedHelper-lib/utils.ts:15',
    category: 'export',
    name: 'unusedHelper',
    location: 'lib/utils.ts:15',
    context: 'Export "unusedHelper" is never imported',
    riskLevel: 'safe',
    confidence: 95,
    isDevOnly: false,
    references: [],
  },
  {
    id: 'dependency-lodash-package.json:10',
    category: 'dependency',
    name: 'lodash',
    location: 'package.json:10',
    context: 'Package "lodash" has no imports in the codebase',
    riskLevel: 'review',
    confidence: 85,
    isDevOnly: false,
    references: [],
  },
  {
    id: 'database-legacyLogs-lib/db/schema.ts:100',
    category: 'database',
    name: 'legacyLogs',
    location: 'lib/db/schema.ts:100',
    context: 'Table "legacyLogs" has no references in the codebase',
    riskLevel: 'dangerous',
    confidence: 75,
    isDevOnly: false,
    references: [],
  },
]

describe('interactive-cli', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatFindingDisplay (T053)', () => {
    it('should format finding with name and location', () => {
      const output = formatFindingDisplay(sampleFindings[0])

      expect(output).toContain('unusedHelper')
      expect(output).toContain('lib/utils.ts:15')
    })

    it('should include category', () => {
      const output = formatFindingDisplay(sampleFindings[0])

      expect(output).toMatch(/export/i)
    })

    it('should include risk level indicator', () => {
      const safeOutput = formatFindingDisplay(sampleFindings[0])
      const dangerousOutput = formatFindingDisplay(sampleFindings[2])

      expect(safeOutput).toMatch(/safe/i)
      expect(dangerousOutput).toMatch(/dangerous/i)
    })

    it('should include context description', () => {
      const output = formatFindingDisplay(sampleFindings[0])

      expect(output).toContain('never imported')
    })

    it('should include confidence percentage', () => {
      const output = formatFindingDisplay(sampleFindings[0])

      expect(output).toMatch(/95%|95 ?%/)
    })

    it('should mark dev-only findings', () => {
      const devFinding: Finding = {
        ...sampleFindings[0],
        isDevOnly: true,
      }
      const output = formatFindingDisplay(devFinding)

      expect(output).toMatch(/dev[- ]?only/i)
    })

    it('should format dangerous findings with warning', () => {
      const output = formatFindingDisplay(sampleFindings[2])

      expect(output).toMatch(/warning|caution|!/i)
    })
  })

  describe('executeRemoval (T054)', () => {
    it('should remove unused export using git rm or edit', () => {
      mockExecFileSync.mockReturnValue(Buffer.from(''))

      const result = executeRemoval(sampleFindings[0])

      expect(result.success).toBe(true)
      expect(result.findingId).toBe(sampleFindings[0].id)
    })

    it('should remove unused dependency from package.json', () => {
      mockExecFileSync.mockReturnValue(Buffer.from(''))

      const result = executeRemoval(sampleFindings[1])

      expect(result.success).toBe(true)
      expect(mockExecFileSync).toHaveBeenCalled()
    })

    it('should return error result on failure', () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('Git command failed')
      })

      const result = executeRemoval(sampleFindings[0])

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should store original content for undo', () => {
      mockExecFileSync.mockReturnValue(Buffer.from('original content'))

      const result = executeRemoval(sampleFindings[0])

      expect(result.originalState).toBeDefined()
    })

    it('should handle database findings with extra caution', () => {
      mockExecFileSync.mockReturnValue(Buffer.from(''))

      const result = executeRemoval(sampleFindings[2])

      // Database removals should have special handling
      expect(result.requiresConfirmation).toBe(true)
    })

    it('should track file modifications', () => {
      mockExecFileSync.mockReturnValue(Buffer.from(''))

      const result = executeRemoval(sampleFindings[0])

      expect(result.filesModified).toBeDefined()
      expect(result.filesModified?.length).toBeGreaterThan(0)
    })
  })

  describe('executeUndo (T055)', () => {
    it('should restore file using git checkout', () => {
      mockExecFileSync.mockReturnValue(Buffer.from(''))

      const removalResult: RemovalResult = {
        success: true,
        findingId: sampleFindings[0].id,
        originalState: 'original content',
        filesModified: ['lib/utils.ts'],
      }

      const result = executeUndo(removalResult)

      expect(result.success).toBe(true)
      expect(mockExecFileSync).toHaveBeenCalledWith('git', expect.any(Array), expect.any(Object))
    })

    it('should restore multiple files if needed', () => {
      mockExecFileSync.mockReturnValue(Buffer.from(''))

      const removalResult: RemovalResult = {
        success: true,
        findingId: 'test',
        originalState: 'original',
        filesModified: ['file1.ts', 'file2.ts'],
      }

      const result = executeUndo(removalResult)

      expect(result.success).toBe(true)
      expect(result.filesRestored).toEqual(['file1.ts', 'file2.ts'])
    })

    it('should return error if no original state', () => {
      const removalResult: RemovalResult = {
        success: true,
        findingId: 'test',
        filesModified: ['file.ts'],
      }

      const result = executeUndo(removalResult)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No original state')
    })

    it('should handle git restore failure gracefully', () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('Git restore failed')
      })

      const removalResult: RemovalResult = {
        success: true,
        findingId: 'test',
        originalState: 'content',
        filesModified: ['file.ts'],
      }

      const result = executeUndo(removalResult)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('session persistence (T061)', () => {
    it('should save session state to file', () => {
      const session: SessionState = {
        startedAt: new Date().toISOString(),
        findings: sampleFindings,
        processed: ['id1'],
        removed: ['id2'],
        skipped: ['id3'],
        history: [],
      }

      saveSession(session, '/tmp/cleanup-session.json')

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/tmp/cleanup-session.json',
        expect.any(String)
      )
    })

    it('should load session state from file', () => {
      const session: SessionState = {
        startedAt: new Date().toISOString(),
        findings: sampleFindings,
        processed: [],
        removed: [],
        skipped: [],
        history: [],
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(session))

      const loaded = loadSession('/tmp/cleanup-session.json')

      expect(loaded).toBeDefined()
      expect(loaded?.findings.length).toBe(3)
    })

    it('should return null if no session file exists', () => {
      mockExistsSync.mockReturnValue(false)

      const loaded = loadSession('/tmp/cleanup-session.json')

      expect(loaded).toBeNull()
    })

    it('should track processed findings', () => {
      const session: SessionState = {
        startedAt: new Date().toISOString(),
        findings: sampleFindings,
        processed: [sampleFindings[0].id],
        removed: [sampleFindings[0].id],
        skipped: [],
        history: [],
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(session))

      const loaded = loadSession('/tmp/cleanup-session.json')

      expect(loaded?.processed).toContain(sampleFindings[0].id)
    })

    it('should preserve history for undo operations', () => {
      const removalResult: RemovalResult = {
        success: true,
        findingId: sampleFindings[0].id,
        originalState: 'content',
        filesModified: ['file.ts'],
      }

      const session: SessionState = {
        startedAt: new Date().toISOString(),
        findings: sampleFindings,
        processed: [sampleFindings[0].id],
        removed: [sampleFindings[0].id],
        skipped: [],
        history: [removalResult],
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(session))

      const loaded = loadSession('/tmp/cleanup-session.json')

      expect(loaded?.history.length).toBe(1)
      expect(loaded?.history[0].originalState).toBe('content')
    })
  })

  describe('batch mode (T062)', () => {
    it('should only process safe findings in batch mode', () => {
      mockExecFileSync.mockReturnValue(Buffer.from(''))

      const results = batchRemoveSafeFindings(sampleFindings)

      // Should only process the safe finding, not review or dangerous
      expect(results.processed).toBe(1)
      expect(results.skipped).toBe(2)
    })

    it('should return summary of batch operations', () => {
      mockExecFileSync.mockReturnValue(Buffer.from(''))

      const results = batchRemoveSafeFindings(sampleFindings)

      expect(results).toHaveProperty('processed')
      expect(results).toHaveProperty('skipped')
      expect(results).toHaveProperty('failed')
      expect(results).toHaveProperty('details')
    })

    it('should not process dangerous findings', () => {
      mockExecFileSync.mockReturnValue(Buffer.from(''))

      const dangerousOnly = [sampleFindings[2]]
      const results = batchRemoveSafeFindings(dangerousOnly)

      expect(results.processed).toBe(0)
      expect(results.skipped).toBe(1)
    })

    it('should continue on individual failures', () => {
      let callCount = 0
      mockExecFileSync.mockImplementation(() => {
        callCount++
        // The first finding calls execFileSync twice:
        // 1. git show (get original content) - succeeds
        // 2. git add (actual removal) - we make this fail
        if (callCount === 2) {
          throw new Error('First removal failed')
        }
        return Buffer.from('')
      })

      const safeFindings = [
        { ...sampleFindings[0], id: 'safe1' },
        { ...sampleFindings[0], id: 'safe2' },
      ]

      const results = batchRemoveSafeFindings(safeFindings)

      expect(results.failed).toBe(1)
      expect(results.processed).toBe(1)
    })

    it('should collect all removal results', () => {
      mockExecFileSync.mockReturnValue(Buffer.from(''))

      const results = batchRemoveSafeFindings(sampleFindings)

      expect(results.details.length).toBeGreaterThan(0)
    })
  })
})
