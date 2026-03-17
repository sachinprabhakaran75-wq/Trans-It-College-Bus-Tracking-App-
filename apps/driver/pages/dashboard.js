import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { initFirebase } from '../firebaseClient';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, getDocs, serverTimestamp, onSnapshot, collection, query, where } from 'firebase/firestore';

export default function DriverDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [speed, setSpeed] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [sosNumber, setSosNumber] = useState('911');
    const [showPassengers, setShowPassengers] = useState(false);
    const [busNumber, setBusNumber] = useState('3A'); // Default Bus
    const [isEditingBus, setIsEditingBus] = useState(false);

    // GPS Tracking Refs
    const watchId = useRef(null);
    const db = useRef(null);

    // Real-Time Passenger Count
    const [passengers, setPassengers] = useState([]);

    useEffect(() => {
        if (!db.current || !busNumber || !user) return;

        // Query Boardings for this bus (Today)
        // ideally we filter by timestamp > start of day, but for demo just matching busNumber
        const q = query(
            collection(db.current, 'boardings'),
            where('busNumber', '==', busNumber),
            where('status', '==', 'Boarded')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().studentName || 'Student',
                status: 'Boarded'
            }));
            setPassengers(list);

            // Sync Count to Tracking Doc for Student App
            setDoc(doc(db.current, 'tracking', busNumber), {
                passengerCount: list.length,
                lastUpdated: serverTimestamp()
            }, { merge: true }).catch(console.error);
        });

        return () => unsubscribe();
    }, [busNumber, user]);

    // Init Firebase & Auth Check
    useEffect(() => {
        initFirebase();
        db.current = getFirestore();
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (!u) {
                router.replace('/auth/signin');
            } else {
                setUser(u);
            }
        });
        return () => unsubscribe();
    }, []);

    // Real-Time GPS Tracking
    useEffect(() => {
        if (isActive) {
            if (!("geolocation" in navigator)) {
                alert("Geolocation is not supported by this browser.");
                return;
            }

            const updateLocation = (position) => {
                const { latitude, longitude, speed: gpsSpeed } = position.coords;

                // Convert m/s to km/h (default 0 if null)
                const speedKmH = gpsSpeed ? Math.round(gpsSpeed * 3.6) : 0;
                setSpeed(speedKmH);

                // Update Firestore
                if (db.current && busNumber) {
                    setDoc(doc(db.current, 'tracking', busNumber), {
                        lat: latitude,
                        lng: longitude,
                        speed: speedKmH,
                        busNumber: busNumber,
                        lastUpdated: serverTimestamp()
                    }, { merge: true }).catch(console.error);
                }
            };

            // Force initial update
            navigator.geolocation.getCurrentPosition(updateLocation, console.error, { enableHighAccuracy: true });

            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };

            watchId.current = navigator.geolocation.watchPosition(
                updateLocation,
                (err) => console.error("GPS Error:", err),
                options
            );
        } else {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
            setSpeed(0);
        }

        return () => {
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
        };
    }, [isActive, busNumber]);

    // Timer Logic
    useEffect(() => {
        let interval;
        if (isActive) {
            interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    // Heartbeat: Keep Driver Online even if stationary
    useEffect(() => {
        if (!isActive || !busNumber || !db.current || !user) return;

        // Force immediate update on start logic handled in toggle, but good to have interval
        const heartbeat = setInterval(() => {
            console.log("Sending Heartbeat...");
            setDoc(doc(db.current, 'tracking', busNumber), {
                lastUpdated: serverTimestamp()
            }, { merge: true }).catch(console.error);
        }, 15000); // 15 seconds for testing, then 30s

        return () => clearInterval(heartbeat);
    }, [isActive, busNumber, user]);

    // Format Timer 00:00
    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    };

    const toggleTrip = () => {
        const newState = !isActive;
        setIsActive(newState);
        if (newState && db.current) {
            setDoc(doc(db.current, 'tracking', busNumber), {
                lastUpdated: serverTimestamp()
            }, { merge: true });
        }
    };

    const handleClearPassengers = async () => {
        if (!confirm('Are you sure you want to clear the passenger list for this bus? This cannot be undone.')) return;

        try {
            const q = query(collection(db.current, 'boardings'), where('busNumber', '==', busNumber));
            const snapshot = await getDocs(q);
            const batchPromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(batchPromises);

            // Update tracking doc as well
            setDoc(doc(db.current, 'tracking', busNumber), {
                passengerCount: 0,
                lastUpdated: serverTimestamp()
            }, { merge: true });

            alert('Passenger list cleared.');
            setShowPassengers(false);
        } catch (error) {
            console.error("Error clearing passengers:", error);
            alert("Failed to clear list.");
        }
    };

    const handleLogout = async () => {
        const auth = getAuth();
        await signOut(auth);
        router.push('/auth/signin');
    };

    return (
        <div style={{ height: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', color: '#0f172a' }}>

            {/* Header */}
            <div style={{
                background: 'white', padding: '15px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Campus Transit</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Driver Dashboard</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleLogout}
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                    >
                        Logout
                    </button>
                    <button
                        onClick={() => setShowPassengers(!showPassengers)}
                        style={{ background: '#f1f5f9', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                    >
                        👥 {passengers.length} passengers
                    </button>
                    {isActive && (
                        <div style={{ background: '#e2e8f0', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            ⏱️ {formatTime(elapsedTime)}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

                {/* Passenger List Modal/Overlay */}
                {showPassengers && (
                    <div style={{
                        position: 'absolute', top: '20px', right: '20px', width: '300px', background: 'white',
                        borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0',
                        zIndex: 20, maxHeight: '400px', overflowY: 'auto', padding: '16px'
                    }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-primary)' }}>Passenger List</h3>
                        {passengers.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                                <span style={{ color: '#10b981', fontSize: '12px' }}>● {p.status}</span>
                            </div>
                        ))}
                        <button
                            onClick={handleClearPassengers}
                            style={{
                                width: '100%', marginTop: '12px', padding: '10px', background: '#fee2e2', color: '#ef4444',
                                border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                            }}>
                            🗑️ Clear List
                        </button>
                    </div>
                )}

                {/* Bus Selector - Moved Above Speedometer */}
                <div style={{ marginBottom: '20px', zIndex: 10 }}>
                    {isEditingBus ? (
                        <input
                            autoFocus
                            value={busNumber}
                            onChange={(e) => setBusNumber(e.target.value.toUpperCase())}
                            onBlur={() => setIsEditingBus(false)}
                            style={{
                                fontSize: '24px', fontWeight: 'bold', padding: '8px 16px', borderRadius: '12px',
                                border: '2px solid #2563eb', textAlign: 'center', width: '120px', color: 'var(--text-primary)'
                            }}
                        />
                    ) : (
                        <button
                            onClick={() => setIsEditingBus(true)}
                            style={{
                                background: 'white', border: '1px solid #e2e8f0', padding: '8px 24px', borderRadius: '12px',
                                fontSize: '18px', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            🚌 Bus {busNumber} <span style={{ fontSize: '14px', opacity: 0.5 }}>✏️</span>
                        </button>
                    )}
                </div>

                {/* Speedometer Circle */}
                <div style={{
                    width: '280px', height: '280px', background: 'white', borderRadius: '50%',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', marginBottom: '60px',
                    border: '4px solid #f1f5f9'
                }}>
                    {/* Progress Arc (CSS Hack or SVG) */}
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '4px solid transparent', borderTopColor: '#2563eb', borderRightColor: '#2563eb', transform: 'rotate(-45deg)', opacity: isActive ? 1 : 0.3 }}></div>

                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>CURRENT SPEED</span>
                    <div style={{ fontSize: '64px', fontWeight: '800', lineHeight: 1 }}>
                        {speed}
                    </div>
                    <span style={{ fontSize: '18px', color: '#94a3b8' }}>km/h</span>
                </div>

                {/* Primary Action Button */}
                <button
                    onClick={toggleTrip}
                    style={{
                        padding: '16px 48px', borderRadius: '16px', border: 'none',
                        background: isActive ? '#ef4444' : '#10b981', color: 'white',
                        fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        transition: 'all 0.2s'
                    }}
                >
                    {isActive ? (
                        <>⏹️ End Trip</>
                    ) : (
                        <>▶️ Start Trip</>
                    )}
                </button>

                {/* Community Button */}
                <button
                    onClick={() => router.push(`/community?bus=${busNumber}`)}
                    style={{
                        marginTop: '20px', padding: '12px 24px', borderRadius: '12px', border: 'none',
                        background: 'white', color: '#2563eb', fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '10px'
                    }}
                >
                    📢 Community & Announcements
                </button>

                {/* Real GPS Status */}
                {isActive && (
                    <div style={{ marginTop: '24px', padding: '8px 20px', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '14px', fontWeight: '600' }}>
                        ● GPS Tracking Active
                    </div>
                )}

            </div>

            {/* SOS Section */}
            <div style={{ position: 'fixed', bottom: '30px', right: '30px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <input
                    type="text"
                    value={sosNumber}
                    onChange={(e) => setSosNumber(e.target.value)}
                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '120px', textAlign: 'right' }}
                    placeholder="SOS Number"
                />
                <button
                    onClick={() => window.open(`tel:${sosNumber}`)}
                    style={{
                        width: '60px', height: '60px', borderRadius: '50%',
                        background: '#ef4444', color: 'white', border: 'none',
                        fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)',
                        cursor: 'pointer'
                    }}>
                    SOS
                </button>
            </div>
        </div >
    );
}
