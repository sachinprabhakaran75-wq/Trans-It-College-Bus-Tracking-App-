import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { initFirebase } from '../firebaseClient';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export default function DriverCommunityPage() {
    const router = useRouter();
    const { bus } = router.query; // Bus Number from query
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    // Auth Check
    useEffect(() => {
        initFirebase();
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (u) setUser(u);
            else router.push('/auth/signin');
        });
        return () => unsubscribe();
    }, []);

    // Fetch Posts
    useEffect(() => {
        if (!bus) return;
        const db = getFirestore();
        // Simplify query to avoid "Index Required" error
        const q = query(
            collection(db, 'posts'),
            where('busNumber', '==', bus)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side Sort: Pinned first, then Newest
            data.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

                const tA = a.timestamp && a.timestamp.toMillis ? a.timestamp.toMillis() : Date.now();
                const tB = b.timestamp && b.timestamp.toMillis ? b.timestamp.toMillis() : Date.now();
                return tB - tA;
            });

            setPosts(data);
            setLoading(false);
        }, (err) => {
            console.error("Query Error:", err);
            setLoading(false);
            alert("Chat Error: " + err.message);
        });

        return () => unsubscribe();
    }, [bus]);

    const handlePost = async (e) => {
        e.preventDefault();
        if (!newPost.trim() || !user || !bus) return;

        try {
            const db = getFirestore();
            await addDoc(collection(db, 'posts'), {
                content: newPost,
                busNumber: bus,
                authorId: user.uid,
                authorName: 'Driver', // Hardcoded for Driver App
                role: 'driver',
                isPinned: true, // Auto-pin driver posts
                timestamp: serverTimestamp()
            });
            setNewPost('');
        } catch (err) {
            console.error("Error posting:", err);
            alert("Failed to post: " + err.message);
        }
    };

    const handleDelete = async (postId) => {
        if (!confirm("Are you sure you want to delete this post?")) return;
        try {
            const db = getFirestore();
            await deleteDoc(doc(db, 'posts', postId));
        } catch (err) {
            console.error("Error deleting:", err);
            alert("Failed to delete post.");
        }
    };

    const formatTime = (ts) => {
        if (!ts) return 'Just now';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!bus) return <div style={{ padding: 20 }}>No bus selected.</div>;

    return (
        <div style={{ minHeight: '100vh', position: 'relative', color: '#0f172a', background: '#f1f5f9' }}>

            {/* Header */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                background: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px',
                zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>←</button>
                <div>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>Community Management</h2>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Bus {bus} • Admin Mode</span>
                </div>
            </div>

            {/* Feed */}
            <div style={{ paddingTop: '80px', paddingBottom: '120px', paddingLeft: '20px', paddingRight: '20px', maxWidth: '600px', margin: '0 auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '40px', color: '#94a3b8' }}>Loading chat...</div>
                ) : posts.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '60px', color: '#cbd5e1' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>📢</div>
                        <p>No announcements or queries yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {posts.map(post => (
                            <div key={post.id} style={{
                                padding: '16px',
                                borderRadius: '16px',
                                background: post.isPinned ? '#eff6ff' : 'white',
                                border: post.isPinned ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                position: 'relative'
                            }}>
                                {post.isPinned && (
                                    <div style={{
                                        position: 'absolute', top: '-10px', right: '40px',
                                        background: '#2563eb', color: 'white', fontSize: '10px', fontWeight: 'bold',
                                        padding: '4px 8px', borderRadius: '12px', textTransform: 'uppercase'
                                    }}>
                                        📌 Your Announcement
                                    </div>
                                )}

                                {/* Delete Button (Driver Only) */}
                                <button
                                    onClick={() => handleDelete(post.id)}
                                    style={{
                                        position: 'absolute', top: '10px', right: '10px',
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444'
                                    }}
                                    title="Delete Post"
                                >
                                    🗑️
                                </button>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingRight: '30px' }}>
                                    <span style={{ fontWeight: '600', color: post.role === 'driver' ? '#2563eb' : '#334155', fontSize: '14px' }}>
                                        {post.role === 'driver' ? '🚌 You' : post.authorName}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatTime(post.timestamp)}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.5' }}>{post.content}</p>
                            </div>
                        ))}
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'white', padding: '16px', borderTop: '1px solid #e2e8f0',
                display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center',
                textAlign: 'center'
            }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>YOUR POSTS WILL BE PINNED 📌</span>
                <form onSubmit={handlePost} style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                    <input
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        placeholder="Post an announcement..."
                        style={{
                            flex: 1, padding: '12px 16px', borderRadius: '12px', border: '2px solid #2563eb',
                            fontSize: '16px', outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!newPost.trim()}
                        style={{
                            background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', padding: '0 20px',
                            cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        POST
                    </button>
                </form>
            </div>
        </div>
    );
}
