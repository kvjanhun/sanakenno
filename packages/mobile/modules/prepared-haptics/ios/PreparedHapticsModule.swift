import ExpoModulesCore
import UIKit

public class PreparedHapticsModule: Module {
  private let lightGenerator = UIImpactFeedbackGenerator(style: .light)
  private let mediumGenerator = UIImpactFeedbackGenerator(style: .medium)
  private let heavyGenerator = UIImpactFeedbackGenerator(style: .heavy)
  private let notificationGenerator = UINotificationFeedbackGenerator()
  private let selectionGenerator = UISelectionFeedbackGenerator()

  // Throttle rapid impacts to prevent Taptic Engine congestion
  private var lastImpactTime: CFTimeInterval = 0
  private let minimumInterval: CFTimeInterval = 0.025

  public func definition() -> ModuleDefinition {
    Name("PreparedHaptics")

    OnCreate {
      self.lightGenerator.prepare()
      self.mediumGenerator.prepare()
      self.notificationGenerator.prepare()
      self.selectionGenerator.prepare()
    }

    Function("trigger") {
      let now = CACurrentMediaTime()
      guard now - self.lastImpactTime >= self.minimumInterval else { return }
      self.lastImpactTime = now
      self.lightGenerator.impactOccurred()
      self.lightGenerator.prepare()
    }

    Function("triggerImpact") { (style: String) in
      let now = CACurrentMediaTime()
      guard now - self.lastImpactTime >= self.minimumInterval else { return }
      self.lastImpactTime = now

      switch style {
      case "medium":
        self.mediumGenerator.impactOccurred()
        self.mediumGenerator.prepare()
      case "heavy":
        self.heavyGenerator.impactOccurred()
        self.heavyGenerator.prepare()
      default:
        self.lightGenerator.impactOccurred()
        self.lightGenerator.prepare()
      }
    }

    Function("triggerNotification") { (type: String) in
      let feedbackType: UINotificationFeedbackGenerator.FeedbackType
      switch type {
      case "success": feedbackType = .success
      case "error": feedbackType = .error
      default: feedbackType = .warning
      }
      self.notificationGenerator.notificationOccurred(feedbackType)
      self.notificationGenerator.prepare()
    }
  }
}
