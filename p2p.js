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
        if (this.peer) return; // Already init

        return new Promise((resolve, reject) => {
            // Using default PeerJS cloud server (free tier)
            this.peer = new Peer();

            this.peer.on('open', (id) => {
                this.peerId = id;
                console.log('My peer ID is: ' + id);
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    // SENDER: Wait for connection
    waitForReceiver(onConnection) {
        if (!this.peer) return;

        this.peer.on('connection', (conn) => {
            this.conn = conn;
            console.log("Receiver connected!");

            conn.on('open', () => {
                onConnection();
                // Send metadata first?
            });
        });
    }

    // SENDER: Send file
    sendFile(file) {
        if (!this.conn) return;

        // PeerJS handles binary serialization automatically
        this.conn.send({
            type: 'meta',
            filename: file.name,
            size: file.size,
            type: file.type
        });

        this.conn.send({
            type: 'file',
            blob: file
        });
    }

    // RECEIVER: Connect to sender
    connect(hostId, onData) {
        if (!this.peer) return;

        this.conn = this.peer.connect(hostId);

        this.conn.on('open', () => {
            console.log("Connected to Sender");
        });

        this.conn.on('data', (data) => {
            onData(data);
        });
    }
}

window.p2p = new P2P();
