/**
 * AetherShare — P2P Engine (WebRTC via PeerJS)
 * Supports bidirectional persistent data channel, multi-file sequential streaming,
 * backpressure control, and instant reconnect / scan pairing.
 */

class P2PEngine {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.peerId = null;
        this.remotePeerId = null;
        this._initPromise = null;

        // Current incoming file state (reset after each file transfer)
        this.incomingFile = null;

        // Active connection event listeners
        this.eventListeners = {
            connected: [],
            disconnected: [],
            meta: [],
            progress: [],
            complete: [],
            error: []
        };
    }

    /**
     * Subscribe to engine events
     * @param {'connected'|'disconnected'|'meta'|'progress'|'complete'|'error'} event
     * @param {Function} callback
     */
    on(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
        return this;
    }

    /**
     * Unsubscribe from engine events
     */
    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
        return this;
    }

    _emit(event, ...args) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(cb => {
                try { cb(...args); } catch (e) { console.error(`[P2P] Event ${event} error:`, e); }
            });
        }
    }

    /**
     * Initialize PeerJS and get a peer ID.
     * @returns {Promise<string>} The assigned peer ID.
     */
    async init() {
        if (this.peer && !this.peer.destroyed && this.peerId) {
            return this.peerId;
        }

        if (this._initPromise) return this._initPromise;

        this._initPromise = new Promise((resolve, reject) => {
            const config = {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                        { urls: 'stun:stun3.l.google.com:19302' },
                        { urls: 'stun:stun4.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                        { urls: 'stun:stun.services.mozilla.com' },
                        { urls: 'stun:stun.cloudflare.com:3478' }
                    ]
                }
            };

            this.peer = new Peer(config);

            this.peer.on('open', (id) => {
                this.peerId = id;
                console.log('[P2P] My peer ID:', id);
                this._initPromise = null;
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                console.log('[P2P] Incoming connection from:', conn.peer);
                this._setupConnection(conn, false);
            });

            this.peer.on('error', (err) => {
                console.error('[P2P] PeerJS Error:', err);
                this._emit('error', err);
                if (err.type === 'browser-incompatible' || err.type === 'invalid-id' || err.type === 'unavailable-id') {
                    this._initPromise = null;
                    reject(err);
                }
            });

            this.peer.on('disconnected', () => {
                console.log('[P2P] Peer disconnected from signaling server. Reconnecting...');
                try { this.peer.reconnect(); } catch (e) { console.error(e); }
            });
        });

        return this._initPromise;
    }

    /**
     * Check if a peer connection is currently active.
     * @returns {boolean}
     */
    isConnected() {
        return Boolean(this.conn && this.conn.open);
    }

    /**
     * Generate a receiver-first URL hash.
     * @returns {string} URL hash fragment like P2P_RECV|{peerId}
     */
    getReceiverHash() {
        return `P2P_RECV|${this.peerId}`;
    }

    /**
     * Generate a sender-first URL hash.
     * @param {File} [file] - Optional file reference.
     * @returns {string} URL hash fragment.
     */
    getSenderHash(file) {
        if (file) {
            const safeName = encodeURIComponent(file.name);
            return `BEAM|${this.peerId}|${safeName}|${file.size}`;
        }
        return `BEAM|${this.peerId}`;
    }

    /**
     * Connect to a remote peer (outbound connection).
     * @param {string} remotePeerId
     * @returns {Promise<void>}
     */
    async connectTo(remotePeerId) {
        await this.init();

        if (this.isConnected() && this.remotePeerId === remotePeerId) {
            console.log('[P2P] Already connected to:', remotePeerId);
            return;
        }

        // Close any existing active connection
        if (this.conn) {
            try { this.conn.close(); } catch (e) { /* ignore */ }
        }

        return new Promise((resolve, reject) => {
            console.log('[P2P] Connecting to peer:', remotePeerId);
            const conn = this.peer.connect(remotePeerId, {
                reliable: true,
                serialization: 'binary'
            });

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout (25s). Ensure the other device is online.'));
            }, 25000);

            conn.on('open', () => {
                clearTimeout(timeout);
                console.log('[P2P] Outbound connection opened with:', remotePeerId);
                this._setupConnection(conn, true);
                resolve();
            });

            conn.on('error', (err) => {
                clearTimeout(timeout);
                console.error('[P2P] Outbound connection error:', err);
                this._emit('error', err);
                reject(err);
            });
        });
    }

    /**
     * Listen for incoming connection (Receiver mode).
     * @param {Object} [callbacks]
     */
    waitForSender(callbacks = {}) {
        if (callbacks.onConnected) this.on('connected', callbacks.onConnected);
        if (callbacks.onMeta) this.on('meta', callbacks.onMeta);
        if (callbacks.onProgress) this.on('progress', callbacks.onProgress);
        if (callbacks.onComplete) this.on('complete', callbacks.onComplete);
        if (callbacks.onError) this.on('error', callbacks.onError);
    }

    /**
     * Listen for receiver to connect (Sender mode).
     * @param {Object} [callbacks]
     */
    waitForReceiver(callbacks = {}) {
        if (callbacks.onReceiverConnected) this.on('connected', callbacks.onReceiverConnected);
        if (callbacks.onError) this.on('error', callbacks.onError);
    }

    /**
     * Connect and receive in one shot (for #BEAM| URL links).
     */
    async connectAndReceive(remotePeerId, callbacks = {}) {
        if (callbacks.onMeta) this.on('meta', callbacks.onMeta);
        if (callbacks.onProgress) this.on('progress', callbacks.onProgress);
        if (callbacks.onComplete) this.on('complete', callbacks.onComplete);
        if (callbacks.onError) this.on('error', callbacks.onError);

        await this.connectTo(remotePeerId);
    }

    /**
     * Internal: Attach data listeners to an open DataConnection.
     * Keeps connection open for unlimited sequential file transfers.
     * @private
     */
    _setupConnection(conn, isOutbound) {
        this.conn = conn;
        this.remotePeerId = conn.peer;

        // Reset incoming buffer for new connection
        this.incomingFile = null;

        conn.on('data', (data) => {
            this._handleIncomingData(data);
        });

        conn.on('close', () => {
            console.log('[P2P] Connection closed with:', conn.peer);
            const wasConnected = this.isConnected();
            this.conn = null;
            this.remotePeerId = null;
            this.incomingFile = null;
            this._emit('disconnected', conn.peer);
        });

        conn.on('error', (err) => {
            console.error('[P2P] DataChannel error:', err);
            this._emit('error', err);
        });

        this._emit('connected', conn.peer, isOutbound);
    }

    /**
     * Internal: Process chunked stream data on the open channel.
     * @private
     */
    _handleIncomingData(data) {
        try {
            if (data.type === 'meta') {
                console.log('[P2P] Incoming file metadata:', data.filename, data.size);
                this.incomingFile = {
                    meta: data,
                    chunks: [],
                    receivedSize: 0,
                    totalSize: data.size,
                    startTime: Date.now(),
                    initialized: true
                };

                this._emit('meta', {
                    filename: data.filename,
                    size: data.size,
                    fileType: data.fileType,
                    encrypted: data.encrypted,
                    salt: data.salt,
                    iv: data.iv,
                    fileIndex: data.fileIndex,
                    totalFiles: data.totalFiles
                });
            } else if (data.type === 'chunk') {
                if (!this.incomingFile || !this.incomingFile.initialized) {
                    console.warn('[P2P] Received chunk before metadata');
                    return;
                }

                const chunkData = data.data;
                this.incomingFile.chunks.push(chunkData);

                const chunkSize = chunkData.byteLength || chunkData.size || 0;
                this.incomingFile.receivedSize += chunkSize;

                const elapsed = (Date.now() - this.incomingFile.startTime) / 1000;
                const percent = Math.min(100, Math.round(
                    (this.incomingFile.receivedSize / this.incomingFile.totalSize) * 100
                ));
                const speedMBps = elapsed > 0
                    ? ((this.incomingFile.receivedSize / (1024 * 1024)) / elapsed).toFixed(2)
                    : '—';

                this._emit('progress', percent, this.incomingFile.receivedSize, this.incomingFile.totalSize, speedMBps);

                // Check file completion
                if (this.incomingFile.receivedSize >= this.incomingFile.totalSize) {
                    console.log('[P2P] File receive complete:', this.incomingFile.meta.filename);

                    const finalBlob = new Blob(this.incomingFile.chunks, {
                        type: this.incomingFile.meta.fileType || 'application/octet-stream'
                    });
                    const meta = this.incomingFile.meta;

                    // Reset incoming buffer so the channel stays open and ready for the next file!
                    this.incomingFile = null;

                    this._emit('complete', finalBlob, meta);
                }
            }
        } catch (err) {
            console.error('[P2P] Data processing error:', err);
            this._emit('error', err);
        }
    }

    /**
     * Send a single file over the established connection.
     * @param {File|Blob} file - File or Blob to send.
     * @param {Object} [meta] - Extra metadata (filename, encrypted, salt, iv, fileIndex, totalFiles).
     * @param {Function} [onProgress] - Callback (percent, sentBytes, totalBytes, speedMBps).
     * @returns {Promise<void>}
     */
    async sendFile(file, meta = {}, onProgress) {
        if (!this.isConnected()) throw new Error('No active peer connection');

        const CHUNK_SIZE = 16 * 1024; // 16KB per chunk
        const filename = meta.filename || file.name || 'file.bin';
        const totalSize = file.size;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
        const startTime = Date.now();

        console.log(`[P2P] Sending: ${filename} (${totalSize} bytes, ${totalChunks} chunks)`);

        // 1. Send metadata header
        this.conn.send({
            type: 'meta',
            filename,
            size: totalSize,
            fileType: file.type || 'application/octet-stream',
            totalChunks,
            ...meta
        });

        // 2. Stream chunks with backpressure
        const arrayBuffer = await file.arrayBuffer();
        let offset = 0;
        let chunkIndex = 0;

        while (offset < totalSize) {
            const end = Math.min(offset + CHUNK_SIZE, totalSize);
            const chunk = arrayBuffer.slice(offset, end);

            this.conn.send({
                type: 'chunk',
                index: chunkIndex,
                data: chunk
            });

            offset = end;
            chunkIndex++;

            const elapsed = (Date.now() - startTime) / 1000;
            const percent = Math.min(100, Math.round((offset / totalSize) * 100));
            const speedMBps = elapsed > 0 ? ((offset / (1024 * 1024)) / elapsed).toFixed(2) : '—';

            onProgress?.(percent, offset, totalSize, speedMBps);

            // Backpressure: yield every 25 chunks or if buffer is high
            if (chunkIndex % 25 === 0) {
                const dc = this.conn?.dataChannel;
                if (dc && dc.bufferedAmount > 1024 * 1024) {
                    await new Promise(resolve => {
                        const check = () => {
                            if (!dc || dc.bufferedAmount < 256 * 1024) {
                                resolve();
                            } else {
                                setTimeout(check, 20);
                            }
                        };
                        check();
                    });
                } else {
                    await new Promise(r => setTimeout(r, 4));
                }
            }
        }

        console.log(`[P2P] Sent file successfully: ${filename}`);
    }

    /**
     * Send multiple files sequentially across the active channel.
     * Keeps connection open after all files are sent.
     * @param {Array<File>} files
     * @param {Function} [metaProvider] - async (file, index, count) => meta
     * @param {Function} [onFileStart] - (file, index, count)
     * @param {Function} [onProgress] - (percent, sent, total, speed, fileIndex, totalFiles)
     * @param {Function} [onFileComplete] - (file, index, count)
     */
    async sendFiles(files, metaProvider, onFileStart, onProgress, onFileComplete) {
        if (!this.isConnected()) throw new Error('No active peer connection');

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const meta = metaProvider ? await metaProvider(file, i, files.length) : {};
            meta.fileIndex = i + 1;
            meta.totalFiles = files.length;
            meta.filename = meta.filename || file.name;

            onFileStart?.(file, i + 1, files.length);

            await this.sendFile(file, meta, (percent, sent, total, speed) => {
                onProgress?.(percent, sent, total, speed, i + 1, files.length);
            });

            onFileComplete?.(file, i + 1, files.length);

            // Brief pause between files
            if (i < files.length - 1) {
                await new Promise(r => setTimeout(r, 80));
            }
        }
    }

    /**
     * Disconnect current active peer connection without destroying the peer instance.
     * The engine remains ready to accept new connections or reconnect.
     */
    disconnect() {
        if (this.conn) {
            try { this.conn.close(); } catch (e) { /* ignore */ }
            this.conn = null;
        }
        const prevRemote = this.remotePeerId;
        this.remotePeerId = null;
        this.incomingFile = null;
        if (prevRemote) {
            this._emit('disconnected', prevRemote);
        }
    }

    /**
     * Destroy peer and cleanup completely.
     */
    destroy() {
        this.disconnect();
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) { /* ignore */ }
            this.peer = null;
        }
        this.peerId = null;
        this._initPromise = null;
        this.eventListeners = {
            connected: [],
            disconnected: [],
            meta: [],
            progress: [],
            complete: [],
            error: []
        };
    }
}

window.p2pEngine = new P2PEngine();
