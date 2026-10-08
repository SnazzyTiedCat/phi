import SwiftUI

/// Gold fill, off-black label. The only gold control. Use one per screen.
struct PhiPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: PhiRadius.button, style: .continuous)
        return configuration.label
            .phiFont(.headline)
            .foregroundStyle(Color.phiBackground)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(Color.phiGold, in: shape)
            .contentShape(shape)
            .modifier(PhiPressFeedback(isPressed: configuration.isPressed))
    }
}

/// Hairline stroke, primary text. For the second action beside a primary.
struct PhiSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: PhiRadius.button, style: .continuous)
        return configuration.label
            .phiFont(.headline)
            .foregroundStyle(Color.phiTextPrimary)
            .frame(maxWidth: .infinity, minHeight: 50)
            .overlay(shape.strokeBorder(Color.phiHairline, lineWidth: 1))
            .contentShape(shape)
            .modifier(PhiPressFeedback(isPressed: configuration.isPressed))
    }
}

/// Text only, for the least important action such as "Skip". Keeps a 44pt tap target.
struct PhiGhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .phiFont(.body)
            .foregroundStyle(Color.phiTextPrimary)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
            .modifier(PhiPressFeedback(isPressed: configuration.isPressed))
    }
}

/// Press feedback shared by all three styles. Scale 0.98 on the press spring.
/// Under Reduce Motion, scale is dropped and the press dims opacity instead.
/// A disabled control dims to 40%.
private struct PhiPressFeedback: ViewModifier {
    let isPressed: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed && !reduceMotion ? 0.98 : 1)
            .opacity(isEnabled ? (isPressed && reduceMotion ? 0.7 : 1) : 0.4)
            .animation(PhiMotion.press, value: isPressed)
    }
}
