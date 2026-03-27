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
import MyRequestHistoryModal from '../components/MyRequestHistoryModal';

const Home = () => {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeDonorId, setActiveDonorId] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [searchedGroup, setSearchedGroup] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [maxDistance, setMaxDistance] = useState(50); 
  
  const [donors, setDonors] = useState([]);
  const [urgentFeed, setUrgentFeed] = useState([]);
  const [userHistory, setUserHistory] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
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
        (error) => {
          console.warn("Geolocation error:", error.message);
          if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
             alert("আপনি Location (GPS) পারমিশন বন্ধ রেখেছেন। ম্যাপ এবং দূরত্বের ফিচার ব্যবহার করতে আপনার ব্রাউজার বা ডিভাইসের সেটিংস থেকে ReDrop অ্যাপের জন্য লোকেশন অন করুন!");
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    }
  }, [currentUser?.uid]);

  // Haversine formula
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

  // 3. Real-time Firebase Listener for Urgent Requests (Filtered < 24h)
  useEffect(() => {
    const q = query(collection(db, 'urgent_requests'), orderBy('timestamp', 'desc'), limit(30));
    const unsubscribeFeed = onSnapshot(q, (snapshot) => {
       const feed = [];
       const now = Date.now();
       snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.timestamp) {
             const diffMs = now - data.timestamp.toDate().getTime();
             const diffHrs = diffMs / (1000 * 60 * 60);
             if (diffHrs < 24) {
               feed.push({ id: docSnap.id, ...data });
             }
          } else {
             // Pending serverTimestamp
             feed.push({ id: docSnap.id, ...data });
          }
       });
       setUrgentFeed(feed.slice(0, 10)); // keep max 10
    });
    return () => unsubscribeFeed();
  }, []);

  // 4. Real-time Firebase Listener for User's Own History
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, 'urgent_requests')); // Client-side filter to avoid composite index requirement
    const unsubscribeHistory = onSnapshot(q, (snapshot) => {
       const historyList = [];
       snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.postedBy === currentUser.uid) {
             historyList.push({ id: docSnap.id, ...data });
          }
       });
       historyList.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp.toDate() - a.timestamp.toDate();
       });
       setUserHistory(historyList);
    }, (err) => console.log("History error:", err));
    return () => unsubscribeHistory();
  }, [currentUser?.uid]);

  const displayedDonors = donors.filter(donor => {
    const matchGroup = searchedGroup ? donor.group === searchedGroup : true;
    const matchDistance = donor.distance !== '?' ? parseFloat(donor.distance) <= parseFloat(maxDistance) : true;
    return matchGroup && matchDistance;
  });

  const handleLogout = async () => {
    if(!window.confirm("Are you sure you want to log out?")) return;
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
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center overflow-hidden">
          <div className="flex items-center h-10 w-32 relative">
             <img src="/logo.png" className="absolute top-1/2 left-0 -translate-y-1/2 h-28 w-auto object-contain mix-blend-multiply" alt="ReDrop Logo" />
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
          <div className="bg-orange-50 border-b border-orange-100 p-2.5 animate-in slide-in-from-top-2 duration-300">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <p className="text-orange-800 text-xs font-semibold">Please setup your profile to use the map.</p>
              </div>
              <button 
                onClick={() => setIsProfileOpen(true)} className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow-sm transition-colors"
              >
                Setup
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-8">
        
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

              {userHistory.length > 0 && (
                 <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm transition-all duration-200">
                    <Clock className="w-3.5 h-3.5" /> My History
                 </button>
              )}
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
                                onClick={() => setIsHistoryOpen(true)} className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
                             >
                                <Clock className="w-3 h-3"/> View in History
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
                  const newGroup = selectedGroup === group ? null : group;
                  setSelectedGroup(newGroup);
                  setSearchedGroup(newGroup); 
                  setActiveDonorId(null);
                }}
              />
            ))}
          </div>
        </section>

        {/* Nearby Donors Map & List Section */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-sm shadow-gray-200/50 border border-gray-100 space-y-6 relative z-0 transition-colors">
          
          {/* Filtering and Map controls placed ABOVE the list */}
          <div className="pb-4 border-b border-gray-100 space-y-4">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold text-gray-900">
                {searchedGroup ? `Live Tracking: ${searchedGroup} Donors` : 'Live Tracking Map'}
              </h3>
            </div>
            
            {/* Map Modal Trigger Built-in */}
            {isProfileComplete && (
              <div className="mb-4 animate-in fade-in duration-300">
                 <Button 
                   fullWidth 
                   variant="secondary" 
                   onClick={() => {
                     if (!userLocation) {
                        alert("অনুগ্রহ করে আপনার ডিভাইসের Location (GPS) পারমিশনটি অন করুন। তা নাহলে আমরা ডোনারের সঠিক দূরত্ব হিসেব করে ম্যাপে দেখাতে পারব না।");
                        return;
                     }
                     setIsMapOpen(true);
                   }}
                   className="flex items-center justify-center gap-2 py-3.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-100 shadow-sm rounded-xl"
                 >
                   <MapPin className="w-5 h-5" /> View Live Map
                 </Button>
              </div>
            )}

            {/* Distance Filter Slider (Max 50km) */}
            {userLocation && isProfileComplete && (
              <div className="flex flex-col bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-in fade-in duration-300">
                 <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-500"/> Radius Filter</span>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">{maxDistance} km</span>
                 </div>
                 <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    step="1"
                    value={maxDistance} 
                    onChange={(e) => setMaxDistance(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1 px-0.5">
                     <span>1km</span>
                     <span>50km Max</span>
                  </div>
              </div>
            )}
          </div>

          {/* Donors List */}
          <div className="space-y-3 min-h-[150px]">
            {!isProfileComplete ? (
              <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 animate-in fade-in duration-300">
                <div className="mx-auto w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                   <AlertTriangle className="text-gray-500 w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm">Features Locked</h3>
                <p className="text-xs text-gray-500 mb-4 px-6">Complete your profile to see active donors nearby.</p>
                <button 
                  onClick={() => setIsProfileOpen(true)} className="mx-auto bg-gray-800 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-900 transition-colors shadow-sm text-xs"
                >
                  Setup Profile Now
                </button>
              </div>
            ) : displayedDonors.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Search className="text-gray-400 w-5 h-5" />
                </div>
                <p className="text-gray-500 font-semibold text-sm">No donors found nearby.</p>
                <button onClick={() => setIsUrgentModalOpen(true)} className="mt-3 bg-white text-red-600 text-xs font-bold py-2 px-4 rounded-lg border border-red-200 shadow-sm hover:bg-red-50 transition-colors">
                  Post an Urgent Request
                </button>
              </div>
            ) : (
              displayedDonors.map((donor) => (
                <div key={donor.id} className="flex flex-col p-4 rounded-2xl bg-white hover:bg-gray-50 transition-all border border-gray-100 shadow-sm group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center font-bold text-red-600 shrink-0">
                        {donor.group}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-bold text-gray-900 text-sm leading-tight">{donor.name}</h4>
                        <div className="flex items-center text-[10px] mt-1 font-semibold">
                          {donor.isAvailable && donor.isEligible ? (
                             <span className="text-green-600 flex items-center gap-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Available
                             </span>
                          ) : !donor.isEligible ? (
                             <span className="text-orange-500 flex items-center gap-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Recovery <span className="text-orange-400 font-normal ml-0.5">(&lt; 90d)</span>
                             </span>
                          ) : (
                             <span className="text-gray-500 flex items-center gap-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Unavailable
                             </span>
                          )}
                        </div>
                        
                        {/* Location */}
                        <p className="flex items-start gap-1 text-[11px] text-gray-500 font-medium mt-1.5">
                          <HouseIcon className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />
                          <span>{donor.address} {donor.distance !== '?' && <span className="text-gray-400 ml-0.5">({donor.distance} km)</span>}</span>
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                       <a href={`tel:+880${donor.phone.replace(/\D/g, '').replace(/^(?:88)?0?/, '')}`} className="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 py-1.5 px-3 rounded-lg border border-gray-200 transition-colors font-bold text-gray-700 shadow-sm text-[11px]">
                         <Phone className="w-3 h-3 text-gray-600" /> Call
                       </a>
                       <a 
                         href={`https://wa.me/880${donor.phone.replace(/\D/g, '').replace(/^(?:88)?0?/, '')}?text=Hi%20${encodeURIComponent(donor.name)},%20I%20found%20you%20on%20ReDrop.%20I%20have%20an%20urgent%20need%20for%20${encodeURIComponent(donor.group)}%20blood.`} 
                         target="_blank" 
                         rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 py-1.5 px-3 rounded-lg border border-[#25D366]/30 transition-colors font-bold text-[#128C7E] shadow-sm text-[11px]"
                        >
                         <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                         WhatsApp
                       </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>


        </div>

      </main>

      {/* Floating Action Button */}
      {isProfileComplete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pointer-events-none z-40 flex justify-end">
          <button
            onClick={() => setIsUrgentModalOpen(true)}
            className="pointer-events-auto bg-red-600 text-white p-4 rounded-full shadow-xl shadow-red-200/50 hover:bg-red-700 hover:scale-105 transition-all flex items-center justify-center animate-bounce duration-1000"
            aria-label="Post Urgent Request"
          >
            <Droplet className="w-6 h-6" />
          </button>
        </div>
      )}

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

      {/* History Modal */}
      {isHistoryOpen && (
        <MyRequestHistoryModal 
          onClose={() => setIsHistoryOpen(false)}
          userHistory={userHistory}
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
      {isMapOpen && userLocation && (
        <MapModal 
          onClose={() => setIsMapOpen(false)}
          centerPosition={userLocation}
          displayedDonors={displayedDonors}
        />
      )}
    </div>
  );
};

export default Home;
