import threading
import time
import queue
import os
import sounddevice as sd
import numpy as np
import scipy.signal as signal
import speech_recognition as sr

class SpeechToTextEngine:
    """Enhanced Microphone Listener & Speech-To-Text Processor with 16kHz Resampling and Audio Normalization."""

    def __init__(self):
        self._recognizer = sr.Recognizer()
        # Adjust energy threshold and dynamic sensitivity
        self._recognizer.energy_threshold = 300
        self._recognizer.dynamic_energy_threshold = True
        self._has_sr = True
        self.device_sample_rate = 16000
        self.target_sample_rate = 16000
        self.is_recording = False
        self.audio_queue = queue.Queue()
        self.stream = None
        print("[STT] SoundDevice Enhanced SpeechRecognition initialized.")

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
                self.device_sample_rate = int(device_info.get('default_samplerate', 16000))
            except Exception:
                self.device_sample_rate = 16000

            self.stream = sd.InputStream(
                device=input_device,
                samplerate=self.device_sample_rate,
                channels=1,
                dtype='float32',  # Capture in float32 for clean normalization and resampling
                callback=callback
            )
            self.stream.start()
            print(f"[STT] Recording started on '{input_device or 'default'}' at native {self.device_sample_rate} Hz...")
        except Exception as e:
            print(f"[STT Error starting stream]: {e}")
            self.is_recording = False

    def stop_and_transcribe(self, language: str = "en-US") -> str:
        """Stops recording, normalizes audio, resamples to 16kHz, and transcribes cleanly with Google STT."""
        if not self.is_recording:
            return ""
            
        print("[STT] Stopping recording...")
        self.is_recording = False
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass
        
        audio_data = []
        while not self.audio_queue.empty():
            audio_data.append(self.audio_queue.get())
            
        if not audio_data:
            print("[STT] No audio captured.")
            return ""
            
        # Concatenate raw float32 samples
        audio_np = np.concatenate(audio_data, axis=0).flatten()
        
        if len(audio_np) < int(self.device_sample_rate * 0.3):
            print("[STT] Audio snippet too short (< 0.3s).")
            return ""

        # --- 1. AUDIO NORMALIZATION ---
        # Normalize audio levels so quiet headset mics are clear and loud for Google's model
        max_val = np.max(np.abs(audio_np))
        if max_val > 1e-4:
            audio_np = audio_np / max_val * 0.92  # Peak at 92% of full scale
        else:
            print("[STT] Silence / very low audio detected.")
            return ""

        # --- 2. HIGH-QUALITY ANTI-ALIASED RESAMPLING TO 16 kHz ---
        if self.device_sample_rate != self.target_sample_rate:
            try:
                # Use polyphase filtering for crisp, anti-aliased downsampling
                from math import gcd
                common_gcd = gcd(self.device_sample_rate, self.target_sample_rate)
                up = self.target_sample_rate // common_gcd
                down = self.device_sample_rate // common_gcd
                audio_resampled = signal.resample_poly(audio_np, up, down)
            except Exception:
                # Fallback to standard resample
                num_target_samples = int(len(audio_np) * self.target_sample_rate / self.device_sample_rate)
                audio_resampled = signal.resample(audio_np, num_target_samples)
        else:
            audio_resampled = audio_np

        # Convert float32 [-1.0, 1.0] to 16-bit PCM integer
        audio_int16 = np.clip(audio_resampled * 32767.0, -32768, 32767).astype(np.int16)
        
        print(f"[STT] Transcribing 16kHz audio ({len(audio_int16)/16000:.2f}s) with Google...")
        
        # Helper to transcribe with fallback languages
        languages_to_try = [language]
        if language not in ["en-IN", "en-US"]:
            languages_to_try.extend(["en-US", "en-IN"])
        elif language == "en-US":
            languages_to_try.append("en-IN")
        elif language == "en-IN":
            languages_to_try.append("en-US")

        for lang in languages_to_try:
            try:
                audio_data_obj = sr.AudioData(audio_int16.tobytes(), self.target_sample_rate, 2)
                text = self._recognizer.recognize_google(audio_data_obj, language=lang)
                if text:
                    print(f"[STT User Said ({lang})]: '{text}'")
                    return text
            except sr.UnknownValueError:
                continue
            except sr.RequestError as e:
                print(f"[STT] Google API error: {e}")
                return ""

        print("[STT] Audio recorded, but speech was unintelligible.")
        return ""

# Singleton instance
_stt_instance = None

def get_stt_engine() -> SpeechToTextEngine:
    global _stt_instance
    if _stt_instance is None:
        _stt_instance = SpeechToTextEngine()
    return _stt_instance
