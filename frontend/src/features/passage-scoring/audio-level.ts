const METER_SENSITIVITY = 2.5

export function computeRmsLevel(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0
  }
  let sumOfSquares = 0
  for (let index = 0; index < samples.length; index += 1) {
    sumOfSquares += samples[index] * samples[index]
  }
  return Math.sqrt(sumOfSquares / samples.length)
}

export function meterLevelFromRms(rms: number): number {
  const scaled = Math.sqrt(Math.max(0, rms)) * METER_SENSITIVITY
  return Math.min(1, scaled)
}
