import { describe, it, expect } from 'vitest'
import type { Finding } from '../../../../scripts/cleanup/types'
import {
  parseEnvFile,
  findEnvReferences,
  analyzeEnvironment,
} from '../../../../scripts/cleanup/env-analyzer'

// Sample .env.example content for testing
const mockEnvExample = `
# Database
DATABASE_URL=postgresql://localhost:5432/mydb

# Authentication
AUTH_SECRET=your-secret-here
AUTH_URL=http://localhost:3000

# AI Services
ANTHROPIC_API_KEY=your-anthropic-key
JINA_API_KEY=your-jina-key

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
RESEND_API_KEY=your-resend-key

# Legacy/unused
LEGACY_API_URL=http://old-api.example.com
UNUSED_FEATURE_FLAG=false
`

// Sample codebase files that reference env vars
const mockCodebaseFiles = {
  'lib/env.ts': `
    export const env = {
      DATABASE_URL: process.env.DATABASE_URL!,
      AUTH_SECRET: process.env.AUTH_SECRET!,
      AUTH_URL: process.env.AUTH_URL!,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    };
  `,
  'lib/db/connection.ts': `
    import { env } from '../env';
    const connectionString = env.DATABASE_URL;
  `,
  'next.config.ts': `
    const nextConfig = {
      env: {
        NEXT_PUBLIC_AUTH_URL: process.env.AUTH_URL,
      },
    };
    export default nextConfig;
  `,
  'drizzle.config.ts': `
    export default {
      dbCredentials: {
        url: process.env.DATABASE_URL!,
      },
    };
  `,
  'lib/email/smtp.ts': `
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
    };
  `,
}

describe('env-analyzer', () => {
  describe('parseEnvFile (T033)', () => {
    it('should parse env file and extract variable names', () => {
      const envVars = parseEnvFile(mockEnvExample)

      expect(envVars).toContain('DATABASE_URL')
      expect(envVars).toContain('AUTH_SECRET')
      expect(envVars).toContain('ANTHROPIC_API_KEY')
      expect(envVars).toContain('LEGACY_API_URL')
    })

    it('should ignore comments', () => {
      const envVars = parseEnvFile(mockEnvExample)

      expect(envVars).not.toContain('# Database')
      expect(envVars).not.toContain('Database')
    })

    it('should ignore empty lines', () => {
      const envVars = parseEnvFile(mockEnvExample)

      expect(envVars).not.toContain('')
      expect(envVars.length).toBeGreaterThan(0)
    })

    it('should handle env file with various formats', () => {
      const envContent = `
VAR1=value1
VAR2="quoted value"
VAR3='single quoted'
VAR4=
EMPTY_VALUE=
      `

      const envVars = parseEnvFile(envContent)

      expect(envVars).toContain('VAR1')
      expect(envVars).toContain('VAR2')
      expect(envVars).toContain('VAR3')
      expect(envVars).toContain('VAR4')
      expect(envVars).toContain('EMPTY_VALUE')
    })

    it('should return empty array for empty file', () => {
      const envVars = parseEnvFile('')
      expect(envVars).toEqual([])
    })

    it('should return empty array for file with only comments', () => {
      const envVars = parseEnvFile('# Just a comment\n# Another comment')
      expect(envVars).toEqual([])
    })
  })

  describe('findEnvReferences (T034)', () => {
    it('should find process.env.VAR_NAME references', () => {
      const refs = findEnvReferences('DATABASE_URL', mockCodebaseFiles)

      expect(refs.length).toBeGreaterThanOrEqual(2)
      expect(refs).toContainEqual(expect.objectContaining({ file: 'lib/env.ts' }))
      expect(refs).toContainEqual(expect.objectContaining({ file: 'drizzle.config.ts' }))
    })

    it('should return empty array for unreferenced env vars', () => {
      const refs = findEnvReferences('LEGACY_API_URL', mockCodebaseFiles)
      expect(refs).toEqual([])
    })

    it('should find references in next.config.ts', () => {
      const refs = findEnvReferences('AUTH_URL', mockCodebaseFiles)

      expect(refs).toContainEqual(expect.objectContaining({ file: 'next.config.ts' }))
    })

    it('should find references in env.ts wrapper', () => {
      const refs = findEnvReferences('AUTH_SECRET', mockCodebaseFiles)

      expect(refs).toContainEqual(expect.objectContaining({ file: 'lib/env.ts' }))
    })

    it('should handle partial matches correctly', () => {
      // Should not match DATABASE_URL when searching for DATABASE
      const refs = findEnvReferences('DATABASE', mockCodebaseFiles)

      // Should not find anything because we need exact VAR_NAME match
      expect(refs.length).toBe(0)
    })
  })

  describe('analyzeEnvironment', () => {
    it('should return findings for unreferenced env vars', async () => {
      const result = await analyzeEnvironment(mockEnvExample, mockCodebaseFiles)

      const unreferencedVars = result.findings.filter((f: Finding) => f.category === 'config')

      // LEGACY_API_URL and UNUSED_FEATURE_FLAG should be flagged
      expect(unreferencedVars.length).toBeGreaterThanOrEqual(2)

      const legacyVar = unreferencedVars.find((f: Finding) => f.name.includes('LEGACY_API_URL'))
      expect(legacyVar).toBeDefined()

      const unusedFlag = unreferencedVars.find((f: Finding) =>
        f.name.includes('UNUSED_FEATURE_FLAG')
      )
      expect(unusedFlag).toBeDefined()
    })

    it('should not flag referenced env vars', async () => {
      const result = await analyzeEnvironment(mockEnvExample, mockCodebaseFiles)

      const databaseUrlFinding = result.findings.find((f: Finding) => f.name === 'DATABASE_URL')
      expect(databaseUrlFinding).toBeUndefined()
    })

    it('should categorize findings as "config"', async () => {
      const result = await analyzeEnvironment(mockEnvExample, mockCodebaseFiles)

      result.findings.forEach((finding: Finding) => {
        expect(finding.category).toBe('config')
      })
    })

    it('should assign review risk level to config findings', async () => {
      const result = await analyzeEnvironment(mockEnvExample, mockCodebaseFiles)

      // Config findings should be review or safe depending on context
      result.findings.forEach((finding: Finding) => {
        expect(['safe', 'review']).toContain(finding.riskLevel)
      })
    })

    it('should include location with env file path', async () => {
      const result = await analyzeEnvironment(mockEnvExample, mockCodebaseFiles)

      result.findings.forEach((finding: Finding) => {
        expect(finding.location).toContain('.env')
      })
    })

    it('should include analyzer metadata', async () => {
      const result = await analyzeEnvironment(mockEnvExample, mockCodebaseFiles)

      expect(result.analyzer).toBe('environment')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
      expect(result.errors).toBeDefined()
    })

    it('should mark config findings as non-dev-only by default', async () => {
      const result = await analyzeEnvironment(mockEnvExample, mockCodebaseFiles)

      // Config vars are typically production, not dev-only
      result.findings.forEach((finding: Finding) => {
        expect(finding.isDevOnly).toBe(false)
      })
    })

    it('should provide context about the unreferenced env var', async () => {
      const result = await analyzeEnvironment(mockEnvExample, mockCodebaseFiles)

      result.findings.forEach((finding: Finding) => {
        expect(finding.context).toBeDefined()
        expect(finding.context.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Multiple .env file support (T037)', () => {
    it('should handle multiple env file contents', async () => {
      const envExample = 'VAR1=value1\nVAR2=value2'
      const envProdExample = 'PROD_VAR=prodvalue\nVAR2=value2'

      // Combine both files
      const combined = envExample + '\n' + envProdExample
      const envVars = parseEnvFile(combined)

      expect(envVars).toContain('VAR1')
      expect(envVars).toContain('VAR2')
      expect(envVars).toContain('PROD_VAR')
    })
  })
})
