/**
 * AetherShare - Serverless File Sharing
 * Logic for encoding/decoding files to/from URL hash.
 */

class Encoder {
    static async fileToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    static base64ToBlob(base64) {
        const byteCharacters = atob(base64);
        const byteArrays = [];
        const sliceSize = 1024;

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays);
    }

    static async compressStream(readableStream) {
        if (!window.CompressionStream) return new Response(readableStream).blob();
        const compressedStream = readableStream.pipeThrough(new CompressionStream('gzip'));
        const response = new Response(compressedStream);
        return await response.blob();
    }

    static async decompressBlob(blob) {
        if (!window.DecompressionStream) return blob;
        const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        const response = new Response(stream);
        return await response.blob();
    }

    static async compressImage(file, quality = 0.7) {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => resolve(blob), 'image/webp', quality);
            };
            img.onerror = () => resolve(file);
        });
    }

    static async deriveKey(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
        );
        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    static async encrypt(blob, password) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(password, salt);

        const fileBuffer = await blob.arrayBuffer();
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv }, key, fileBuffer
        );

        return {
            salt: this.bufferToBase64(salt),
            iv: this.bufferToBase64(iv),
            data: this.bufferToBase64(encryptedBuffer)
        };
    }

    static async decrypt(base64Data, password, base64Salt, base64Iv) {
        const salt = this.base64ToBuffer(base64Salt);
        const iv = this.base64ToBuffer(base64Iv);
        const encryptedData = this.base64ToBuffer(base64Data);

        const key = await this.deriveKey(password, salt);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv }, key, encryptedData
        );

        return new Blob([decryptedBuffer]);
    }

    static async encryptBlob(blob, password) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(password, salt);

        const fileBuffer = await blob.arrayBuffer();
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv }, key, fileBuffer
        );

        return {
            salt: this.bufferToBase64(salt),
            iv: this.bufferToBase64(iv),
            blob: new Blob([encryptedBuffer])
        };
    }

    static async decryptBlob(encryptedBlob, password, base64Salt, base64Iv) {
        const salt = this.base64ToBuffer(base64Salt);
        const iv = this.base64ToBuffer(base64Iv);
        const encryptedBuffer = await encryptedBlob.arrayBuffer();

        const key = await this.deriveKey(password, salt);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv }, key, encryptedBuffer
        );

        return new Blob([decryptedBuffer]);
    }

    static bufferToBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    static base64ToBuffer(base64) {
        return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    }

    // Unicode-safe String Base64
    static stringToBase64(str) {
        return this.bufferToBase64(new TextEncoder().encode(str));
    }

    static base64ToString(base64) {
        return new TextDecoder().decode(this.base64ToBuffer(base64));
    }
}

class App {
    constructor() {
        this.dom = {
            senderView: document.getElementById('sender-view'),
            receiverView: document.getElementById('receiver-view'),
            dropZone: document.getElementById('drop-zone'),
            fileInput: document.getElementById('file-input'),
            optionsPanel: document.getElementById('options-panel'),
            fileInfo: {
                name: document.getElementById('filename'),
                size: document.getElementById('filesize')
            },
            resultPanel: document.getElementById('result-panel'),
            generateBtn: document.getElementById('generate-btn'),
            shareUrl: document.getElementById('share-url'),
            copyBtn: document.getElementById('copy-btn'),
            qrBtn: document.getElementById('qr-btn'),
            previewLink: document.getElementById('preview-link'),
            progressBar: document.getElementById('progress-container'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),

            // Settings
            lossyToggle: document.getElementById('lossy-toggle'),
            encryptToggle: document.getElementById('encrypt-toggle'),
            passwordContainer: document.getElementById('password-input-container'),
            senderPassword: document.getElementById('sender-password'),

            // Advanced
            advancedToggle: document.getElementById('advanced-toggle-btn'),
            advancedPanel: document.getElementById('advanced-panel'),
            timeBombSelect: document.getElementById('timebomb-select'),
            vibeSelect: document.getElementById('vibe-select'),
            geoToggle: document.getElementById('geo-toggle'),
            beamToggle: document.getElementById('beam-toggle'),
            camoBtn: document.getElementById('camo-btn'),
            camoTrigger: document.getElementById('camo-trigger'),

            // Audio
            openAudioBtn: document.getElementById('open-audio-btn'),
            audioTxBtn: document.getElementById('audio-tx-btn'),
            audioModal: document.getElementById('audio-modal'),
            closeAudioBtn: document.getElementById('close-audio-btn'),
            startListenBtn: document.getElementById('start-listen-btn'),
            stopListenBtn: document.getElementById('stop-listen-btn'),
            audioCanvas: document.getElementById('audio-visualizer'),
            streamOutput: document.getElementById('stream-output'),

            // Receiver
            recvFilename: document.getElementById('recv-filename'),
            recvFilesize: document.getElementById('recv-filesize'),
            downloadBtn: document.getElementById('download-btn'),
            decryptPanel: document.getElementById('decrypt-panel'),
            decryptPassword: document.getElementById('decrypt-password'),
            decryptBtn: document.getElementById('decrypt-btn'),

            // Output
            qrContainer: document.getElementById('qr-container'),
            qrcodeBox: document.getElementById('qrcode'),

            // Toast
            toastContainer: document.getElementById('toast-container')
        };

        this.currentFile = null;
        this.receivedHeader = null;
        this.receivedBlob = null;
        this.init();
    }

    init() {
        this.handleRouting();
        window.addEventListener('hashchange', () => this.handleRouting());

        // Sender Events
        this.dom.dropZone.addEventListener('click', () => this.dom.fileInput.click());
        this.dom.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
            this.dom.dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); });
        });
        this.dom.dropZone.addEventListener('dragover', () => this.dom.dropZone.classList.add('drag-over'));
        this.dom.dropZone.addEventListener('dragleave', () => this.dom.dropZone.classList.remove('drag-over'));
        this.dom.dropZone.addEventListener('drop', (e) => {
            this.dom.dropZone.classList.remove('drag-over');
            this.handleFileSelect(e.dataTransfer.files);
        });

        this.dom.generateBtn.addEventListener('click', () => this.generateLink());
        this.dom.copyBtn.addEventListener('click', () => this.copyLink());
        this.dom.qrBtn.addEventListener('click', () => this.toggleQR());
        this.dom.advancedToggle.addEventListener('click', () => {
            this.dom.advancedPanel.classList.toggle('hidden');
        });
        this.dom.camoBtn.addEventListener('click', () => Features.toggleCamouflage(true));
        this.dom.camoTrigger.addEventListener('click', () => Features.toggleCamouflage(false));
        this.dom.beamToggle.addEventListener('change', () => this.checkSizeLimit());

        // Audio Events
        this.dom.openAudioBtn.addEventListener('click', () => {
            this.dom.audioModal.classList.remove('hidden');
        });

        this.dom.closeAudioBtn.addEventListener('click', () => {
            this.dom.audioModal.classList.add('hidden');
            this.stopAudioListening();
        });

        this.dom.audioTxBtn.addEventListener('click', () => {
            if (this.currentFile) {
                window.audioComp.transmit(this.currentFile.name);
            } else {
                this.showToast("File required for transmission", "error");
            }
        });

        this.dom.startListenBtn.addEventListener('click', () => {
            this.dom.startListenBtn.classList.add('hidden');
            this.dom.stopListenBtn.classList.remove('hidden');
            this.dom.streamOutput.innerText = "Listening for Aether signals...";

            window.audioComp.startListening(
                (spectrumData) => this.drawSpectrum(spectrumData),
                (bit, energy) => this.processBit(bit, energy)
            );
        });

        this.dom.stopListenBtn.addEventListener('click', () => this.stopAudioListening());

        // Toggles
        this.dom.encryptToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.dom.passwordContainer.classList.remove('hidden');
                this.dom.senderPassword.focus();
            } else {
                this.dom.passwordContainer.classList.add('hidden');
            }
        });

        // Receiver Events
        this.dom.downloadBtn.addEventListener('click', () => this.downloadFile());
        this.dom.decryptBtn.addEventListener('click', () => this.attemptDecryption());
    }

    stopAudioListening() {
        window.audioComp.stopListening();
        this.dom.startListenBtn.classList.remove('hidden');
        this.dom.stopListenBtn.classList.add('hidden');
        this.dom.streamOutput.innerText += "\n[Stopped]";
    }

    drawSpectrum(dataArray) {
        const canvas = this.dom.audioCanvas;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        const barWidth = (width / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = dataArray[i] / 2; // scale
            ctx.fillStyle = `rgb(${barHeight + 100}, 50, 200)`;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    processBit(bit, energy) {
        // Visualize bits scrolling
        const span = document.createElement('span');
        span.innerText = bit;
        span.style.color = bit === 1 ? '#00ff00' : '#555';
        this.dom.streamOutput.appendChild(span);
        // Auto scroll
        this.dom.streamOutput.scrollTop = this.dom.streamOutput.scrollHeight;
    }

    handleRouting() {
        const hash = window.location.hash.substring(1);
        if (hash.length > 5 && hash.includes('|')) {
            this.showReceiver(hash);
        } else {
            this.showSender();
        }
    }

    showSender() {
        this.dom.senderView.classList.add('active');
        this.dom.receiverView.classList.remove('active');
        this.resetSender();
    }

    async showReceiver(hash) {
        this.dom.senderView.classList.remove('active');
        this.dom.receiverView.classList.add('active');
        this.dom.downloadBtn.disabled = true;
        this.dom.decryptPanel.classList.add('hidden');
        this.receivedHeader = null;
        this.receivedBlob = null;

        try {
            let header, payload;
            if (hash.startsWith('BEAM|')) {
                const parts = hash.split('|');
                const peerId = parts[1];
                header = { filename: decodeURIComponent(parts[2]), size: parts[3], beam: true };
                this.dom.recvFilename.innerText = "📡 " + header.filename;
                this.dom.recvFilesize.innerText = "Connecting to peer...";
                // Initialize Chunking State
                this.incomingFile = {
                    chunks: [],
                    receivedSize: 0,
                    totalSize: 0,
                    startTime: 0,
                    initialized: false
                };

                // Show Progress Bar
                this.dom.progressBar.classList.remove('hidden');
                this.dom.progressFill.style.width = '0%';
                this.dom.progressText.innerText = 'Waiting for data...';

                window.p2p.init().then(() => {
                    // Connection Timeout Guard
                    const connectionTimeout = setTimeout(() => {
                        this.dom.recvFilesize.innerText = "Connection taking too long... (NAT Issue?)";
                        this.showToast("Connection is slow. Are you on a restricted network?", "info");
                    }, 15000);

                    window.p2p.connect(peerId, (data) => {
                        // Protocol V3: Meta -> Chunks
                        // Clear timeout on first data or successful connect (technically open event clears prompt via status update)
                        clearTimeout(connectionTimeout);

                        if (data.type === 'meta') {
                            console.log("RECV: Meta received:", data);
                            this.receivedHeader = {
                                filename: data.filename,
                                size: data.originalSize || data.size,
                                fileType: data.fileType || 'application/octet-stream', // Capture MIME
                                encrypted: data.encrypted,
                                salt: data.salt,
                                iv: data.iv,
                                beam: true
                            };

                            this.incomingFile.totalSize = data.totalChunks ? data.size : data.size;
                            this.incomingFile.startTime = Date.now();
                            this.incomingFile.initialized = true;

                            this.dom.recvFilename.innerText = (data.encrypted ? "🔒 " : "📡 ") + data.filename;
                            this.dom.recvFilesize.innerText = "Receiving...";
                        }
                        else if (data.type === 'chunk') {
                            // Validate initialization
                            if (!this.incomingFile.initialized) {
                                console.warn("Received chunk without meta!");
                                return;
                            }

                            // Append Chunk
                            // data.data is the blob/arraybuffer
                            this.incomingFile.chunks.push(data.data);
                            this.incomingFile.receivedSize += data.data.size || data.data.byteLength;

                            // Update UI
                            const percent = Math.min(100, Math.round((this.incomingFile.receivedSize / this.incomingFile.totalSize) * 100));
                            this.dom.progressFill.style.width = `${percent}%`;
                            this.dom.progressText.innerText = `${percent}%`;

                            // Check Completion
                            if (this.incomingFile.receivedSize >= this.incomingFile.totalSize) {
                                console.log("RECV: Transfer Complete");
                                this.dom.progressText.innerText = "Processing...";

                                const finalBlob = new Blob(this.incomingFile.chunks, { type: this.receivedHeader.fileType });
                                this.receivedBlob = finalBlob;

                                // Cleanup memory
                                this.incomingFile.chunks = [];

                                if (this.receivedHeader && this.receivedHeader.encrypted) {
                                    this.receivedHeader.payload = null;
                                    this.dom.recvFilesize.innerText = "Encrypted File Received.";
                                    this.dom.decryptPanel.classList.remove('hidden');
                                    this.dom.decryptBtn.innerText = "Unlock Beam File";
                                } else {
                                    this.dom.recvFilesize.innerText = this.formatSize(this.receivedBlob.size);
                                    this.dom.downloadBtn.disabled = false;
                                    this.dom.downloadBtn.innerText = "Download File";
                                }

                                // Hide Progress after short delay
                                setTimeout(() => this.dom.progressBar.classList.add('hidden'), 1000);
                            }
                        }
                    }, (err) => {
                        clearTimeout(connectionTimeout);
                        console.error("P2P Receiver Error:", err);
                        this.dom.recvFilesize.innerText = "Connection Failed. Refresh?";
                        this.showToast("P2P Error: " + (err.message || err), "error");
                    });
                });
                return;
            } else if (hash.startsWith('AETHER|')) {
                const parts = hash.split('|');
                header = JSON.parse(Encoder.base64ToString(parts[1]));
                payload = parts[2];
            } else {
                const parts = hash.split('|');
                if (parts[0] === 'SECURE') {
                    header = { filename: decodeURIComponent(parts[1]), encrypted: true, salt: parts[2], iv: parts[3] };
                    payload = parts[4];
                } else {
                    header = { filename: decodeURIComponent(parts[0]), encrypted: false };
                    payload = parts[1];
                }
            }

            this.receivedHeader = header;
            this.dom.recvFilename.innerText = (header.encrypted ? "🔒 " : "") + header.filename;

            if (header.expiry) {
                const status = Features.checkExpiry(header.expiry);
                if (status.expired) {
                    this.dom.recvFilename.innerText = "💥 Link Expired";
                    this.dom.recvFilesize.innerText = "Self-destructed.";
                    return;
                }
            }
            if (header.geo) {
                this.dom.recvFilesize.innerText = "Checking Location...";
                const geoStatus = await Features.verifyLocation(header.geo.lat, header.geo.lng);
                if (!geoStatus.allowed) {
                    this.dom.recvFilename.innerText = "📍 Access Denied";
                    this.dom.recvFilesize.innerText = geoStatus.error || "Wrong location.";
                    return;
                }
            }
            if (header.vibe) {
                Features.applyVibe(header.vibe);
            }

            if (header.encrypted) {
                this.dom.recvFilesize.innerText = "Encrypted File";
                this.dom.decryptPanel.classList.remove('hidden');
                this.dom.decryptBtn.innerText = "Unlock File";
            } else {
                this.dom.recvFilesize.innerText = "Processing...";
                setTimeout(async () => {
                    const compressedBlob = Encoder.base64ToBlob(payload);
                    const originalBlob = await Encoder.decompressBlob(compressedBlob);
                    this.receivedBlob = originalBlob;
                    this.dom.recvFilesize.innerText = this.formatSize(originalBlob.size);
                    this.dom.downloadBtn.disabled = false;
                    this.dom.downloadBtn.innerText = "Download File";
                }, 100);
            }
            this.receivedHeader.payload = payload;

        } catch (e) {
            console.error(e);
            this.dom.recvFilename.innerText = "Error parsing link";
            this.dom.recvFilesize.innerText = "Invalid URL format";
        }
    }

    async attemptDecryption() {
        if (!this.receivedHeader || !this.receivedHeader.encrypted) return;
        const password = this.dom.decryptPassword.value;
        if (!password) { this.showToast("Please enter password", "error"); return; }
        this.dom.decryptBtn.disabled = true;
        this.dom.decryptBtn.innerText = "Decrypting...";

        try {
            if (this.receivedHeader.beam) {
                // Beam Decryption (Blob based)
                const decryptedBlob = await Encoder.decryptBlob(
                    this.receivedBlob, password, this.receivedHeader.salt, this.receivedHeader.iv
                );
                this.receivedBlob = decryptedBlob;
            } else {
                // Legacy/Aether Decryption (Base64 based)
                const decryptedBlob = await Encoder.decrypt(
                    this.receivedHeader.payload, password, this.receivedHeader.salt, this.receivedHeader.iv
                );
                // Aether also compresses, Beam currently sends raw encrypted blob (not compressed again inside encryption?) 
                // Wait, logic says sendFile uses currentFile directly.
                // Assuming Beam doesn't compress for now or handled differently.
                // If Aether, we decompress after decrypt.
                const originalBlob = await Encoder.decompressBlob(decryptedBlob);
                this.receivedBlob = originalBlob;
            }

            this.dom.recvFilesize.innerText = this.formatSize(this.receivedBlob.size);
            this.dom.downloadBtn.disabled = false;
            this.dom.downloadBtn.innerText = "Download File";
            this.dom.decryptPanel.classList.add('hidden');
            this.dom.recvFilename.innerText = this.receivedHeader.filename;
        } catch (e) {
            console.error(e);
            this.showToast("Decryption failed. Wrong password?", "error");
            this.dom.decryptBtn.disabled = false;
            this.dom.decryptBtn.innerText = "Unlock File";
        }
    }

    async handleFileSelect(fileOrFiles) {
        if (!fileOrFiles) return;

        // Handle Multiple Files
        let fileToProcess = fileOrFiles;

        // Check if argument is a FileList or array (from multiple input) or single File
        const isMultiple = (fileOrFiles instanceof FileList || Array.isArray(fileOrFiles)) && fileOrFiles.length > 1;

        if (isMultiple) {
            this.setLoading(true, "Zipping files...");
            try {
                const zip = new JSZip();
                for (let i = 0; i < fileOrFiles.length; i++) {
                    zip.file(fileOrFiles[i].name, fileOrFiles[i]);
                }
                const zipBlob = await zip.generateAsync({ type: "blob" });
                // Create a "File" object from the blob to keep interface consistent
                fileToProcess = new File([zipBlob], "archive.zip", { type: "application/zip" });
                this.dom.fileInfo.name.innerText = `📦 archive.zip (${fileOrFiles.length} files)`;
            } catch (e) {
                console.error(e);
                this.showToast("Failed to create zip archive", "error");
                this.setLoading(false);
                return;
            } finally {
                this.setLoading(false);
            }
        } else {
            // Single file logic (normalize input)
            if (fileOrFiles instanceof FileList) fileToProcess = fileOrFiles[0];
            this.dom.fileInfo.name.innerText = fileToProcess.name;
        }

        this.currentFile = fileToProcess;
        this.dom.fileInfo.size.innerText = this.formatSize(fileToProcess.size);
        this.dom.optionsPanel.classList.remove('hidden');
        this.dom.resultPanel.classList.add('hidden');

        // Lossy Toggle only for single images
        if (!isMultiple && fileToProcess.type.startsWith('image/')) {
            this.dom.lossyToggle.parentElement.classList.remove('hidden');
            this.dom.lossyToggle.checked = true;
        } else {
            this.dom.lossyToggle.parentElement.classList.add('hidden');
            this.dom.lossyToggle.checked = false;
        }

        this.checkSizeLimit();
    }

    checkSizeLimit() {
        if (!this.currentFile) return;
        const size = this.currentFile.size;
        const isBeam = this.dom.beamToggle.checked;
        const warning = document.getElementById('size-warning');
        const beamInfo = document.getElementById('beam-info');

        // Show/Hide Beam Info
        if (beamInfo) {
            if (isBeam) beamInfo.classList.remove('hidden');
            else beamInfo.classList.add('hidden');
        }

        // Limit for URL Hash ~30KB safe (Warning ONLY)
        if (!isBeam && size > 30 * 1024) {
            if (warning) {
                warning.classList.remove('hidden');
                warning.innerText = `⚠️ Large file (>30KB). Link might be too long for some browsers.`;
            }
            // We do NOT disable the button anymore per user request
            this.dom.generateBtn.disabled = false;
            this.dom.generateBtn.title = "Large file - URL might break";
            this.dom.generateBtn.classList.remove('disabled-look');
        } else {
            if (warning) warning.classList.add('hidden');
            this.dom.generateBtn.disabled = false;
            this.dom.generateBtn.title = "";
            this.dom.generateBtn.classList.remove('disabled-look');
        }
    }

    resetSender() {
        this.dom.fileInput.value = '';
        this.currentFile = null;
        this.dom.optionsPanel.classList.add('hidden');
        this.dom.resultPanel.classList.add('hidden');
        this.dom.progressBar.classList.add('hidden');
        this.dom.passwordContainer.classList.add('hidden');
        this.dom.encryptToggle.checked = false;
        this.dom.beamToggle.checked = false;
        this.dom.senderPassword.value = '';
        this.dom.advancedPanel.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `<i>${icon}</i> <span>${message}</span>`;

        this.dom.toastContainer.appendChild(toast);

        // Trigger reflow
        void toast.offsetWidth;

        toast.classList.add('visible');

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async generateLink() {
        if (!this.currentFile) return;
        this.setLoading(true, "Processing...");

        if (this.dom.beamToggle.checked) {
            this.setLoading(true, "Initializing Beam...");
            try {
                const peerId = await window.p2p.init();
                if (!peerId) throw new Error("Failed to initialize P2P Network.");

                window.p2p.waitForReceiver(() => {
                    // Visual feedback that transfer started/finished
                    const statusMsg = document.querySelector('.status-msg');
                    if (statusMsg) statusMsg.innerText = "🚀 Sending file...";

                    // Show Progress
                    this.dom.progressBar.classList.remove('hidden');
                    this.dom.progressFill.style.width = '0%';

                    window.p2p.sendFile(this.currentFile, {}, (percent) => {
                        this.dom.progressFill.style.width = `${percent}%`;
                        this.dom.progressText.innerText = `${percent}%`;
                        if (statusMsg) statusMsg.innerText = `🚀 Sending... ${percent}%`;
                    }).then(() => {
                        this.setLoading(false);
                        this.showToast("File transferred successfully!", "success");
                        if (statusMsg) statusMsg.innerText = "✅ Transfer Complete!";
                        setTimeout(() => this.dom.progressBar.classList.add('hidden'), 2000);
                    });
                }, (error) => {
                    console.error("P2P Sender Error:", error);
                    const statusMsg = document.querySelector('.status-msg');
                    if (statusMsg) statusMsg.innerText = "❌ Connection Failed";
                    this.showToast("Connection lost: " + error.message, "error");
                });

                const safeFilename = encodeURIComponent(this.currentFile.name);
                const hashData = `BEAM|${peerId}|${safeFilename}|${this.currentFile.size}`;
                this.showResult(hashData);

                // Update text to indicate waiting state
                const statusMsg = document.querySelector('.status-msg');
                if (statusMsg) statusMsg.innerText = "📡 Beam Active: Waiting for receiver...";

            } catch (err) {
                console.error(err);
                this.showToast("Infinity Beam Error: " + err.message, "error");
            } finally {
                this.setLoading(false);
            }
            return;
        }

        setTimeout(async () => {
            try {
                let blobToCompress = this.currentFile;
                if (this.dom.lossyToggle.checked && this.currentFile.type.startsWith('image/')) {
                    this.setLoading(true, "Optimizing Image...");
                    blobToCompress = await Encoder.compressImage(this.currentFile);
                }
                this.setLoading(true, "Compressing...");
                const compressedBlob = await Encoder.compressStream(blobToCompress.stream());

                const header = {
                    filename: this.currentFile.name,
                    vibe: this.dom.vibeSelect.value !== 'default' ? this.dom.vibeSelect.value : undefined,
                    encrypted: this.dom.encryptToggle.checked
                };
                const expiryMin = parseInt(this.dom.timeBombSelect.value);
                if (expiryMin > 0) header.expiry = Features.getExpiryTimestamp(expiryMin);
                if (this.dom.geoToggle.checked) {
                    this.setLoading(true, "Getting Location...");
                    const loc = await Features.getCurrentPosition();
                    header.geo = loc;
                }

                let payloadBase64 = "";
                if (header.encrypted) {
                    const password = this.dom.senderPassword.value;
                    if (!password) throw new Error("Password required");
                    this.setLoading(true, "Encrypting...");
                    const encrypted = await Encoder.encrypt(compressedBlob, password);
                    header.salt = encrypted.salt;
                    header.iv = encrypted.iv;
                    payloadBase64 = encrypted.data;
                } else {
                    this.setLoading(true, "Encoding...");
                    payloadBase64 = await Encoder.fileToBase64(compressedBlob);
                }

                const headerBase64 = Encoder.stringToBase64(JSON.stringify(header));
                const hashData = `AETHER|${headerBase64}|${payloadBase64}`;
                this.showResult(hashData);

            } catch (error) {
                console.error("Generation failed", error);
                alert("Error: " + error.message);
            } finally {
                this.setLoading(false);
            }
        }, 100);
    }

    showResult(hashData) {
        const fullUrl = `${window.location.origin}${window.location.pathname}#${hashData}`;
        this.dom.shareUrl.value = fullUrl;
        this.dom.previewLink.href = fullUrl;
        this.dom.resultPanel.classList.remove('hidden');
        this.dom.qrcodeBox.innerHTML = '';
        this.dom.qrContainer.classList.add('hidden');
    }

    toggleQR() {
        if (!this.dom.shareUrl.value) return;
        this.dom.qrContainer.classList.toggle('hidden');
        if (!this.dom.qrContainer.classList.contains('hidden') && this.dom.qrcodeBox.innerHTML === '') {
            new QRCode(this.dom.qrcodeBox, { text: this.dom.shareUrl.value, width: 200, height: 200 });
        }
    }

    downloadFile() {
        if (!this.receivedBlob) return;
        const url = URL.createObjectURL(this.receivedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.receivedHeader ? this.receivedHeader.filename : 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    copyLink() {
        this.dom.shareUrl.select();
        navigator.clipboard.writeText(this.dom.shareUrl.value).then(() => this.showCopyFeedback());
    }

    showCopyFeedback() {
        const originalIcon = this.dom.copyBtn.innerHTML;
        this.dom.copyBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        this.dom.copyBtn.style.color = 'var(--primary)';
        setTimeout(() => { this.dom.copyBtn.innerHTML = originalIcon; this.dom.copyBtn.style.color = ''; }, 2000);
    }

    setLoading(isLoading, text = "Processing...") {
        if (isLoading) {
            this.dom.progressBar.classList.remove('hidden');
            this.dom.generateBtn.disabled = true;
            this.dom.progressText.innerText = text;
            this.dom.progressFill.style.width = '70%';
        } else {
            this.dom.progressBar.classList.add('hidden');
            this.dom.generateBtn.disabled = false;
            this.dom.progressFill.style.width = '0%';
        }
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const s = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
