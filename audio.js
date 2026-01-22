/**
 * AetherShare - Audio Modem v2
 * Uses AudioContext for FSK Modulation/Demodulation + Visualization.
 */

class AudioKey {
    constructor() {
        this.ctx = null;
        this.osc = null;

        // Frequencies (Hz)
        this.markFreq = 2000; // '1'
        this.spaceFreq = 1200; // '0'
        this.baudRate = 20; // Bits per sec (Increased from 10)

        // Receiver State
        this.isListening = false;
        this.analyser = null;
        this.microphone = null;
        this.onSpectrum = null;      // Callback for viz
        this.onBit = null;           // Callback for received bit

        // Decoding
        this.rxBuffer = []; // Rolling buffer of levels
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // --- TRANSMITTER ---
    async transmit(text) {
        this.init();
        // Browser requires user interaction to resume audio context
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        // Preamble (Sync)
        // 10101010 sync byte + data + constant tail
        const binary = "10101010" + this.textToBinary(text) + "0000";
        console.log("Transmitting...", text, binary);

        const startTime = this.ctx.currentTime + 0.1;
        const bitDuration = 1 / this.baudRate;

        this.osc = this.ctx.createOscillator();
        this.osc.type = 'sine'; // Sine wave is smoothest

        // Add Gain Node to control volume (avoid clipping but ensure audibility)
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = 0.5; // 50% volume to prevent distortion

        this.osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        // Schedule Frequencies
        this.osc.frequency.setValueAtTime(this.spaceFreq, startTime);

        for (let i = 0; i < binary.length; i++) {
            const bit = binary[i];
            const time = startTime + (i * bitDuration);
            const freq = bit === '1' ? this.markFreq : this.spaceFreq;
            this.osc.frequency.setValueAtTime(freq, time);
        }

        const endTime = startTime + (binary.length * bitDuration);

        this.osc.start(startTime);
        this.osc.stop(endTime);

        return new Promise(r => setTimeout(r, (endTime - startTime) * 1000 + 500));
    }

    textToBinary(text) {
        return text.split('').map(char => {
            return char.charCodeAt(0).toString(2).padStart(8, '0');
        }).join('');
    }

    // --- RECEIVER ---
    async startListening(onSpectrum, onBitDecoded) {
        this.init();
        if (this.isListening) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphone = this.ctx.createMediaStreamSource(stream);
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 2048; // Resolution
            this.analyser.smoothingTimeConstant = 0.5;
            this.microphone.connect(this.analyser);

            this.isListening = true;
            this.onSpectrum = onSpectrum;
            this.onBit = onBitDecoded;

            this.processLoop();

        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    stopListening() {
        this.isListening = false;
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
    }

    processLoop() {
        if (!this.isListening) return;

        // 1. Spectrum Data for Viz
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        if (this.onSpectrum) this.onSpectrum(dataArray);

        // 2. Decode Logic (Simple Energy Detection)
        // Bin size = 44100 / 2048 ~= 21.5 Hz
        const hzPerBin = this.ctx.sampleRate / this.analyser.fftSize;
        const markBin = Math.round(this.markFreq / hzPerBin);
        const spaceBin = Math.round(this.spaceFreq / hzPerBin);

        // Scan a small range around target bins to be forgiving
        const range = 2;
        let markEnergy = 0;
        let spaceEnergy = 0;

        for (let i = -range; i <= range; i++) {
            markEnergy = Math.max(markEnergy, dataArray[markBin + i]);
            spaceEnergy = Math.max(spaceEnergy, dataArray[spaceBin + i]);
        }

        const noiseGate = 50;

        if (markEnergy > noiseGate || spaceEnergy > noiseGate) {
            // Very simple majority vote
            const bit = markEnergy > spaceEnergy ? 1 : 0;
            if (this.onBit) this.onBit(bit, Math.max(markEnergy, spaceEnergy));
        }

        requestAnimationFrame(() => this.processLoop());
    }
}

window.audioComp = new AudioKey();
