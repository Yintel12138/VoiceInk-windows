import Foundation
import os

/// A generic WebSocket streaming provider for custom self-hosted or third-party
/// streaming ASR (Automatic Speech Recognition) endpoints.
///
/// This class implements the `StreamingTranscriptionProvider` protocol using macOS's
/// native `URLSessionWebSocketTask`, enabling real-time partial transcription results
/// from any compliant WebSocket server without requiring a vendor-specific SDK.
///
/// ## Wire Protocol
///
/// The server MUST implement the following WebSocket protocol:
///
/// **Client → Server:**
/// - Binary frames: raw PCM-16 audio chunks (16 kHz, mono, little-endian)
/// - Text frame `{"type":"session_start","model":"…","language":"…"}` — sent on connect
/// - Text frame `{"type":"commit"}` — sent when the user stops recording to request finalisation
///
/// **Server → Client (JSON text frames):**
/// - `{"type":"partial","text":"…"}` — real-time intermediate hypothesis
/// - `{"type":"committed","text":"…"}` or `{"type":"final","text":"…"}` — final committed segment
/// - `{"type":"session_started"}` — (optional) server ready notification
/// - `{"type":"error","message":"…"}` — server-side error description
///
/// **Authentication:**
/// When `apiKey` is non-empty the provider sends `Authorization: Bearer <apiKey>` as an
/// HTTP header during the WebSocket upgrade handshake.
final class CustomWebSocketStreamingProvider: NSObject, StreamingTranscriptionProvider, URLSessionWebSocketDelegate {

    private let wsURL: URL
    private let apiKey: String
    private let logger = Logger(subsystem: "com.prakashjoshipax.voiceink", category: "CustomWebSocketStreamingProvider")

    private var urlSession: URLSession?
    private var wsTask: URLSessionWebSocketTask?
    private var receiveTask: Task<Void, Never>?

    private var eventsContinuation: AsyncStream<StreamingTranscriptionEvent>.Continuation?
    private(set) var transcriptionEvents: AsyncStream<StreamingTranscriptionEvent>

    init(wsURL: URL, apiKey: String) {
        self.wsURL = wsURL
        self.apiKey = apiKey
        var continuation: AsyncStream<StreamingTranscriptionEvent>.Continuation!
        transcriptionEvents = AsyncStream { continuation = $0 }
        eventsContinuation = continuation
    }

    deinit {
        receiveTask?.cancel()
        eventsContinuation?.finish()
    }

    // MARK: - StreamingTranscriptionProvider

    func connect(model: any TranscriptionModel, language: String?) async throws {
        var request = URLRequest(url: wsURL)
        if !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }

        let configuration = URLSessionConfiguration.default
        urlSession = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
        wsTask = urlSession?.webSocketTask(with: request)
        wsTask?.resume()

        // Background receive loop — must be started before sending any messages
        let capturedTask = wsTask
        receiveTask = Task.detached { [weak self] in
            await self?.receiveLoop(task: capturedTask)
        }

        // Inform the server about the model and language so it can initialise its pipeline
        var start: [String: Any] = ["type": "session_start", "model": model.name]
        if let lang = language, !lang.isEmpty, lang != "auto" {
            start["language"] = lang
        }
        if let data = try? JSONSerialization.data(withJSONObject: start),
           let json = String(data: data, encoding: .utf8) {
            try await wsTask?.send(.string(json))
        }

        logger.notice("CustomWebSocket: connected to \(self.wsURL, privacy: .public)")
    }

    func sendAudioChunk(_ data: Data) async throws {
        guard let wsTask = wsTask else {
            throw StreamingTranscriptionError.notConnected
        }
        try await wsTask.send(.data(data))
    }

    func commit() async throws {
        guard let wsTask = wsTask else {
            throw StreamingTranscriptionError.notConnected
        }
        let commitMsg = #"{"type":"commit"}"#
        try await wsTask.send(.string(commitMsg))
        logger.notice("CustomWebSocket: commit sent")
    }

    func disconnect() async {
        receiveTask?.cancel()
        receiveTask = nil
        wsTask?.cancel(with: .normalClosure, reason: nil)
        wsTask = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil
        eventsContinuation?.finish()
        logger.notice("CustomWebSocket: disconnected")
    }

    // MARK: - URLSessionWebSocketDelegate

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?
    ) {
        logger.notice("CustomWebSocket: connection opened")
        eventsContinuation?.yield(.sessionStarted)
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        let reasonStr = reason.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        logger.notice("CustomWebSocket: closed (code \(closeCode.rawValue)) \(reasonStr, privacy: .public)")
        eventsContinuation?.finish()
    }

    // MARK: - Private

    private func receiveLoop(task: URLSessionWebSocketTask?) async {
        guard let task = task else { return }
        while !Task.isCancelled {
            do {
                let message = try await task.receive()
                switch message {
                case .string(let text):
                    handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        handleMessage(text)
                    }
                @unknown default:
                    break
                }
            } catch {
                if !Task.isCancelled {
                    logger.error("CustomWebSocket receive error: \(error.localizedDescription, privacy: .public)")
                    eventsContinuation?.yield(.error(
                        StreamingTranscriptionError.connectionFailed(error.localizedDescription)
                    ))
                }
                break
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard
            let data = text.data(using: .utf8),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let type = json["type"] as? String
        else {
            logger.warning("CustomWebSocket: unrecognised message: \(text, privacy: .public)")
            return
        }

        switch type {
        case "session_started":
            eventsContinuation?.yield(.sessionStarted)

        case "partial":
            let partial = json["text"] as? String ?? ""
            eventsContinuation?.yield(.partial(text: partial))

        case "committed", "final":
            let committed = json["text"] as? String ?? ""
            eventsContinuation?.yield(.committed(text: committed))

        case "error":
            let msg = json["message"] as? String ?? "Unknown error"
            logger.error("CustomWebSocket server error: \(msg, privacy: .public)")
            eventsContinuation?.yield(.error(StreamingTranscriptionError.serverError(msg)))

        default:
            logger.debug("CustomWebSocket: unknown type '\(type, privacy: .public)'")
        }
    }
}
