import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  subLabel?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  required?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  label,
  required
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === value);
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else {
      setSearchTerm('');
    }
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        const selectedOption = options.find(opt => opt.value === value);
        if (selectedOption) {
          setSearchTerm(selectedOption.label);
        } else if (!value) {
            setSearchTerm('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, options]);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.subLabel && option.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (option: Option) => {
    if (option.disabled) return;
    onChange(option.value);
    setSearchTerm(option.label);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    if (value) onChange(''); 
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        
        <input
          type="text"
          className={`w-full border rounded-xl pl-10 pr-10 py-3 text-gray-700 dark:text-white bg-white dark:bg-gray-700 shadow-sm outline-none transition-all duration-200
            ${isOpen 
                ? 'ring-4 ring-blue-500/10 border-blue-500' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}
            ${required && !value && isOpen ? 'border-red-300' : ''}
          `}
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onClick={() => setIsOpen(true)}
          required={required && !value}
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {value && (
                <button type="button" onClick={clearSelection} className="text-gray-300 hover:text-red-400 mr-2 transition-colors">
                    <X size={16} />
                </button>
            )}
            <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-fade-in-down">
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={`px-4 py-3 cursor-pointer flex flex-col border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors
                    ${option.disabled ? 'bg-gray-50 dark:bg-gray-900 opacity-60 cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-gray-700'}
                    ${option.value === value ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${option.value === value ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}>
                        {option.label}
                    </span>
                    {option.disabled && <span className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">Stok Yok</span>}
                  </div>
                  {option.subLabel && (
                    <span className="text-xs text-gray-400 mt-0.5">{option.subLabel}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
              Sonuç bulunamadı.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;