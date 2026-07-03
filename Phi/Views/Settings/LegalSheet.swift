import SwiftUI

/// The SIL Open Font License 1.1 text for Space Mono, pushed from Settings.
///
/// Bundling the .ttf files in the app is redistribution, and the OFL requires
/// the license travel with any redistribution — showing this text satisfies
/// that. The text is loaded from the bundled `OFL.txt` resource, never pasted
/// into source, so what's displayed can't drift from the file that ships.
struct LegalSheet: View {
    var body: some View {
        ZStack {
            Color.c950.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Space Mono — SIL Open Font License 1.1")
                        .phiFont(.body)
                        .foregroundStyle(.white)

                    // Monospaced so the license's alignment/columns read as
                    // intended; c400 keeps body legal text quieter than the head.
                    Text(licenseText)
                        .font(.system(.footnote, design: .monospaced))
                        .foregroundStyle(Color.c400)
                        .textSelection(.enabled)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
            }
        }
        .navigationTitle("Legal")
        .navigationBarTitleDisplayMode(.inline)
    }

    /// Reads the license from the app bundle. If the resource is missing, fail
    /// visibly in-text rather than crash or ship a blank screen — a missing
    /// license is a bundling bug worth surfacing loudly.
    private var licenseText: String {
        guard let url = Bundle.main.url(forResource: "OFL", withExtension: "txt"),
              let text = try? String(contentsOf: url, encoding: .utf8)
        else { return "OFL.txt could not be loaded from the app bundle." }
        return text
    }
}

#Preview {
    NavigationStack { LegalSheet() }
        .preferredColorScheme(.dark)
}
