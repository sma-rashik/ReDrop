import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Droplet, Phone, Lock } from 'lucide-react';
import Button from '../components/Button';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Login = () => {
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('userProfile')) {
      navigate('/home');
    }
  }, [navigate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.phone || !formData.password) {
      setError("Please enter both phone and password.");
      setLoading(false);
      return;
    }

    try {
      // Use our dummy email strategy
      const dummyEmail = `${formData.phone}@bloodlink.app`;
      const userCredential = await signInWithEmailAndPassword(auth, dummyEmail, formData.password);
      const user = userCredential.user;

      // Fetch Profile Data
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profileData = { uid: user.uid, ...docSnap.data() };
        localStorage.setItem('userProfile', JSON.stringify(profileData));
        navigate('/home');
      } else {
        setError("User profile data not found.");
      }

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError("Invalid phone number or password.");
      } else {
          setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-6 bg-gradient-to-br from-red-50 to-white">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 space-y-8 border border-red-100 relative">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Droplet className="text-red-600 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ReDrop</h1>
          <p className="text-gray-500 text-sm">Every drop counts. Save a life today.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        {/* Action Section */}
        <form onSubmit={onLogin} className="pt-2 space-y-4">
          <div>
            <div className="relative">
               <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                  type="tel" 
                  name="phone" 
                  placeholder="Phone Number"
                  value={formData.phone} 
                  onChange={handleChange} className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm" 
               />
            </div>
          </div>
          <div>
            <div className="relative">
               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                  type="password" 
                  name="password" 
                  placeholder="Password"
                  value={formData.password} 
                  onChange={handleChange} className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm" 
               />
            </div>
            <div className="flex justify-end mt-2">
               <a 
                 href="https://wa.me/8801994412000?text=Hi%20Admin,%20I%20have%20forgotten%20my%20ReDrop%20password.%20My%20registered%20phone%20number%20is%20" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="text-xs text-red-600 font-semibold hover:underline"
               >
                 Forgot Password?
               </a>
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit"
              fullWidth 
              variant="primary" className="py-4 text-lg shadow-red-200 bg-red-600 text-white hover:bg-red-700 transition-all font-semibold flex items-center justify-center gap-2" 
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </Button>
          </div>
        </form>

        <div className="text-center text-sm text-gray-500 mt-6 leading-relaxed">
          Don't have an account?{' '}
          <Link to="/signup" className="text-red-600 font-semibold hover:underline">
            Register here
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;
