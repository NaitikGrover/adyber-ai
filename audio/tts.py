import threading
import queue
import sys

class TextToSpeechEngine:
    """Ultra-responsive, low-latency Text-to-Speech Engine using Windows SAPI5 / pyttsx3."""

    def __init__(self):
        self._speech_queue = queue.Queue()
        self._is_speaking = False
        self._thread = threading.Thread(target=self._speech_worker, daemon=True)
        self._thread.start()

    def speak(self, text: str):
        if not text or not text.strip():
            return
        
        # Clean text formatting for voice speech
        clean_text = text.replace('*', '').replace('#', '').replace('http://', '').replace('https://', '')
        print(f"[AI Voice Speaker]: {clean_text[:120]}...")
        
        # Clear stale queued speech items for instant responsiveness
        with self._speech_queue.mutex:
            self._speech_queue.queue.clear()
            
        self._speech_queue.put(clean_text)

    def _speech_worker(self):
        try:
            import pythoncom
            pythoncom.CoInitialize()
        except Exception:
            pass

        # Primary: Windows SAPI5 COM Speaker for zero-latency instant voice
        sapi_speaker = None
        try:
            import win32com.client
            sapi_speaker = win32com.client.Dispatch("SAPI.SpVoice")
            sapi_speaker.Rate = 1
            print("[TTS] SAPI5 Windows Voice Engine initialized.")
        except Exception as e:
            print(f"[TTS] SAPI5 init warning ({e}), fallback to pyttsx3...")

        # Fallback: pyttsx3 Engine
        pyttsx_engine = None
        if sapi_speaker is None:
            try:
                import pyttsx3
                pyttsx_engine = pyttsx3.init()
                pyttsx_engine.setProperty('rate', 190)
            except Exception as e2:
                print(f"[TTS] pyttsx3 init warning: {e2}")

        while True:
            text = self._speech_queue.get()
            if text is None:
                break

            self._is_speaking = True
            try:
                if sapi_speaker:
                    sapi_speaker.Speak(text)
                elif pyttsx_engine:
                    pyttsx_engine.say(text)
                    pyttsx_engine.runAndWait()
            except Exception as err:
                print(f"[TTS Speak Error]: {err}")
            finally:
                self._is_speaking = False
                self._speech_queue.task_done()

# Singleton instance
_tts_instance = None

def get_tts_engine() -> TextToSpeechEngine:
    global _tts_instance
    if _tts_instance is None:
        _tts_instance = TextToSpeechEngine()
    return _tts_instance
