/**
 * AetherShare — Web NFC Engine
 * Provides Tap-to-Share and Tap-to-Connect for P2P mesh rooms,
 * as well as direct NFC writing & reading for messages, URLs, and files (MIME/P2P bridge).
 * 
 * Complies with the W3C Web NFC specification (NDEFReader / NDEFWriter).
 */

class NFCEngine {
    constructor() {
        this.reader = null;
        this.scanController = null;
        this.writeController = null;
        this.isScanning = false;
        this.isWriting = false;

        this.onStatus = null;
        this.onError = null;
    }

    /**
     * Check if Web NFC is supported by the current browser and environment.
     * Web NFC is supported in Chromium-based browsers on Android over HTTPS or localhost.
     * @returns {boolean}
     */
    isSupported() {
        return typeof window !== 'undefined' && 'NDEFReader' in window;
    }

    _status(msg) {
        if (this.onStatus) this.onStatus(msg);
        console.log('[NFCEngine]', msg);
    }

    _error(err) {
        if (this.onError) this.onError(err);
        console.error('[NFCEngine Error]', err);
    }

    /**
     * Parse an incoming NDEFRecord into a user-friendly object.
     * @param {NDEFRecord} record
     * @returns {Promise<object>}
     */
    async parseRecord(record) {
        const result = {
            recordType: record.recordType,
            mediaType: record.mediaType || '',
            id: record.id || '',
            encoding: record.encoding || 'utf-8',
            lang: record.lang || '',
            raw: record.data
        };

        const decoder = new TextDecoder(record.encoding || 'utf-8');

        if (record.recordType === 'text') {
            try {
                result.text = decoder.decode(record.data);
                result.isEncrypted = result.text.startsWith('NENC|') || result.text.startsWith('AENC|') || result.text.startsWith('CENC|');
            } catch (e) {
                result.text = '[Error decoding text record]';
            }
        } else if (record.recordType === 'url') {
            try {
                result.url = decoder.decode(record.data);
            } catch (e) {
                result.url = '';
            }
        } else if (record.recordType === 'mime') {
            try {
                const buffer = record.data.buffer.slice(
                    record.data.byteOffset,
                    record.data.byteOffset + record.data.byteLength
                );
                result.bytes = buffer.byteLength;
                result.blob = new Blob([buffer], { type: record.mediaType || 'application/octet-stream' });
                
                // If it's json or text mime, decode text
                if (record.mediaType.includes('json') || record.mediaType.startsWith('text/')) {
                    result.text = decoder.decode(record.data);
                    if (record.mediaType.includes('json')) {
                        try {
                            result.json = JSON.parse(result.text);
                        } catch (err) {
                            // not json
                        }
                    }
                }
            } catch (e) {
                console.error('[NFCEngine] Error reading mime record:', e);
            }
        }

        return result;
    }

    /**
     * Start scanning for NFC tags or peer tap.
     * @param {object} options
     * @param {Function} options.onReading - callback({ serialNumber, records, rawEvent })
     * @param {Function} [options.onError] - callback(error)
     * @param {Function} [options.onReadingError] - callback(event)
     * @returns {Promise<void>}
     */
    async startScan({ onReading, onError, onReadingError } = {}) {
        if (!this.isSupported()) {
            const err = new Error('Web NFC n\'est pas supporté par ce navigateur (nécessite Chrome/Edge sur Android via HTTPS).');
            if (onError) onError(err);
            throw err;
        }

        this.stopScan();

        this.scanController = new AbortController();
        this.reader = new NDEFReader();
        this.isScanning = true;

        this.reader.onreading = async (event) => {
            this._status('Tag NFC détecté ! Lecture des données...');
            try {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(100);
                }
            } catch (_) {}

            const parsedRecords = [];
            if (event.message && event.message.records) {
                for (const rec of event.message.records) {
                    const parsed = await this.parseRecord(rec);
                    parsedRecords.push(parsed);
                }
            }

            if (onReading) {
                onReading({
                    serialNumber: event.serialNumber || 'Inconnu',
                    records: parsedRecords,
                    rawEvent: event,
                    timestamp: Date.now()
                });
            }
        };

        this.reader.onreadingerror = (event) => {
            this._error('Erreur lors de la lecture du tag NFC.');
            if (onReadingError) onReadingError(event);
        };

        try {
            await this.reader.scan({ signal: this.scanController.signal });
            this._status('En attente d\'un tag ou appareil NFC...');
        } catch (err) {
            this.isScanning = false;
            if (err.name !== 'AbortError') {
                this._error(err);
                if (onError) onError(err);
                throw err;
            }
        }
    }

    /**
     * Stop the current NFC scan.
     */
    stopScan() {
        if (this.scanController) {
            this.scanController.abort();
            this.scanController = null;
        }
        this.isScanning = false;
        this.reader = null;
        this._status('Scanner NFC arrêté.');
    }

    /**
     * Write records to an NFC tag or peer device.
     * @param {Array<object>} records - Array of NDEF records
     * @param {object} [options]
     * @param {AbortSignal} [options.signal]
     * @param {boolean} [options.overwrite=true]
     * @returns {Promise<void>}
     */
    async writeRecords(records, options = {}) {
        if (!this.isSupported()) {
            throw new Error('Web NFC n\'est pas supporté par ce navigateur (nécessite Chrome/Edge sur Android via HTTPS).');
        }

        this.cancelWrite();
        this.writeController = new AbortController();
        const signal = options.signal || this.writeController.signal;
        this.isWriting = true;

        try {
            const writer = new NDEFReader();
            this._status('Approchez le badge ou le smartphone pour écrire...');

            await writer.write({ records }, {
                signal,
                overwrite: options.overwrite !== false
            });

            this.isWriting = false;
            this._status('Écriture NFC réussie !');
            try {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
            } catch (_) {}
            return true;
        } catch (err) {
            this.isWriting = false;
            if (err.name === 'AbortError') {
                this._status('Écriture NFC annulée.');
                return false;
            }
            this._error(err);
            throw err;
        } finally {
            this.writeController = null;
        }
    }

    /**
     * Cancel any pending NFC write operation.
     */
    cancelWrite() {
        if (this.writeController) {
            this.writeController.abort();
            this.writeController = null;
        }
        this.isWriting = false;
    }

    /**
     * Write a URL to an NFC tag or peer device.
     * @param {string} url
     * @returns {Promise<boolean>}
     */
    async writeUrl(url) {
        if (!url || !url.trim()) throw new Error('URL invalide');
        let formatted = url.trim();
        if (!formatted.startsWith('http://') && !formatted.startsWith('https://') && !formatted.startsWith('mailto:') && !formatted.startsWith('tel:')) {
            formatted = 'https://' + formatted;
        }
        return await this.writeRecords([
            { recordType: 'url', data: formatted }
        ]);
    }

    /**
     * Write text (plain or encrypted) to NFC.
     * @param {string} text
     * @param {object} [options]
     * @param {boolean} [options.encrypt]
     * @param {string} [options.password]
     * @returns {Promise<boolean>}
     */
    async writeText(text, { encrypt = false, password = '' } = {}) {
        if (!text || !text.trim()) throw new Error('Texte vide');
        let payload = text.trim();

        if (encrypt) {
            if (!password) throw new Error('Un mot de passe est requis pour chiffrer le message.');
            if (typeof Crypto !== 'undefined' && Crypto.encryptBlob && Compress && Compress.blobToBase64) {
                const blob = new Blob([new TextEncoder().encode(payload)]);
                const enc = await Crypto.encryptBlob(blob, password);
                const encB64 = await Compress.blobToBase64(enc.blob);
                payload = `NENC|${enc.salt}|${enc.iv}|${encB64}`;
            } else {
                throw new Error('Module Crypto non disponible pour le chiffrement.');
            }
        }

        return await this.writeRecords([
            { recordType: 'text', data: payload, encoding: 'utf-8' }
        ]);
    }

    /**
     * Write P2P room share / invitation to NFC.
     * Writes the P2P connection URL and a companion text record with the room ID.
     * @param {string} roomUrl
     * @param {string} roomId
     * @returns {Promise<boolean>}
     */
    async writeP2PRoom(roomUrl, roomId) {
        if (!roomUrl) throw new Error('URL du salon P2P manquante');
        const cleanRoom = (roomId || '').trim().toUpperCase();

        const records = [
            { recordType: 'url', data: roomUrl }
        ];

        if (cleanRoom) {
            records.push({
                recordType: 'text',
                data: `AETHER_P2P|${cleanRoom}`,
                encoding: 'utf-8'
            });
        }

        return await this.writeRecords(records);
    }

    /**
     * Write a file via NFC.
     * For small files (<= maxDirectBytes, typically ~1-2 KB), writes direct binary MIME record.
     * For larger files, uses the provided beamUrl or fallback P2P link.
     * @param {File|Blob} file
     * @param {object} options
     * @param {number} [options.maxDirectBytes=2048]
     * @param {string} [options.beamUrl=null]
     * @param {'auto'|'direct'|'beam'} [options.mode='auto']
     * @returns {Promise<{ mode: string, bytesWritten: number }>}
     */
    async writeFile(file, { maxDirectBytes = 2048, beamUrl = null, mode = 'auto' } = {}) {
        if (!file) throw new Error('Fichier manquant');

        const useDirect = (mode === 'direct') || (mode === 'auto' && file.size <= maxDirectBytes);

        if (useDirect) {
            // Direct NFC binary MIME storage
            const buffer = await file.arrayBuffer();
            const meta = {
                aether: 'nfc-file',
                name: file.name || 'fichier_nfc',
                size: file.size,
                type: file.type || 'application/octet-stream',
                lastModified: file.lastModified || Date.now()
            };

            const records = [
                {
                    recordType: 'mime',
                    mediaType: 'application/json',
                    data: new TextEncoder().encode(JSON.stringify(meta))
                },
                {
                    recordType: 'mime',
                    mediaType: file.type || 'application/octet-stream',
                    data: buffer
                }
            ];

            await this.writeRecords(records);
            return { mode: 'direct', bytesWritten: buffer.byteLength };
        } else {
            // P2P Beam Handshake via NFC
            if (!beamUrl) {
                throw new Error('Ce fichier est trop volumineux pour un badge NFC physique (> 2 KB). Un lien P2P Beam est requis pour le transfert.');
            }
            await this.writeRecords([
                { recordType: 'url', data: beamUrl },
                {
                    recordType: 'text',
                    data: `AETHER_FILE|${encodeURIComponent(file.name)}|${file.size}`,
                    encoding: 'utf-8'
                }
            ]);
            return { mode: 'beam', bytesWritten: beamUrl.length };
        }
    }
}

// Global instance
window.nfcEngine = new NFCEngine();
