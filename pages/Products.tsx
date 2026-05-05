import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Edit2, Search, ArrowUpDown, X, Download, Upload, Package, FileText, Image as ImageIcon, History, Barcode, Tag, Truck, Info, Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlertCircle, AlignLeft, AlignCenter, AlignRight, AlignJustify, Heading1, Heading2, Link as LinkIcon, Undo, Redo, Eye, Globe, Clock, User, ArrowRight, Activity, Loader, CheckSquare, Square } from 'lucide-react';
import { Product, ProductImage } from '../types';
import { deleteProduct, generateId, getProducts, saveProduct, saveSystemLog } from '../services/db';
import { exportToExcel, importFromExcel } from '../services/excel';
import { fetchTrendyolProducts } from '../services/trendyol';

type SortKey = 'name' | 'category' | 'stock' | 'cost' | 'price';
type TabType = 'general' | 'description' | 'images' | 'history';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncingTrendyol, setIsSyncingTrendyol] = useState(false);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Rich Text Editor Ref
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    brand: '',
    category: '',
    stock: '',
    soldCount: '0',
    desi: '',
    price: '',
    marketPrice: '',
    minSalePrice: '',
    cost: '',
    vatRate: '20',
    description: '',
    images: [] as ProductImage[],
    history: [] as any[]
  });

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
      if (activeTab === 'description' && editorRef.current) {
          editorRef.current.innerHTML = formData.description;
      }
  }, [activeTab, isModalOpen]);

  const loadProducts = () => {
    const data = getProducts();
    setProducts(data);
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`${selectedIds.size} adet ürünü silmek istediğinize emin misiniz?`)) {
        selectedIds.forEach(id => deleteProduct(id));
        setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.name.length > 100) {
        alert("Ürün adı 100 karakterden uzun olamaz. Lütfen kısaltınız.");
        return;
    }

    const newProduct: Product = {
      id: editingId || generateId(),
      code: formData.code,
      barcode: formData.barcode,
      name: formData.name,
      brand: formData.brand,
      category: formData.category,
      stock: parseInt(formData.stock) || 0,
      soldCount: parseInt(formData.soldCount) || 0,
      desi: parseFloat(formData.desi) || 0,
      price: parseFloat(formData.price) || 0,
      marketPrice: parseFloat(formData.marketPrice) || 0,
      minSalePrice: parseFloat(formData.minSalePrice) || 0,
      cost: parseFloat(formData.cost) || 0,
      vatRate: parseInt(formData.vatRate) || 20,
      description: formData.description,
      images: formData.images,
      history: formData.history
    };

    saveProduct(newProduct);
    loadProducts();
    handleCloseModal();
  };

  const handleEdit = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(product.id);
    setActiveTab('general');
    setFormData({
      code: product.code || '',
      barcode: product.barcode || '',
      name: product.name,
      brand: product.brand || '',
      category: product.category,
      stock: product.stock.toString(),
      soldCount: (product.soldCount || 0).toString(),
      desi: (product.desi || 0).toString(),
      price: product.price.toString(),
      marketPrice: (product.marketPrice || 0).toString(),
      minSalePrice: (product.minSalePrice || 0).toString(),
      cost: (product.cost || 0).toString(),
      vatRate: (product.vatRate || 20).toString(),
      description: product.description || '',
      images: product.images || [],
      history: product.history || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    if (window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      deleteProduct(id);
      setProducts(currentProducts => currentProducts.filter(p => p.id !== id));
      if (selectedIds.has(id)) {
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      }
    }
  };

  const handleInlineChange = (id: string, field: 'stock' | 'price', value: string) => {
      const numValue = parseFloat(value);
      setProducts(prev => prev.map(p => {
          if (p.id === id) {
              return { ...p, [field]: isNaN(numValue) ? 0 : numValue };
          }
          return p;
      }));
  };

  const handleInlineSave = (product: Product) => {
      saveProduct(product);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setActiveTab('general');
    setFormData({
      code: '', barcode: '', name: '', brand: '', category: '',
      stock: '', soldCount: '0', desi: '',
      price: '', marketPrice: '', minSalePrice: '', cost: '', vatRate: '20',
      description: '', images: [], history: []
    });
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (editorRef.current) {
          setFormData({ ...formData, description: editorRef.current.innerHTML });
          editorRef.current.focus();
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (!formData.name) {
          alert("Lütfen resim eklemeden önce 'Genel' sekmesinden Ürün Adını giriniz. SEO isimlendirmesi için gereklidir.");
          return;
      }

      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

      Array.from(files).forEach((file: File, index) => {
          const reader = new FileReader();
          reader.onload = (readerEvent) => {
              const base64 = readerEvent.target?.result as string;
              const currentIndex = formData.images.length + index + 1;
              const extension = file.type.split('/')[1] || 'jpg';
              const seoFileName = `${slug}-${currentIndex}.${extension}`;

              const newImage: ProductImage = {
                  id: generateId(),
                  data: base64,
                  fileName: seoFileName,
                  type: file.type
              };

              setFormData(prev => ({
                  ...prev,
                  images: [...prev.images, newImage]
              }));
          };
          reader.readAsDataURL(file);
      });
      if (imageUploadRef.current) imageUploadRef.current.value = '';
  };

  const handleRemoveImage = (imageId: string) => {
      setFormData(prev => ({
          ...prev,
          images: prev.images.filter(img => img.id !== imageId)
      }));
  };

  const getFieldLabel = (field: string) => {
      const labels: Record<string, string> = {
          name: 'Ürün Adı', stock: 'Stok', price: 'Satış Fiyatı', cost: 'Maliyet',
          marketPrice: 'Piyasa Fiyatı', code: 'Ürün Kodu', category: 'Kategori',
          desi: 'Desi', images: 'Resimler', Genel: 'Genel Durum'
      };
      return labels[field] || field;
  };

  const handleSort = (key: SortKey) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const handleExport = () => {
    const exportData = products.map(p => ({
        "Ürün Kodu": p.code, "Barkod": p.barcode, "Marka": p.brand,
        "Ürün Adı": p.name, "Kategori": p.category, "Stok": p.stock,
        "Satılan": p.soldCount, "Desi": p.desi, "Maliyet": p.cost,
        "Satış Fiyatı": p.price, "Piyasa Fiyatı": p.marketPrice,
        "Min Satış Fiyatı": p.minSalePrice, "KDV": p.vatRate,
        "Açıklama": p.description, "Resim Sayısı": p.images?.length || 0
    }));
    exportToExcel(exportData, "urun_listesi_detayli");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const urlToBase64 = async (url: string): Promise<string> => {
      try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
          });
      } catch (error) {
          console.error("Error fetching image:", url, error);
          return "";
      }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
          const data = await importFromExcel(file);
          let count = 0;
          await Promise.all(data.map(async (row: any) => {
             const name = row["Ürün Adı"] || row["name"] || row["Name"];
             const price = row["Satış Fiyatı"] || row["price"] || row["Price"];
             if (name) {
                 const newId = generateId();
                 let productImages: ProductImage[] = [];
                 const imageUrls = row["Resim URL"] || row["Image URL"] || row["gorsel_link"];
                 if (imageUrls && productImages.length === 0) {
                     const links = String(imageUrls).split(',').map(s => s.trim());
                     for (let i = 0; i < links.length; i++) {
                         const link = links[i];
                         if (link) {
                             const base64 = await urlToBase64(link);
                             if (base64) {
                                 const slug = String(name).toLowerCase().replace(/[^a-z0-9]/g, '-');
                                 productImages.push({
                                     id: generateId(),
                                     data: base64,
                                     fileName: `${slug}-${i+1}.jpg`,
                                     type: 'image/jpeg'
                                 });
                             }
                         }
                     }
                 }
                 saveProduct({
                     id: newId,
                     code: String(row["Ürün Kodu"] || row["code"] || ""),
                     barcode: String(row["Barkod"] || row["barcode"] || ""),
                     brand: String(row["Marka"] || row["brand"] || ""),
                     name: String(name),
                     category: String(row["Kategori"] || row["category"] || "Genel"),
                     stock: parseInt(row["Stok"] || row["stock"]) || 0,
                     soldCount: parseInt(row["Satılan"] || row["soldCount"]) || 0,
                     desi: parseFloat(row["Desi"] || row["desi"]) || 0,
                     cost: parseFloat(row["Maliyet"] || row["cost"]) || 0,
                     price: parseFloat(price) || 0,
                     marketPrice: parseFloat(row["Piyasa Fiyatı"] || row["marketPrice"]) || 0,
                     minSalePrice: parseFloat(row["Min Satış Fiyatı"] || row["minSalePrice"]) || 0,
                     vatRate: parseInt(row["KDV"] || row["vatRate"]) || 20,
                     description: row["Açıklama"] || row["description"] || "",
                     images: productImages
                 });
                 count++;
             }
          }));
          alert(`${count} ürün başarıyla içe aktarıldı.`);
          loadProducts();
      } catch (err) {
          alert('Excel okuma hatası.');
          console.error(err);
      } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleSyncTrendyolProducts = async () => {
    setIsSyncingTrendyol(true);
    try {
        const result = await fetchTrendyolProducts();
        if (result.success && result.data?.content) {
            const trendyolProducts = result.data.content;
            let count = 0;
            const currentProducts = getProducts();

            for (const tp of trendyolProducts) {
                // Mevcut ürünü barkod veya koda göre bul
                let existing = currentProducts.find(p => p.barcode === tp.barcode || p.code === tp.productCode);
                
                const productImages: ProductImage[] = [];
                if (tp.images && tp.images.length > 0) {
                    for (let i = 0; i < tp.images.length; i++) {
                        const img = tp.images[i];
                        const base64 = await urlToBase64(img.url);
                        if (base64) {
                            productImages.push({
                                id: generateId(),
                                data: base64,
                                fileName: `${tp.productCode || 'tp'}-${i+1}.jpg`,
                                type: 'image/jpeg'
                            });
                        }
                    }
                }

                const productData: Product = {
                    id: existing?.id || generateId(),
                    code: tp.productCode || tp.barcode,
                    barcode: tp.barcode,
                    name: tp.title,
                    brand: tp.brand?.name || '',
                    category: tp.categoryName || 'Trendyol',
                    stock: tp.quantity || 0,
                    soldCount: existing?.soldCount || 0,
                    desi: tp.desi || 0,
                    price: tp.salePrice || 0,
                    marketPrice: tp.listPrice || 0,
                    minSalePrice: existing?.minSalePrice || 0,
                    cost: existing?.cost || 0,
                    vatRate: tp.vatRate || 20,
                    description: existing?.description || '',
                    images: productImages.length > 0 ? productImages : (existing?.images || []),
                    history: existing?.history || []
                };

                saveProduct(productData);
                count++;
            }
            alert(`${count} ürün Trendyol'dan başarıyla çekildi/güncellendi.`);
            loadProducts();
        } else {
            alert(result.message || 'Ürünler çekilemedi.');
        }
    } catch (err: any) {
        alert('Trendyol senkronizasyon hatası: ' + err.message);
    } finally {
        setIsSyncingTrendyol(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
  });

  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: SortKey }) => (
      <th 
        className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none group"
        onClick={() => handleSort(sortKey)}
      >
          <div className="flex items-center gap-1">
              {label}
              <ArrowUpDown size={14} className={`text-gray-400 ${sortConfig.key === sortKey ? 'text-blue-500' : 'opacity-0 group-hover:opacity-100'}`} />
          </div>
      </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Ürün Yönetimi</h1>
            {selectedIds.size > 0 && (
                <p className="text-sm font-medium text-blue-600 animate-pulse">{selectedIds.size} ürün seçildi</p>
            )}
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
                onClick={handleSyncTrendyolProducts} 
                disabled={isSyncingTrendyol}
                className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm disabled:opacity-70 disabled:cursor-wait"
            >
              {isSyncingTrendyol ? <Loader size={18} className="animate-spin"/> : <Globe size={18} />}
              <span className="hidden md:inline">Trendyol'dan Çek</span>
            </button>
            <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm">
              <Download size={18} /> <span className="hidden md:inline">Excel Export</span>
            </button>
            <button 
                onClick={handleImportClick} 
                disabled={isImporting}
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm disabled:opacity-70 disabled:cursor-wait"
            >
              {isImporting ? <Clock size={18} className="animate-spin"/> : <Upload size={18} />}
              <span className="hidden md:inline">Excel Import</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />

            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-blue-200 dark:shadow-none ml-auto sm:ml-0">
              <Plus size={20} /> <span className="hidden sm:inline">Yeni Ürün</span>
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center">
            <Search className="text-gray-400 mr-2" size={20}/>
            <input 
                type="text" 
                placeholder="Ürün adı, kodu veya kategori ara..." 
                className="bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-sm">
              <tr>
                <th className="w-10 pl-6 pr-0 py-3">
                    <button onClick={handleSelectAll} className="p-1 rounded hover:bg-gray-200 transition-colors">
                        {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                    </button>
                </th>
                <th className="w-16 px-6 py-3">Resim</th>
                <SortableHeader label="Ürün Adı" sortKey="name" />
                <SortableHeader label="Kategori" sortKey="category" />
                <SortableHeader label="Stok (Düzenle)" sortKey="stock" />
                <SortableHeader label="Maliyet" sortKey="cost" />
                <SortableHeader label="Satış Fiyatı (Düzenle)" sortKey="price" />
                <th className="px-6 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedProducts.length > 0 ? (
                sortedProducts.map((product) => (
                  <tr key={product.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 group ${selectedIds.has(product.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="w-10 pl-6 pr-0 py-4">
                        <button onClick={() => handleToggleSelect(product.id)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                            {selectedIds.has(product.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                        </button>
                    </td>
                    <td className="px-6 py-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                            {product.images && product.images.length > 0 ? (
                                <img src={product.images[0].data} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon size={18} className="text-gray-400" />
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{product.name}</div>
                        {product.code && <div className="text-xs text-gray-400 font-mono">{product.code}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                            {product.category}
                        </span>
                        {product.brand && <div className="text-xs text-gray-400 mt-1">{product.brand}</div>}
                    </td>
                    <td className="px-6 py-4">
                        <input 
                            type="number"
                            value={product.stock}
                            onChange={(e) => handleInlineChange(product.id, 'stock', e.target.value)}
                            onBlur={() => handleInlineSave(product)}
                            className={`w-20 px-2 py-1 text-sm rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-transparent transition-all font-medium ${product.stock < 5 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}
                        />
                        <span className="text-xs text-gray-400 ml-1">Adet</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">₺{(product.cost || 0).toLocaleString('tr-TR')}</td>
                    <td className="px-6 py-4">
                        <div className="flex items-center">
                            <span className="text-gray-400 mr-1">₺</span>
                            <input 
                                type="number"
                                step="0.01"
                                value={product.price}
                                onChange={(e) => handleInlineChange(product.id, 'price', e.target.value)}
                                onBlur={() => handleInlineSave(product)}
                                className="w-24 px-2 py-1 text-base font-bold text-gray-800 dark:text-white rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-transparent transition-all"
                            />
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={(e) => handleEdit(e, product)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                        <Edit2 size={18} className="pointer-events-none" />
                      </button>
                      <button onClick={(e) => handleDelete(e, product.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash2 size={18} className="pointer-events-none" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Kayıtlı ürün bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-up border border-gray-100 dark:border-gray-700 flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {editingId ? 'Ürün Düzenle' : 'Yeni Ürün Kartı'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Package size={18} /> Genel
                </button>
                <button 
                    onClick={() => setActiveTab('description')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'description' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <FileText size={18} /> Açıklama
                </button>
                <button 
                    onClick={() => setActiveTab('images')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'images' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <ImageIcon size={18} /> Resimler
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'history' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <History size={18} /> Ürün Geçmişi
                </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/30">
                <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Identifiers */}
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Kimlik Bilgileri</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1"><Tag size={14}/> Ürün Kodu</label>
                                        <input type="text" className="form-input w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" placeholder="Örn: PRD-001" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1"><Barcode size={14}/> Barkod</label>
                                        <input type="text" className="form-input w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" placeholder="EAN13 / Code128" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1"><Info size={14}/> Marka</label>
                                        <input type="text" className="form-input w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" placeholder="Marka Adı" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Ürün Adı <span className="text-red-500">*</span></label>
                                        <span className={`text-xs font-medium ${formData.name.length > 100 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {formData.name.length}/100
                                        </span>
                                    </div>
                                    <input 
                                        type="text" 
                                        required 
                                        className={`form-input w-full rounded-lg border bg-gray-50 dark:bg-gray-700 font-medium text-lg transition-colors
                                            ${formData.name.length > 100 
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' 
                                                : 'border-gray-200 dark:border-gray-600 focus:border-blue-500'}`}
                                        placeholder="Ürün tam adı" 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                    />
                                    {formData.name.length > 100 && (
                                        <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                                            <AlertCircle size={12} />
                                            <span>Ürün adı 100 karakteri geçemez.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stock & Logistics */}
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Stok ve Lojistik</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Kategori</label>
                                        <input type="text" list="categories" className="form-input w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                                        <datalist id="categories"><option value="Erkek" /><option value="Kadın" /><option value="Unisex" /></datalist>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Mevcut Stok</label>
                                        <input type="number" required className="form-input w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Satılan Miktar</label>
                                        <input type="number" className="form-input w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" value={formData.soldCount} onChange={e => setFormData({...formData, soldCount: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1"><Truck size={14}/> Desi</label>
                                        <input type="number" step="0.1" className="form-input w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" value={formData.desi} onChange={e => setFormData({...formData, desi: e.target.value})} placeholder="0.0" />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Fiyatlandırma</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Alış / Maliyet</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-400">₺</span>
                                            <input type="number" step="0.01" className="form-input w-full pl-7 rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Min. Satış Fiyatı</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-400">₺</span>
                                            <input type="number" step="0.01" className="form-input w-full pl-7 rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" value={formData.minSalePrice} onChange={e => setFormData({...formData, minSalePrice: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Piyasa Fiyatı (Üstü Çizili)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-400">₺</span>
                                            <input type="number" step="0.01" className="form-input w-full pl-7 rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" value={formData.marketPrice} onChange={e => setFormData({...formData, marketPrice: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div>
                                        <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-1.5">Güncel Satış Fiyatı</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-blue-600 font-bold">₺</span>
                                            <input type="number" step="0.01" required className="form-input w-full pl-7 rounded-lg border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-lg font-bold text-blue-800 dark:text-blue-100" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">KDV Oranı (%)</label>
                                        <select className="form-select w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700" value={formData.vatRate} onChange={e => setFormData({...formData, vatRate: e.target.value})}>
                                            <option value="0">%0</option>
                                            <option value="1">%1</option>
                                            <option value="10">%10</option>
                                            <option value="20">%20</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'description' && (
                        <div className="h-full flex flex-col space-y-2 animate-fade-in">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Ürün Açıklaması</label>
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col flex-1 min-h-[450px] shadow-sm">
                                {/* Toolbar */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1 items-center">
                                    <button type="button" onClick={() => executeCommand('bold')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="Kalın"><Bold size={16} /></button>
                                    <button type="button" onClick={() => executeCommand('italic')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="İtalik"><Italic size={16} /></button>
                                    <button type="button" onClick={() => executeCommand('underline')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="Altı Çizili"><Underline size={16} /></button>
                                    <button type="button" onClick={() => executeCommand('insertUnorderedList')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="Liste"><List size={16} /></button>
                                </div>
                                <div 
                                    className="flex-1 p-6 outline-none overflow-y-auto text-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none prose-sm sm:prose-base"
                                    contentEditable
                                    ref={editorRef}
                                    onInput={(e) => setFormData({ ...formData, description: e.currentTarget.innerHTML })}
                                    style={{ minHeight: '350px' }}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'images' && (
                         <div className="h-full flex flex-col space-y-6 animate-fade-in">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Yeni Resim Ekle</h4>
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-900/20" onClick={() => imageUploadRef.current?.click()}>
                                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                                        <Upload size={32} />
                                    </div>
                                    <h5 className="text-gray-800 dark:text-white font-medium mb-1">Resimleri buraya sürükleyin veya seçin</h5>
                                    <input type="file" ref={imageUploadRef} className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2"><ImageIcon size={16} /> Yüklü Resimler ({formData.images.length})</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {formData.images.map((img, index) => (
                                        <div key={img.id} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                                            <div className="aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                                                <img src={img.data} alt={img.fileName} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="p-2 flex justify-between items-center">
                                                <span className="text-xs text-gray-500 truncate w-20">{img.fileName}</span>
                                                <button type="button" onClick={() => handleRemoveImage(img.id)} className="text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="h-full space-y-4 animate-fade-in bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 min-h-[400px]">
                            <div className="flex items-center gap-2 mb-6 text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-4">
                                <History size={20} className="text-blue-500" />
                                <h3 className="font-bold text-lg">Ürün Hareket Geçmişi</h3>
                            </div>
                            {formData.history && formData.history.length > 0 ? (
                                <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8 py-2">
                                    {formData.history.map((entry: any) => (
                                        <div key={entry.id} className="relative pl-8">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-500"></div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                                    <span className="font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded flex items-center gap-1"><Clock size={12} /> {new Date(entry.date).toLocaleString('tr-TR')}</span>
                                                    <span className="text-gray-600 dark:text-gray-300 font-medium flex items-center gap-1"><User size={14} className="text-gray-400" /> {entry.user}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${entry.type === 'create' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{entry.type === 'create' ? 'OLUŞTURMA' : 'GÜNCELLEME'}</span>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700 space-y-2">
                                                    {entry.changes.map((change: any, cIdx: number) => (
                                                        <div key={cIdx} className="flex items-start md:items-center gap-2 text-sm">
                                                            <Activity size={14} className="text-gray-400 mt-1 md:mt-0 shrink-0" />
                                                            <span className="font-semibold text-gray-700 dark:text-gray-200 min-w-[80px]">{getFieldLabel(change.field)}:</span>
                                                            <div className="flex flex-wrap items-center gap-2 text-gray-600 dark:text-gray-400">
                                                                <span className="line-through opacity-70 bg-red-50 dark:bg-red-900/20 px-1 rounded text-red-600 dark:text-red-400">{String(change.oldValue)}</span>
                                                                <ArrowRight size={14} className="text-gray-400" />
                                                                <span className="font-bold bg-green-50 dark:bg-green-900/20 px-1 rounded text-green-600 dark:text-green-400">{String(change.newValue)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-400">Henüz geçmiş kaydı yok.</div>
                            )}
                        </div>
                    )}
                </form>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shrink-0 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition font-medium">İptal</button>
                <button 
                    type="submit" 
                    form="productForm" 
                    disabled={formData.name.length > 100}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg shadow-blue-200 dark:shadow-none disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
                >
                    Kaydet
                </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Products;