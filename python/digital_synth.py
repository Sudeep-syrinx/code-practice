import math
import struct
import wave

class Synthesizer:
    def __init__(self, sample_rate=44100):
        self.sample_rate = sample_rate

    def _apply_adsr(self, samples, attack, decay, sustain_level, release):
        """ Applies Attack-Decay-Sustain-Release envelope """
        total_len = len(samples)
        attack_len = int(attack * self.sample_rate)
        decay_len = int(decay * self.sample_rate)
        release_len = int(release * self.sample_rate)
        
        env = []
        for i in range(total_len):
            if i < attack_len:
                # Attack: linear rise to 1.0
                env.append(i / attack_len if attack_len else 1.0)
            elif i < attack_len + decay_len:
                # Decay: linear fall to sustain level
                progress = (i - attack_len) / decay_len
                env.append(1.0 - (1.0 - sustain_level) * progress)
            elif i < total_len - release_len:
                # Sustain
                env.append(sustain_level)
            else:
                # Release: linear fall to 0.0
                progress = (i - (total_len - release_len)) / release_len
                env.append(sustain_level * (1.0 - progress))
        
        return [s * e for s, e in zip(samples, env)]

    def generate_wave(self, freq, duration, wave_type='sine', volume=0.5):
        samples = []
        for i in range(int(self.sample_rate * duration)):
            t = i / self.sample_rate
            if wave_type == 'sine':
                val = math.sin(2 * math.pi * freq * t)
            elif wave_type == 'square':
                val = 1.0 if math.sin(2 * math.pi * freq * t) > 0 else -1.0
            elif wave_type == 'sawtooth':
                val = 2.0 * (t * freq - math.floor(t * freq + 0.5))
            else:
                val = 0
            samples.append(val * volume)
        return samples

    def export_wav(self, filename, samples):
        # Convert floats (-1.0 to 1.0) to 16-bit PCM integers
        pcm_samples = [int(max(-1.0, min(1.0, s)) * 32767) for s in samples]
        
        with wave.open(filename, 'w') as wav_file:
            wav_file.setnchannels(1) # Mono
            wav_file.setsampwidth(2) # 2 bytes (16 bit)
            wav_file.setframerate(self.sample_rate)
            for sample in pcm_samples:
                wav_file.writeframes(struct.pack('<h', sample))
        print(f"Exported {len(samples)} samples to {filename}")

if __name__ == "__main__":
    synth = Synthesizer()
    
    # Generate a pure C4 note (261.63 Hz) for 2 seconds
    print("Generating sine wave (C4)...")
    sine_wave = synth.generate_wave(261.63, 2.0, wave_type='sine')
    
    # Apply ADSR envelope: 0.1s attack, 0.2s decay, 70% sustain, 0.5s release
    shaped_wave = synth._apply_adsr(sine_wave, attack=0.1, decay=0.2, sustain_level=0.7, release=0.5)
    
    synth.export_wav("test_sine_c4.wav", shaped_wave)
