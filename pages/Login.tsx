import React, { useState, useEffect } from 'react';
import { loginUser } from '../services/db';
import { supabase } from '../services/supabase';
import { Lock, ArrowRight, AlertCircle, Mail, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: () => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    const savedPassword = localStorage.getItem('remembered_password');
    const savedRememberMe = localStorage.getItem('remember_me');

    if (savedRememberMe === 'true') {
      setRememberMe(true);
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) throw signUpError;
        
        if (data.user) {
          const role = data.user.user_metadata?.role || 'user';
          loginUser({ 
            id: data.user.id, 
            username: email.split('@')[0], 
            email: email, 
            password: '', 
            role: role as 'admin' | 'user', 
            createdAt: new Date().toISOString() 
          });

          if (rememberMe) {
            localStorage.setItem('remember_me', 'true');
            localStorage.setItem('remembered_email', email);
            localStorage.setItem('remembered_password', password);
          } else {
            localStorage.removeItem('remember_me');
            localStorage.removeItem('remembered_email');
            localStorage.removeItem('remembered_password');
          }

          await onLogin();
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) throw signInError;
        
        if (data.user) {
          const role = data.user.user_metadata?.role || 'user';
          loginUser({ 
            id: data.user.id, 
            username: email.split('@')[0], 
            email: email, 
            password: '', 
            role: role as 'admin' | 'user', 
            createdAt: new Date().toISOString() 
          });

          if (rememberMe) {
            localStorage.setItem('remember_me', 'true');
            localStorage.setItem('remembered_email', email);
            localStorage.setItem('remembered_password', password);
          } else {
            localStorage.removeItem('remember_me');
            localStorage.removeItem('remembered_email');
            localStorage.removeItem('remembered_password');
          }

          await onLogin();
        }
      }
    } catch (err: any) {
      if (err.message.includes('Invalid login credentials')) {
        setError('E-posta veya şifre hatalı!');
      } else if (err.message.includes('User already registered')) {
        setError('Bu e-posta adresi zaten kayıtlı!');
      } else {
        setError(err.message || 'Bir hata oluştu!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">STOKrates</h1>
            <p className="text-blue-100">Cari ve Stok Takip Sistemi</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {isRegister ? 'Yeni Hesap Oluştur' : 'Giriş Yap'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {isRegister ? 'Sistemi kullanmaya başlamak için kayıt olun.' : 'Devam etmek için giriş yapınız.'}
              </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg text-center flex items-center justify-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Mail size={20} />
              </div>
              <input
                type="email"
                required
                placeholder="E-posta Adresi"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Şifre"
                minLength={6}
                className="w-full pl-10 pr-12 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-500 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 transition-colors"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">Beni Hatırla</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/30"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Kayıt Ol' : 'Giriş Yap'}</span>
                {isRegister ? <UserPlus size={20} /> : <ArrowRight size={20} />}
              </>
            )}
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              {isRegister ? (
                <><LogIn size={14} /> Zaten hesabınız var mı? Giriş yapın</>
              ) : (
                <><UserPlus size={14} /> Hesabınız yok mu? Kayıt olun</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;