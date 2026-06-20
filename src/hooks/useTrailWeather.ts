import { useEffect, useState } from 'react'

interface WeatherData {
  temp: number
  condition: string
  humidity: number
  windSpeed: number
  weatherCode: number
}

function wmoCondition(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Cloudy'
  if (code <= 48) return 'Fog'
  if (code <= 55) return 'Drizzle'
  if (code <= 65) return 'Rain'
  if (code <= 75) return 'Snow'
  if (code <= 82) return 'Rain'
  if (code >= 95) return 'Thunderstorm'
  return 'Cloudy'
}

export function useTrailWeather(lat?: number, lng?: number) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lat == null || lng == null) return
    let cancelled = false

    async function fetchWeather() {
      setLoading(true)
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
        const res = await fetch(url)
        const json = await res.json()
        if (cancelled) return

        if (json?.current) {
          setWeather({
            temp: Math.round(json.current.temperature_2m),
            condition: wmoCondition(json.current.weather_code),
            humidity: json.current.relative_humidity_2m,
            windSpeed: json.current.wind_speed_10m,
            weatherCode: json.current.weather_code,
          })
        }
      } catch {
        if (!cancelled) setWeather(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchWeather()
    return () => { cancelled = true }
  }, [lat, lng])

  return { weather, loading }
}
