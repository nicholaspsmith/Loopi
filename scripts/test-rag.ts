/**
 * Test RAG functionality
 * Usage: npx tsx scripts/test-rag.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { buildRAGContext, shouldUseRAG } from '@/lib/claude/rag'
import { getDb } from '@/lib/db/pg-client'
import { users } from '@/lib/db/drizzle-schema'

async function main() {
  try {
    const db = getDb()

    // Get first user
    const [user] = await db.select().from(users).limit(1)

    if (!user) {
      console.log('No users found. Please create a user first.')
      process.exit(0)
    }

    console.log(`Testing RAG for user: ${user.id}`)

    // Test 1: Should use RAG
    const testQueries = [
      'What is LanceDB?',
      'How does vector search work?',
      'Tell me about serverless architecture',
      'Explain RAG to me',
    ]

    console.log('\n--- Testing shouldUseRAG() ---')
    console.log('Should NOT use RAG:')
    console.log('  "hi" ->', shouldUseRAG('hi'))
    console.log('  "hello" ->', shouldUseRAG('hello'))
    console.log('  "yo" ->', shouldUseRAG('yo'))

    console.log('\nShould use RAG:')
    testQueries.forEach(query => {
      console.log(`  "${query}" ->`, shouldUseRAG(query))
    })

    // Test 2: Build RAG context
    console.log('\n--- Testing buildRAGContext() ---')

    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`)

      const ragContext = await buildRAGContext(query, user.id, {
        enabled: true,
        maxMessages: 3,
        maxTokens: 500,
      })

      console.log(`  RAG enabled: ${ragContext.enabled}`)
      console.log(`  Source messages: ${ragContext.sourceMessages.length}`)

      if (ragContext.sourceMessages.length > 0) {
        console.log(`  Context length: ${ragContext.context.length} chars`)
        console.log(`  First source message: "${ragContext.sourceMessages[0].content.substring(0, 80)}..."`)
      } else {
        console.log('  No similar messages found (this is normal if you have no embeddings yet)')
      }
    }

    console.log('\n✅ RAG test complete')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
