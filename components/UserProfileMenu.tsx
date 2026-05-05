import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, LogOut, Settings, ChevronDown, X, Save, Lock, AlertCircle, Mail, Database } from 'lucide-react';
import { User } from '../types';
import { getUsers } from '../services/db';
import { Link } from 'react-router-dom';

interface UserProfileMenuProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  onLogout: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ user, onUpdate, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="flex items-center gap-2 md:gap-3 p-1.5 md:pl-3 md:pr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span className="hidden md:block font-medium text-sm text-gray-700 dark:text-gray-200">
            {user.username}
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-fade-in-down">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{user.email}</p>
            </div>
            <div className="p-1">
              <button 
                onClick={() => { setIsModalOpen(true); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
              >
                <UserIcon size={16} />
                Profil Düzenle
              </button>
              
              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
              >
                 <Settings size={16} />
                 Sistem Ayarları & Yedek
              </Link>

              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
              >
                <LogOut size={16} />
                Çıkış Yap
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isModalOpen && (
        <EditProfileModal 
          user={user} 
          onClose={() => setIsModalOpen(false)} 
          onSave={onUpdate} 
        />
      )}
    </>
  );
};

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSave }) => {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState(''); // Default empty
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
        setError('Kullanıcı adı boş olamaz.');
        return;
    }

    if (!email.trim()) {
        setError('E-posta adresi boş olamaz.');
        return;
    }

    // Check uniqueness (exclude self)
    const existingUsers = getUsers();
    const isTaken = existingUsers.some(u => u.username === username && u.id !== user.id);
    
    if (isTaken) {
        setError('Bu kullanıcı adı başka biri tarafından kullanılıyor.');
        return;
    }

    const updatedUser: User = {
        ...user,
        username: username,
        email: email,
        // Update password only if user typed something, otherwise keep existing
        password: password ? password : user.password
    };

    onSave(updatedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <UserIcon size={20} className="text-gray-500" />
            Profili Düzenle
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
             <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg flex items-start gap-2">
                 <AlertCircle size={18} className="shrink-0 mt-0.5" />
                 <span>{error}</span>
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Kullanıcı Adı</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">E-posta Adresi</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="ornek@email.com"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                Yeni Şifre <span className="text-xs font-normal text-gray-400 ml-1">(Değiştirmek istemiyorsanız boş bırakın)</span>
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={18} />
                </div>
                <input
                  type="text" 
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  placeholder="Mevcut şifreyi koru"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition font-medium"
            >
              İptal
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2"
            >
              <Save size={18} />
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};