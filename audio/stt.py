import threading
import time
import queue
import os
import sounddevice as sd
import numpy as np
import scipy.io.wavfile as wavfile
import speech_recognition as sr

class SpeechToTextEngine:
    """Microphone Listener & Speech-To-Text Processor using sounddevice (No PyAudio required)."""

    def __init__(self):
        self._recognizer = sr.Recognizer()
        self._has_sr = True
        self.sample_rate = 16000
        self.is_recording = False
        self.audio_queue = queue.Queue()
        self.filename = "temp_stt.wav"
        self.stream = None
        print("[STT] SoundDevice SpeechRecognition initialized.")

    def start_recording(self):
        """Starts background recording from the default microphone using native device samplerate."""
        self.is_recording = True
        self.audio_queue.queue.clear()
        
        def callback(indata, frames, time_info, status):
            if self.is_recording:
                self.audio_queue.put(indata.copy())

        try:
            input_device = None
            try:
                device_info = sd.query_devices(kind='input')
                input_device = device_info.get('name')
                self.sample_rate = int(device_info.get('default_samplerate', 16000))
            except Exception:
                self.sample_rate = 16000

            self.stream = sd.InputStream(
                device=input_device,
                samplerate=self.sample_rate,
                channels=1,
                dtype='int16',
                callback=callback
            )
            self.stream.start()
            print(f"[STT] Recording started on '{input_device or 'default'}' at {self.sample_rate} Hz...")
        except Exception as e:
            print(f"[STT Error starting stream]: {e}")
            self.is_recording = False

    def stop_and_transcribe(self) -> str:
        """Stops recording and transcribes the captured audio."""
        if not self.is_recording:
            return ""
            
        print("[STT] Stopping recording...")
        self.is_recording = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
        
        audio_data = []
        while not self.audio_queue.empty():
            audio_data.append(self.audio_queue.get())
            
        if not audio_data:
            print("[STT] No audio captured.")
            return ""
            
        audio_np = np.concatenate(audio_data, axis=0)
        
        # Ensure it's exactly 16-bit PCM for Google STT
        if audio_np.dtype == np.float32 or audio_np.dtype == np.float64:
            audio_np = (audio_np * 32767).astype(np.int16)
        else:
            audio_np = audio_np.astype(np.int16)
            
        print("[STT] Transcribing audio with Google...")
        try:
            # Pass raw bytes directly to speech_recognition, avoiding file I/O entirely!
            audio = sr.AudioData(audio_np.tobytes(), self.sample_rate, 2)
            text = self._recognizer.recognize_google(audio)
            print(f"[STT User Said]: '{text}'")
            return text
        except sr.UnknownValueError:
            print("[STT] Audio recorded, but speech was unintelligible.")
            return ""
        except sr.RequestError as e:
            print(f"[STT] Google API error: {e}")
            return ""

# Singleton instance
_stt_instance = None

def get_stt_engine() -> SpeechToTextEngine:
    global _stt_instance
    if _stt_instance is None:
        _stt_instance = SpeechToTextEngine()
    return _stt_instance
