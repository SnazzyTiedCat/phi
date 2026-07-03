import SwiftUI

/// The Settings surface presented from the Dashboard's profile button.
///
/// CHUNK 3 SCOPE, ON PURPOSE: exactly a font choice and a Legal entry. Chunk 6
/// grows the rest of Settings around this shell, so nothing speculative is
/// built here. No ViewModel — two rows, no async, nothing to isolate (same
/// reasoning as `DashboardView`).
struct SettingsSheet: View {
    /// The single persisted font choice, shared with the `.phiFont` modifier
    /// through the same `@AppStorage` key. Writing it here re-renders every
    /// font-aware view app-wide, live — that's the whole switching mechanism.
    @AppStorage(PhiFont.storageKey) private var fontChoice: PhiFont = .spaceMono
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.c950.ignoresSafeArea() // match the app's flat-dark surface

                Form {
                    // Inline picker renders "Font" as the group header and the
                    // two faces as radio rows — clearest for a 2-way choice and
                    // it shows the live selection at a glance.
                    Section {
                        Picker("Font", selection: $fontChoice) {
                            ForEach(PhiFont.allCases) { face in
                                Text(face.rawValue).tag(face)
                            }
                        }
                        .pickerStyle(.inline)
                    }

                    Section {
                        NavigationLink("Legal") { LegalSheet() }
                    }
                }
                .scrollContentBackground(.hidden) // let c950 show through, flat rows
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        // Gold is reserved; chrome stays white/monochrome per the Dashboard's
        // established rule. `.tint` here colors the Done button, the picker
        // checkmark, and the Legal chevron uniformly.
        .tint(.white)
        .preferredColorScheme(.dark)
    }
}

#Preview {
    SettingsSheet()
}
