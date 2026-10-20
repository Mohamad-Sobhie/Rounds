import AVFoundation

enum CueKind: String {
  case countdown, change, finish, speech
}

struct Cue {
  let atMs: Double
  let kind: CueKind
  let text: String
}

/// Schedules every cue on an `AVAudioEngine` timeline with sample accuracy.
///
/// Timing lives entirely in the audio engine, so cues keep firing on time while the JS thread is
/// suspended (screen locked, app in the background). The app declares the `audio` background mode;
/// the session mixes with other audio, so the user's music keeps playing underneath.
final class CueScheduler {
  private let engine = AVAudioEngine()
  private let soundNode = AVAudioPlayerNode()
  private let speechNode = AVAudioPlayerNode()
  private let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
  private let queue = DispatchQueue(label: "rounds.cue-player")

  private var cues: [Cue] = []
  private var sounds: [CueKind: AVAudioPCMBuffer] = [:]
  private var speech: [String: AVAudioPCMBuffer] = [:]
  private let speaker = SpeechRenderer()

  /// Where playback started, to resume correctly after an interruption (phone call, Siri).
  private var playStartedAt: (positionMs: Double, hostTime: Date)?

  var volume: Float = 1 {
    didSet { engine.mainMixerNode.outputVolume = volume }
  }

  init() {
    engine.attach(soundNode)
    engine.attach(speechNode)
    engine.connect(soundNode, to: engine.mainMixerNode, format: format)
    engine.connect(speechNode, to: engine.mainMixerNode, format: format)
    sounds = [
      .countdown: Tones.beep(frequency: 880, duration: 0.12, format: format),
      .change: Tones.chime(frequencies: [988, 1319], noteDuration: 0.14, format: format),
      .finish: Tones.chime(frequencies: [784, 988, 1175, 1568], noteDuration: 0.16, format: format),
    ]
    NotificationCenter.default.addObserver(
      self, selector: #selector(handleInterruption),
      name: AVAudioSession.interruptionNotification, object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(handleMediaReset),
      name: AVAudioSession.mediaServicesWereResetNotification, object: nil)
  }

  func load(_ cues: [Cue]) async throws {
    let texts = Set(cues.filter { $0.kind == .speech && !$0.text.isEmpty }.map(\.text))
    var rendered: [String: AVAudioPCMBuffer] = [:]
    for text in texts {
      if let cached = speech[text] {
        rendered[text] = cached
      } else if let buffer = await speaker.render(text, format: format) {
        rendered[text] = buffer
      }
    }
    queue.sync {
      self.speech = rendered
      self.cues = cues.sorted { $0.atMs < $1.atMs }
    }
    NSLog("[CuePlayer] loaded \(cues.count) cues, rendered \(rendered.count)/\(texts.count) phrases")
  }

  func play(fromMs positionMs: Double) {
    queue.sync {
      do {
        try activateSession()
        resetNodes()
        if !engine.isRunning { try engine.start() }
        schedule(fromMs: positionMs)
        soundNode.play()
        speechNode.play()
        playStartedAt = (positionMs, Date())
        NSLog("[CuePlayer] playing from \(Int(positionMs)) ms")
      } catch {
        NSLog("[CuePlayer] play failed: \(error)")
      }
    }
  }

  func pause() {
    queue.sync {
      resetNodes()
      playStartedAt = nil
    }
  }

  func stop() {
    queue.sync {
      resetNodes()
      engine.stop()
      playStartedAt = nil
      try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
  }

  // MARK: - Scheduling

  /// Cues this close before the start position still play, so resuming exactly on a segment
  /// boundary announces that segment.
  private let lookBehindMs: Double = 150

  private func schedule(fromMs positionMs: Double) {
    // Both nodes start their sample timeline at 0 when `play()` is called.
    for cue in cues where cue.atMs >= positionMs - lookBehindMs {
      let delayMs = max(0, cue.atMs - positionMs)
      switch cue.kind {
      case .speech:
        guard let buffer = speech[cue.text] else { continue }
        // Let the change sound ring briefly before the announcement starts.
        speechNode.scheduleBuffer(buffer, at: time(afterMs: delayMs + 250))
      default:
        guard let buffer = sounds[cue.kind] else { continue }
        soundNode.scheduleBuffer(buffer, at: time(afterMs: delayMs))
      }
    }
  }

  private func time(afterMs ms: Double) -> AVAudioTime {
    AVAudioTime(sampleTime: AVAudioFramePosition(ms / 1000 * format.sampleRate), atRate: format.sampleRate)
  }

  private func resetNodes() {
    soundNode.stop()
    speechNode.stop()
  }

  private func activateSession() throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
    try session.setActive(true)
  }

  // MARK: - Interruptions

  @objc private func handleInterruption(_ notification: Notification) {
    guard
      let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
      AVAudioSession.InterruptionType(rawValue: raw) == .ended,
      let started = queue.sync(execute: { playStartedAt })
    else { return }
    // The workout kept running during the interruption: resume at the current position.
    let elapsedMs = Date().timeIntervalSince(started.hostTime) * 1000
    play(fromMs: started.positionMs + elapsedMs)
  }

  @objc private func handleMediaReset(_ notification: Notification) {
    guard let started = queue.sync(execute: { playStartedAt }) else { return }
    let elapsedMs = Date().timeIntervalSince(started.hostTime) * 1000
    queue.sync {
      engine.stop()
      engine.attach(soundNode)
      engine.attach(speechNode)
      engine.connect(soundNode, to: engine.mainMixerNode, format: format)
      engine.connect(speechNode, to: engine.mainMixerNode, format: format)
    }
    play(fromMs: started.positionMs + elapsedMs)
  }
}
