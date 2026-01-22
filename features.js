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
        if (enable) {
            document.body.classList.add('camo-mode');
            // Change title to look fake
            document.title = "Daily News | Top 10 Recipes for 2026";
            // Swap favicon if possible (advanced)
        } else {
            document.body.classList.remove('camo-mode');
            document.title = "AetherShare | Secure Serverless File Sharing";
        }
    }
}
