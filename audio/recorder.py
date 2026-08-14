import speech_recognition as sr

class AudioRecorder:
    """Microphone Audio Recorder with sensitive noise adjustment."""

    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 150
        self.recognizer.dynamic_energy_threshold = True
        self._microphone = None
        self._init_microphone()

    def _init_microphone(self):
        try:
            self._microphone = sr.Microphone()
        except Exception as e:
            print(f"[AudioRecorder Init Warning]: {e}")

    def capture_prompt(self, timeout: float = 7.0) -> str:
        """Captures microphone input while listening for voice."""
        if not self._microphone:
            return ""

        try:
            with self._microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.2)
                print("[AudioRecorder] Listening...")
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=10.0)

            text = self.recognizer.recognize_google(audio)
            print(f"[AudioRecorder User Prompt]: {text}")
            return text
        except Exception as e:
            print(f"[AudioRecorder Error]: {e}")
            return ""

# Global instance
recorder = AudioRecorder()
