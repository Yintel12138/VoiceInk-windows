import SwiftUI

struct LicenseView: View {
    var body: some View {
        VStack(spacing: 15) {
            Text("VoiceInk is free and open source")
                .foregroundColor(.green)
        }
        .padding()
    }
}

struct LicenseView_Previews: PreviewProvider {
    static var previews: some View {
        LicenseView()
    }
} 