import Foundation

/// Turns a student's uploaded material into a structured lesson.
///
/// The UI depends only on this protocol. Previews swap in `MockLessonGenerator`,
/// so they never reach the network.
protocol LessonGenerating: Sendable {
    func generateLesson(title: String, text: String) async throws -> LessonDraft
}
