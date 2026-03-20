import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import Button from './Button';

const UrgentRequestModal = ({ onClose, currentUser }) => {
  const [bloodGroup, setBloodGroup] = useState(currentUser?.group || 'O+');
  const [location, setLocation] = useState(currentUser?.address || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bloodGroup || !location || !phone) {
      alert("Please fill out the required fields!");
      return;
    }
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'urgent_requests'), {
        bloodGroup,
        location,
        phone,
        note,
        postedBy: currentUser.uid,
        name: currentUser.name,
        timestamp: serverTimestamp(),
        status: 'Active'
      });
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
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200 p-6 transition-colors duration-200">
        
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-red-600">
             <AlertCircle className="w-6 h-6" />
             <h2 className="text-xl font-bold dark:text-gray-100">Post Urgent Need</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blood Group Needed *</label>
             <select 
                value={bloodGroup} 
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none" 
                required
              >
                <option value="" disabled>Select Blood Group</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hospital / Location *</label>
            <input 
              type="text" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Dhaka Medical College"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" 
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Phone *</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" 
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Note (Optional)</label>
            <textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)}
              placeholder="Patient condition, bag requirements..."
              rows="2"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none" 
            />
          </div>

          <div className="pt-2">
            <Button 
              fullWidth 
              type="submit" 
              variant="primary" 
              disabled={loading} 
              className="py-3.5 flex items-center justify-center gap-2 text-base shadow-lg shadow-red-200"
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
