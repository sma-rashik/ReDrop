import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Droplet, User, Phone, MapPin, Calendar, Lock } from 'lucide-react';
import Button from '../components/Button';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    bloodGroup: '',
    lastDonation: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
      // Create user in Firebase Auth using a dummy email format based on phone
      const dummyEmail = `${formData.phone}@bloodlink.app`;
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
          coordinates: []
      };

      // Save to Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, profileData);

      // Save to localStorage
      localStorage.setItem('userProfile', JSON.stringify(profileData));
      navigate('/home');

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
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
            <Droplet className="text-red-600 w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create Account</h1>
          <p className="text-gray-500 text-sm">Join BloodLink and start saving lives.</p>
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
            <div className="relative">
               <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                  type="tel" 
                  name="phone" 
                  placeholder="Phone Number *"
                  value={formData.phone} 
                  onChange={handleChange} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm" 
               />
            </div>
          </div>

          <div>
             <div className="relative">
               <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                  type="text" 
                  name="address" 
                  placeholder="Full Address *"
                  value={formData.address} 
                  onChange={handleChange} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm" 
               />
             </div>
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
                  type="date" 
                  name="lastDonation" 
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
          <Link to="/" className="text-red-600 font-semibold hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
