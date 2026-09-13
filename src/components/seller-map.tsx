'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { User } from '@/lib/users-data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

let icon: L.Icon | undefined;
if (typeof window !== 'undefined') {
    icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });
}

interface SellerMapProps {
    sellers: User[];
}

const generateColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const val = (hash >> (i * 8)) & 0xFF;
        color += ('00' + val.toString(16)).substr(-2);
    }
    return color;
}

export default function SellerMap({ sellers }: SellerMapProps) {
    const center: [number, number] = [10.25, -67.9]; 
    const sellersWithLocation = sellers.filter(s => 
        s.lastLocation && 
        typeof s.lastLocation.lat === 'number' && 
        typeof s.lastLocation.lng === 'number' &&
        !isNaN(s.lastLocation.lat) &&
        !isNaN(s.lastLocation.lng)
    );

    return (
        <MapContainer center={center} zoom={9} style={{ height: '400px', width: '100%' }} className="rounded-lg">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {sellersWithLocation.map(seller => {
                const routePoints = seller.locationHistory
                    ?.map(p => ({ lat: p?.lat, lng: p?.lng }))
                    .filter((p): p is { lat: number, lng: number } => 
                        p && 
                        typeof p.lat === 'number' && 
                        typeof p.lng === 'number' &&
                        !isNaN(p.lat) && 
                        !isNaN(p.lng)
                    )
                    .map(p => [p.lat, p.lng] as [number, number]) || [];
                
                const routeColor = generateColor(seller.id);

                return (
                    <React.Fragment key={seller.id}>
                        {seller.lastLocation && (
                             <Marker position={[seller.lastLocation.lat, seller.lastLocation.lng]} icon={icon}>
                                <Popup>
                                    <b>{seller.name}</b><br/>
                                    Último punto: <br/>
                                    {(() => {
                                        if (!seller.lastLocationTimestamp) return 'N/A';
                                        let date: Date | null = null;
                                        const ts = seller.lastLocationTimestamp as any;
                                        if (ts instanceof Date) {
                                            date = ts;
                                        } else if (typeof ts.toDate === 'function') {
                                            date = ts.toDate();
                                        } else if (typeof ts.seconds === 'number') {
                                            date = new Date(ts.seconds * 1000);
                                        } else if (typeof ts === 'string') {
                                            date = new Date(ts);
                                        } else if (typeof ts === 'number') {
                                            date = new Date(ts);
                                        }
                                        return date && !isNaN(date.getTime()) 
                                            ? format(date, 'Pp', { locale: es }) 
                                            : 'N/A';
                                    })()}
                                </Popup>
                                <Tooltip permanent direction="top" offset={[0, -41]}>{seller.name}</Tooltip>
                            </Marker>
                        )}
                        {routePoints.length > 1 && (
                            <Polyline pathOptions={{ color: routeColor, weight: 4, opacity: 0.6 }} positions={routePoints} />
                        )}
                    </React.Fragment>
                );
            })}
        </MapContainer>
    );
}
