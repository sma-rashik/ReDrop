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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) setProfile(JSON.parse(saved));
  }, []);

  const handleChange = (e) => {
    // Only allow changing lastDonation
    if (e.target.name === 'lastDonation') {
      setProfile({ ...profile, [e.target.name]: e.target.value });
    }
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
      setProfile(prev => ({ ...prev, isAvailable: false }));
    } else if (profile.lastDonation && isEligible) {
      setProfile(prev => ({ ...prev, isAvailable: true }));
    }
  }, [profile.lastDonation]);

  const handleSave = async () => {
    setLoading(true);
    
    try {
      if (profile.uid) {
          const userRef = doc(db, 'users', profile.uid);
          await updateDoc(userRef, {
              isAvailable: profile.isAvailable,
              lastDonation: profile.lastDonation || ''
          });
      }
      localStorage.setItem('userProfile', JSON.stringify(profile));
    } catch (e) {
      console.error("Error updating profile in DB:", e);
      alert("Failed to update profile. Please check your connection.");
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col relative animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 max-h-[90vh] transition-colors duration-200">
        
        <header className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl sticky top-0 z-10 transition-colors duration-200">
          <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Read-only Form Fields */}
          <div className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Full Name (Cannot be changed)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={profile.name} 
                  disabled
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl cursor-not-allowed" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number (Cannot be changed)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="tel" 
                  value={profile.phone} 
                  disabled
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl cursor-not-allowed" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Address (Cannot be changed)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={profile.address} 
                  disabled
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl cursor-not-allowed" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Blood Group (Cannot be changed)</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                  {profile.group || '?'}
                </div>
                <input 
                  type="text" 
                  value={profile.group} 
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl cursor-not-allowed" 
                />
              </div>
            </div>

            {/* Editable Fields */}
            <div className="border-t border-gray-100 pt-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Blood Donation Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="date" 
                  name="lastDonation" 
                  value={profile.lastDonation} 
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]} 
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                />
              </div>
              {!isEligible && (
                <p className="text-xs text-red-500 mt-2 font-medium">
                  3 months have not passed since your last donation. You are currently ineligible.
                </p>
              )}
            </div>

            <div className={`flex items-center justify-between p-4 rounded-xl border mt-2 transition-colors ${!isEligible ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-100'}`}>
              <div>
                <p className={`font-semibold text-sm ${!isEligible ? 'text-gray-500' : 'text-gray-900'}`}>Available for Donation</p>
                <p className="text-xs text-gray-500">Let others know if you can donate</p>
              </div>
              <label className={`relative inline-flex items-center ${isEligible ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={profile.isAvailable}
                  disabled={!isEligible}
                  onChange={(e) => setProfile({...profile, isAvailable: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

          </div>
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-white sm:rounded-b-3xl">
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:bg-red-400"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
