import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import Button from './Button';
import LocationAutocomplete from './LocationAutocomplete';

const UrgentRequestModal = ({ onClose, currentUser }) => {
  const [bloodGroup, setBloodGroup] = useState(currentUser?.group || 'O+');
  const [location, setLocation] = useState(currentUser?.address || '');
  const [locationCoordinates, setLocationCoordinates] = useState(currentUser?.profileCoordinates || []);
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bloodGroup || !location || !phone) {
      alert("Please fill out all required fields.");
      return;
    }
    
    setLoading(true);
    try {
      const requestData = {
        bloodGroup,
        location,
        locationCoordinates,
        phone,
        note,
        postedBy: currentUser.uid,
        name: currentUser.name,
        timestamp: serverTimestamp(),
        status: 'Active'
      };
      
      await addDoc(collection(db, 'urgent_requests'), requestData);
      
      // Trigger Background Push Notifications asynchronously via free Vercel Edge Function
      fetch('/api/notify', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            bloodGroup,
            requesterName: currentUser.name,
            location,
            note
         })
      }).catch(e => console.error("Notification API Dispatch Failed:", e));

      onClose();
    } catch (err) {
      console.error("Error posting urgent request:", err);
      alert("Failed to post request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200 p-6 transition-colors duration-200">
        
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-red-600">
             <AlertCircle className="w-6 h-6" />
             <h2 className="text-xl font-bold">Post Urgent Need</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 :bg-gray-800 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group Needed *</label>
             <select 
                value={bloodGroup} 
                onChange={(e) => setBloodGroup(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none" 
                required
              >
                <option value="" disabled>Select Blood Group</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital / Location *</label>
            <LocationAutocomplete 
              value={location}
              onLocationSelect={(addr, coords) => {
                 setLocation(addr);
                 setLocationCoordinates(coords || []);
              }}
              placeholder="Search specific Hospital or Location..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone *</label>
            <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-red-500 transition-all overflow-hidden text-sm">
               <div className="pl-4 pr-3 py-3 bg-gray-100 text-gray-600 font-bold border-r border-gray-200 flex items-center justify-center shrink-0">
                 +880
               </div>
               <input 
                  type="tel" 
                  value={phone.replace(/\D/g, '').replace(/^(?:88)?0?/, '')} 
                  onChange={(e) => {
                     const val = e.target.value.replace(/\D/g, '');
                     setPhone(`+880${val.slice(0, 10)}`);
                  }} 
                  className="w-full pl-3 pr-4 py-3 bg-transparent text-gray-900 outline-none font-semibold tracking-wide" 
                  required
                  placeholder="1XXXXXXXXX (10 digits)"
               />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Note (Optional)</label>
            <textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)}
              placeholder="Patient condition, bag requirements..."
              rows="2" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none" 
            />
          </div>

          <div className="pt-2">
            <Button 
              fullWidth 
              type="submit" 
              variant="primary" 
              disabled={loading} className="py-3.5 flex items-center justify-center gap-2 text-base shadow-lg shadow-red-200"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Posting...' : 'Post Request'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default UrgentRequestModal;
