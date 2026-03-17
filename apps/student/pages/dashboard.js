import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { initFirebase } from '../firebaseClient';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, where, limit, getDocs, updateDoc } from 'firebase/firestore';
import { LucideLayoutDashboard, LucideClock, LucideMapPin, LucideUsers, LucideShieldCheck, LucideLogOut } from 'lucide-react'; // Mock icons, using text/emoji fallback if lib missing

// Dynamic Import for Map (SSR false)
const Map = dynamic(() => import('../components/Map'), { ssr: false });

const VELS_COORDS = { lat: 12.957952, lng: 80.160793 };

export default function StudentDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [busNumber, setBusNumber] = useState('');
    const [trackingBus, setTrackingBus] = useState(null);
    const [busLocation, setBusLocation] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    // Derived Stats
    const totalSeats = 50;
    const currentPassengers = busLocation?.passengerCount || 0;
    const seatsLeft = totalSeats - currentPassengers;
    const [eta, setEta] = useState(null);

    const isBoarded = router.query.boarded === 'true';

    // Driver Offline Logic
    const [isDriverOffline, setIsDriverOffline] = useState(false);

    useEffect(() => {
        if (!trackingBus) return;

        const checkStatus = () => {
            if (!busLocation || !busLocation.lastUpdated) {
                setIsDriverOffline(true);
                return;
            }

            // Handle Firestore Timestamp
            const lastUpdate = busLocation.lastUpdated.seconds
                ? busLocation.lastUpdated.seconds * 1000
                : (busLocation.lastUpdated.toMillis ? busLocation.lastUpdated.toMillis() : Date.now());

            const diff = Date.now() - lastUpdate;
            // Consider offline if no update for 2 minutes
            setIsDriverOffline(diff > 120000);
        };

        checkStatus(); // Initial
        const timer = setInterval(checkStatus, 10000);
        return () => clearInterval(timer);
    }, [busLocation, trackingBus]);

    // ... (Existing Geolocation & Firebase Logic kept same for functionality)
    useEffect(() => {
        initFirebase();
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (u) {
                // setUserLocation(null); // Keep previous location if any
                setUser(u);
            } else {
                router.push('/auth/signin');
            }
        });
        return () => unsubscribe();
    }, []);

    // Boilerplate Tracking Logic (Simplified for brevity regarding UI update)
    useEffect(() => {
        if (router.query.bus) setTrackingBus(router.query.bus);
    }, [router.query.bus]);

    useEffect(() => {
        if (!trackingBus) return;
        const db = getFirestore();
        const unsubLoc = onSnapshot(doc(db, 'tracking', trackingBus), (doc) => setBusLocation(doc.data()));
        return () => unsubLoc();
    }, [trackingBus]);

    // Student Geolocation
    useEffect(() => {
        if (!("geolocation" in navigator)) return;
        const watchId = navigator.geolocation.watchPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // OSRM Real-Time Distance & ETA
    const [routeStats, setRouteStats] = useState({ distance: null, duration: null });

    useEffect(() => {
        if (!busLocation) {
            setRouteStats({ distance: null, duration: null });
            return;
        }

        // Target: Campus if boarded, User if waiting
        const targetLat = isBoarded ? VELS_COORDS.lat : userLocation?.lat;
        const targetLng = isBoarded ? VELS_COORDS.lng : userLocation?.lng;

        if (!targetLat || !targetLng) return;

        const fetchOSRM = async () => {
            try {
                // Use 'driving' profile
                const url = `https://router.project-osrm.org/route/v1/driving/${busLocation.lng},${busLocation.lat};${targetLng},${targetLat}?overview=false`;
                const res = await fetch(url);

                if (!res.ok) throw new Error(`OSRM fetch failed: ${res.status}`);

                const data = await res.json();

                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    setRouteStats({
                        distance: (route.distance / 1000).toFixed(1), // Meters -> Km
                        duration: Math.round(route.duration / 60)     // Seconds -> Min
                    });
                } else {
                    console.warn("OSRM returned no routes");
                    setRouteStats({ distance: '--', duration: '--' });
                }
            } catch (err) {
                console.error("OSRM Error:", err);
                // Keep previous stats or show error if critical, but for now just log
            }
        };

        // Fetch immediately on change, then interval
        fetchOSRM();
        const timer = setInterval(fetchOSRM, 10000); // 10s is better for public API limits than 5s

        return () => clearInterval(timer);
    }, [busLocation, userLocation, isBoarded]);

    const distance = routeStats.distance;
    const etaMinutes = routeStats.duration;

    const handleDropOff = async () => {
        if (!user || !trackingBus) return;
        try {
            const db = getFirestore();
            const q = query(
                collection(db, 'boardings'),
                where('studentId', '==', user.uid),
                where('busNumber', '==', trackingBus),
                where('status', '==', 'Boarded'),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const docRef = snapshot.docs[0].ref;
                await updateDoc(docRef, {
                    status: 'Dropped Off',
                    droppedOffAt: Date.now()
                });
            }
            router.push('/attendance');
        } catch (err) {
            console.error("Dropoff Error:", err);
            router.push('/attendance');
        }
    };

    const handleSearch = (e) => { e.preventDefault(); if (busNumber) setTrackingBus(busNumber); };

    const handleLogout = async () => {
        const auth = getAuth();
        await signOut(auth);
        router.push('/auth/signin');
    };

    return (
        <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', color: '#0f172a' }}>

            {/* Header */}
            <div style={{
                background: 'white', padding: '15px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)', zIndex: 10
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Campus Transit</h1>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Student Dashboard</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!trackingBus ? (
                        <button className="btn-primary" style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '14px' }} onClick={() => router.push('/scan')}>
                            Scan QR Code
                        </button>
                    ) : (
                        <button style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600' }} onClick={() => { setTrackingBus(null); router.push('/dashboard'); }}>
                            Exit Bus Mode
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        style={{ background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Logout"
                    >
                        <LucideLogOut size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, position: 'relative' }}>

                {/* Map Layer */}
                <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 0 }}>
                    {!trackingBus ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#e2e8f0' }}>
                            {/* Search State if not tracking */}
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel" style={{ padding: '30px', borderRadius: '24px', textAlign: 'center', width: '350px' }}>
                                <h2>Find Your Bus</h2>
                                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <input
                                        value={busNumber}
                                        onChange={(e) => setBusNumber(e.target.value)}
                                        placeholder="Bus Number (e.g. 101)"
                                        className="cyber-input"
                                        style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                                    />
                                    <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>Search</button>
                                </form>
                            </motion.div>
                        </div>
                    ) : (
                        <Map
                            busLocation={busLocation || { lat: 12.97, lng: 77.59 }}
                            busNumber={trackingBus}
                            destination={isBoarded ? VELS_COORDS : null}
                            userLocation={userLocation}
                        />
                    )}
                </div>

                {/* SOS Button (Only when boarded) */}
                {isBoarded && (
                    <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20 }}>
                        <button
                            onClick={() => window.open('tel:911')}
                            style={{
                                width: '60px', height: '60px', borderRadius: '50%',
                                background: '#ef4444', color: 'white', border: 'none',
                                fontWeight: 'bold', fontSize: '18px',
                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.5)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                animation: 'pulse 2s infinite'
                            }}
                        >
                            SOS
                        </button>
                    </div>
                )}

                {/* Floating Bottom Panel (Design 1) */}
                {trackingBus && (
                    <motion.div
                        initial={{ y: 100 }} animate={{ y: 0 }}
                        style={{
                            position: 'absolute', bottom: '20px', left: '20px', right: '20px',
                            background: 'white', borderRadius: '24px', padding: '24px',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 10
                        }}
                    >
                        {/* Offline Warning */}
                        {isDriverOffline && (
                            <div style={{
                                background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '12px',
                                marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600'
                            }}>
                                ⚠️ Driver is Offline (Last signal over 2m ago)
                            </div>
                        )}
                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

                            {/* Card 1: Speed */}
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                                    <span>⏱️</span> Current Speed
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {busLocation?.speed ? Math.round(busLocation.speed) : 0} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>km/h</span>
                                </div>
                            </div>

                            {/* Card 2: Distance */}
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                                    <span>📍</span> {isBoarded ? 'To Campus' : 'Distance'}
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {distance || '--'} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>km</span>
                                </div>
                            </div>

                            {/* Card 3: Seats */}
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                                    <span>👥</span> Seats Available
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {seatsLeft} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ 50</span>
                                </div>
                            </div>

                            {/* Card 4: ETA */}
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                                    <span>🕒</span> Estimated Arrival
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {etaMinutes} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>min</span>
                                </div>
                            </div>
                        </div>

                        {/* Community Button */}
                        <button
                            onClick={() => router.push(`/community?bus=${trackingBus}`)}
                            style={{
                                width: '100%', padding: '12px', background: '#eff6ff', color: '#2563eb',
                                borderRadius: '12px', border: '1px solid #dbeafe', marginBottom: '16px',
                                fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                            }}
                        >
                            💬 Bus Community
                        </button>

                        {/* Primary Action Button */}
                        {isBoarded ? (
                            <button
                                onClick={handleDropOff}
                                style={{
                                    width: '100%', background: '#10b981', color: 'white', padding: '16px',
                                    borderRadius: '16px', border: 'none', fontSize: '16px', fontWeight: '600',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)'
                                }}
                            >
                                🛡️ Confirm Safe Drop-off
                            </button>
                        ) : (
                            <button
                                onClick={() => router.push(`/scan`)}
                                style={{
                                    width: '100%', background: '#2563eb', color: 'white', padding: '16px',
                                    borderRadius: '16px', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer'
                                }}
                            >
                                Board This Bus (Scan QR)
                            </button>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
