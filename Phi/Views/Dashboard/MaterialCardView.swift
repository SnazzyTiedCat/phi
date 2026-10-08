import SwiftUI

/// One material in the library grid. The card is a single accessibility element
/// that reads the title and the date it was imported.
struct MaterialCardView: View {
    let material: Material

    var body: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.sm) {
            Spacer(minLength: 0)

            // Long file names clamp to two lines. The tail is cut, never the start.
            Text(material.title)
                .phiFont(.headline)
                .foregroundStyle(Color.phiTextPrimary)
                .multilineTextAlignment(.leading)
                .lineLimit(2)
                .truncationMode(.tail)

            Text(dateText)
                .phiFont(.caption)
                .foregroundStyle(Color.phiTextSecondary)
        }
        .frame(maxWidth: .infinity, minHeight: 160, alignment: .leading)
        .padding(PhiSpacing.lg)
        .contentShape(RoundedRectangle(cornerRadius: PhiRadius.card, style: .continuous))
        .phiCard()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(material.title), \(dateText)")
    }

    private var dateText: String {
        material.createdAt.formatted(date: .abbreviated, time: .omitted)
    }
}

#Preview {
    HStack(spacing: PhiSpacing.lg) {
        MaterialCardView(material: Material(id: UUID(), title: "Calculus"))
        MaterialCardView(
            material: Material(
                id: UUID(),
                title: "Organic Chemistry: Reactions and Mechanisms of Carbonyl Compounds"
            )
        )
    }
    .padding(PhiSpacing.lg)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.phiBackground)
    .preferredColorScheme(.dark)
}
