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
            qrcodeBox: document.getElementById('qrcode')
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
        this.dom.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
            this.dom.dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); });
        });
        this.dom.dropZone.addEventListener('dragover', () => this.dom.dropZone.classList.add('drag-over'));
        this.dom.dropZone.addEventListener('dragleave', () => this.dom.dropZone.classList.remove('drag-over'));
        this.dom.dropZone.addEventListener('drop', (e) => {
            this.dom.dropZone.classList.remove('drag-over');
            this.handleFileSelect(e.dataTransfer.files[0]);
        });

        this.dom.generateBtn.addEventListener('click', () => this.generateLink());
        this.dom.copyBtn.addEventListener('click', () => this.copyLink());
        this.dom.qrBtn.addEventListener('click', () => this.toggleQR());
        this.dom.advancedToggle.addEventListener('click', () => {
            this.dom.advancedPanel.classList.toggle('hidden');
        });
        this.dom.camoBtn.addEventListener('click', () => Features.toggleCamouflage(true));
        this.dom.camoTrigger.addEventListener('click', () => Features.toggleCamouflage(false));

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
                alert("File required for transmission.");
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
                window.p2p.init().then(() => {
                    window.p2p.connect(peerId, (data) => {
                        if (data.type === 'meta') {
                            // Store metadata for when file arrives
                            console.log("Meta received:", data);
                            this.receivedHeader = {
                                filename: data.filename,
                                size: data.originalSize || data.size, // Use original size if encrypted
                                encrypted: data.encrypted,
                                salt: data.salt,
                                iv: data.iv,
                                beam: true
                            };
                            this.dom.recvFilename.innerText = (data.encrypted ? "🔒 " : "📡 ") + data.filename;
                            this.dom.recvFilesize.innerText = "Receiving data...";
                        }
                        else if (data.type === 'file') {
                            this.receivedBlob = new Blob([data.blob]);
                            // If we didn't get meta first (unlikely due to order), fallback? 
                            // PeerJS usually guarantees order.

                            if (this.receivedHeader && this.receivedHeader.encrypted) {
                                this.receivedHeader.payload = null; // We have blob directly
                                this.dom.recvFilesize.innerText = "Encrypted File Received.";
                                this.dom.decryptPanel.classList.remove('hidden');
                                this.dom.decryptBtn.innerText = "Unlock Beam File";
                                // Decrypt button handler needs to know it's a blob, not base64 payload
                            } else {
                                this.dom.recvFilesize.innerText = this.formatSize(this.receivedBlob.size);
                                this.dom.downloadBtn.disabled = false;
                                this.dom.downloadBtn.innerText = "Download File";
                            }
                        }
                    });
                });
                return;
            } else if (hash.startsWith('AETHER|')) {
                const parts = hash.split('|');
                header = JSON.parse(atob(parts[1]));
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
        if (!password) { alert("Please enter password"); return; }
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
            alert("Decryption failed. Wrong password?");
            this.dom.decryptBtn.disabled = false;
            this.dom.decryptBtn.innerText = "Unlock File";
        }
    }

    handleFileSelect(file) {
        if (!file) return;
        this.currentFile = file;
        this.dom.fileInfo.name.innerText = file.name;
        this.dom.fileInfo.size.innerText = this.formatSize(file.size);
        this.dom.optionsPanel.classList.remove('hidden');
        this.dom.resultPanel.classList.add('hidden');
        if (file.type.startsWith('image/')) {
            this.dom.lossyToggle.parentElement.classList.remove('hidden');
            this.dom.lossyToggle.checked = true;
        } else {
            this.dom.lossyToggle.parentElement.classList.add('hidden');
            this.dom.lossyToggle.checked = false;
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

                    window.p2p.sendFile(this.currentFile);
                    this.setLoading(false); // Ensure loader is off
                    alert("File transferred via Beam!");
                    if (statusMsg) statusMsg.innerText = "✅ Transfer Complete!";
                });

                const safeFilename = encodeURIComponent(this.currentFile.name);
                const hashData = `BEAM|${peerId}|${safeFilename}|${this.currentFile.size}`;
                this.showResult(hashData);

                // Update text to indicate waiting state
                const statusMsg = document.querySelector('.status-msg');
                if (statusMsg) statusMsg.innerText = "📡 Beam Active: Waiting for receiver...";

            } catch (err) {
                console.error(err);
                alert("Infinity Beam Error: " + err.message);
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

                const headerBase64 = btoa(JSON.stringify(header));
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
