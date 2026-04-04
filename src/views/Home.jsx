import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, MapPin, Search, Phone, Home as HouseIcon, UserCircle, AlertTriangle, Clock, Droplet, HelpCircle } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db, auth, messaging } from '../firebase';
import { getToken } from 'firebase/messaging';
import { useRouter } from 'next/navigation';
import BloodGroupButton from '../components/BloodGroupButton';
import Button from '../components/Button';
import ProfileModal from '../components/ProfileModal';
import UrgentRequestModal from '../components/UrgentRequestModal';
import MapModal from '../components/MapModal';
import MyRequestHistoryModal from '../components/MyRequestHistoryModal';
import GuideModal from '../components/GuideModal';

const Home = () => {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeDonorId, setActiveDonorId] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [searchedGroup, setSearchedGroup] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [maxDistance, setMaxDistance] = useState(50);

  const [donors, setDonors] = useState([]);
  const [urgentFeed, setUrgentFeed] = useState([]);
  const [userHistory, setUserHistory] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);

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
    // 0. Fallback: Set location instantly using saved Account Profile Coordinates
    if (currentUser?.profileCoordinates?.length === 2) {
      setUserLocation(currentUser.profileCoordinates);
    }

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
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    }
  }, [currentUser?.uid]);

  // Request & Store FCM Push Token for specific blood group alerting
  useEffect(() => {
    if (currentUser?.uid && messaging && typeof window !== "undefined") {
      const requestFCMToken = async () => {
        try {
          // If env var is missing, skip to avoid UI crashes
          if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) return;

          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const currentToken = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
            });
            if (currentToken) {
              const userRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userRef, { fcmToken: currentToken });
            }
          }
        } catch (err) {
          console.log("FCM Background permission error/denied:", err);
        }
      };

      if (Notification.permission !== 'denied') {
        requestFCMToken();
      }
    }
  }, [currentUser?.uid]);

  // Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return '?';
    const p = 0.017453292519943295; // Math.PI / 180
    const c = Math.cos;
    const a = 0.5 - c((lat2 - lat1) * p) / 2 +
      c(lat1 * p) * c(lat2 * p) *
      (1 - c((lon2 - lon1) * p)) / 2;
    return (12742 * Math.asin(Math.sqrt(a))).toFixed(1);
  };

  // 2. Real-time Firebase Listener for Available Donors
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const donorsList = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const activeCoords = data.coordinates?.length === 2 ? data.coordinates : data.profileCoordinates;

        let dist = '?';
        if (userLocation && userLocation.length === 2 && activeCoords?.length === 2) {
          dist = calculateDistance(userLocation[0], userLocation[1], activeCoords[0], activeCoords[1]);
        }

        let isEligible = true;
        if (data.lastDonation) {
          const diffTime = new Date() - new Date(data.lastDonation);
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          isEligible = diffDays > 90;
        }

        donorsList.push({
          id: docSnap.id,
          name: docSnap.id === currentUser?.uid ? `${data.name} (You)` : data.name,
          group: data.group || 'A+',
          distance: dist,
          phone: data.phone,
          address: data.address,
          coordinates: activeCoords || [],
          isAvailable: data.isAvailable !== false,
          isEligible: isEligible,
          lastDonation: data.lastDonation || null
        });
      });
      donorsList.sort((a, b) => {
        const aAvail = a.isAvailable && a.isEligible ? 1 : 0;
        const bAvail = b.isAvailable && b.isEligible ? 1 : 0;
        if (aAvail !== bAvail) return bAvail - aAvail;
        if (userLocation && a.distance !== '?' && b.distance !== '?') {
          return parseFloat(a.distance) - parseFloat(b.distance);
        }
        return 0;
      });
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
    if (!window.confirm("Are you sure you want to log out?")) return;
    try {
      if (auth) await auth.signOut();
      localStorage.removeItem('userProfile');
    } catch (e) {
      console.error(e);
    }
    router.push('/');
  };

  const isProfileComplete =
    currentUser &&
    currentUser.name?.trim() &&
    currentUser.phone?.trim() &&
    currentUser.address?.trim() &&
    currentUser.group?.trim();

  return (
    <div className="min-h-screen bg-[#fffafa] text-red-950 pb-48 font-sans transition-colors duration-300 flex flex-col items-center">

      {/* App Bar */}
      <header className="w-full bg-white border-b border-gray-50 sticky top-0 z-20">
        <div className="max-w-md mx-auto px-5 py-3 flex justify-between items-center">
          <div className="relative h-12 w-24">
             <img className="absolute top-1/2 left-0 -translate-y-1/2 h-28 w-auto object-contain mix-blend-multiply" alt="ReDrop Logo" src="/logo.png" />
          </div>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => setIsGuideOpen(true)}
              className="p-1 text-gray-500 hover:text-red-500 transition-colors"
              aria-label="User Guide"
            >
              <HelpCircle className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setIsProfileOpen(true)} 
              className="relative p-1 text-gray-500 hover:text-red-500 transition-colors"
              aria-label="Profile"
            >
              <UserCircle className="w-7 h-7" />
              {!isProfileComplete && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>
            <button 
              onClick={handleLogout} 
              className="p-1 text-gray-500 hover:text-red-500 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Profile Completion Alert */}
        {!isProfileComplete && (
          <div className="bg-orange-50 border-b border-orange-100 p-2.5">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <p className="text-orange-800 text-[10px] font-semibold leading-tight">Setup profile to use map.</p>
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

      <main className="w-full max-w-md px-4 py-6 space-y-8">

        {/* Live Urgent Feed */}
        {isProfileComplete && (
          <section className="bg-white rounded-2xl p-5 border border-gray-100 relative overflow-hidden transition-colors">
            <div className="flex justify-between items-center mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
                <h3 className="text-base font-bold text-gray-900">Live Feed</h3>
              </div>
              <button
                onClick={() => setIsUrgentModalOpen(true)} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full shadow-sm transition-colors"
              >
                + Post Need
              </button>
            </div>

            <div className="space-y-3 relative z-10 max-h-64 overflow-y-auto pr-1">
              {urgentFeed.length === 0 ? (
                <p className="text-center text-sm text-red-800 py-4 bg-red-50/50 rounded-xl border border-dashed border-red-200">No urgent requests right now.</p>
              ) : (
                urgentFeed.map(feed => (
                  <div key={feed.id} className="bg-white rounded-xl p-3 border border-red-100 shadow-sm shadow-red-50 hover:border-red-300 hover:shadow-red-100 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-red-100 text-red-700 font-extrabold text-xs px-2 py-0.5 rounded-md border border-red-200">{feed.bloodGroup}</span>
                        <span className="text-xs font-semibold text-gray-700">{feed.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {feed.timestamp?.toDate() ? (() => {
                        const diffMs = new Date() - feed.timestamp.toDate();
                        const diffMins = Math.floor(diffMs / 60000);
                        if (diffMins < 60) return `${diffMins}m ago`;
                        const diffHrs = Math.floor(diffMins / 60);
                        if (diffHrs < 24) return `${diffHrs}h ago`;
                        return `${Math.floor(diffHrs / 24)}d ago`;
                      })() : 'just now'}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-800 flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 text-gray-400 shrink-0" /> {feed.location}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col items-center gap-2">
                       {currentUser?.uid === feed.postedBy && (
                          <button
                            onClick={async () => {
                              if (window.confirm("Are you sure?")) {
                                try { await deleteDoc(doc(db, 'urgent_requests', feed.id)); } catch (e) { alert('Error'); }
                              }
                            }} className="text-[10px] font-bold text-gray-400 hover:text-red-600 transition-colors mb-1"
                          >
                            Delete My Request
                          </button>
                       )}
                       <a 
                         href={`tel:+${String(feed.phone || '').replace(/\D/g, '').startsWith('880') ? String(feed.phone || '').replace(/\D/g, '') : `880${String(feed.phone || '').replace(/\D/g, '').replace(/^0+/, '')}`}`} 
                         className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-red-100 shadow-sm shadow-red-100/50 active:scale-95"
                       >
                         <Phone className="w-4 h-4" /> Call Now
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
              <p className="text-gray-500 text-sm mt-1">Select the blood group you need to immediately find nearby donors</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 sm:gap-4 mt-2">
            {bloodGroups.map((group) => (
              <BloodGroupButton
                key={group}
                group={group}
                selected={searchedGroup === group}
                onClick={(group) => {
                  setSelectedGroup(group);
                  setSearchedGroup(searchedGroup === group ? null : group);
                  setActiveDonorId(null);
                  setVisibleCount(15);
                  setTimeout(() => {
                    window.scrollTo({
                      top: 400,
                      behavior: 'smooth'
                    });
                  }, 100);
                }}
              />
            ))}
          </div>
        </section>

        {/* Map & List Section */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-sm shadow-gray-200/50 border border-gray-100 space-y-6 relative z-0 transition-colors">
          <div className="pb-4 border-b border-gray-100 space-y-4">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold text-gray-900">
                {searchedGroup ? `Live Tracking: ${searchedGroup} Donors` : 'Live Tracking Map'}
              </h3>
            </div>

            {isProfileComplete && (
              <div className="mb-4">
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => {
                    if (!userLocation) {
                      alert("Location needed");
                      return;
                    }
                    setIsMapOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-100 shadow-sm rounded-xl active:scale-95 transition-all"
                >
                  <MapPin className="w-5 h-5" /> View Live Map
                </Button>
              </div>
            )}

            {userLocation && isProfileComplete && (
              <div className="flex flex-col bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all group">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" /> Radius Filter
                  </span>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">{maxDistance} km</span>
                </div>
                <div className="relative px-1">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none transition-all"
                  />
                  <div className="flex justify-between text-[11px] font-bold text-gray-400 mt-2 px-0.5">
                    <span>1km</span>
                    <span>50km Max</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Donors List with Framer Motion */}
          <div className="space-y-3 min-h-[150px]">
            {!isProfileComplete ? (
              <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <h3 className="font-bold text-gray-900 mb-1 text-sm">Features Locked</h3>
                <p className="text-xs text-gray-500 mb-4 px-6">Complete your profile to see active donors nearby.</p>
                <button onClick={() => setIsProfileOpen(true)} className="mx-auto bg-gray-800 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-900 transition-colors shadow-sm text-xs">Setup Profile Now</button>
              </div>
            ) : displayedDonors.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="text-gray-900 font-bold text-base mb-1">No donors found</h4>
                <p className="text-gray-500 font-medium text-xs mb-5 px-4">Try expanding the radius or posting a request.</p>
                <button onClick={() => setIsUrgentModalOpen(true)} className="bg-red-600 text-white text-xs font-bold py-3 px-8 rounded-xl hover:bg-red-700 active:scale-95 transition-all">Post an Urgent Request</button>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {displayedDonors.slice(0, visibleCount).map((donor, index) => (
                  <motion.div
                    layout
                    key={donor.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex flex-col p-4 rounded-2xl bg-white hover:bg-gray-50 transition-all border border-gray-100 shadow-sm group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center font-bold text-red-600 shrink-0 border border-red-100">
                          {donor.group}
                        </div>
                        <div className="flex flex-col">
                          <h4 className="font-bold text-gray-900 text-sm leading-tight">{donor.name}</h4>
                          <div className="flex items-center text-[10px] mt-1 font-bold">
                            {donor.isAvailable && donor.isEligible ? (
                              <span className="text-green-600 flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full border border-green-100/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Available
                              </span>
                            ) : (
                              <span className="text-orange-600 flex items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Recovery
                                {!donor.isEligible && donor.lastDonation && (
                                  <span className="text-orange-400 font-normal ml-0.5 text-[10px] tracking-tight whitespace-nowrap">
                                    {"(< 90d)"}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <p className="flex items-start gap-1 text-[11px] text-gray-500 font-medium mt-1.5">
                            <HouseIcon className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />
                            <span>{donor.address} {donor.distance !== '?' && <span className="text-gray-400 ml-0.5">({donor.distance} km)</span>}</span>
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 shrink-0 w-full sm:w-32 mt-2 sm:mt-0">
                        <a href={`tel:+${String(donor.phone || '').replace(/\D/g, '').startsWith('880') ? String(donor.phone || '').replace(/\D/g, '') : `880${String(donor.phone || '').replace(/\D/g, '').replace(/^0+/, '')}`}`} className="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 py-3 rounded-xl border border-gray-100 transition-all font-bold text-gray-800 shadow-sm text-xs active:scale-95">
                          <Phone className="w-3.5 h-3.5 text-red-500" /> Call
                        </a>
                        <a href={`https://wa.me/${String(donor.phone || '').replace(/\D/g, '').startsWith('880') ? String(donor.phone || '').replace(/\D/g, '') : `880${String(donor.phone || '').replace(/\D/g, '').replace(/^0+/, '')}`}?text=Hi%20${encodeURIComponent(donor.name)},%20I%20found%20you%20on%20ReDrop.%20I%20have%20an%20urgent%20need%20for%20${encodeURIComponent(donor.group)}%20blood.`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 py-3 rounded-xl border border-[#25D366]/20 transition-all font-bold text-[#128C7E] shadow-sm text-xs active:scale-95">
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      {/* FAB */}
      {isProfileComplete && (
        <div className="fixed bottom-6 w-full max-w-md px-6 pointer-events-none z-40 flex justify-end">
          <motion.button
            onClick={() => setIsUrgentModalOpen(true)}
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="pointer-events-auto bg-red-600 text-white p-5 rounded-full shadow-2xl shadow-red-500/50 hover:bg-red-700 transition-all group"
          >
            <Droplet className="w-7 h-7" />
          </motion.button>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-md mx-auto px-4 py-12 mb-4 text-center text-sm text-gray-500">
        Created By <a href="https://www.linkedin.com/in/sma-rashik/" target="_blank" rel="noopener noreferrer" className="font-semibold text-red-600 hover:underline transition-colors">S M Abdul Rashik</a>
      </footer>

      {/* Modals */}
      {isUrgentModalOpen && currentUser && (
        <UrgentRequestModal onClose={() => setIsUrgentModalOpen(false)} currentUser={currentUser} />
      )}
      {isHistoryOpen && (
        <MyRequestHistoryModal onClose={() => setIsHistoryOpen(false)} userHistory={userHistory} />
      )}
      {isProfileOpen && (
        <ProfileModal onClose={() => { setIsProfileOpen(false); loadProfile(); }} />
      )}
      {isMapOpen && userLocation && (
        <MapModal onClose={() => setIsMapOpen(false)} centerPosition={userLocation} displayedDonors={displayedDonors} />
      )}
      {isGuideOpen && (
        <GuideModal onClose={() => setIsGuideOpen(false)} />
      )}
    </div>
  );
};

export default Home;
