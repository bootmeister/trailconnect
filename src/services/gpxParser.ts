export interface GpxTrack {
  name: string
  points: { lat: number; lng: number; ele?: number }[]
  distance: number
  elevationGain: number
  elevationLoss: number
}

export function parseGpx(xml: string): GpxTrack {
  const track: GpxTrack = { name: '', points: [], distance: 0, elevationGain: 0, elevationLoss: 0 }

  const nameMatch = xml.match(/<name>([^<]*)<\/name>/)
  if (nameMatch) track.name = nameMatch[1].trim() || 'Unnamed Trail'

  const trkptRegex = /<trkpt\s+lat="([\d.-]+)"\s+lon="([\d.-]+)"[^>]*>(?:[\s\S]*?<ele>([\d.-]+)<\/ele>)?[\s\S]*?<\/trkpt>/gi
  let match
  while ((match = trkptRegex.exec(xml)) !== null) {
    track.points.push({
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
      ele: match[3] ? parseFloat(match[3]) : undefined,
    })
  }

  if (track.points.length > 1) {
    track.distance = calculateDistance(track.points)
    track.elevationGain = calculateElevationGain(track.points)
    track.elevationLoss = calculateElevationLoss(track.points)
  }

  return track
}

function calculateDistance(points: { lat: number; lng: number }[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1], points[i])
  }
  return total
}

function calculateElevationGain(points: { ele?: number }[]): number {
  let gain = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].ele
    const curr = points[i].ele
    if (prev !== undefined && curr !== undefined && curr > prev) {
      gain += curr - prev
    }
  }
  return gain
}

function calculateElevationLoss(points: { ele?: number }[]): number {
  let loss = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].ele
    const curr = points[i].ele
    if (prev !== undefined && curr !== undefined && curr < prev) {
      loss += prev - curr
    }
  }
  return loss
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export interface TrailRoute {
  type: 'LineString'
  points: { lat: number; lng: number; ele: number }[]
}

export function gpxToRoute(points: { lat: number; lng: number; ele?: number }[]): TrailRoute {
  return {
    type: 'LineString',
    points: points.map(p => ({ lat: p.lat, lng: p.lng, ele: p.ele ?? 0 })),
  }
}
