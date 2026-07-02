import Foundation

/// A single imported study material (a textbook PDF, in the product's terms).
///
/// Intentionally thin for Chunk 2. Chunk 4 extends this with the real fields
/// that import produces — file URL, page count, tutor assignment, import date
/// — but adding them now would be guessing at shapes that don't exist yet. A
/// struct that's trivially easy to extend beats one that pre-commits to the
/// wrong fields.
///
/// `Hashable` is load-bearing, not decorative: it's what lets `Material` be a
/// value in `.navigationDestination(for: Material.self)` on the Dashboard's
/// `NavigationStack`.
struct Material: Identifiable, Hashable {
    let id: UUID
    let title: String
}
