import React, { useState, useEffect } from 'react';
import { LogOut, MapPin, Search, Phone, Home as HouseIcon, UserCircle, AlertTriangle, Clock, Droplet } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import BloodGroupButton from '../components/BloodGroupButton';
import Button from '../components/Button';
import ProfileModal from '../components/ProfileModal';
import UrgentRequestModal from '../components/UrgentRequestModal';
import MapModal from '../components/MapModal';

const Home = () => {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeDonorId, setActiveDonorId] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [searchedGroup, setSearchedGroup] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [maxDistance, setMaxDistance] = useState(15); 
  
  const [donors, setDonors] = useState([]);
  const [urgentFeed, setUrgentFeed] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  
  const loadProfile = () => {
    const saved = localStorage.getItem('userProfile');
    if (saved) setCurrentUser(JSON.parse(saved));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // 1. Get User's Live Location and Update Firestore
  useEffect(() => {
    if (currentUser && currentUser.uid && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation([lat, lng]);

          try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              coordinates: [lat, lng]
            });
          } catch (error) {
            console.error("Error updating location:", error);
          }
        },
        (error) => console.warn("Geolocation error:", error.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    }
  }, [currentUser?.uid]);

  // Haversine formula to calculate accurate distances between coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return '?';
    const p = 0.017453292519943295; // Math.PI / 180
    const c = Math.cos;
    const a = 0.5 - c((lat2 - lat1) * p)/2 + 
            c(lat1 * p) * c(lat2 * p) * 
            (1 - c((lon2 - lon1) * p))/2;
    return (12742 * Math.asin(Math.sqrt(a))).toFixed(1); 
  };
  
  // 2. Real-time Firebase Listener for Available Donors
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const donorsList = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.coordinates && docSnap.id !== currentUser?.uid) {
          
          let dist = '?';
          if (userLocation && userLocation.length === 2 && data.coordinates.length === 2) {
             dist = calculateDistance(userLocation[0], userLocation[1], data.coordinates[0], data.coordinates[1]);
          }

          let isEligible = true;
          if (data.lastDonation) {
             const diffTime = new Date() - new Date(data.lastDonation);
             const diffDays = diffTime / (1000 * 60 * 60 * 24);
             isEligible = diffDays > 90;
          }

          donorsList.push({
            id: docSnap.id,
            name: data.name,
            group: data.group || 'A+',
            distance: dist, 
            phone: data.phone,
            address: data.address,
            coordinates: data.coordinates,
            isAvailable: data.isAvailable !== false,
            isEligible: isEligible
          });
        }
      });
      if (userLocation) {
         donorsList.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      }
      setDonors(donorsList);
    }, (error) => {
      console.error("Real-time map listen error:", error);
    });

    return () => unsubscribe(); 
  }, [userLocation, currentUser?.uid]);

  // 3. Real-time Firebase Listener for Urgent Requests
  useEffect(() => {
    const q = query(collection(db, 'urgent_requests'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeFeed = onSnapshot(q, (snapshot) => {
       const feed = [];
       snapshot.forEach(docSnap => {
          feed.push({ id: docSnap.id, ...docSnap.data() });
       });
       setUrgentFeed(feed);
    });
    return () => unsubscribeFeed();
  }, []);

  const displayedDonors = donors.filter(donor => {
    const matchGroup = searchedGroup ? donor.group === searchedGroup : true;
    const matchDistance = donor.distance !== '?' ? parseFloat(donor.distance) <= maxDistance : true;
    return matchGroup && matchDistance;
  });

  const handleLogout = async () => {
    try {
      if (auth) await auth.signOut();
      localStorage.removeItem('userProfile');
    } catch (e) {
      console.error(e);
    }
    navigate('/');
  };

  const isProfileComplete = 
    currentUser && 
    currentUser.name?.trim() && 
    currentUser.phone?.trim() && 
    currentUser.address?.trim() && 
    currentUser.group?.trim();

  return (
    <div className="min-h-screen bg-[#fffafa] text-red-950 pb-20 font-sans selection:bg-red-200 selection:text-red-900 transition-colors duration-300">
      
      {/* App Bar */}
      <header className="bg-white/80 backdrop-blur-xl shadow-sm shadow-red-100/50 border-b border-red-50 sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
             <img src="/logo.png" className="h-10 w-auto object-contain drop-shadow-sm" alt="ReDrop Logo" />
          </div>
          <div className="flex gap-1 items-center">
            <button 
              onClick={() => setIsProfileOpen(true)} className="relative p-2 text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100"
              aria-label="Profile"
            >
              <UserCircle className="w-6 h-6" />
              {!isProfileComplete && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>
            <button 
              onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Profile Completion Alert */}
        {!isProfileComplete && (
          <div className="bg-orange-50 border-b border-orange-100 p-3 sm:p-4 animate-in slide-in-from-top-2 duration-300">
            <div className="max-w-md mx-auto flex items-start sm:items-center justify-between gap-3 px-2">
              <div className="flex gap-3 items-start sm:items-center">
                <div className="bg-orange-100 p-1.5 rounded-full shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="text-orange-900 font-bold text-sm">Complete Your Profile</h4>
                  <p className="text-orange-700 text-xs mt-0.5 leading-tight">Add your details to unlock the map and view nearby donors.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsProfileOpen(true)} className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2 px-4 rounded-full shadow-sm transition-colors"
              >
                Setup
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-8">
        
        {/* Request Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Request Blood</h2>
              <p className="text-gray-500 text-sm mt-1">Select the blood group you need</p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-3 sm:gap-4 mt-2">
            {bloodGroups.map((group) => (
              <BloodGroupButton
                key={group}
                group={group}
                selected={selectedGroup === group}
                onClick={(group) => {
                  setSelectedGroup(group);
                  setSearchedGroup(null); // Reset search when clicking new group
                  setActiveDonorId(null);
                }}
              />
            ))}
          </div>
          
          {selectedGroup && !searchedGroup && (
            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Button 
                onClick={() => setSearchedGroup(selectedGroup)}
                fullWidth 
                variant="primary" className="shadow-lg shadow-red-200 py-3.5"
              >
                Find {selectedGroup} Donors
              </Button>
            </div>
          )}
        </section>

        {/* Live Urgent Feed */}
        {isProfileComplete && (
          <section className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-sm shadow-red-100/50 border border-red-100 relative overflow-hidden transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -z-0 opacity-50"></div>
            
            <div className="flex justify-between items-center mb-4 relative z-10">
              <div className="flex items-center gap-2">
                 <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                 </div>
                 <h3 className="text-base font-bold text-gray-900">Live feed</h3>
              </div>
              <button 
                onClick={() => setIsUrgentModalOpen(true)} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full shadow-sm transition-colors"
              >
                + Post Need
              </button>
            </div>

            <div className="space-y-3 relative z-10 max-h-64 overflow-y-auto pr-1">
               {urgentFeed.length === 0 ? (
                 <p className="text-center text-sm text-red-800 py-4 bg-red-50/50 rounded-xl border border-dashed border-red-200">No urgent requests right now. Alhamdullilah!</p>
               ) : (
                 urgentFeed.map(feed => (
                   <div key={feed.id} className="bg-white rounded-xl p-3 border border-red-100 shadow-sm shadow-red-50 hover:border-red-300 hover:shadow-md hover:shadow-red-100 transition-all">
                      <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-2">
                            <span className="bg-red-100 text-red-700 font-extrabold text-xs px-2 py-0.5 rounded-md border border-red-200">{feed.bloodGroup}</span>
                            <span className="text-xs font-semibold text-gray-700">{feed.name}</span>
                         </div>
                         <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {feed.timestamp?.toDate() ? (() => {
                             const diffMs = new Date() - feed.timestamp.toDate();
                             const diffMins = Math.floor(diffMs / 60000);
                             if (diffMins < 60) return `${diffMins}m ago`;
                             const diffHrs = Math.floor(diffMins / 60);
                             if (diffHrs < 24) return `${diffHrs}h ago`;
                             return `${Math.floor(diffHrs/24)}d ago`;
                         })() : 'just now'}</span>
                      </div>
                      <p className="text-xs font-medium text-gray-800 flex items-start gap-1">
                         <MapPin className="w-3 h-3 mt-0.5 text-gray-400 shrink-0"/> {feed.location}
                      </p>
                      {feed.note && <p className="text-xs text-gray-500 mt-1 italic w-full truncate">"{feed.note}"</p>}
                      
                      <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                          {currentUser?.uid === feed.postedBy ? (
                             <button
                                onClick={async () => {
                                   if(window.confirm("Are you sure you want to delete this urgent request?")) {
                                      try {
                                         await deleteDoc(doc(db, 'urgent_requests', feed.id));
                                      } catch(e) {
                                         alert('Failed to delete post');
                                      }
                                   }
                                }} className="text-xs font-bold text-gray-500 hover:text-red-600 transition-colors"
                             >
                                Delete
                             </button>
                          ) : (<span></span>)}
                          <a href={`tel:+880${feed.phone.replace(/\D/g, '').replace(/^(?:88)?0?/, '')}`} className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors flex items-center gap-1">
                             <Phone className="w-3 h-3"/> Contact
                          </a>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </section>
        )}

        {/* Nearby Donors Map & List Section */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-sm shadow-red-100/50 border border-red-100 space-y-4 relative z-0 transition-colors">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-lg font-bold text-gray-900">
              {searchedGroup ? `Live Tracking: ${searchedGroup} Donors` : 'Live Tracking Map'}
            </h3>
          </div>
          
          {/* Map Modal Trigger Built-in */}
          {isProfileComplete && (
            <div className="mb-6 animate-in fade-in duration-300">
               <Button 
                 fullWidth 
                 variant="secondary" 
                 onClick={() => setIsMapOpen(true)}
                 className="flex items-center justify-center gap-2 py-4 bg-red-50 hover:bg-red-100 text-red-700 font-bold border-2 border-red-200 shadow-sm"
               >
                 <MapPin className="w-5 h-5" /> View Live Donor Map
               </Button>
            </div>
          )}

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search donor locations..." 
              className="w-full bg-gray-50 pl-10 pr-4 py-3 rounded-xl border border-gray-100 shadow-inner focus:ring-2 focus:ring-red-500 outline-none text-sm transition-all text-gray-700"
            />
          </div>

          {/* Distance Filter Slider (Max 15km) */}
          {userLocation && isProfileComplete && (
            <div className="flex flex-col bg-red-50/50 p-4 rounded-xl border border-red-100 animate-in fade-in duration-300">
               <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-500"/> Distance Radius Filter</span>
                  <span className="text-sm font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">{maxDistance} km</span>
               </div>
               <input 
                  type="range" 
                  min="0.5" 
                  max="15" 
                  step="0.5"
                  value={maxDistance} 
                  onChange={(e) => setMaxDistance(e.target.value)} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1 px-0.5">
                   <span>0.5km</span>
                   <span>15km Max</span>
                </div>
            </div>
          )}

          {/* Donors List below the Map */}
          <div className="space-y-3 pt-2 min-h-[150px]">
            {!isProfileComplete ? (
              <div className="text-center py-8 bg-white/50 backdrop-blur-md rounded-2xl border border-red-100 shadow-sm shadow-red-100/50 animate-in fade-in duration-300">
                <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
                   <AlertTriangle className="text-red-400 w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Live Map Locked</h3>
                <p className="text-sm text-gray-500 mb-4 px-6">Complete your profile to see the active live tracking map of donors.</p>
                <button 
                  onClick={() => setIsProfileOpen(true)} className="mx-auto bg-red-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-red-700 transition-colors shadow-sm text-sm"
                >
                  Set Up Profile Now
                </button>
              </div>
            ) : displayedDonors.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 rounded-2xl border-dashed border-2 border-gray-200 animate-in fade-in">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-3">
                  <Search className="text-red-400 w-6 h-6" />
                </div>
                <p className="text-gray-500 font-semibold text-sm">No donors found within {maxDistance}km radius.</p>
                <p className="text-xs text-gray-400 mt-1">Try expanding the slider horizontally or modifying search.</p>
              </div>
            ) : (
              displayedDonors.map((donor) => (
                <div key={donor.id} className="flex flex-col p-4 rounded-2xl bg-gray-50 hover:bg-red-50 transition-all cursor-pointer group border border-transparent hover:border-red-100 shadow-sm shadow-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-red-600 ring-1 ring-gray-100 group-hover:ring-red-200">
                        {donor.group}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{donor.name}</h4>
                        <div className="flex items-center text-xs mt-1 font-semibold">
                          {donor.isAvailable && donor.isEligible ? (
                             <span className="text-green-600 flex items-center gap-1.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Available on Map
                             </span>
                          ) : !donor.isEligible ? (
                             <span className="text-orange-500 flex items-center gap-1.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Recovery <span className="text-orange-400 font-normal ml-0.5">(&lt; 90 days)</span>
                             </span>
                          ) : (
                             <span className="text-gray-500 flex items-center gap-1.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Unavailable Right Now
                             </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDonorId(activeDonorId === donor.id ? null : donor.id);
                      }}
                      className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-colors border shadow-sm ${
                        activeDonorId === donor.id 
                          ? 'bg-red-600 text-white border-red-700' 
                          : 'text-red-700 bg-white border-red-100 group-hover:bg-red-50'
                      }`}
                    >
                      {activeDonorId === donor.id ? 'Close' : 'View'}
                    </button>
                  </div>
                  
                  {/* Expandable Details Section */}
                  {activeDonorId === donor.id && (
                    <div className="mt-4 pt-4 border-t border-red-100 animate-in fade-in duration-200">
                      <div className="space-y-3 text-sm text-gray-700 font-medium bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                          <p className="flex items-start gap-2 text-gray-600">
                            <HouseIcon className="w-4 h-4 mt-0.5 shrink-0" />
                            {donor.address} <span className="text-gray-400 ml-1">({donor.distance} km)</span>
                          </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                           <a href={`tel:+880${donor.phone.replace(/\D/g, '').replace(/^(?:88)?0?/, '')}`} className="flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 p-3 rounded-xl border border-gray-200 transition-colors font-bold text-gray-700 shadow-sm">
                             <Phone className="w-4 h-4 text-gray-600" /> Call Directly
                           </a>
                           <a 
                             href={`https://wa.me/880${donor.phone.replace(/\D/g, '').replace(/^(?:88)?0?/, '')}?text=Hi%20${encodeURIComponent(donor.name)},%20I%20found%20you%20on%20ReDrop.%20I%20have%20an%20urgent%20need%20for%20${encodeURIComponent(donor.group)}%20blood.`} 
                             target="_blank" 
                             rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 p-3 rounded-xl border border-[#25D366]/30 transition-colors font-bold text-[#128C7E] shadow-sm"
                            >
                             <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                             WhatsApp
                           </a>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto px-4 py-8 mb-4 text-center text-sm text-gray-500">
        Created By <a href="https://www.linkedin.com/in/sma-rashik/" target="_blank" rel="noopener noreferrer" className="font-semibold text-red-600 hover:underline transition-colors">S M Abdul Rashik</a>
      </footer>

      {/* Urgent Request Modal */}
      {isUrgentModalOpen && currentUser && (
        <UrgentRequestModal 
          onClose={() => setIsUrgentModalOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal 
          onClose={() => {
            setIsProfileOpen(false);
            loadProfile(); // Reload the profile to check if phone was updated
          }} 
        />
      )}

      {/* Full Screen Map Modal */}
      {isMapOpen && (
        <MapModal 
          onClose={() => setIsMapOpen(false)}
          currentUser={currentUser}
          displayedDonors={displayedDonors}
        />
      )}
    </div>
  );
};

export default Home;
