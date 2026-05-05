
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, CheckSquare, Square, Clock, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { Todo } from '../types';
import { deleteTodo, generateId, getTodos, saveTodo } from '../services/db';

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Form State
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = () => {
    setTodos(getTodos());
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === todos.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(todos.map(t => t.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`${selectedIds.size} adet görevi silmek istediğinize emin misiniz?`)) {
        selectedIds.forEach(id => deleteTodo(id));
        setTodos(prev => prev.filter(t => !selectedIds.has(t.id)));
        setSelectedIds(new Set());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTodo: Todo = {
      id: generateId(),
      content,
      priority,
      estimatedDuration: duration,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      startDate: startDate || undefined,
      endDate: endDate || undefined
    };
    saveTodo(newTodo);
    loadTodos();
    handleCloseModal();
  };

  const toggleComplete = (todo: Todo) => {
    const updatedTodo = { ...todo, isCompleted: !todo.isCompleted };
    saveTodo(updatedTodo);
    loadTodos();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu görevi silmek istediğinize emin misiniz?')) {
      deleteTodo(id);
      if (selectedIds.has(id)) {
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      }
      loadTodos();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setContent('');
    setPriority('medium');
    setDuration('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
  };

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
    }
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getPriorityBadge = (p: string) => {
      switch(p) {
          case 'high': return <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs px-2 py-0.5 rounded font-bold">Yüksek</span>;
          case 'medium': return <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs px-2 py-0.5 rounded font-bold">Orta</span>;
          case 'low': return <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-0.5 rounded font-bold">Düşük</span>;
          default: return null;
      }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <CheckSquare className="text-blue-600" />
                Yapılacaklar Listesi
            </h1>
            {selectedIds.size > 0 && <p className="text-sm font-medium text-blue-600 animate-pulse">{selectedIds.size} görev seçildi</p>}
        </div>
        <div className="flex gap-2">
            {selectedIds.size > 0 && (
                <button 
                    onClick={handleDeleteSelected}
                    className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-bold text-sm"
                >
                    <Trash2 size={18} />
                    <span>Seçilenleri Sil</span>
                </button>
            )}
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
            >
                <Plus size={20} />
                <span>Yeni Görev</span>
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
         <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <button onClick={handleSelectAll} className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">
                {selectedIds.size === todos.length && todos.length > 0 ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                Tümünü Seç
            </button>
            <span className="text-xs text-gray-500">{todos.length} Görev Mevcut</span>
         </div>
         {sortedTodos.length > 0 ? (
             <div className="divide-y divide-gray-100 dark:divide-gray-700">
                 {sortedTodos.map(todo => (
                     <div key={todo.id} className={`p-4 flex items-center justify-between group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${todo.isCompleted ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''} ${selectedIds.has(todo.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                         <div className="flex items-start gap-4 flex-1">
                             <div className="flex items-center h-full pt-1">
                                 <button onClick={() => handleToggleSelect(todo.id)} className="text-gray-300 hover:text-blue-500 mr-1">
                                    {selectedIds.has(todo.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20}/>}
                                 </button>
                                 <button 
                                    onClick={() => toggleComplete(todo)}
                                    className={`transition-colors ${todo.isCompleted ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'}`}
                                 >
                                     {todo.isCompleted ? <CheckCircle size={24} /> : <Square size={24} />}
                                 </button>
                             </div>
                             <div className={todo.isCompleted ? 'opacity-50' : ''}>
                                 <p className={`font-medium text-lg ${todo.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800 dark:text-white'}`}>
                                     {todo.content}
                                 </p>
                                 <div className="flex flex-wrap items-center gap-3 mt-1">
                                     {getPriorityBadge(todo.priority)}
                                     {todo.estimatedDuration && (
                                         <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                             <Clock size={12} className="mr-1" />
                                             {todo.estimatedDuration}
                                         </span>
                                     )}
                                     {(todo.startDate || todo.endDate) && (
                                         <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                             <Calendar size={12} />
                                             {todo.startDate ? new Date(todo.startDate).toLocaleDateString('tr-TR') : '?'}
                                             <span>-</span>
                                             {todo.endDate ? new Date(todo.endDate).toLocaleDateString('tr-TR') : 'Açık'}
                                         </div>
                                     )}
                                 </div>
                             </div>
                         </div>
                         <button 
                            onClick={() => handleDelete(todo.id)}
                            className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                             <Trash2 size={18} />
                         </button>
                     </div>
                 ))}
             </div>
         ) : (
             <div className="p-10 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                 <CheckCircle size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
                 <p className="text-lg font-medium">Listeniz boş!</p>
                 <p className="text-sm">Yeni bir görev ekleyerek başlayın.</p>
             </div>
         )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Yeni Görev Ekle</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Yapılacak İş</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Müşterileri ara..."
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Başlangıç Tarihi</label>
                    <input
                        type="date"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-blue-500/10 outline-none"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Bitiş Tarihi</label>
                    <input
                        type="date"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-blue-500/10 outline-none"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Öncelik</label>
                    <select
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                    >
                        <option value="high">Yüksek (Acil)</option>
                        <option value="medium">Orta</option>
                        <option value="low">Düşük</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Tahmini Süre</label>
                    <input
                        type="text"
                        placeholder="Örn: 30 dk, 2 saat"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-700 dark:text-white bg-white dark:bg-gray-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                    />
                  </div>
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
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoList;
