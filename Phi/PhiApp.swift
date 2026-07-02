import SwiftUI

@main
struct PhiApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark) // DESIGN.md: always dark, no light mode adaptation
        }
    }
}
