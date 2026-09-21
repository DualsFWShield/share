/**
 * AetherShare — Audio Engine (ggwave)
 * Data-over-sound using ggwave WebAssembly.
 * Supports audible and ultrasound protocols.
 */

class AudioEngine {
    constructor() {
        this.ggwave = null;
        this.instance = null;
        this.audioCtx = null;
        this.isListening = false;
        this.mediaStream = null;
        this.scriptNode = null;
        this.analyser = null;

        // Callbacks
        this.onReceived = null;
        this.onSpectrum = null;

        // Protocol mapping
        this.protocols = {
            audible_fast: null,
            audible_normal: null,
            ultrasound_fast: null,
            ultrasound_normal: null
        };

        this._initPromise = null;
    }

    /**
     * Initialize ggwave WASM module.
     * Returns a promise that resolves when ready.
     */
    async init() {
        if (this._initPromise) return this._initPromise;

        this._initPromise = new Promise(async (resolve, reject) => {
            try {
                if (typeof ggwave_factory !== 'function') {
                    throw new Error('ggwave library not loaded. Check CDN.');
                }

                this.ggwave = await ggwave_factory();

                // Map protocol IDs
                this.protocols = {
                    audible_fast: this.ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST,
                    audible_normal: this.ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_NORMAL,
                    ultrasound_fast: this.ggwave.ProtocolId.GGWAVE_PROTOCOL_ULTRASOUND_FAST,
                    ultrasound_normal: this.ggwave.ProtocolId.GGWAVE_PROTOCOL_ULTRASOUND_NORMAL
                };

                // Create instance with default parameters
                const params = this.ggwave.getDefaultParameters();
                params.sampleRateInp = 48000;
                params.sampleRateOut = 48000;
                this.instance = this.ggwave.init(params);

                console.log('[AudioEngine] ggwave initialized successfully');
                resolve();
            } catch (err) {
                console.error('[AudioEngine] Init failed:', err);
                this._initPromise = null;
                reject(err);
            }
        });

        return this._initPromise;
    }

    /**
     * Encode text into audio waveform and play it.
     * @param {string} text - The text to transmit.
     * @param {string} protocolKey - Protocol key (audible_fast, ultrasound_fast, etc.)
     * @param {number} volume - Volume 0-20. Default 10.
     * @returns {Promise<void>}
     */
    async transmit(text, protocolKey = 'ultrasound_fast', volume = 10) {
        await this.init();

        const protocol = this.protocols[protocolKey];
        if (protocol === undefined || protocol === null) {
            throw new Error(`Unknown protocol: ${protocolKey}`);
        }

        // Encode to PCM waveform
        const waveform = this.ggwave.encode(this.instance, text, protocol, volume);

        if (!waveform || waveform.length === 0) {
            throw new Error('ggwave.encode returned empty waveform');
        }

        // Play via Web Audio API
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
        }

        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }

        const audioBuffer = this.audioCtx.createBuffer(1, waveform.length, 48000);
        const channelData = audioBuffer.getChannelData(0);
        channelData.set(waveform);

        const source = this.audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioCtx.destination);

        return new Promise((resolve) => {
            source.onended = () => {
                console.log('[AudioEngine] Transmission complete');
                resolve();
            };
            source.start();
        });
    }

    /**
     * Start listening for audio data via microphone.
     * @param {Function} onReceived - Callback with decoded string.
     * @param {Function} onSpectrum - Callback with Uint8Array spectrum data for visualization.
     */
    async startListening(onReceived, onSpectrum) {
        await this.init();

        if (this.isListening) return;

        this.onReceived = onReceived;
        this.onSpectrum = onSpectrum;

        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
        }

        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }

        this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 48000
            }
        });

        const source = this.audioCtx.createMediaStreamSource(this.mediaStream);

        // Analyser for visualization
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.6;
        source.connect(this.analyser);

        // ScriptProcessorNode for ggwave decode
        const bufferSize = 1024;
        this.scriptNode = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);

        this.scriptNode.onaudioprocess = (event) => {
            if (!this.isListening) return;

            const inputData = event.inputBuffer.getChannelData(0);
            const result = this.ggwave.decode(this.instance, inputData);

            if (result && result.length > 0) {
                const decoded = new TextDecoder().decode(new Uint8Array(result));
                console.log('[AudioEngine] Decoded:', decoded);
                if (this.onReceived) this.onReceived(decoded);
            }
        };

        source.connect(this.scriptNode);
        this.scriptNode.connect(this.audioCtx.destination);

        this.isListening = true;

        // Start spectrum visualization loop
        this._visualizeLoop();

        console.log('[AudioEngine] Listening started');
    }

    /**
     * Stop listening.
     */
    stopListening() {
        this.isListening = false;

        if (this.scriptNode) {
            this.scriptNode.disconnect();
            this.scriptNode = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }

        this.analyser = null;
        console.log('[AudioEngine] Listening stopped');
    }

    /**
     * Get spectrum data for visualization.
     * @returns {Uint8Array|null}
     */
    getSpectrumData() {
        if (!this.analyser) return null;
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        return data;
    }

    /** @private */
    _visualizeLoop() {
        if (!this.isListening) return;

        const data = this.getSpectrumData();
        if (data && this.onSpectrum) {
            this.onSpectrum(data);
        }

        requestAnimationFrame(() => this._visualizeLoop());
    }

    /**
     * Cleanup resources.
     */
    destroy() {
        this.stopListening();
        if (this.audioCtx) {
            this.audioCtx.close();
            this.audioCtx = null;
        }
    }
}

window.audioEngine = new AudioEngine();
