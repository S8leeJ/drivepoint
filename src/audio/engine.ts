let context: AudioContext | null = null
let low: OscillatorNode | null = null
let high: OscillatorNode | null = null
let filter: BiquadFilterNode | null = null
let gain: GainNode | null = null

export const engine = {
  ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume()
      return
    }
    const audio = new AudioContext()
    context = audio
    low = audio.createOscillator()
    high = audio.createOscillator()
    low.type = 'sawtooth'
    high.type = 'triangle'
    filter = audio.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 0.65
    const blend = audio.createGain()
    blend.gain.value = 0.4
    gain = audio.createGain()
    gain.gain.value = 0
    low.connect(filter)
    high.connect(blend)
    blend.connect(filter)
    filter.connect(gain)
    gain.connect(audio.destination)
    low.start()
    high.start()
  },
  update(speedMs: number, throttle: boolean, muted: boolean) {
    if (!context || !low || !high || !filter || !gain) return
    const speed = Math.abs(speedMs)
    const now = context.currentTime
    const freq = 38 + speed * 3.1 + (throttle ? 14 + speed * 0.35 : 0)
    low.frequency.setTargetAtTime(freq, now, 0.08)
    high.frequency.setTargetAtTime(freq * 0.5, now, 0.1)
    filter.frequency.setTargetAtTime(200 + speed * 26 + (throttle ? 160 : 0), now, 0.08)
    const volume = muted ? 0 : Math.min(0.065, 0.011 + speed * 0.001 + (throttle ? 0.016 : 0))
    gain.gain.setTargetAtTime(volume, now, 0.05)
  },
}
