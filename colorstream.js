/**
 * AetherShare — Color Stream Engine
 * Optical data transfer via rapid color pulse sequences.
 * Each color encodes 2 bits (4 colors = 2 bits per frame).
 * Uses camera + canvas analysis for reception.
 */

class ColorStreamEngine {

    // Color palette: 4 saturated colors mapped to 2-bit values
    // Chosen for maximum perceptual distance from each other
    static PALETTE = [
        { r: 255, g: 0,   b: 0,   label: 'RED',    bits: '00' },   // 0
        { r: 0,   g: 255, b: 0,   label: 'GREEN',  bits: '01' },   // 1
        { r: 0,   g: 0,   b: 255, label: 'BLUE',   bits: '10' },   // 2
        { r: 255, g: 255, b: 0,   label: 'YELLOW', bits: '11' },   // 3
    ];

    // Sync pulse: WHITE then BLACK
    static SYNC_COLOR  = { r: 255, g: 255, b: 255 };
    static CLOCK_COLOR = { r: 0,   g: 0,   b: 0   };

    constructor() {
        this.isTransmitting = false;
        this.isReceiving = false;

        this._txTimer = null;
        this._rxStream = null;
        this._rxVideo = null;
        this._rxAnimFrame = null;
    }

    // =====================================================
    // TRANSMITTER
    // =====================================================

    /**
     * Encode a text string into a color frame sequence.
     * Format: SYNC(white,black) + length_frames + data_frames + END_SYNC
     * @param {string} text - Text to encode.
     * @returns {Array<{r,g,b}>} Array of color frames.
     */
    encodeText(text) {
        const bytes = new TextEncoder().encode(text);
        const frames = [];

        // Start sync: 3x white-black alternating
        for (let i = 0; i < 3; i++) {
            frames.push(ColorStreamEngine.SYNC_COLOR);
            frames.push(ColorStreamEngine.CLOCK_COLOR);
        }

        // Encode length (2 bytes, 4 frames of 2 bits each = 8 bits per byte)
        const lenHigh = (bytes.length >> 8) & 0xFF;
        const lenLow = bytes.length & 0xFF;
        frames.push(...this._byteToColorFrames(lenHigh));
        frames.push(...this._byteToColorFrames(lenLow));

        // Encode data bytes
        for (const byte of bytes) {
            frames.push(...this._byteToColorFrames(byte));
        }

        // End sync: 3x white-black
        for (let i = 0; i < 3; i++) {
            frames.push(ColorStreamEngine.SYNC_COLOR);
            frames.push(ColorStreamEngine.CLOCK_COLOR);
        }

        return frames;
    }

    /**
     * Start transmitting color sequence on a canvas.
     * @param {HTMLCanvasElement} canvas
     * @param {Array<{r,g,b}>} frames - Color sequence from encodeText.
     * @param {number} intervalMs - Milliseconds per frame.
     * @param {Function} onComplete - Called when sequence ends.
     * @param {boolean} loop - Whether to loop the sequence.
     */
    startTransmitting(canvas, frames, intervalMs = 50, onComplete = null, loop = true) {
        const ctx = canvas.getContext('2d');
        let index = 0;
        this.isTransmitting = true;

        // Set canvas to fill container
        canvas.width = canvas.clientWidth || 400;
        canvas.height = canvas.clientHeight || 225;

        const render = () => {
            if (!this.isTransmitting) return;

            const frame = frames[index];
            ctx.fillStyle = `rgb(${frame.r}, ${frame.g}, ${frame.b})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            index++;

            if (index >= frames.length) {
                if (loop) {
                    index = 0;
                } else {
                    this.isTransmitting = false;
                    onComplete?.();
                    return;
                }
            }

            this._txTimer = setTimeout(render, intervalMs);
        };

        render();
    }

    /**
     * Stop transmitting.
     */
    stopTransmitting() {
        this.isTransmitting = false;
        if (this._txTimer) {
            clearTimeout(this._txTimer);
            this._txTimer = null;
        }
    }

    // =====================================================
    // RECEIVER (Camera-based)
    // =====================================================

    /**
     * Start scanning camera for color stream.
     * @param {HTMLVideoElement} video
     * @param {Object} callbacks
     * @param {Function} callbacks.onData - Called with decoded text when complete.
     * @param {Function} callbacks.onStatus - Status messages.
     * @param {Function} callbacks.onError
     */
    async startReceiving(video, { onData, onStatus, onError }) {
        try {
            this._rxStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 320 }, height: { ideal: 240 } }
            });

            video.srcObject = this._rxStream;
            this._rxVideo = video;
            this.isReceiving = true;

            const scanCanvas = document.createElement('canvas');
            const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

            // State machine
            let state = 'WAITING_SYNC'; // WAITING_SYNC, READING_LENGTH, READING_DATA, DONE
            let syncCount = 0;
            let lastColor = null;
            const collectedBits = [];
            let expectedLength = 0;
            let samplesBuffer = [];

            const sampleRate = 20; // samples per second
            let lastSampleTime = 0;

            const scan = (timestamp) => {
                if (!this.isReceiving) return;

                // Rate limit sampling
                if (timestamp - lastSampleTime < 1000 / sampleRate) {
                    this._rxAnimFrame = requestAnimationFrame(scan);
                    return;
                }
                lastSampleTime = timestamp;

                if (video.readyState >= video.HAVE_CURRENT_DATA) {
                    scanCanvas.width = 32;
                    scanCanvas.height = 24;
                    scanCtx.drawImage(video, 0, 0, 32, 24);

                    const imageData = scanCtx.getImageData(0, 0, 32, 24);
                    const avgColor = this._getAverageColor(imageData);
                    const detected = this._classifyColor(avgColor);

                    if (detected !== lastColor) {
                        lastColor = detected;

                        if (state === 'WAITING_SYNC') {
                            if (detected === 'WHITE' || detected === 'BLACK') {
                                syncCount++;
                                if (syncCount >= 4) {
                                    state = 'READING_LENGTH';
                                    collectedBits.length = 0;
                                    onStatus?.('Sync detected, reading...');
                                }
                            } else {
                                syncCount = 0;
                            }
                        }
                        else if (state === 'READING_LENGTH' || state === 'READING_DATA') {
                            if (detected === 'WHITE' || detected === 'BLACK') {
                                // Potential end sync
                                syncCount++;
                                if (syncCount >= 4 && state === 'READING_DATA') {
                                    // End of transmission
                                    this._decodeCollected(collectedBits, expectedLength, onData, onError);
                                    state = 'DONE';
                                    this.stopReceiving();
                                    return;
                                }
                            } else {
                                syncCount = 0;
                                const palette = ColorStreamEngine.PALETTE.find(p => p.label === detected);
                                if (palette) {
                                    collectedBits.push(palette.bits);

                                    if (state === 'READING_LENGTH' && collectedBits.length >= 8) {
                                        // First 8 frames = 16 bits = 2 bytes length
                                        const lenBits = collectedBits.splice(0, 8).join('');
                                        expectedLength = parseInt(lenBits, 2);
                                        state = 'READING_DATA';
                                        onStatus?.(`Expecting ${expectedLength} bytes...`);
                                    }
                                }
                            }
                        }
                    }
                }

                this._rxAnimFrame = requestAnimationFrame(scan);
            };

            video.onloadeddata = () => {
                onStatus?.('Camera ready. Point at color stream...');
                this._rxAnimFrame = requestAnimationFrame(scan);
            };

        } catch (err) {
            onError?.(err);
        }
    }

    /**
     * Stop receiving.
     */
    stopReceiving() {
        this.isReceiving = false;
        if (this._rxAnimFrame) {
            cancelAnimationFrame(this._rxAnimFrame);
            this._rxAnimFrame = null;
        }
        if (this._rxStream) {
            this._rxStream.getTracks().forEach(t => t.stop());
            this._rxStream = null;
        }
    }

    // =====================================================
    // INTERNAL
    // =====================================================

    /** @private Convert a byte to 4 color frames (2 bits each) */
    _byteToColorFrames(byte) {
        return [
            ColorStreamEngine.PALETTE[(byte >> 6) & 0x03],
            ColorStreamEngine.PALETTE[(byte >> 4) & 0x03],
            ColorStreamEngine.PALETTE[(byte >> 2) & 0x03],
            ColorStreamEngine.PALETTE[(byte >> 0) & 0x03],
        ];
    }

    /** @private Get average RGB from image data */
    _getAverageColor(imageData) {
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        const pixels = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }

        return { r: r / pixels, g: g / pixels, b: b / pixels };
    }

    /** @private Classify average color to nearest palette entry */
    _classifyColor({ r, g, b }) {
        // Check for sync colors first
        const brightness = (r + g + b) / 3;
        if (brightness > 200) return 'WHITE';
        if (brightness < 40) return 'BLACK';

        // Find nearest palette color by Euclidean distance
        let minDist = Infinity;
        let nearest = null;

        for (const p of ColorStreamEngine.PALETTE) {
            const dist = Math.sqrt(
                (r - p.r) ** 2 +
                (g - p.g) ** 2 +
                (b - p.b) ** 2
            );
            if (dist < minDist) {
                minDist = dist;
                nearest = p.label;
            }
        }

        return minDist < 150 ? nearest : null;
    }

    /** @private Decode collected bit pairs into text */
    _decodeCollected(bitPairs, expectedLength, onData, onError) {
        try {
            const allBits = bitPairs.join('');
            const bytes = new Uint8Array(Math.floor(allBits.length / 8));

            for (let i = 0; i < bytes.length; i++) {
                bytes[i] = parseInt(allBits.substr(i * 8, 8), 2);
            }

            const text = new TextDecoder().decode(bytes.slice(0, expectedLength));
            onData?.(text);
        } catch (err) {
            onError?.(err);
        }
    }
}

window.colorStreamEngine = new ColorStreamEngine();
