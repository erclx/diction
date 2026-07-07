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
