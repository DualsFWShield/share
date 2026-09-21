/**
 * AetherShare — Features Module
 * Crypto (AES-256-GCM), Compression, TimeBomb, GeoLock, VibeShare, Camouflage.
 */

class Crypto {
    /**
     * Derive an AES-256-GCM key from a password using PBKDF2.
     */
    static async deriveKey(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt a Blob with AES-256-GCM.
     * @returns {{ salt: string, iv: string, blob: Blob }}
     */
    static async encryptBlob(blob, password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(password, salt);
        const buffer = await blob.arrayBuffer();
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer);
        return {
            salt: this.bufferToBase64(salt),
            iv: this.bufferToBase64(iv),
            blob: new Blob([encrypted])
        };
    }

    /**
     * Decrypt a Blob with AES-256-GCM.
     */
    static async decryptBlob(encryptedBlob, password, base64Salt, base64Iv) {
        const salt = this.base64ToBuffer(base64Salt);
        const iv = this.base64ToBuffer(base64Iv);
        const key = await this.deriveKey(password, salt);
        const buffer = await encryptedBlob.arrayBuffer();
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, buffer);
        return new Blob([decrypted]);
    }

    /**
     * Encrypt raw base64 data (for URL mode).
     * @returns {{ salt: string, iv: string, data: string }}
     */
    static async encryptBase64(blob, password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(password, salt);
        const buffer = await blob.arrayBuffer();
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer);
        return {
            salt: this.bufferToBase64(salt),
            iv: this.bufferToBase64(iv),
            data: this.bufferToBase64(encrypted)
        };
    }

    /**
     * Decrypt base64 data back to Blob (for URL mode).
     */
    static async decryptBase64(base64Data, password, base64Salt, base64Iv) {
        const salt = this.base64ToBuffer(base64Salt);
        const iv = this.base64ToBuffer(base64Iv);
        const data = this.base64ToBuffer(base64Data);
        const key = await this.deriveKey(password, salt);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return new Blob([decrypted]);
    }

    // ---- Encoding helpers ----

    static bufferToBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    static base64ToBuffer(base64) {
        return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    }

    static stringToBase64(str) {
        return this.bufferToBase64(new TextEncoder().encode(str));
    }

    static base64ToString(base64) {
        return new TextDecoder().decode(this.base64ToBuffer(base64));
    }
}


class Compress {
    /**
     * Gzip compress a readable stream to Blob.
     */
    static async gzip(readableStream) {
        if (!window.CompressionStream) return new Response(readableStream).blob();
        const compressed = readableStream.pipeThrough(new CompressionStream('gzip'));
        return new Response(compressed).blob();
    }

    /**
     * Gzip decompress a Blob.
     */
    static async gunzip(blob) {
        if (!window.DecompressionStream) return blob;
        const decompressed = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        return new Response(decompressed).blob();
    }

    /**
     * Lossy image compression to WebP.
     */
    static async compressImage(file, quality = 0.7) {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) { resolve(file); return; }
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                canvas.toBlob(blob => resolve(blob || file), 'image/webp', quality);
                URL.revokeObjectURL(img.src);
            };
            img.onerror = () => resolve(file);
        });
    }

    /**
     * Convert blob to base64 string.
     */
    static async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                resolve(result.includes(',') ? result.split(',')[1] : result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Convert base64 string to Blob.
     */
    static base64ToBlob(base64) {
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes]);
    }
}


class Features {
    // ---- Vibe Share ----
    static vibes = {
        default:   { name: 'Default',    class: '' },
        cyberpunk: { name: 'Cyberpunk',  class: 'vibe-cyberpunk' },
        sunset:    { name: 'Sunset',     class: 'vibe-sunset' },
        matrix:    { name: 'The Matrix', class: 'vibe-matrix' },
        zen:       { name: 'Zen Garden', class: 'vibe-zen' }
    };

    static applyVibe(vibeKey) {
        document.body.className = document.body.className
            .replace(/vibe-\w+/g, '').trim();
        const vibe = this.vibes[vibeKey];
        if (vibe?.class) document.body.classList.add(vibe.class);
    }

    // ---- Time Bomb ----
    static getExpiryTimestamp(minutes) {
        return Date.now() + (minutes * 60 * 1000);
    }

    static checkExpiry(timestamp) {
        if (!timestamp) return { expired: false };
        const left = timestamp - Date.now();
        return { expired: left < 0, timeLeft: left };
    }

    // ---- Geo Lock ----
    static async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) reject('Geolocation not supported');
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                err => reject(err),
                { enableHighAccuracy: true }
            );
        });
    }

    static calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    static async verifyLocation(targetLat, targetLng, radiusMeters = 5000) {
        try {
            const current = await this.getCurrentPosition();
            const dist = this.calculateDistance(targetLat, targetLng, current.lat, current.lng);
            return { allowed: dist <= radiusMeters, distance: dist };
        } catch (e) {
            return { allowed: false, error: 'Location access denied' };
        }
    }


}
