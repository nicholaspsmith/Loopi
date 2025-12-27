import { config } from 'dotenv'
import { resolve } from 'path'
import type { Config } from 'drizzle-kit'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

export default {
  schema: './lib/db/drizzle-schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
