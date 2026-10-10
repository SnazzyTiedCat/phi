import Foundation

/// The models Phi calls. Raw values are the exact API model IDs.
enum AnthropicModel: String, Sendable {
    case sonnet = "claude-sonnet-5-5"
    case haiku = "claude-haiku-5-5"
}

/// One turn of a conversation.
struct AnthropicMessage: Codable, Sendable, Equatable {
    let role: String      // "user" or "assistant" only
    let content: String
}

/// Failures the UI can show directly. None of them carry the API key.
enum AnthropicError: LocalizedError {
    case missingAPIKey
    case invalidAPIKey            // HTTP 401
    case rateLimited              // HTTP 429
    case overloaded               // HTTP 529
    case http(status: Int, message: String)
    case emptyResponse
    case malformedResponse
    /// The reply hit `max_tokens` before it finished. Retrying with the same budget won't help.
    case truncated
    case transport(Error)
    /// The Keychain could not be read. This is not the same as "no key saved".
    case keyUnavailable(Error)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "Add your Anthropic API key in Settings to use Phi."
        case .invalidAPIKey:
            return "Anthropic did not accept your API key. Check it in Settings."
        case .rateLimited:
            return "Too many requests right now. Wait a moment and try again."
        case .overloaded:
            return "Claude is busy right now. Try again in a moment."
        case .http(let status, let message):
            return "Anthropic returned an error (\(status)): \(message)"
        case .emptyResponse:
            return "Claude sent back an empty reply. Try again."
        case .malformedResponse:
            return "Phi could not read the reply from Anthropic. Try again."
        case .truncated:
            return "The reply was too long and got cut off. Try a smaller section or a shorter question."
        case .transport:
            return "Phi could not reach Anthropic. Check your connection and try again."
        case .keyUnavailable:
            return "Phi could not read your saved API key from the Keychain. Re-enter it in Settings."
        }
    }
}

/// Calls the Messages API directly from the device.
///
/// `keyProvider` runs on every request, so a key changed in Settings takes effect
/// right away. The key is sent only in the `x-api-key` header.
struct AnthropicClient: Sendable {
    private static let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!
    private static let apiVersion = "2023-06-01"
    private static let timeout: TimeInterval = 120

    private let session: URLSession
    private let keyProvider: @Sendable () throws -> String

    init(session: URLSession = .shared, keyProvider: @escaping @Sendable () throws -> String) {
        self.session = session
        self.keyProvider = keyProvider
    }

    /// Returns the full reply text in one response.
    func complete(system: String, messages: [AnthropicMessage], model: AnthropicModel, maxTokens: Int) async throws -> String {
        let request = try makeRequest(system: system, messages: messages, model: model, maxTokens: maxTokens, stream: false)
        let (data, http) = try await send(request)
        guard (200..<300).contains(http.statusCode) else {
            throw Self.error(for: http, body: data)
        }

        let reply: ReplyBody
        do {
            reply = try JSONDecoder().decode(ReplyBody.self, from: data)
        } catch {
            throw AnthropicError.malformedResponse
        }
        // Check the stop reason before the text. A cut-off reply can still look valid.
        if reply.stopReason == "max_tokens" {
            throw AnthropicError.truncated
        }
        let text = reply.content
            .compactMap { $0.type == "text" ? $0.text : nil }
            .joined()
        guard !text.isEmpty else {
            throw AnthropicError.emptyResponse
        }
        return text
    }

    /// Yields text as it arrives. Cancelling the consumer cancels the request.
    func stream(system: String, messages: [AnthropicMessage], model: AnthropicModel, maxTokens: Int) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream<String, Error> { continuation in
            let task = Task {
                do {
                    try await self.readStream(
                        system: system,
                        messages: messages,
                        model: model,
                        maxTokens: maxTokens,
                        into: continuation
                    )
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: Self.wrap(error))
                }
            }
            continuation.onTermination = { _ in
                task.cancel()
            }
        }
    }

    // MARK: - Requests

    private func makeRequest(system: String, messages: [AnthropicMessage], model: AnthropicModel, maxTokens: Int, stream: Bool) throws -> URLRequest {
        let apiKey = try resolvedKey()

        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = Self.timeout
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue(Self.apiVersion, forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONEncoder().encode(
            RequestBody(model: model.rawValue, maxTokens: maxTokens, system: system, messages: messages, stream: stream)
        )
        return request
    }

    /// Reads the key fresh each time. A missing or blank key fails before any network call.
    private func resolvedKey() throws -> String {
        // Only a missing key means "add a key". Any other failure is reported as such,
        // so a readable saved key is never mistaken for a missing one.
        let raw: String
        do {
            raw = try keyProvider()
        } catch let error as AnthropicError {
            throw error
        } catch {
            throw AnthropicError.keyUnavailable(error)
        }
        let key = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            throw AnthropicError.missingAPIKey
        }
        return key
    }

    private func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw AnthropicError.malformedResponse
            }
            return (data, http)
        } catch {
            throw Self.wrap(error)
        }
    }

    // MARK: - Streaming

    private func readStream(
        system: String,
        messages: [AnthropicMessage],
        model: AnthropicModel,
        maxTokens: Int,
        into continuation: AsyncThrowingStream<String, Error>.Continuation
    ) async throws {
        let request = try makeRequest(system: system, messages: messages, model: model, maxTokens: maxTokens, stream: true)
        let (bytes, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw AnthropicError.malformedResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            var body = Data()
            for try await byte in bytes {
                body.append(byte)
            }
            throw Self.error(for: http, body: body)
        }

        for try await line in bytes.lines {
            // Only data lines carry JSON. Event names and blank separators are skipped.
            guard line.hasPrefix("data:") else { continue }
            let payload = line.dropFirst("data:".count).trimmingCharacters(in: .whitespaces)

            let event: StreamEvent
            do {
                event = try JSONDecoder().decode(StreamEvent.self, from: Data(payload.utf8))
            } catch {
                throw AnthropicError.malformedResponse
            }

            switch event.type {
            case "content_block_delta":
                if let delta = event.delta, delta.type == "text_delta", let text = delta.text, !text.isEmpty {
                    continuation.yield(text)
                }
            case "message_stop":
                return
            case "error":
                throw Self.streamError(event.error)
            default:
                break
            }
        }

        // A reply always ends with message_stop. Anything else is a cut-off reply.
        throw AnthropicError.malformedResponse
    }

    // MARK: - Errors

    /// Maps a non-2xx response to an error. The body is read first so the server's message can be shown.
    private static func error(for response: HTTPURLResponse, body: Data) -> AnthropicError {
        switch response.statusCode {
        case 401:
            return .invalidAPIKey
        case 429:
            return .rateLimited
        case 529:
            return .overloaded
        default:
            return .http(status: response.statusCode, message: serverMessage(in: body))
        }
    }

    private static func serverMessage(in body: Data) -> String {
        if let envelope = try? JSONDecoder().decode(ErrorEnvelope.self, from: body),
           let message = envelope.error.message,
           !message.isEmpty {
            return message
        }
        return "No details were returned."
    }

    /// An `error` event arrives after the HTTP status is already 200, so the known
    /// types map to the same cases as their HTTP codes.
    private static func streamError(_ detail: ErrorDetail?) -> AnthropicError {
        switch detail?.type ?? "" {
        case "overloaded_error":
            return .overloaded
        case "rate_limit_error":
            return .rateLimited
        case "authentication_error":
            return .invalidAPIKey
        default:
            return .http(status: 200, message: detail?.message ?? "The stream ended with an error.")
        }
    }

    /// Keeps Anthropic errors as they are and sorts URLSession failures.
    private static func wrap(_ error: Error) -> Error {
        if error is AnthropicError || error is CancellationError {
            return error
        }
        if let urlError = error as? URLError, urlError.code == .cancelled {
            return CancellationError()
        }
        return AnthropicError.transport(error)
    }
}

// MARK: - Wire types

private struct RequestBody: Encodable {
    let model: String
    let maxTokens: Int
    let system: String
    let messages: [AnthropicMessage]
    let stream: Bool

    enum CodingKeys: String, CodingKey {
        case model
        case maxTokens = "max_tokens"
        case system
        case messages
        case stream
    }
}

private struct ReplyBody: Decodable {
    struct Block: Decodable {
        let type: String
        let text: String?
    }

    let content: [Block]
    /// "end_turn" for a finished reply, "max_tokens" for a cut-off one.
    let stopReason: String?

    enum CodingKeys: String, CodingKey {
        case content
        case stopReason = "stop_reason"
    }
}

private struct StreamEvent: Decodable {
    struct Delta: Decodable {
        let type: String?
        let text: String?
    }

    let type: String
    let delta: Delta?
    let error: ErrorDetail?
}

private struct ErrorEnvelope: Decodable {
    let error: ErrorDetail
}

private struct ErrorDetail: Decodable {
    let type: String?
    let message: String?
}
