import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, User as UserIcon, Shield, Search, Mail } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../services/supabase';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    try {
        const res = await fetch('/api/users', { 
            headers: { Authorization: `Bearer ${session.access_token}` } 
        });
        if (res.ok) {
            const supabaseUsers = await res.json();
            const formatted = supabaseUsers.map((u: any) => ({
                id: u.id,
                email: u.email,
                username: u.user_metadata?.username || u.email?.split('@')[0] || 'Bilinmeyen',
                role: u.user_metadata?.role || 'user',
                password: '', 
                createdAt: u.created_at
            }));
            setUsers(formatted);
        }
    } catch (err) {
        console.error('Kullanıcılar yüklenirken hata:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if editing username exists
    const existingUser = users.find(u => u.username === formData.username);
    if (existingUser && existingUser.id !== editingId) {
        alert('Bu kullanıcı adı zaten kullanılıyor.');
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const url = editingId ? `/api/users/${editingId}` : '/api/users';
    const method = editingId ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
           method,
           headers: { 
             'Content-Type': 'application/json',
             Authorization: `Bearer ${session.access_token}`
           },
           body: JSON.stringify(formData)
        });
        
        if (res.ok) {
           loadUsers();
           handleCloseModal();
        } else {
           const err = await res.json();
           alert('Hata: ' + (err.error?.message || err.error));
        }
    } catch (err) {
        alert('Bir hata oluştu.');
    }
  };

  const handleEdit = (e: React.MouseEvent, user: User) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(user.id);
    setFormData({
        username: user.username,
        email: user.email || '',
        password: user.password,
        role: user.role
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (id === session.user.id) {
        alert('Kendi hesabınızı silemezsiniz.');
        return;
    }
    
    if (window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      try {
          const res = await fetch(`/api/users/${id}`, {
             method: 'DELETE',
             headers: { Authorization: `Bearer ${session.access_token}` }
          });
          if (res.ok) {
             setUsers(prev => prev.filter(u => u.id !== id));
          } else {
             const err = await res.json();
             alert('Silme hatası: ' + (err.error?.message || err.error));
          }
      } catch (err) {
          alert('Bir hata oluştu.');
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ username: '', email: '', password: '', role: 'user' });
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Kullanıcı Yönetimi</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sisteme erişebilen kullanıcıları yönetin.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <Plus size={20} />
          <span>Kullanıcı Ekle</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center">
            <Search className="text-gray-400 mr-2" size={20}/>
            <input 
                type="text" 
                placeholder="Kullanıcı veya e-posta ara..." 
                className="bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-sm">
              <tr>
                <th className="px-6 py-3">Kullanıcı</th>
                <th className="px-6 py-3">E-posta</th>
                <th className="px-6 py-3">Rol</th>
                <th className="px-6 py-3">Kayıt Tarihi</th>
                <th className="px-6 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{user.username}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                    {user.email || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            <Shield size={12} /> Yönetici
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            <UserIcon size={12} /> Kullanıcı
                        </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                        <button 
                            type="button"
                            onClick={(e) => handleEdit(e, user)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Düzenle"
                        >
                            <Edit2 size={18} className="pointer-events-none" />
                        </button>
                        {user.id !== 'admin' && (
                            <button 
                                type="button"
                                onClick={(e) => handleDelete(e, user.id)} 
                                className="text-red-600 hover:text-red-800 dark:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Sil"
                            >
                                <Trash2 size={18} className="pointer-events-none" />
                            </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {editingId ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <Plus size={24} className="transform rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Kullanıcı Adı</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
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
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl pl-10 pr-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Şifre</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Rol</label>
                 <select
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as 'user' | 'admin'})}
                 >
                     <option value="user">Standart Kullanıcı</option>
                     <option value="admin">Yönetici</option>
                 </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition font-medium"
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  {editingId ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;