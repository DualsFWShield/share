/**
 * AetherShare - Infinity Beam (WebRTC P2P)
 * Uses PeerJS for limitless file transfer.
 */

class P2P {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.peerId = null;
    }

    // Initialize PeerJS (CDN required in index.html)
    async init() {
        if (this.peer) return this.peerId;

        return new Promise((resolve, reject) => {
            // Configuration robuste pour traverser les NATs (STUN)
            // Note: Sans serveur TURN, les NATs symétriques bloqueront toujours la connexion.
            const config = {
                debug: 2, // Affiche les erreurs dans la console
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                        { urls: 'stun:stun3.l.google.com:19302' },
                        { urls: 'stun:stun4.l.google.com:19302' },
                        { urls: 'stun:stun.services.mozilla.com' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            };

            this.peer = new Peer(config);

            this.peer.on('open', (id) => {
                this.peerId = id;
                console.log('My peer ID is: ' + id);
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error("PeerJS Error:", err);
                // Si l'ID est déjà pris ou erreur fatale
                if (['invalid-id', 'unavailable-id'].includes(err.type)) {
                    reject(err);
                }
            });

            this.peer.on('disconnected', () => {
                console.log("Peer Disconnected. Attempting reconnect...");
                try { this.peer.reconnect(); } catch (e) { console.error(e); }
            });
        });
    }

    // SENDER: Wait for connection
    waitForReceiver(onConnection, onError) {
        if (!this.peer) return;

        this.peer.off('connection');

        this.peer.on('connection', (conn) => {
            this.conn = conn;
            console.log("Receiver connected!");

            conn.on('open', () => {
                onConnection();
            });

            conn.on('error', (err) => {
                console.error("Connection Error (Sender):", err);
                if (onError) onError(err);
            });

            conn.on('close', () => {
                console.log("Connection Closed");
            });
        });
    }

    // SENDER: Send file with Chunking (V3)
    async sendFile(file, extraMeta = {}, onProgress) {
        if (!this.conn) return;

        const CHUNK_SIZE = 16 * 1024; // 16KB (Safe for WebRTC)
        const totalSize = file.size;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

        console.log(`SEND: Starting Chunked Transfer. Size: ${totalSize}, Chunks: ${totalChunks}`);

        try {
            // 1. Send Metadata
            this.conn.send({
                type: 'meta',
                filename: file.name,
                size: file.size,
                fileType: file.type,
                totalChunks: totalChunks,
                ...extraMeta
            });

            // 2. Send Chunks
            let offset = 0;
            let chunkIndex = 0;

            while (offset < totalSize) {
                const chunk = file.slice(offset, offset + CHUNK_SIZE);

                this.conn.send({
                    type: 'chunk',
                    offset: offset,
                    data: chunk
                });

                offset += CHUNK_SIZE;
                chunkIndex++;

                // Update Progress
                if (onProgress) {
                    const percent = Math.min(100, Math.round((offset / totalSize) * 100));
                    onProgress(percent, offset, totalSize);
                }

                // Yield to event loop regularly
                if (chunkIndex % 50 === 0) await new Promise(r => setTimeout(r, 10));
            }
            console.log("SEND: Transfer Complete.");
        } catch (e) {
            console.error("Send Error:", e);
            throw e;
        }
    }

    // RECEIVER: Connect to sender
    connect(hostId, onData, onError) {
        if (!this.peer) return;

        console.log("Connecting to Peer:", hostId);

        // Reliable: true est par défaut, mais explicite pour être sûr
        this.conn = this.peer.connect(hostId, { reliable: true });

        this.conn.on('open', () => {
            console.log("Connected to Sender");
        });

        this.conn.on('data', (data) => {
            onData(data);
        });

        this.conn.on('error', (err) => {
            console.error("Connection Error (Receiver):", err);
            if (onError) onError(err);
        });

        this.conn.on('close', () => {
            console.log("Connection Closed (Receiver)");
            if (onError) onError(new Error("Connection closed by remote peer."));
        });
    }
}

window.p2p = new P2P();
