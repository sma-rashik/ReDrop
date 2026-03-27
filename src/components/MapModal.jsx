import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue natively
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Donor Icon
const createDonorIcon = (group) => L.divIcon({
  className: 'bg-transparent border-0',
  html: `<div style="background-color: #ef4444; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2.5px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
           <span style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 13px;">${group}</span>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

// Custom User Icon
const userIcon = L.divIcon({
  className: 'bg-transparent border-0',
  html: `<div style="background-color: #3b82f6; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.4);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11]
});

// Auto-center map to user
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom() || 13);
    }
  }, [center, map]);
  return null;
}

const MapModal = ({ onClose, centerPosition, displayedDonors }) => {
  if (!centerPosition || centerPosition.length !== 2) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in zoom-in-95 duration-200">
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-10 shrink-0">
        <div className="flex items-center h-8 relative w-32 border-0">
           <img src="/logo.png" className="absolute top-1/2 left-0 -translate-y-1/2 h-24 w-auto object-contain mix-blend-multiply" alt="ReDrop Logo" />
           <h2 className="text-lg font-bold text-gray-800 tracking-tight absolute left-14 whitespace-nowrap">Live Donor Map</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* Map Content */}
      <div className="flex-1 relative z-0">
         <MapContainer 
            center={centerPosition} 
            zoom={13} 
            scrollWheelZoom={true} 
            className="w-full h-full"
         >
            <TileLayer
               attribution='&copy; OpenStreetMap'
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={centerPosition} />

            {/* Current User Marker */}
            <Marker position={centerPosition} icon={userIcon}>
               <Popup>
                 <div className="font-bold text-center text-blue-600">You are here</div>
               </Popup>
            </Marker>

            {/* Render Donors within radius */}
            {displayedDonors.map((donor) => (donor.coordinates && donor.coordinates.length === 2) && (
                <Marker 
                  key={donor.id} 
                  position={donor.coordinates}
                  icon={createDonorIcon(donor.group)}
                >
                  <Popup>
                    <div className="text-center w-40">
                      <div className="font-bold text-sm text-gray-900 mb-1">{donor.name}</div>
                      <div className="text-xs font-bold text-red-600 bg-red-50 inline-block px-2 py-0.5 rounded-full mb-2">
                        {donor.group}
                      </div>
                      {donor.distance !== '?' && (
                        <div className="text-xs text-gray-500 font-medium mb-3">
                          {donor.distance} km away
                        </div>
                      )}
                      <div className="flex gap-2">
                         <a href={`tel:+880${donor.phone.replace(/\D/g, '').replace(/^(?:88)?0?/, '')}`} className="flex-1 text-center bg-gray-100 text-gray-700 font-bold rounded-md py-1.5 px-2 text-[10px] hover:bg-gray-200 transition">Call</a>
                         <a 
                           href={`https://wa.me/880${donor.phone.replace(/\D/g, '').replace(/^(?:88)?0?/, '')}?text=Hi%20${encodeURIComponent(donor.name)},%20I%20found%20you%20on%20ReDrop.%20I%20have%20an%20urgent%20need%20for%20${encodeURIComponent(donor.group)}%20blood.`}
                           target="_blank" rel="noopener noreferrer" 
                           className="flex-1 text-center bg-[#25D366]/10 text-[#128C7E] font-bold border border-[#25D366]/30 rounded-md py-1.5 px-2 text-[10px] hover:bg-[#25D366]/20 transition"
                         >
                           WA
                         </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
            ))}
         </MapContainer>
      </div>
    </div>
  );
};

export default MapModal;
