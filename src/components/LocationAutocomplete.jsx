import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';

const LocationAutocomplete = ({ value = '', onLocationSelect, placeholder = 'Search location (e.g., Dhaka Medical College)' }) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query if external value changes (like when loading profile)
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!query || query.length < 3 || query === value) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Query OpenStreetMap restricted to Bangladesh (bd)
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10&countrycodes=bd`, {
           headers: {
              'Accept': 'application/json',
              // Nominatim requires a user-agent to avoid blocking
              'User-Agent': 'BloodlinkApp/1.0 (bd.redrop)'
           }
        });
        const data = await response.json();
        setResults(data);
        setShowDropdown(true);
      } catch (error) {
        console.error("Autocomplete error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchLocations, 600); // 600ms debounce
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSelect = (item) => {
    const addressName = item.display_name;
    const coordinates = [parseFloat(item.lat), parseFloat(item.lon)];
    
    setQuery(addressName);
    setShowDropdown(false);
    
    if (onLocationSelect) {
      onLocationSelect(addressName, coordinates);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-red-500 transition-all overflow-hidden">
        <div className="pl-4 pr-2 py-3 text-gray-400">
          {loading ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : <MapPin className="w-5 h-5" />}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
             const val = e.target.value;
             setQuery(val);
             // Guarantee that manual text is passed to parent, but with null coordinates
             if (onLocationSelect) {
                 onLocationSelect(val, null);
             }
          }}
          onFocus={() => { if(results.length > 0) setShowDropdown(true); }}
          placeholder={placeholder}
          className="w-full pr-4 py-3 bg-transparent text-gray-900 outline-none placeholder:text-gray-400 font-medium"
          required
          autoComplete="off"
        />
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl shadow-red-200/40 border border-gray-100 max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {results.map((item) => {
             // Beautify the address string
             const parts = item.display_name.split(',');
             const mainTitle = parts[0];
             const subtitle = parts.slice(1).join(',').trim();

             return (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-red-50 focus:bg-red-50 border-b border-gray-50 last:border-0 transition-colors flex items-start gap-3 group"
              >
                <Search className="w-4 h-4 text-gray-400 mt-1 shrink-0 group-hover:text-red-500 transition-colors" />
                <div className="truncate w-full pr-2">
                  <p className="text-sm font-bold text-gray-900 truncate">{mainTitle}</p>
                  {subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>}
                </div>
              </button>
             )
          })}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
