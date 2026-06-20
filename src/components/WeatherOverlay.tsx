import React from 'react'
import { View, StyleSheet } from 'react-native'

interface WeatherOverlayProps {
  condition: string
}

const weatherBg: Record<string, string> = {
  Clear: 'rgba(255, 200, 50, 0.06)',
  Cloudy: 'rgba(180, 180, 190, 0.05)',
  Fog: 'rgba(200, 200, 210, 0.06)',
  Drizzle: 'rgba(150, 170, 200, 0.05)',
  Rain: 'rgba(120, 150, 190, 0.06)',
  Snow: 'rgba(220, 230, 245, 0.06)',
  Thunderstorm: 'rgba(80, 70, 110, 0.07)',
}

export default function WeatherOverlay({ condition }: WeatherOverlayProps) {
  const bg = weatherBg[condition] || weatherBg.Cloudy

  return <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} pointerEvents="none" />
}
