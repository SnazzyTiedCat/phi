import UIKit

/// Haptic feedback for the moments that need a physical answer. Keep it rare:
/// one tap per deliberate action, not one per list row.
///
/// Each call creates its generator on the main actor, prepares it, then fires.
@MainActor
enum PhiHaptics {
    /// A light impact for a deliberate tap, such as a primary button.
    static func tap() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.prepare()
        generator.impactOccurred()
    }

    /// A tick for a change of selection, such as a picker row.
    static func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.prepare()
        generator.selectionChanged()
    }

    /// The action finished as intended.
    static func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.success)
    }

    /// The action failed or was refused.
    static func error() {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.error)
    }
}
