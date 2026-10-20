import AVFoundation

/// Synthesized cue sounds: no audio assets to ship or license.
enum Tones {
  /// A single sine beep with short fades to avoid clicks.
  static func beep(frequency: Double, duration: Double, format: AVAudioFormat) -> AVAudioPCMBuffer {
    render(notes: [(frequency, duration)], format: format)
  }

  /// A rising sequence of notes.
  static func chime(frequencies: [Double], noteDuration: Double, format: AVAudioFormat) -> AVAudioPCMBuffer {
    render(notes: frequencies.map { ($0, noteDuration) }, format: format)
  }

  private static func render(notes: [(frequency: Double, duration: Double)], format: AVAudioFormat) -> AVAudioPCMBuffer {
    let sampleRate = format.sampleRate
    let total = notes.reduce(0) { $0 + Int($1.duration * sampleRate) }
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(total))!
    buffer.frameLength = AVAudioFrameCount(total)
    let samples = buffer.floatChannelData![0]
    let fade = Int(0.008 * sampleRate)
    var offset = 0
    for note in notes {
      let count = Int(note.duration * sampleRate)
      for i in 0..<count {
        let envelope = Float(min(1, Double(min(i, count - 1 - i)) / Double(fade)))
        samples[offset + i] = 0.6 * envelope * Float(sin(2 * Double.pi * note.frequency * Double(i) / sampleRate))
      }
      offset += count
    }
    return buffer
  }
}
