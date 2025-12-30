/**
 * useJobStatus Hook
 *
 * Polls job status with adaptive intervals:
 * - 0-30s: poll every 3 seconds
 * - 30s-2min: poll every 5 seconds
 * - 2min-10min: poll every 10 seconds
 * - After 10min: timeout
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface JobStatusResponse {
  id: string
  type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: unknown
  error?: string
  createdAt: string
  attempts?: number
  maxAttempts?: number
}

interface UseJobStatusReturn {
  job: JobStatusResponse | null
  isPolling: boolean
  error: string | null
  retry: () => Promise<void>
}

export function useJobStatus(jobId: string | null): UseJobStatusReturn {
  const [job, setJob] = useState<JobStatusResponse | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const pollCountRef = useRef(0)

  const fetchJob = useCallback(async () => {
    if (!jobId) return null

    try {
      const response = await fetch(`/api/jobs/${jobId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Job not found')
        }
        throw new Error(`Failed to fetch job status: ${response.statusText}`)
      }

      const data: JobStatusResponse = await response.json()
      setJob(data)
      setError(null)
      return data.status
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
      return null
    }
  }, [jobId])

  const retry = useCallback(async () => {
    if (!jobId) return

    // Reset state and restart polling
    setError(null)
    pollCountRef.current = 0
    setIsPolling(true)
    await fetchJob()
  }, [jobId, fetchJob])

  useEffect(() => {
    if (!jobId) {
      setIsPolling(false)
      return
    }

    let isMounted = true
    pollCountRef.current = 0

    const poll = async () => {
      if (!isMounted) return

      const status = await fetchJob()

      // Stop polling if completed or failed
      if (status === 'completed' || status === 'failed') {
        setIsPolling(false)
        return
      }

      // Increment poll count
      pollCountRef.current++
      const pollCount = pollCountRef.current

      // Calculate adaptive delay
      let delay: number
      if (pollCount <= 10) {
        // 0-30 seconds: poll every 3 seconds
        delay = 3000
      } else if (pollCount <= 40) {
        // 30s-2min: poll every 5 seconds (10 polls * 3s = 30s, then 30 polls * 5s = 2.5min total)
        delay = 5000
      } else if (pollCount <= 100) {
        // 2min-10min: poll every 10 seconds
        delay = 10000
      } else {
        // After 10 minutes, stop polling
        setIsPolling(false)
        setError('Job timed out after 10 minutes')
        return
      }

      // Schedule next poll
      if (isMounted) {
        timeoutRef.current = setTimeout(poll, delay)
      }
    }

    // Start polling
    setIsPolling(true)
    poll()

    // Cleanup
    return () => {
      isMounted = false
      setIsPolling(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [jobId, fetchJob])

  return { job, isPolling, error, retry }
}
