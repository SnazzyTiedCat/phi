import SwiftUI

/// Corner radii. One continuous-curve system: always pass `style: .continuous`.
/// No pill shapes on buttons.
enum PhiRadius {
    /// Chips, tags, small inline controls.
    static let chip: CGFloat = 12
    /// Cards and grouped surfaces.
    static let card: CGFloat = 20
    /// Buttons.
    static let button: CGFloat = 14
}

/// Spacing on a 4-point base unit. Pick the smallest step that reads clearly.
enum PhiSpacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
}
