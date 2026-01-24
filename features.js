/**
 * AetherShare - Advanced Features Module
 * 
 * Includes:
 * - TimeBomb: Expires links after set duration.
 * - GeoLock: Restricts access to geographical area.
 * - VibeShare: Applies aesthetic themes.
 */

class Features {

    // --- VIBE SHARE ---
    static vibes = {
        'default': { name: 'Default', class: '' },
        'cyberpunk': { name: 'Cyberpunk', class: 'vibe-cyberpunk' },
        'sunset': { name: 'Sunset', class: 'vibe-sunset' },
        'matrix': { name: 'The Matrix', class: 'vibe-matrix' },
        'zen': { name: 'Zen Garden', class: 'vibe-zen' }
    };

    static applyVibe(vibeKey) {
        // Reset
        document.body.className = '';
        const vibe = this.vibes[vibeKey];
        if (vibe && vibe.class) {
            document.body.classList.add(vibe.class);
        }
    }

    // --- TIME BOMB ---
    static getExpiryTimestamp(minutes) {
        return Date.now() + (minutes * 60 * 1000);
    }

    static checkExpiry(timestamp) {
        if (!timestamp) return true; // No expiry
        const now = Date.now();
        const left = timestamp - now;
        return {
            expired: left < 0,
            timeLeft: left
        };
    }

    // --- GEO LOCK ---
    static async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) reject("Geolocation not supported");
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(err),
                { enableHighAccuracy: true }
            );
        });
    }

    static calculateDistance(lat1, lng1, lat2, lng2) {
        // Haversine formula
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in meters
    }

    static async verifyLocation(targetLat, targetLng, radiusMeters = 5000) { // Default 5km radius
        try {
            const current = await this.getCurrentPosition();
            const dist = this.calculateDistance(targetLat, targetLng, current.lat, current.lng);
            return {
                allowed: dist <= radiusMeters,
                distance: dist
            };
        } catch (e) {
            console.error(e);
            return { allowed: false, error: "Location access denied" };
        }
    }

    // --- CAMOUFLAGE ---
    static toggleCamouflage(enable) {
        const app = document.querySelector('.app-container');
        const bg = document.querySelector('.background-orbs');
        const layer = document.getElementById('camouflage-layer');

        if (enable) {
            document.body.classList.add('camo-mode');
            app.classList.add('hidden');
            bg.classList.add('hidden');
            layer.classList.remove('hidden');
            document.title = "Q4 Financial Overview_2025.xlsx - Excel";

            // Setup exit triggers
            this.setupCamoExit();
        } else {
            document.body.classList.remove('camo-mode');
            app.classList.remove('hidden');
            bg.classList.remove('hidden');
            layer.classList.add('hidden');
            document.title = "AetherShare | Secure Serverless File Sharing";
        }
    }

    static setupCamoExit() {
        if (this.camoInitialized) return;
        this.camoInitialized = true;

        const exitTrigger = document.getElementById('camo-exit-trigger');
        if (exitTrigger) {
            exitTrigger.addEventListener('dblclick', () => this.toggleCamouflage(false));
        }

        // Escape Key Sequence (3x Esc to exit)
        let escCount = 0;
        let escTimer = null;

        document.addEventListener('keydown', (e) => {
            if (!document.body.classList.contains('camo-mode')) return;

            if (e.key === 'Escape') {
                escCount++;
                if (escTimer) clearTimeout(escTimer);

                escTimer = setTimeout(() => { escCount = 0; }, 500); // Reset if too slow

                if (escCount >= 3) {
                    this.toggleCamouflage(false);
                    escCount = 0;
                }
            }
        });
    }
}
