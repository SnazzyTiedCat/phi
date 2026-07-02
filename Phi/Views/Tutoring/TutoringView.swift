import SwiftUI

/// Navigation destination for a tapped `Material`. Stub for Chunk 2 — the file
/// and its `let material: Material` signature are load-bearing for the
/// Dashboard's navigation spine now, but Chunk 4 replaces the body entirely
/// (the real tutoring surface). Nothing else belongs here yet: no toolbar,
/// no capsule, no options popup — that's scope for a later chunk.
struct TutoringView: View {
    let material: Material

    var body: some View {
        Text(material.title)
            .navigationTitle(material.title)
    }
}
