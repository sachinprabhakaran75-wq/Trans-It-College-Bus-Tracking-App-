import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapRecenter({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo([lat, lng], 13);
    }, [lat, lng, map]);
    return null;
}

export default function Map({ busLocation, busNumber, destination, userLocation }) {
    // Default to Vels University (Chennai) if no location
    const defaultCenter = [12.957952, 80.160793];

    // Check if we have valid coordinates
    const hasValidLocation = busLocation &&
        typeof busLocation.lat === 'number' &&
        typeof busLocation.lng === 'number';

    const position = hasValidLocation ? [busLocation.lat, busLocation.lng] : defaultCenter;
    const destPosition = destination ? [destination.lat, destination.lng] : null;
    const userPos = (userLocation && userLocation.lat && userLocation.lng) ? [userLocation.lat, userLocation.lng] : null;

    const [routePath, setRoutePath] = React.useState(null);

    // Fetch Route from OSRM
    useEffect(() => {
        if (!hasValidLocation || !destPosition) {
            setRoutePath(null);
            return;
        }

        const fetchRoute = async () => {
            try {
                // OSRM Public API (Demo server)
                const url = `https://router.project-osrm.org/route/v1/driving/${busLocation.lng},${busLocation.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.routes && data.routes.length > 0) {
                    // GeoJSON coordinates are [lng, lat], Leaflet needs [lat, lng]
                    const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                    setRoutePath(coordinates);
                }
            } catch (err) {
                console.error("Error fetching route:", err);
                setRoutePath([[busLocation.lat, busLocation.lng], [destination.lat, destination.lng]]);
            }
        };

        const timeoutId = setTimeout(fetchRoute, 1000);
        return () => clearTimeout(timeoutId);

    }, [busLocation?.lat, busLocation?.lng, destination, hasValidLocation]);

    // Icons
    const createEmojiIcon = (emoji) => new L.DivIcon({
        html: `<div style="font-size: 30px; line-height: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${emoji}</div>`,
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });

    const busIcon = createEmojiIcon('🚌');
    const userIcon = createEmojiIcon('🔵');
    const destIcon = createEmojiIcon('🏁');

    return (
        <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '16px' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Bus Marker (Red) */}
            {hasValidLocation && (
                <>
                    <Marker position={position} icon={busIcon}>
                        <Popup>
                            Bus {busNumber} <br /> Speed: {Math.round(busLocation.speed || 0)} km/h
                        </Popup>
                    </Marker>
                    <MapRecenter lat={busLocation.lat} lng={busLocation.lng} />
                </>
            )}

            {/* User Marker (Blue) */}
            {userPos && (
                <Marker position={userPos} icon={userIcon}>
                    <Popup>You are here</Popup>
                </Marker>
            )}

            {/* Destination (Green) */}
            {destPosition && hasValidLocation && (
                <>
                    <Marker position={destPosition} icon={destIcon}>
                        <Popup>Vels University (Campus)</Popup>
                    </Marker>
                    {/* Render Actual Path if valid, else fallback or nothing */}
                    {routePath && <Polyline positions={routePath} color="#10b981" weight={4} opacity={0.8} dashArray="10, 10" />}
                </>
            )}
        </MapContainer>
    );
}
