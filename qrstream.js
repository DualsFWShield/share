/**
 * AetherShare — QR Stream Engine (TXQR)
 * Animated QR code streaming for offline file transfer.
 * Uses qrcode-generator for encoding, jsQR + BarcodeDetector for decoding.
 */

class QRStreamEngine {
    // ---- Frame format: TXQ1|{sessionId}|{index}|{total}|{data} ----

    constructor() {
        this.isTransmitting = false;
        this.isReceiving = false;

        // Transmitter state
        this._txFrames = [];
        this._txIndex = 0;
        this._txTimer = null;
        this._txCanvas = null;

        // Receiver state
        this._rxCollected = new Map();
        this._rxTotal = 0;
        this._rxSessionId = null;
        this._rxStream = null;
        this._rxVideo = null;
        this._rxScanCanvas = null;
        this._rxScanCtx = null;
        this._rxAnimFrame = null;

        // Config
        this.CHUNK_SIZE = 400; // bytes per QR frame (conservative for phone cameras)
    }

    // =====================================================
    // TRANSMITTER
    // =====================================================

    /**
     * Prepare frames from a binary payload.
     * @param {Uint8Array} payload - Compressed/encrypted data to stream.
     * @param {string} filename - Original filename.
     * @returns {{ totalChunks: number, sessionId: string }}
     */
    prepareFrames(payload, filename) {
        const sessionId = this._generateSessionId();

        // Base64 encode the payload for QR text mode
        const base64 = this._uint8ToBase64(payload);
        const chunks = [];

        for (let i = 0; i < base64.length; i += this.CHUNK_SIZE) {
            chunks.push(base64.slice(i, i + this.CHUNK_SIZE));
        }

        // Frame 0 is metadata
        const metaPayload = JSON.stringify({ fn: filename, sz: payload.length, tc: chunks.length + 1 });

        this._txFrames = [
            `TXQ1|${sessionId}|0|${chunks.length + 1}|${metaPayload}`
        ];

        for (let i = 0; i < chunks.length; i++) {
            this._txFrames.push(`TXQ1|${sessionId}|${i + 1}|${chunks.length + 1}|${chunks[i]}`);
        }

        return { totalChunks: this._txFrames.length, sessionId };
    }

    /**
     * Start broadcasting QR frames on a canvas.
     * @param {HTMLCanvasElement} canvas - Target canvas.
     * @param {number} fps - Frames per second.
     * @param {Function} onFrameChange - Callback with (currentIndex, totalFrames).
     */
    startTransmitting(canvas, fps = 8, onFrameChange) {
        if (this._txFrames.length === 0) return;

        this._txCanvas = canvas;
        this._txIndex = 0;
        this.isTransmitting = true;

        const interval = 1000 / fps;

        const renderFrame = () => {
            if (!this.isTransmitting) return;

            const frameData = this._txFrames[this._txIndex];
            this._renderQRToCanvas(canvas, frameData);

            onFrameChange?.(this._txIndex, this._txFrames.length);

            this._txIndex = (this._txIndex + 1) % this._txFrames.length;
            this._txTimer = setTimeout(renderFrame, interval);
        };

        renderFrame();
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
        this._txFrames = [];
    }

    // =====================================================
    // RECEIVER (Camera Scanner)
    // =====================================================

    /**
     * Start scanning camera for QR stream frames.
     * @param {HTMLVideoElement} video - Video element for camera preview.
     * @param {Object} callbacks
     * @param {Function} callbacks.onProgress - (receivedCount, totalCount)
     * @param {Function} callbacks.onComplete - (payload: Uint8Array, filename: string)
     * @param {Function} callbacks.onError - (error)
     */
    async startReceiving(video, { onProgress, onComplete, onError }) {
        try {
            this._rxStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 } }
            });

            video.srcObject = this._rxStream;
            this._rxVideo = video;
            this.isReceiving = true;

            // Create off-screen canvas for frame analysis
            this._rxScanCanvas = document.createElement('canvas');
            this._rxScanCtx = this._rxScanCanvas.getContext('2d', { willReadFrequently: true });

            this._rxCollected = new Map();
            this._rxTotal = 0;
            this._rxSessionId = null;

            // Start scanning loop
            const scan = () => {
                if (!this.isReceiving) return;

                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    this._rxScanCanvas.width = video.videoWidth;
                    this._rxScanCanvas.height = video.videoHeight;
                    this._rxScanCtx.drawImage(video, 0, 0);

                    const imageData = this._rxScanCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
                    const decoded = this._decodeQR(imageData);

                    if (decoded) {
                        this._processReceivedFrame(decoded, { onProgress, onComplete, onError });
                    }
                }

                this._rxAnimFrame = requestAnimationFrame(scan);
            };

            // Wait for video to be ready
            video.onloadeddata = () => scan();

        } catch (err) {
            onError?.(err);
        }
    }

    /**
     * Stop receiving and release camera.
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

        if (this._rxVideo) {
            this._rxVideo.srcObject = null;
            this._rxVideo = null;
        }
    }

    // =====================================================
    // INTERNAL
    // =====================================================

    /** @private */
    _renderQRToCanvas(canvas, data) {
        try {
            const qr = qrcode(0, 'L'); // Auto-version, Low error correction for max capacity
            qr.addData(data);
            qr.make();

            const ctx = canvas.getContext('2d');
            const moduleCount = qr.getModuleCount();
            const cellSize = Math.floor(canvas.width / (moduleCount + 2)); // 1 module margin
            const offset = Math.floor((canvas.width - cellSize * moduleCount) / 2);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#000000';
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize, cellSize);
                    }
                }
            }
        } catch (err) {
            console.error('[QRStream] Render error:', err);
        }
    }

    /** @private */
    _decodeQR(imageData) {
        // Try native BarcodeDetector first (async but not useful here)
        // Fall back to jsQR (synchronous)
        if (typeof jsQR === 'function') {
            const result = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
            });
            return result?.data || null;
        }
        return null;
    }

    /** @private */
    _processReceivedFrame(decoded, { onProgress, onComplete, onError }) {
        // Parse frame: TXQ1|sessionId|index|total|data
        if (!decoded.startsWith('TXQ1|')) return;

        const firstPipe = decoded.indexOf('|');
        const secondPipe = decoded.indexOf('|', firstPipe + 1);
        const thirdPipe = decoded.indexOf('|', secondPipe + 1);
        const fourthPipe = decoded.indexOf('|', thirdPipe + 1);

        if (fourthPipe === -1) return;

        const sessionId = decoded.substring(firstPipe + 1, secondPipe);
        const index = parseInt(decoded.substring(secondPipe + 1, thirdPipe));
        const total = parseInt(decoded.substring(thirdPipe + 1, fourthPipe));
        const data = decoded.substring(fourthPipe + 1);

        if (isNaN(index) || isNaN(total)) return;

        // Session validation
        if (!this._rxSessionId) {
            this._rxSessionId = sessionId;
            this._rxTotal = total;
        } else if (this._rxSessionId !== sessionId) {
            // New session detected, reset
            this._rxCollected = new Map();
            this._rxSessionId = sessionId;
            this._rxTotal = total;
        }

        // Store chunk (deduplicate by index)
        if (!this._rxCollected.has(index)) {
            this._rxCollected.set(index, data);
            onProgress?.(this._rxCollected.size, this._rxTotal);
        }

        // Check completion
        if (this._rxCollected.size >= this._rxTotal) {
            this.stopReceiving();

            try {
                // Frame 0 is metadata
                const metaStr = this._rxCollected.get(0);
                const meta = JSON.parse(metaStr);

                // Concatenate data frames (1..total-1)
                let base64 = '';
                for (let i = 1; i < this._rxTotal; i++) {
                    base64 += this._rxCollected.get(i) || '';
                }

                const payload = this._base64ToUint8(base64);
                onComplete?.(payload, meta.fn);

            } catch (err) {
                onError?.(err);
            }
        }
    }

    /** @private */
    _generateSessionId() {
        return Math.random().toString(36).substring(2, 8);
    }

    /** @private */
    _uint8ToBase64(uint8) {
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
        }
        return btoa(binary);
    }

    /** @private */
    _base64ToUint8(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
}

window.qrStreamEngine = new QRStreamEngine();
