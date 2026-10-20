import AVFoundation

/// Renders text to an audio buffer ahead of time with `AVSpeechSynthesizer.write`, so speech can be
/// scheduled on the audio timeline like any other sound (live synthesis is unreliable in background).
final class SpeechRenderer {
  private let synthesizer = AVSpeechSynthesizer()

  func render(_ text: String, format: AVAudioFormat) async -> AVAudioPCMBuffer? {
    let utterance = AVSpeechUtterance(string: text)
    utterance.voice = AVSpeechSynthesisVoice(language: Locale.preferredLanguages.first ?? "en-US")
      ?? AVSpeechSynthesisVoice(language: "en-US")
    utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 1.05

    let chunks: [AVAudioPCMBuffer] = await withCheckedContinuation { continuation in
      var collected: [AVAudioPCMBuffer] = []
      var finished = false
      synthesizer.write(utterance) { buffer in
        guard !finished, let pcm = buffer as? AVAudioPCMBuffer else { return }
        if pcm.frameLength == 0 {
          finished = true
          continuation.resume(returning: collected)
        } else {
          collected.append(pcm)
        }
      }
    }
    return Self.concatenate(chunks, to: format)
  }

  /// Converts the synthesizer's chunks (its own sample rate and format) into one engine-format buffer.
  private static func concatenate(_ chunks: [AVAudioPCMBuffer], to format: AVAudioFormat) -> AVAudioPCMBuffer? {
    guard let source = chunks.first?.format,
          let converter = AVAudioConverter(from: source, to: format) else { return nil }
    let inputFrames = chunks.reduce(0) { $0 + Int($1.frameLength) }
    let capacity = AVAudioFrameCount(Double(inputFrames) * format.sampleRate / source.sampleRate) + 1024
    guard let output = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else { return nil }

    var pending = chunks[...]
    var error: NSError?
    converter.convert(to: output, error: &error) { _, status in
      guard let next = pending.popFirst() else {
        status.pointee = .endOfStream
        return nil
      }
      status.pointee = .haveData
      return next
    }
    if let error {
      NSLog("[CuePlayer] speech conversion failed: \(error)")
      return nil
    }
    return output
  }
}
