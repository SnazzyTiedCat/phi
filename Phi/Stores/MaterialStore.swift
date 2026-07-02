import Foundation
import Observation

/// Single source of truth for the person's imported materials, mirroring the
/// `OnboardingStore` pattern from Chunk 1 (`@Observable`, owns one slice of
/// state).
///
/// IN-MEMORY ONLY THIS CHUNK. There is no import mechanism yet (that's Chunk
/// 4), so `materials` starts empty and stays empty in the shipped app — which
/// is exactly what exercises the Dashboard's empty state. Deliberately no
/// persistence layer here: Chunk 4 adds real storage when real import lands,
/// and building a throwaway persistence shim now would just be something that
/// chunk has to unwind.
///
/// The populated card-row layout is verified through `DashboardView`'s
/// previews (which inject a seeded store), not through any debug toggle in the
/// shipped binary.
@Observable
final class MaterialStore {
    var materials: [Material] = []
}
