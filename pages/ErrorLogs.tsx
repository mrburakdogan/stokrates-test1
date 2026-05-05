import React, { useEffect, useState } from 'react';
import { AlertCircle, Trash2, RefreshCw, XCircle, Info, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { SystemLog } from '../types';
import { getSystemLogs, clearSystemLogs } from '../services/db';

const ErrorLogs: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setLogs(getSystemLogs());
  };

  const handleClearLogs = () => {
    if (window.confirm('Tüm sistem kayıtlarını silmek istediğinize emin misiniz?')) {
        clearSystemLogs();
        loadLogs();
    }
  };

  const getIcon = (type: string) => {
      switch (type) {
          case 'error': return <XCircle className="text-red-500" size={20} />;
          case 'warning': return <AlertTriangle className="text-yellow-500" size={20} />;
          case 'success': return <CheckCircle className="text-green-500" size={20} />;
          default: return <Info className="text-blue-500" size={20} />;
      }
  };

  const getRowClass = (type: string) => {
      switch (type) {
          case 'error': return 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500';
          case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-500';
          case 'success': return 'bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500';
          default: return 'bg-white dark:bg-gray-800 border-l-4 border-blue-500';
      }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <ShieldAlert className="text-red-600" />
                Hata Kayıtları ve Sistem Günlükleri
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Entegrasyon hatalarını ve sistem olaylarını buradan takip edebilirsiniz.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={loadLogs}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
                <RefreshCw size={18} /> Yenile
            </button>
            <button 
                onClick={handleClearLogs}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-red-200 dark:shadow-none"
            >
                <Trash2 size={18} /> Kayıtları Temizle
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {logs.length > 0 ? (
            <div className="flex flex-col">
                {logs.map((log) => (
                    <div key={log.id} className={`p-4 border-b border-gray-100 dark:border-gray-700 transition-colors ${getRowClass(log.type)}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                {getIcon(log.type)}
                                <span className="font-bold text-gray-800 dark:text-white">{log.title}</span>
                                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                    {log.source}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">
                                {new Date(log.date).toLocaleString('tr-TR')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 ml-7 mb-2">
                            {log.message}
                        </p>
                        {log.stackTrace && (
                            <div className="ml-7 mt-2">
                                <details className="group">
                                    <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline list-none flex items-center gap-1">
                                        <Info size={12} /> Teknik Detayları Göster
                                    </summary>
                                    <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto font-mono border border-gray-700 shadow-inner">
                                        {log.stackTrace}
                                    </pre>
                                </details>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                <CheckCircle size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
                <p className="text-lg font-medium">Sistem kaydı bulunamadı.</p>
                <p className="text-sm">Herhangi bir hata veya işlem gerçekleştiğinde burada listelenecektir.</p>
            </div>
        )}
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-bold mb-1">Entegrasyon Bilgisi</p>
                <p>
                    Trendyol API entegrasyonu test edilirken "Network Error" veya "CORS" hataları almanız normaldir. 
                    Tarayıcı güvenlik politikaları gereği, istemci (Frontend) üzerinden doğrudan Trendyol API'sine istek atılması engellenebilir. 
                    Bu durumda alınan hatalar yukarıdaki listeye düşecektir.
                </p>
            </div>
      </div>
    </div>
  );
};

export default ErrorLogs;