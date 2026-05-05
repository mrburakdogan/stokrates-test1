
import { utils, writeFile, read } from 'xlsx';
import { getCustomers, getExpenses, getMessageLogs, getProducts, getSales, getTemplates, getTodos, restoreDatabase, getTrendyolConfig, getSystemLogs, getShippingSettings, getDebtCredits } from './db';
import { supabase } from './supabase';

// --- EXCEL OPERATIONS ---

export const exportToExcel = (data: any[], fileName: string) => {
  // Excel cell limit is 32,767 characters. We must truncate to prevent crashes.
  const sanitizedData = data.map(row => {
    const newRow: any = {};
    for (const key in row) {
      let val = row[key];
      if (typeof val === 'string' && val.length > 32000) {
        // Truncate and add indicator
        val = val.substring(0, 32000) + "... (KESİLDİ - EXCEL LİMİTİ)";
      }
      newRow[key] = val;
    }
    return newRow;
  });

  const ws = utils.json_to_sheet(sanitizedData);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Sheet1");
  writeFile(wb, `${fileName}.xlsx`);
};

export const importFromExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = utils.sheet_to_json(sheet);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

// --- FULL SYSTEM BACKUP OPERATIONS (JSON) ---

export const exportFullSystemBackup = async () => {
    // This includes EVERYTHING: Images (Base64), Descriptions (HTML), History, etc.
    const backupData = {
        products: getProducts(),
        customers: getCustomers(),
        sales: getSales(),
        expenses: getExpenses(),
        todos: getTodos(),
        debt_credits: getDebtCredits(),
        templates: getTemplates(),
        messageLogs: getMessageLogs(),
        trendyolConfig: getTrendyolConfig(),
        shippingSettings: getShippingSettings(),
        systemLogs: getSystemLogs(),
        backupDate: new Date().toISOString(),
        version: "1.7"
    };

    // Use Blob instead of Data URI to handle large files (Base64 images)
    const jsonString = JSON.stringify(backupData, null, 2); 
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `stokrates_tam_yedek_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    // Clean up memory
    URL.revokeObjectURL(url);

    // Also upload to Supabase backups bucket
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
            const fileName = `${user.id}/stokrates_tam_yedek_${new Date().toISOString().split('T')[0]}.json`;
            const { error } = await supabase.storage
                .from('backups')
                .upload(fileName, blob, {
                    contentType: 'application/json',
                    upsert: true
                });
            if (error) console.error("Bulut yedekleme hatası:", error);
            else console.log("Bulut yedekleme başarılı.");
        }
    } catch (e) {
        console.error("Bulut yedekleme işlemi sırasında bir hata oluştu:", e);
    }
};

export const importFullSystemBackup = (file: File): Promise<{success: boolean, message: string}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                
                if (!text) {
                    throw new Error("Dosya içeriği boş.");
                }

                const data = JSON.parse(text);

                // Basic validation
                if (!data.backupDate && !data.products) {
                    throw new Error("Geçersiz veya bozuk yedek dosyası.");
                }

                // Use the bulk restore function and await it!
                const result = await restoreDatabase(data);

                resolve(result);
            } catch (error) {
                console.error("Yedekleme hatası:", error);
                resolve({ success: false, message: "Dosya okuma veya işleme hatası." });
            }
        };
        reader.onerror = () => resolve({ success: false, message: "Dosya okuma hatası." });
        reader.readAsText(file);
    });
};
