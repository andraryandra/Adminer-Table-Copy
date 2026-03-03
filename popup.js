// Ambil kolom dari halaman aktif
async function getTableColumns() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject script untuk mendapatkan kolom
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const table = document.querySelector('table.results') || 
                     document.querySelector('table[id*="table"]') ||
                     document.querySelector('table:has(thead)');
        
        if (!table) return null;
        
        const thead = table.querySelector('thead');
        if (!thead) return null;
        
        const headerCells = thead.querySelectorAll('th, td');
        const headers = Array.from(headerCells)
          .map(cell => {
            const text = cell.textContent.trim();
            const link = cell.querySelector('a');
            return link ? link.textContent.trim() : text;
          })
          .filter(h => h !== '');
        
        return headers;
      }
    });
    
    return results[0]?.result || [];
  } catch (error) {
    console.error('Error getting columns:', error);
    return [];
  }
}

// Render daftar kolom
function renderColumnList(columns, selectedColumns = []) {
  const columnList = document.getElementById('columnList');
  
  if (columns.length === 0) {
    columnList.innerHTML = `
      <div style="text-align: center; color: #999; padding: 20px;">
        Buka halaman Adminer dengan tabel untuk melihat daftar kolom
      </div>
    `;
    return;
  }
  
  columnList.innerHTML = '';
  
  columns.forEach((col, index) => {
    const isChecked = selectedColumns.length === 0 || selectedColumns.includes(col);
    const columnItem = document.createElement('div');
    columnItem.className = 'column-item';
    
    ModernCheckbox.create(columnItem, {
      id: `col-${index}`,
      label: col,
      checked: isChecked,
      size: 'medium',
      color: 'green',
      onChange: (checked) => {
        // Update dataset untuk tracking
        const checkbox = document.getElementById(`col-${index}`);
        if (checkbox) {
          checkbox.dataset.column = col;
        }
      }
    });
    
    // Set dataset untuk tracking
    const checkbox = columnItem.querySelector(`#col-${index}`);
    if (checkbox) {
      checkbox.dataset.column = col;
    }
    
    columnList.appendChild(columnItem);
  });
}

// Ambil kolom yang dipilih
function getSelectedColumns() {
  const checkboxes = document.querySelectorAll('#columnList input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.dataset.column);
}

// Load pengaturan
async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    format: 'csv',
    selectedColumns: [],
    includeHeaders: true
  });
  
  document.getElementById('format').value = settings.format;
  
  // Setup modern checkbox untuk includeHeaders
  const includeHeadersContainer = document.getElementById('includeHeadersContainer');
  if (includeHeadersContainer) {
    includeHeadersContainer.innerHTML = ''; // Clear dulu
    ModernCheckbox.create(includeHeadersContainer, {
      id: 'includeHeaders',
      label: 'Sertakan header kolom',
      checked: settings.includeHeaders,
      size: 'medium',
      color: 'green',
      onChange: (checked) => {
        // Value sudah tersimpan di checkbox
      }
    });
  }
  
  // Ambil kolom dari halaman aktif
  const columns = await getTableColumns();
  renderColumnList(columns, settings.selectedColumns);
}

// Simpan pengaturan
async function saveSettings() {
  const format = document.getElementById('format').value;
  const includeHeadersCheckbox = document.getElementById('includeHeaders');
  const includeHeaders = includeHeadersCheckbox ? includeHeadersCheckbox.checked : true;
  const selectedColumns = getSelectedColumns();
  
  await chrome.storage.sync.set({
    format,
    includeHeaders,
    selectedColumns
  });
  
  showStatus('Pengaturan berhasil disimpan!', 'success');
}

// Tampilkan status
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `mt-2.5 p-2 rounded text-xs text-center ${
    type === 'success' 
      ? 'bg-green-100 text-green-800 block' 
      : 'bg-red-100 text-red-800 block'
  }`;
  
  setTimeout(() => {
    status.className = 'mt-2.5 p-2 rounded text-xs text-center hidden';
  }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  
  document.getElementById('selectAll').addEventListener('click', () => {
    document.querySelectorAll('#columnList input[type="checkbox"]').forEach(cb => {
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
    });
  });
  
  document.getElementById('deselectAll').addEventListener('click', () => {
    document.querySelectorAll('#columnList input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
      cb.dispatchEvent(new Event('change'));
    });
  });
  
  // Refresh kolom saat popup dibuka
  document.getElementById('columnList').addEventListener('click', async (e) => {
    if (e.target.tagName === 'BUTTON' && e.target.id === 'refreshColumns') {
      const columns = await getTableColumns();
      const selectedColumns = getSelectedColumns();
      renderColumnList(columns, selectedColumns);
    }
  });
});
