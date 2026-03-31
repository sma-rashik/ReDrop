import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Trash2, ShieldAlert } from 'lucide-react';

const AdminPanel = () => {
   const [users, setUsers] = useState([]);
   const [posts, setPosts] = useState([]);

   const [isAuthorized, setIsAuthorized] = useState(false);
   const [loadingAuth, setLoadingAuth] = useState(true);

   useEffect(() => {
      // Check Auth
      const unsubAuth = onAuthStateChanged(auth, (user) => {
         if (user && user.email === '01994412000@bloodlink.app') {
            setIsAuthorized(true);
         } else {
            setIsAuthorized(false);
         }
         setLoadingAuth(false);
      });

      // Fetch Users
      const unsubUsers = onSnapshot(collection(db, 'users'), sn => {
         setUsers(sn.docs.map(d => ({id: d.id, ...d.data()})));
      });
      // Fetch Posts History
      const unsubPosts = onSnapshot(collection(db, 'urgent_requests'), sn => {
         const postList = sn.docs.map(d => ({id: d.id, ...d.data()}));
         postList.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return b.timestamp.toDate() - a.timestamp.toDate();
         });
         setPosts(postList);
      });
      return () => {
         unsubAuth();
         unsubUsers();
         unsubPosts();
      }
   }, []);

   const deleteUser = async (id) => {
      if(window.confirm("WARNING: Are you sure you want to permanently delete this user?")) {
         try {
             await deleteDoc(doc(db, 'users', id));
         } catch(e) {
             alert('Failed to delete user');
         }
      }
   };

   const deletePost = async (id) => {
      if(window.confirm("Delete this Urgent Post?")) {
         try {
             await deleteDoc(doc(db, 'urgent_requests', id));
         } catch(e) {
             alert('Failed to delete post');
         }
      }
   };

   if (loadingAuth) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Checking authorization...</div>;
   }

   if (!isAuthorized) {
      return (
         <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center transition-colors">
            <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Access Denied!</h1>
            <p className="text-gray-500 mt-2">Only the admin (01994412000) can view this page.</p>
            <p className="text-xs text-gray-400 mt-1">Make sure you are logged in with the correct Phone Number.</p>
            <a href="/" className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md transition-colors">Go back Home</a>
         </div>
      );
   }

   return (
     <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-8 transition-colors">
       <div className="max-w-6xl mx-auto">
           <header className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-200">
               <ShieldAlert className="w-8 h-8 text-red-600" />
               <div>
                  <h1 className="text-2xl font-bold text-gray-900">Hidden Admin Dashboard</h1>
                  <p className="text-sm text-gray-500">Manage all ReDrop users and posts</p>
               </div>
           </header>

           <div className="grid md:grid-cols-2 gap-6">
             {/* Users Table */}
             <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Registered Users</h2>
                  <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-xs">{users.length} Total</span>
               </div>
               <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
                  {users.map(u => (
                     <div key={u.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div>
                           <p className="font-semibold text-sm text-gray-900">{u.name || 'Unnamed'} <span className="text-red-600 font-bold">({u.group || '?'})</span></p>
                           <p className="text-xs text-gray-500 mt-1">{u.phone}</p>
                        </div>
                        <button onClick={() => deleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-50 :bg-red-900/20 rounded-lg transition-colors" title="Delete User">
                           <Trash2 className="w-5 h-5"/>
                        </button>
                     </div>
                  ))}
                  {users.length === 0 && <p className="text-center text-gray-500 py-10">No users found</p>}
               </div>
             </div>

             {/* Posts History Table */}
             <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Urgent Posts History</h2>
                  <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-xs">{posts.length} Total</span>
               </div>
               <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
                  {posts.map(p => {
                     let isExpired = false;
                     if (p.timestamp) {
                        const diffHrs = (Date.now() - p.timestamp.toDate().getTime()) / (1000 * 60 * 60);
                        isExpired = diffHrs >= 24;
                     }
                     return (
                     <div key={p.id} className={`flex justify-between items-center p-4 rounded-xl border transition-colors ${isExpired ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-gray-50 border-red-100'}`}>
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                             <p className="font-semibold text-sm text-gray-900">{p.name || 'Anonymous'}</p>
                             <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isExpired ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                               {isExpired ? 'Expired' : 'Active Live'}
                             </span>
                           </div>
                           <p className="text-xs font-bold text-red-600">Needs {p.bloodGroup} at {p.location}</p>
                           {p.timestamp && <p className="text-[10px] text-gray-400 mt-1">{p.timestamp.toDate().toLocaleString()}</p>}
                        </div>
                        <button onClick={() => deletePost(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Post">
                           <Trash2 className="w-5 h-5"/>
                        </button>
                     </div>
                  )})}
                  {posts.length === 0 && <p className="text-center text-gray-500 py-10">No post history found</p>}
               </div>
             </div>
           </div>
       </div>
     </div>
   );
};

export default AdminPanel;
