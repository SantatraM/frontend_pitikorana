import { useCallback, useEffect, useMemo, useRef } from 'react'

/**
 * Gives each asynchronous loading cycle a sequence number so that only the
 * latest mounted cycle may update React state.
 */
export function useLatestRequest() {
  const sequenceRef = useRef(0)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      sequenceRef.current += 1
    }
  }, [])

  const startRequest = useCallback(() => {
    sequenceRef.current += 1
    return sequenceRef.current
  }, [])

  const isCurrentRequest = useCallback((sequence: number) => (
    mountedRef.current && sequence === sequenceRef.current
  ), [])

  return useMemo(() => ({ startRequest, isCurrentRequest }), [startRequest, isCurrentRequest])
}
