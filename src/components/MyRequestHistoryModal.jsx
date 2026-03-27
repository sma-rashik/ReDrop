import React from 'react';
import { X, Clock, MapPin, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const MyRequestHistoryModal = ({ onClose, userHistory }) => {
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this request from your history?")) {
      try {
        await deleteDoc(doc(db, 'urgent_requests', id));
      } catch (e) {
        alert('Failed to delete history post');
      }
    }
  };

  const getStatus = (timestamp) => {
    if (!timestamp) return { text: 'Active Live', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    const diffMs = Date.now() - timestamp.toDate().getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs >= 24) {
      return { text: 'Expired (24h+)', color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200' };
    }
    return { text: 'Active Live', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  };

  const formatDate = (timestamp) => {
     if (!timestamp) return 'Just now';
     const date = timestamp.toDate();
     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200 transition-colors max-h-[90vh]">
        
        <header className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl sticky top-0 z-10">
          <div className="flex items-center gap-2 text-gray-800">
             <Clock className="w-5 h-5 text-red-500" />
             <h2 className="text-xl font-bold">My Post History</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 overflow-y-auto space-y-4">
          {userHistory.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Clock className="w-12 h-12 mb-3 opacity-50" />
                <p>No request history found.</p>
             </div>
          ) : (
             userHistory.map(post => {
                const status = getStatus(post.timestamp);
                return (
                  <div key={post.id} className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${status.border}`}>
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                           <span className="bg-red-100 text-red-700 font-extrabold text-xs px-2 py-0.5 rounded-md border border-red-200">
                             {post.bloodGroup}
                           </span>
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${status.bg} ${status.color}`}>
                             {status.text === 'Active Live' ? <CheckCircle2 className="w-3 h-3"/> : <AlertCircle className="w-3 h-3"/>}
                             {status.text}
                           </span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                           {formatDate(post.timestamp)}
                        </span>
                     </div>
                     <p className="text-xs font-semibold text-gray-800 flex items-start gap-1.5 mt-2">
                        <MapPin className="w-3.5 h-3.5 mt-0 text-gray-400 shrink-0"/> {post.location}
                     </p>
                     {post.note && <p className="text-xs text-gray-500 mt-1.5 italic w-full">"{post.note}"</p>}
                     
                     <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                        <button
                           onClick={() => handleDelete(post.id)} 
                           className="text-xs font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                        >
                           <Trash2 className="w-3.5 h-3.5"/> Delete
                        </button>
                     </div>
                  </div>
                );
             })
          )}
        </div>
      </div>
    </div>
  );
};

export default MyRequestHistoryModal;
