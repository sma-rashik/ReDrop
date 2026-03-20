import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, User, MapPin, Phone } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ProfileModal = ({ onClose }) => {
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    address: '',
    lastDonation: '',
    isAvailable: true,
    group: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Eligibility Check (3 months = ~90 days)
  const checkEligibility = (dateStr) => {
    if (!dateStr) return true;
    const diffTime = new Date() - new Date(dateStr);
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 90; 
  };

  const isEligible = checkEligibility(profile.lastDonation);

  // Auto-update availability based on date logic
  useEffect(() => {
    if (!isEligible) {
      // Less than 3 months -> Disable availability
      setProfile(prev => ({ ...prev, isAvailable: false }));
    } else if (profile.lastDonation && isEligible) {
      // More than 3 months -> Auto activate availability
      setProfile(prev => ({ ...prev, isAvailable: true }));
    }
  }, [profile.lastDonation]);

  const handleSave = async () => {
    localStorage.setItem('userProfile', JSON.stringify(profile));
    
    if (profile.uid) {
      try {
         const userRef = doc(db, 'users', profile.uid);
         await updateDoc(userRef, {
             name: profile.name,
             phone: profile.phone,
             address: profile.address,
             lastDonation: profile.lastDonation || '',
             isAvailable: profile.isAvailable,
             group: profile.group
         });
      } catch (e) {
         console.error("Error updating profile in DB:", e);
      }
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col relative animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 max-h-[90vh] transition-colors duration-200">
        
        <header className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 rounded-t-3xl sticky top-0 z-10 transition-colors duration-200">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Profile</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Form Fields */}
          <div className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  name="name" 
                  value={profile.name} 
                  onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="tel" 
                  name="phone" 
                  value={profile.phone} 
                  onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  name="address" 
                  value={profile.address} 
                  onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blood Group</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                  {profile.group || '?'}
                </div>
                <select 
                  name="group" 
                  value={profile.group} 
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none" 
                >
                  <option value="" disabled>Select Blood Group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Blood Donation Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="date" 
                  name="lastDonation" 
                  value={profile.lastDonation} 
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]} // Max date is today
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                />
              </div>
              {!isEligible && (
                <p className="text-xs text-red-500 mt-2 font-medium">
                  3 months have not passed since your last donation. You are currently ineligible.
                </p>
              )}
            </div>

            <div className={`flex items-center justify-between p-4 rounded-xl border mt-2 transition-colors ${!isEligible ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50'}`}>
              <div>
                <p className={`font-semibold text-sm ${!isEligible ? 'text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>Available for Donation</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Let others know if you can donate</p>
              </div>
              <label className={`relative inline-flex items-center ${isEligible ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={profile.isAvailable}
                  disabled={!isEligible}
                  onChange={(e) => setProfile({...profile, isAvailable: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

          </div>
        </div>
        
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sm:rounded-b-3xl">
          <button 
            onClick={handleSave}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Profile
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
