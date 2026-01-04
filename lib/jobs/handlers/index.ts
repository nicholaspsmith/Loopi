/**
 * Job Handler Registry
 *
 * Import all handlers to register them with the processor.
 * Handlers self-register via registerHandler() calls at module load time.
 */

// Import handlers to trigger registration
import './distractor-job'
import './flashcard-job'
import './skill-tree-job'

// Export handler functions for testing
export { handleDistractorGeneration } from './distractor-job'
export { handleFlashcardGeneration } from './flashcard-job'
export { handleSkillTreeGeneration } from './skill-tree-job'
