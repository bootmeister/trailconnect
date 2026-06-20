export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

export function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`
}

export function formatDate(date: Date | { seconds: number; nanoseconds: number } | undefined | null): string {
  if (!date) return 'Unknown'
  
  let dateObj: Date
  if (typeof date.getTime === 'function') {
    dateObj = date as Date
  } else if (date && typeof date.seconds === 'number') {
    dateObj = new Date(date.seconds * 1000)
  } else {
    return 'Unknown'
  }

  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return dateObj.toLocaleDateString()
}

export function formatHikeDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}
