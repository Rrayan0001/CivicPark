"use client"

import { useEffect, useState } from 'react'

export function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 600
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4)
      
      setDisplayValue(Math.floor(easeProgress * value))

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
      }
    }

    requestAnimationFrame(animate)
  }, [value])

  return <>{displayValue.toLocaleString()}</>
}
