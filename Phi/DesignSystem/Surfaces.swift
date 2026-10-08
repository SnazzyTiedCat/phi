import SwiftUI

extension View {
    /// Content card: raised surface, continuous 20pt corners, 1pt hairline.
    /// Elevation comes from the surface step and the hairline, not a shadow.
    func phiCard() -> some View {
        modifier(PhiCardModifier())
    }

    /// Floating chrome only: sheet toolbars and floating bars. Never place glass
    /// behind scrolling content. Under Reduce Transparency it becomes an opaque
    /// surface.
    func phiFloatingChrome(cornerRadius: CGFloat = PhiRadius.card) -> some View {
        modifier(PhiFloatingChromeModifier(cornerRadius: cornerRadius))
    }
}

private struct PhiCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: PhiRadius.card, style: .continuous)
        return content
            .background(Color.phiSurfaceRaised, in: shape)
            .overlay(shape.strokeBorder(Color.phiHairline, lineWidth: 1))
    }
}

private struct PhiFloatingChromeModifier: ViewModifier {
    let cornerRadius: CGFloat
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        return content
            .background {
                if reduceTransparency {
                    shape.fill(Color.phiSurfaceHigh)
                } else {
                    shape.fill(.thinMaterial)
                }
            }
            .overlay(shape.strokeBorder(Color.phiHairline, lineWidth: 1))
    }
}
