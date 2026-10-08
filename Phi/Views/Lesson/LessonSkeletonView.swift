import SwiftUI

/// Placeholder while a lesson is being built. It is shaped like the lesson and says
/// what is happening. It does not loop, because loops are reserved for live status.
struct LessonSkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.xl) {
            Text("Phi is writing this lesson from your material.")
                .phiFont(.body)
                .foregroundStyle(Color.phiTextSecondary)

            ForEach(0..<3, id: \.self) { _ in
                VStack(alignment: .leading, spacing: PhiSpacing.sm) {
                    placeholderLine(height: 14, trailing: 200)
                    placeholderLine(height: 10, trailing: 0)
                    placeholderLine(height: 10, trailing: 0)
                    placeholderLine(height: 10, trailing: 96)
                }
            }
        }
        .frame(maxWidth: 620, alignment: .leading)
        .frame(maxWidth: .infinity, alignment: .top)
        .padding(.horizontal, PhiSpacing.lg)
        .padding(.top, PhiSpacing.lg)
        .frame(maxHeight: .infinity, alignment: .top)
    }

    /// One bar. `trailing` shortens it, so the block reads as text.
    private func placeholderLine(height: CGFloat, trailing: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: PhiRadius.chip, style: .continuous)
            .fill(Color.phiSurfaceRaised)
            .overlay(
                RoundedRectangle(cornerRadius: PhiRadius.chip, style: .continuous)
                    .strokeBorder(Color.phiHairline, lineWidth: 1)
            )
            .frame(height: height)
            .padding(.trailing, trailing)
            .accessibilityHidden(true)
    }
}
