import { useState, useEffect, useCallback } from 'react'
import { type QueryConstraint, type DocumentData } from 'firebase/firestore'
import { subscribeToCollection, queryDocuments } from '@/services/firestore'

export function useFirestore<T extends DocumentData>(collectionName: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsubscribe = subscribeToCollection(
      collectionName,
      constraints,
      (docs) => {
        setData(docs as T[])
        setLoading(false)
      },
      (err) => {
        setError(err as Error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [collectionName])

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const docs = await queryDocuments(collectionName, constraints)
      setData(docs as T[])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [collectionName])

  return { data, loading, error, refetch }
}
