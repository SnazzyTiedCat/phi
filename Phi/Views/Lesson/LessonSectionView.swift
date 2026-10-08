import Foundation
import SwiftUI

/// One row of the lesson: a section title and its body. The intro (index 0) has no
/// label. The body is measured to about 60 characters, and the word being read is tinted.
struct LessonSectionView: View {
    let index: Int
    let section: LessonSection
    let rendered: LessonBody.Rendered
    let highlight: NSRange?
    let entranceDelay: Double

    var body: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.md) {
            if index > 0 {
                Text(section.title)
                    .phiFont(.headline)
                    .foregroundStyle(Color.phiTextPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityAddTraits(.isHeader)
            }

            Text(LessonBody.highlighted(rendered, range: highlight))
                .foregroundStyle(Color.phiTextPrimary)
                .phiLesson()
        }
        .frame(maxWidth: 620, alignment: .leading)
        .phiEntrance(delay: entranceDelay)
    }
}
