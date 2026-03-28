import React from 'react';
import { ArrowLeft, MapPin, Search, Phone, Droplet, UserCircle, Bell, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserGuide = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fffafa] text-gray-900 pb-20 font-sans selection:bg-red-200 selection:text-red-900">
      
      {/* App Bar */}
      <header className="bg-white/80 backdrop-blur-xl shadow-sm shadow-red-100/50 border-b border-red-50 sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 text-gray-500 hover:text-red-600 transition-colors rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">ব্যবহার নির্দেশিকা</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Intro */}
        <div className="text-center mb-8">
           <div className="mx-auto mb-4 flex justify-center">
              <img src="/logo.png" className="h-32 md:h-40 w-auto object-contain mix-blend-multiply" alt="ReDrop Logo" />
           </div>
           <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">ReDrop App</h2>
           <p className="text-sm text-gray-500 leading-relaxed px-4">
             জরুরি মুহূর্তে খুব সহজে এবং দ্রুত রক্তদাতা খুঁজে পাওয়ার সম্পূর্ণ নির্দেশিকা নিচে দেওয়া হলো।
           </p>
        </div>

        {/* Steps */}
        <section className="space-y-4">
          
          <div className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-100 border border-red-50 hover:shadow-md transition-shadow">
             <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                   <UserCircle className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-bold text-gray-900 mb-1 text-base">১. প্রোফাইল সম্পূর্ণ করা</h3>
                   <p className="text-xs text-gray-600 leading-relaxed">
                     অ্যাপের মূল ফিচারগুলো ব্যবহার করতে চাইলে সর্বপ্রথম নিজের প্রোফাইল ঠিক করতে হবে। 
                     উপরে ডানদিকের <span className="font-semibold text-gray-800">Profile আইকনে</span> ক্লিক করে নাম, গ্রুপ এবং লোকেশন আপডেট করুন। লোকেশন (GPS) পারমিশন অবশ্যই 'Allow' বা 'On' রাখতে হবে।
                   </p>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-100 border border-red-50 hover:shadow-md transition-shadow">
             <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                   <Bell className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-bold text-gray-900 mb-1 text-base">২. লাইভ রক্তের রিকোয়েস্ট</h3>
                   <p className="text-xs text-gray-600 leading-relaxed">
                     হোম পেজের উপরের <span className="font-semibold text-gray-800">"Live Feed"</span> অংশে গত ২৪ ঘণ্টার সব রিকোয়েস্ট দেখা যায়। যেকোনো রোগীর সাহায্যে সরাসরি <span className="font-semibold text-gray-800 text-[11px] bg-gray-100 px-1 py-0.5 rounded border border-gray-200">Contact</span> বাটনে ক্লিক করে রোগীর লোকজনের সাথে কথা বলা যাবে।
                   </p>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-100 border border-red-50 hover:shadow-md transition-shadow">
             <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                   <Search className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-bold text-gray-900 mb-1 text-base">৩. নির্দিষ্ট গ্রুপের রক্তদাতা খোঁজা</h3>
                   <p className="text-xs text-gray-600 leading-relaxed">
                     মাঝখানের বাটনগুলো (যেমন: A+, O-) থেকে আপনার প্রয়োজনীয় রক্তের গ্রুপ বাছাই করলেই নিচের লিস্ট এবং ম্যাপ স্বয়ংক্রিয়ভাবে ফিল্টার হয়ে যাবে।
                   </p>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-100 border border-red-50 hover:shadow-md transition-shadow">
             <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                   <MapPin className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-bold text-gray-900 mb-1 text-base">৪. ম্যাপ ও রিয়েল-টাইম দূরত্ব</h3>
                   <p className="text-xs text-gray-600 leading-relaxed">
                     লিস্টের ঠিক ওপরে থাকা দূরত্ব মাপার স্কেল (Radius Filter) টেনে ১-৫০ কিলোমিটারের ডোনার খুঁজুন। ম্যাপে আপনার লোকেশন নীল পিন এবং ডোনারের লোকেশন লাল পিন দিয়ে দেখানো হয়। 
                   </p>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-100 border border-red-50 hover:shadow-md transition-shadow">
             <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                   <Phone className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-bold text-gray-900 mb-1 text-base">৫. ডোনারের সাথে যোগাযোগ</h3>
                   <p className="text-xs text-gray-600 leading-relaxed mb-2">
                     ডোনার লিস্ট থেকে সরাসরি কল (Call) বা হোয়াটস্যাপে (WhatsApp) যোগাযোগ করার সুবিধা রয়েছে। ডোনার স্ট্যাটাস খেয়াল করুন:
                   </p>
                   <div className="space-y-1.5 mt-2">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-gray-700">
                         <div className="w-2 h-2 rounded-full bg-green-500"></div> <span className="text-green-700 font-bold">Available</span> (ব্লাড দিতে প্রস্তুত)
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-gray-700">
                         <div className="w-2 h-2 rounded-full bg-orange-500"></div> <span className="text-orange-700 font-bold">Recovery</span> (৯০ দিন পার হয়নি)
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-gray-700">
                         <div className="w-2 h-2 rounded-full bg-gray-400"></div> <span className="text-gray-600 font-bold">Unavailable</span> (রক্ত দিতে ইচ্ছুক নন)
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm shadow-gray-100 border border-red-50 hover:shadow-md transition-shadow">
             <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                   <Droplet className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-bold text-gray-900 mb-1 text-base">৬. নিজের জন্য রিকোয়েস্ট (Urgent)</h3>
                   <p className="text-xs text-gray-600 leading-relaxed">
                     আপনার নিজের রক্তের প্রয়োজন হলে স্ক্রিনের একদম নিচে ডান দিকে থাকা লাফানো লাল রঙের ড্রপলেট আইকনে ক্লিক করে রিকোয়েস্ট পোস্ট করতে পারবেন।
                   </p>
                </div>
             </div>
          </div>

        </section>

      </main>
    </div>
  );
};

export default UserGuide;
