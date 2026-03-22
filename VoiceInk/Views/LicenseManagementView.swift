import SwiftUI

struct LicenseManagementView: View {
    @Environment(\.colorScheme) private var colorScheme
    let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown"

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                heroSection

                VStack(spacing: 32) {
                    openSourceCard
                    linksCard
                }
                .padding(32)
            }
        }
        .background(Color(NSColor.controlBackgroundColor))
    }

    private var heroSection: some View {
        VStack(spacing: 24) {
            AppIconView()

            VStack(spacing: 16) {
                HStack(spacing: 16) {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 32))
                        .foregroundStyle(.pink)

                    HStack(alignment: .lastTextBaseline, spacing: 8) {
                        Text("VoiceInk")
                            .font(.system(size: 32, weight: .bold))

                        Text("v\(appVersion)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding(.bottom, 4)
                    }
                }

                Text(NSLocalizedString("VoiceInk is free and open source", comment: ""))
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.vertical, 60)
    }

    private var openSourceCard: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(.green)
                Text(NSLocalizedString("Open Source", comment: ""))
                    .font(.headline)
                Spacer()
                Text("MIT License")
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(.green))
                    .foregroundStyle(.white)
            }

            Divider()

            Text("VoiceInk is free, open-source software. You can use it on all your devices, contribute to its development, or fork it for your own projects.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(32)
        .background(CardBackground(isSelected: false))
        .shadow(color: .black.opacity(0.05), radius: 10)
    }

    private var linksCard: some View {
        VStack(spacing: 20) {
            Text("Resources")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 40) {
                Button {
                    if let url = URL(string: "https://github.com/Beingpax/VoiceInk") {
                        NSWorkspace.shared.open(url)
                    }
                } label: {
                    linkItem(icon: "chevron.left.forwardslash.chevron.right", title: "GitHub", color: .primary)
                }
                .buttonStyle(.plain)

                Button {
                    if let url = URL(string: "https://github.com/Beingpax/VoiceInk/releases") {
                        NSWorkspace.shared.open(url)
                    }
                } label: {
                    linkItem(icon: "list.bullet.clipboard.fill", title: "Changelog", color: .blue)
                }
                .buttonStyle(.plain)

                Button {
                    if let url = URL(string: "https://discord.gg/xryDy57nYD") {
                        NSWorkspace.shared.open(url)
                    }
                } label: {
                    linkItem(icon: "bubble.left.and.bubble.right.fill", title: "Discord", color: .purple)
                }
                .buttonStyle(.plain)

                Button {
                    EmailSupport.openSupportEmail()
                } label: {
                    linkItem(icon: "envelope.fill", title: "Email Support", color: .orange)
                }
                .buttonStyle(.plain)

                Button {
                    if let url = URL(string: "https://tryvoiceink.com/docs") {
                        NSWorkspace.shared.open(url)
                    }
                } label: {
                    linkItem(icon: "book.fill", title: "Docs", color: .indigo)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(32)
        .background(CardBackground(isSelected: false))
        .shadow(color: .black.opacity(0.05), radius: 10)
    }

    private func linkItem(icon: String, title: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(color)

            Text(title)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.primary)
        }
    }
}


