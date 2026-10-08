import SwiftUI

/// Shown where a screen or section has nothing in it yet.
///
/// The copy fills the space. Say what the place is for and what to do next,
/// for example "Upload a photo of your notes to start a lesson." Never a bare
/// "No data" or "Nothing here". Pass an action only when there is one clear
/// next step. It uses the primary (gold) style.
struct PhiEmptyState: View {
    let symbol: String
    let title: String
    let message: String
    let actionLabel: String?
    let action: (() -> Void)?

    @ScaledMetric(relativeTo: .largeTitle) private var symbolSize: CGFloat = 28

    init(
        symbol: String,
        title: String,
        message: String,
        actionLabel: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.symbol = symbol
        self.title = title
        self.message = message
        self.actionLabel = actionLabel
        self.action = action
    }

    var body: some View {
        VStack(spacing: PhiSpacing.md) {
            Image(systemName: symbol)
                .font(.system(size: symbolSize, weight: .medium))
                .symbolRenderingMode(.monochrome)
                .foregroundStyle(Color.phiTextTertiary)
                .accessibilityHidden(true)

            Text(title)
                .phiFont(.headline)
                .foregroundStyle(Color.phiTextPrimary)
                .multilineTextAlignment(.center)

            Text(message)
                .phiFont(.body)
                .foregroundStyle(Color.phiTextSecondary)
                .multilineTextAlignment(.center)

            if let actionLabel = actionLabel, let action = action {
                Button(actionLabel, action: action)
                    .buttonStyle(PhiPrimaryButtonStyle())
                    .padding(.top, PhiSpacing.sm)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(PhiSpacing.xl)
    }
}
