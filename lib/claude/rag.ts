/**
 * RAG (Retrieval-Augmented Generation) stub module.
 *
 * This is a placeholder until the RAG feature (005-rag-integration) is fully implemented.
 * Currently returns disabled/empty responses.
 */

interface RAGOptions {
  enabled?: boolean
  maxMessages?: number
  maxTokens?: number
}

interface RAGContext {
  enabled: boolean
  context: string | null
  sourceMessages: Array<{ id: string; content: string; similarity: number }>
}

/**
 * Determines whether RAG should be used for a given message.
 * Currently always returns false (RAG disabled).
 */
export function shouldUseRAG(_content: string): boolean {
  return false
}

/**
 * Builds RAG context from similar past conversations.
 * Currently returns empty context (RAG disabled).
 */
export async function buildRAGContext(
  _content: string,
  _userId: string,
  options: RAGOptions = {}
): Promise<RAGContext> {
  return {
    enabled: options.enabled ?? false,
    context: null,
    sourceMessages: [],
  }
}
