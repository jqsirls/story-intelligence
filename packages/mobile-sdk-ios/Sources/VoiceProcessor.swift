import Foundation
import AVFoundation
import Speech

@available(iOS 14.0, *)
internal protocol VoiceProcessorDelegate: AnyObject {
    func voiceProcessor(_ processor: VoiceProcessor, didDetectSpeech speech: String, confidence: Float)
    func voiceProcessor(_ processor: VoiceProcessor, didEncounterError error: Error)
}

@available(iOS 14.0, *)
internal class VoiceProcessor: NSObject {
    
    weak var delegate: VoiceProcessorDelegate?
    
    private let audioEngine = AVAudioEngine()
    private let speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioRecorder: AVAudioRecorder?
    private var recordingURL: URL?
    
    let isEnabled: Bool
    private var isRecording = false
    
    init(enabled: Bool) {
        self.isEnabled = enabled
        self.speechRecognizer = SFSpeechRecognizer(locale: Locale.current)
        super.init()
    }
    
    func initialize() async throws {
        guard isEnabled else { return }
        
        // Request permissions
        try await requestPermissions()
        
        // Configure audio session
        try configureAudioSession()
    }
    
    private func requestPermissions() async throws {
        // Request microphone permission
        let microphoneStatus = await AVAudioSession.sharedInstance().requestRecordPermission()
        guard microphoneStatus else {
            throw VoiceProcessorError.microphonePermissionDenied
        }
        
        // Request speech recognition permission
        let speechStatus = await SFSpeechRecognizer.requestAuthorization()
        guard speechStatus == .authorized else {
            throw VoiceProcessorError.speechRecognitionPermissionDenied
        }
    }
    
    private func configureAudioSession() throws {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true)
    }
    
    func startRecording() throws {
        guard isEnabled else {
            throw VoiceProcessorError.voiceNotEnabled
        }
        
        guard !isRecording else {
            throw VoiceProcessorError.alreadyRecording
        }
        
        // Create recording URL
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        recordingURL = documentsPath.appendingPathComponent("recording_\(Date().timeIntervalSince1970).wav")
        
        guard let url = recordingURL else {
            throw VoiceProcessorError.failedToCreateRecordingURL
        }
        
        // Configure audio recorder
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]
        
        audioRecorder = try AVAudioRecorder(url: url, settings: settings)
        audioRecorder?.delegate = self
        audioRecorder?.isMeteringEnabled = true
        
        // Start recording
        guard audioRecorder?.record() == true else {
            throw VoiceProcessorError.failedToStartRecording
        }
        
        isRecording = true
        
        // Start real-time speech recognition if available
        startRealTimeSpeechRecognition()
    }
    
    func stopRecording() throws -> Data {
        guard isRecording else {
            throw VoiceProcessorError.notRecording
        }
        
        audioRecorder?.stop()
        stopRealTimeSpeechRecognition()
        
        isRecording = false
        
        guard let url = recordingURL else {
            throw VoiceProcessorError.noRecordingURL
        }
        
        do {
            let audioData = try Data(contentsOf: url)
            
            // Clean up recording file
            try? FileManager.default.removeItem(at: url)
            recordingURL = nil
            
            return audioData
        } catch {
            throw VoiceProcessorError.failedToReadRecording(error)
        }
    }
    
    private func startRealTimeSpeechRecognition() {
        guard let speechRecognizer = speechRecognizer,
              speechRecognizer.isAvailable else { return }
        
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        
        recognitionRequest.shouldReportPartialResults = true
        
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }
        
        audioEngine.prepare()
        
        do {
            try audioEngine.start()
        } catch {
            delegate?.voiceProcessor(self, didEncounterError: error)
            return
        }
        
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }
            
            if let error = error {
                self.delegate?.voiceProcessor(self, didEncounterError: error)
                return
            }
            
            if let result = result {
                let speech = result.bestTranscription.formattedString
                let confidence = result.bestTranscription.segments.last?.confidence ?? 0.0
                self.delegate?.voiceProcessor(self, didDetectSpeech: speech, confidence: confidence)
            }
        }
    }
    
    private func stopRealTimeSpeechRecognition() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        
        recognitionTask?.cancel()
        recognitionTask = nil
    }
    
    func synthesizeVoice(text: String, config: VoiceConfig) async throws -> Data {
        // Use AVSpeechSynthesizer for basic TTS or integrate with ElevenLabs API
        return try await synthesizeWithAVSpeech(text: text, config: config)
    }
    
    private func synthesizeWithAVSpeech(text: String, config: VoiceConfig) async throws -> Data {
        return try await withCheckedThrowingContinuation { continuation in
            let synthesizer = AVSpeechSynthesizer()
            let utterance = AVSpeechUtterance(string: text)
            
            // Configure voice
            if let voice = AVSpeechSynthesisVoice(language: config.language ?? "en-US") {
                utterance.voice = voice
            }
            
            utterance.rate = config.speed
            utterance.pitchMultiplier = config.pitch
            utterance.volume = config.volume
            
            // Create audio file
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let audioURL = documentsPath.appendingPathComponent("synthesis_\(Date().timeIntervalSince1970).wav")
            
            // Configure audio session for synthesis
            do {
                let audioSession = AVAudioSession.sharedInstance()
                try audioSession.setCategory(.playback, mode: .default)
                try audioSession.setActive(true)
                
                // Write to file (simplified - in real implementation would use AVAudioEngine)
                synthesizer.speak(utterance)
                
                // For now, return empty data - in real implementation would capture audio
                continuation.resume(returning: Data())
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
}

// MARK: - AVAudioRecorderDelegate

@available(iOS 14.0, *)
extension VoiceProcessor: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if !flag {
            delegate?.voiceProcessor(self, didEncounterError: VoiceProcessorError.recordingFailed)
        }
    }
    
    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        if let error = error {
            delegate?.voiceProcessor(self, didEncounterError: error)
        }
    }
}

// MARK: - Error Types

enum VoiceProcessorError: Error, LocalizedError {
    case voiceNotEnabled
    case microphonePermissionDenied
    case speechRecognitionPermissionDenied
    case alreadyRecording
    case notRecording
    case failedToCreateRecordingURL
    case failedToStartRecording
    case recordingFailed
    case noRecordingURL
    case failedToReadRecording(Error)
    
    var errorDescription: String? {
        switch self {
        case .voiceNotEnabled:
            return "Voice processing is not enabled"
        case .microphonePermissionDenied:
            return "Microphone permission denied"
        case .speechRecognitionPermissionDenied:
            return "Speech recognition permission denied"
        case .alreadyRecording:
            return "Already recording"
        case .notRecording:
            return "Not currently recording"
        case .failedToCreateRecordingURL:
            return "Failed to create recording URL"
        case .failedToStartRecording:
            return "Failed to start recording"
        case .recordingFailed:
            return "Recording failed"
        case .noRecordingURL:
            return "No recording URL available"
        case .failedToReadRecording(let error):
            return "Failed to read recording: \(error.localizedDescription)"
        }
    }
}

// MARK: - Supporting Types

struct VoiceConfig {
    let language: String?
    let speed: Float
    let pitch: Float
    let volume: Float
    let emotion: String?
    
    init(
        language: String? = nil,
        speed: Float = 0.5,
        pitch: Float = 1.0,
        volume: Float = 1.0,
        emotion: String? = nil
    ) {
        self.language = language
        self.speed = speed
        self.pitch = pitch
        self.volume = volume
        self.emotion = emotion
    }
}