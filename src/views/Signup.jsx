import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Droplet, User, Phone, MapPin, Calendar, Lock } from 'lucide-react';
import Button from '../components/Button';
import LocationAutocomplete from '../components/LocationAutocomplete';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    bloodGroup: '',
    lastDonation: '',
    password: '',
    profileCoordinates: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && localStorage.getItem('userProfile')) {
        router.push('/home');
      } else if (!user) {
        localStorage.removeItem('userProfile');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name || !formData.phone || !formData.address || !formData.bloodGroup || !formData.password) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    try {
      // Formats exactly 10 digits
      const cleanPhone = String(formData.phone || '').replace(/\D/g, '').replace(/^(?:88)?0?/, '');
      if (cleanPhone.length !== 10) {
        setError("Phone number must be exactly 10 digits (e.g. 1712345678)");
        setLoading(false);
        return;
      }
      
      const dummyEmail = `0${cleanPhone}@bloodlink.app`;
      formData.phone = `+880${cleanPhone}`; // Save strictly +880 format to Firestore
      const userCredential = await createUserWithEmailAndPassword(auth, dummyEmail, formData.password);
      const user = userCredential.user;

      // Determine eligibility
      let isAvailable = true;
      if (formData.lastDonation) {
          const diffTime = new Date() - new Date(formData.lastDonation);
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          if (diffDays <= 90) isAvailable = false;
      }

      const profileData = {
          uid: user.uid,
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          group: formData.bloodGroup,
          lastDonation: formData.lastDonation || '',
          isAvailable: isAvailable,
          coordinates: [],
          profileCoordinates: formData.profileCoordinates
      };

      // Save to Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, profileData);

      // Save to localStorage
      localStorage.setItem('userProfile', JSON.stringify(profileData));
      router.push('/home');

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
          setError("This Phone Number is already registered!");
      } else if (err.code === 'auth/weak-password') {
          setError("Password must be at least 6 characters.");
      } else {
          setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-6 bg-gradient-to-br from-red-50 to-white">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-6 border border-red-100 relative">
        
        {/* Header Section */}
        <div className="text-center space-y-2 flex flex-col items-center mb-6">
          <div className="relative w-full h-24 flex justify-center items-center overflow-visible mb-2">
             <img src="/logo.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-auto object-contain drop-shadow-sm mix-blend-multiply" alt="ReDrop Logo" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight z-10 relative">Create Account</h2>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        {/* Form Section */}
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                name="name" 
                placeholder="Full Name *"
                value={formData.name} 
                onChange={handleChange} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm" 
              />
            </div>
          </div>

          <div>
            <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-red-500 transition-all overflow-hidden text-sm">
               <div className="pl-4 pr-3 py-2.5 bg-gray-100 text-gray-600 font-bold border-r border-gray-200 flex items-center justify-center shrink-0">
                 +880
               </div>
               <input 
                  type="tel" 
                  name="phone" 
                  placeholder="1XXXXXXXXX (10 digits)"
                  value={formData.phone} 
                  onChange={(e) => {
                     const val = e.target.value.replace(/\D/g, '');
                     if (val.length <= 10) handleChange({ target: { name: 'phone', value: val } });
                  }} 
                  className="w-full pl-3 pr-4 py-2.5 bg-transparent text-gray-900 outline-none font-semibold tracking-wide" 
                  required
               />
            </div>
          </div>

          <div>
             <LocationAutocomplete 
                value={formData.address}
                onLocationSelect={(addr, coords) => {
                   setFormData(prev => ({ 
                      ...prev, 
                      address: addr, 
                      profileCoordinates: coords || [] 
                   }));
                }}
                placeholder="Full Home Address (Search & Select) *"
             />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="relative">
                <select 
                   name="bloodGroup" 
                   value={formData.bloodGroup} 
                   onChange={handleChange} className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none text-sm" 
                >
                   <option value="" disabled>Blood Group *</option>
                   {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                   ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
             </div>

             <div className="relative">
               <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                  type="text" 
                  name="lastDonation" 
                  placeholder="Last Donation Date"
                  onFocus={(e) => e.target.type = 'date'}
                  onBlur={(e) => { if(!e.target.value) e.target.type = 'text' }}
                  value={formData.lastDonation} 
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-xs sm:text-sm" 
               />
             </div>
          </div>

          <div>
             <div className="relative">
               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                  type="password" 
                  name="password" 
                  placeholder="Password *"
                  value={formData.password} 
                  onChange={handleChange} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm" 
               />
             </div>
          </div>

          <div className="pt-2">
            <Button 
               type="submit" 
               fullWidth 
               variant="primary" className="py-3 shadow-lg shadow-red-200 bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2"
               disabled={loading}
            >
               {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </div>
        </form>

        <p className="text-sm text-center text-gray-500 mt-4 leading-relaxed">
          Already have an account?{' '}
          <Link href="/" className="text-red-600 font-semibold hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
