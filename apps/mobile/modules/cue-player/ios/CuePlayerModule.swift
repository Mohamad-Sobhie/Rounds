import ExpoModulesCore

/// JS interface. Cues arrive as parallel arrays so the bridge only carries primitives.
public final class CuePlayerModule: Module {
  private let player = CueScheduler()

  public func definition() -> ModuleDefinition {
    Name("CuePlayer")

    /// Replaces the cue plan and pre-renders all speech. Resolves once the plan is ready to play.
    AsyncFunction("load") { (atMs: [Double], kinds: [String], texts: [String]) async throws in
      let cues = zip(atMs.indices, atMs).map { index, at in
        Cue(atMs: at, kind: CueKind(rawValue: kinds[index]) ?? .countdown, text: texts[index])
      }
      try await self.player.load(cues)
    }

    /// Starts (or restarts) playback as if the workout were at `positionMs` right now.
    Function("play") { (positionMs: Double) in
      self.player.play(fromMs: positionMs)
    }

    Function("pause") {
      self.player.pause()
    }

    Function("stop") {
      self.player.stop()
    }

    Function("setVolume") { (volume: Double) in
      self.player.volume = Float(volume)
    }
  }
}
