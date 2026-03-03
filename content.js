// Deteksi Adminer
function isAdminerPage() {
  const hostname = window.location.hostname.toLowerCase();
  const excludedDomains = [
    'github.com', 'github.io', 'gitlab.com',
    'bitbucket.org', 'stackoverflow.com', 'stackexchange.com'
  ];
  if (excludedDomains.some(domain => hostname.includes(domain))) return false;

  const url = window.location.href.toLowerCase();
  const urlMatches = url.includes('/adminer') ||
    url.includes('/vendor/adminer') ||
    url.includes('adminer.php') ||
    (url.includes('adminer') && (url.includes('?') || url.includes('#')));

  const title = document.title.toLowerCase();
  const titleMatches = title.includes('adminer') && !title.includes('github');

  const bodyText = document.body.textContent || '';
  const headerText = document.querySelector('h1, h2, .header, header')?.textContent || '';
  const hasAdminerVersion = /Adminer\s+[\d.]+\s+[\d.]+/.test(bodyText) ||
    /Adminer\s+[\d.]+\s+[\d.]+/.test(headerText);

  const hasDatabaseSelect = document.querySelector('select[name="database"], select[name="db"]') !== null;
  const hasSchemaSelect = document.querySelector('select[name="schema"]') !== null;
  const hasAdminerLinks = document.querySelector('a[href*="select"], a[href*="table"]') !== null;
  const hasDataTable = document.querySelector('table') &&
    document.querySelector('table thead') &&
    document.querySelector('table tbody');

  const adminerElementCount = [hasDatabaseSelect, hasSchemaSelect, hasAdminerLinks, hasDataTable]
    .filter(Boolean).length;
  const hasAdminerElements = adminerElementCount >= 2;

  const hasAdminerForm = document.querySelector('form[action*="adminer"], form input[name="username"], form input[type="password"]') !== null ||
    document.querySelector('form input[name="select"], form input[name="search"]') !== null;

  const urlOrTitleMatch = urlMatches || titleMatches;
  const hasAdminerSignature = hasAdminerVersion || hasAdminerElements || hasAdminerForm;

  return urlOrTitleMatch && hasAdminerSignature;
}

// Temukan tabel data Adminer
function findAdminerTable() {
  const tables = document.querySelectorAll('table');
  
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    if (!thead || !tbody) continue;

    const headerRow = thead.querySelector('tr');
    if (!headerRow) continue;

    const headerText = headerRow.textContent.toLowerCase();
    if (headerText.includes('database') && headerText.includes('collation') && headerText.includes('refresh')) continue;
    if (headerText.includes('schema') && headerText.includes('collation') && !headerText.includes('select:')) continue;

    const rows = tbody.querySelectorAll('tr');
    if (rows.length > 0) return table;
  }
  
  return null;
}

// Ekstrak data dari tabel - SELALU gunakan direct query untuk konsistensi
function extractTableData(table, selectedColumns = null) {
  const thead = table.querySelector('thead');
  if (!thead) return null;

  const headerRow = thead.querySelector('tr');
  if (!headerRow) return null;

  const headerCells = headerRow.querySelectorAll('th, td');
  const headers = [];
  const dataColumnIndices = [];

  Array.from(headerCells).forEach((cell, idx) => {
    if (cell.classList.contains('adminer-checkbox-header') ||
      cell.classList.contains('adminer-action-header')) return;

    const text = cell.textContent.trim();
    const link = cell.querySelector('a');
    const headerText = link ? link.textContent.trim() : text;

    if (headerText && headerText.toLowerCase() !== 'modify') {
      headers.push(headerText);
      dataColumnIndices.push(idx);
    }
  });

  let columnIndices = dataColumnIndices;
  if (selectedColumns && selectedColumns.length > 0) {
    const filteredIndices = [];
    selectedColumns.forEach(colName => {
      const headerIdx = headers.findIndex(h => h.toLowerCase() === colName.toLowerCase());
      if (headerIdx !== -1) filteredIndices.push(dataColumnIndices[headerIdx]);
    });
    columnIndices = filteredIndices;
  }

  // SELALU gunakan direct query untuk mendapatkan semua rows
  const directRows = Array.from(document.querySelectorAll('table tbody tr'));
  const data = [];

  directRows.forEach((row, rowIndex) => {
    // Pastikan row ini milik table yang sama
    if (row.closest('table') !== table) return;
    
    const cells = row.querySelectorAll('td, th');
    const rowData = [];

    columnIndices.forEach(originalColIdx => {
      if (cells[originalColIdx]) {
        const cell = cells[originalColIdx];
        if (cell.querySelector('.adminer-row-checkbox') ||
          cell.querySelector('.adminer-copy-row') ||
          cell.querySelector('.adminer-preview-row')) return;

        let cellText = cell.textContent.trim();
        cellText = cellText.replace(/\s+/g, ' ');
        rowData.push(cellText);
      } else {
        rowData.push('');
      }
    });

    if (rowData.some(cell => cell !== '')) {
      data.push({ index: rowIndex, data: rowData });
    }
  });

  const usedHeaders = columnIndices.map(origIdx => {
    const headerIdx = dataColumnIndices.indexOf(origIdx);
    return headers[headerIdx];
  }).filter(Boolean);

  return { headers: usedHeaders, data: data };
}

// Format data ke CSV
function formatAsCSV(tableData, delimiter = ',') {
  if (!tableData || !tableData.headers || !tableData.data) return '';
  const lines = [];
  lines.push(tableData.headers.join(delimiter));
  tableData.data.forEach(row => {
    const escapedRow = row.data.map(cell => {
      if (cell.includes(delimiter) || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    });
    lines.push(escapedRow.join(delimiter));
  });
  return lines.join('\n');
}

// Copy ke clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

// Tampilkan toast notification
function showToast(message, type = 'success', duration = 2000) {
  const oldToast = document.getElementById('adminer-toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.id = 'adminer-toast';
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white; padding: 14px 20px; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 100000;
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; font-weight: 500;
    animation: slideInRight 0.3s ease-out; max-width: 400px;
  `;

  if (!document.getElementById('adminer-toast-style')) {
    const style = document.createElement('style');
    style.id = 'adminer-toast-style';
    style.textContent = `
      @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
      ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'}
    </svg>
    <span>${escapeHtml(message)}</span>
  `;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300);
  }, duration);
}

// Escape HTML
function escapeHtml(text) {
  if (text === null || text === undefined) return 'NULL';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ================================================================
// Tambahkan tombol dan checkbox ke tabel
// ================================================================
function addControlsToTable(table) {
  let tbody = null;
  let addedCount = 0;
  let skippedCount = 0;

  try {
    if (!table) {
      console.warn('[Adminer Ext] ⚠️ addControlsToTable: Table null');
      return;
    }

    // SELALU gunakan direct query dari document untuk mendapatkan tbody yang benar
    const directTbodyQuery = document.querySelector('table tbody');
    if (directTbodyQuery) {
      tbody = directTbodyQuery;
    } else {
      // Fallback ke query dari table
      tbody = table.querySelector('tbody');
    }
    
    if (!tbody) {
      console.warn('[Adminer Ext] ⚠️ addControlsToTable: Tbody tidak ditemukan');
      return;
    }

    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
      const headerText = headerRow.textContent.toLowerCase();
      if (headerText.includes('database') && headerText.includes('collation')) return;
      if (headerText.includes('schema') && headerText.includes('collation')) return;
    }

    // SELALU gunakan direct query dari document - ini lebih akurat
    // Karena Adminer mungkin menggunakan multiple tbody atau nested structure
    const directRows = Array.from(document.querySelectorAll('table tbody tr'));
    
    // Filter rows berdasarkan table yang benar
    const rows = directRows.filter(row => row.closest('table') === table);
    
    // Cek juga query dari tbody untuk perbandingan
    const tbodyRows = Array.from(tbody.querySelectorAll('tr'));
    
    // Update tbody reference dari direct query jika berbeda
    if (rows.length > 0) {
      const newTbody = rows[0].closest('tbody');
      if (newTbody && newTbody !== tbody) {
        tbody = newTbody;
        console.log(`[Adminer Ext] 🔄 Tbody reference di-update (direct query lebih akurat)`);
      }
    }
    
    // Log perbandingan (hanya sekali, tidak looping)
    if (rows.length !== tbodyRows.length) {
      console.log(`[Adminer Ext] ⚠️ Direct query menemukan ${rows.length} rows vs ${tbodyRows.length} dari tbody query`);
    }
    
    if (rows.length === 0) {
      console.warn('[Adminer Ext] ⚠️ Tidak ada rows ditemukan');
      return;
    }

    const rowsWithoutControls = rows.filter(row =>
      !row.querySelector('.adminer-row-checkbox') && !row.querySelector('.adminer-action-cell')
    );
    
    // Log hanya jika ada rows tanpa controls (untuk mengurangi spam log)
    if (rowsWithoutControls.length > 0) {
      console.log(`[Adminer Ext] 🔍 Row analysis:`, {
        totalRows: rows.length,
        rowsWithoutControls: rowsWithoutControls.length,
        firstRowText: rows[0] ? rows[0].textContent.substring(0, 50) : 'null',
        lastRowText: rows[rows.length - 1] ? rows[rows.length - 1].textContent.substring(0, 50) : 'null'
      });
    }

    const thead = table.querySelector('thead');
    const headerRowFinal = thead ? thead.querySelector('tr') : null;

    if (headerRowFinal && !headerRowFinal.querySelector('.adminer-action-header')) {
      const actionHeader = document.createElement('th');
      actionHeader.className = 'adminer-action-header';
      actionHeader.style.cssText = 'padding: 4px 8px; background: #e2e8f0; border: 1px solid #cbd5e0; width: 120px; text-align: center;';
      actionHeader.textContent = 'Actions';
      headerRowFinal.insertBefore(actionHeader, headerRowFinal.firstChild);

      const checkboxHeader = document.createElement('th');
      checkboxHeader.className = 'adminer-checkbox-header';
      checkboxHeader.style.cssText = 'padding: 4px 8px; background: #e2e8f0; border: 1px solid #cbd5e0; width: 30px; text-align: center;';
      const selectAllCheckbox = document.createElement('input');
      selectAllCheckbox.type = 'checkbox';
      selectAllCheckbox.id = 'adminer-select-all';
      selectAllCheckbox.style.cssText = 'cursor: pointer; width: 18px; height: 18px; margin: 0;';
      checkboxHeader.appendChild(selectAllCheckbox);
      headerRowFinal.insertBefore(checkboxHeader, headerRowFinal.firstChild.nextSibling);
    }

    // Log hanya jika ada rows tanpa controls (untuk mengurangi spam log)
    if (rowsWithoutControls.length > 0) {
      console.log('[Adminer Ext] 🔍 addControlsToTable mulai:', {
        totalRowsInTbody: rows.length,
        rowsWithoutControls: rowsWithoutControls.length
      });
    }

    rows.forEach((row, actualIndex) => {
      try {
        if (!row.hasAttribute('data-adminer-row-id')) {
          row.setAttribute('data-adminer-row-id', `row-${Date.now()}-${actualIndex}-${Math.random().toString(36).substr(2, 9)}`);
        }

        const hasCheckbox = row.querySelector('.adminer-row-checkbox');
        const hasActionCell = row.querySelector('.adminer-action-cell');
        const copyBtn = row.querySelector('.adminer-copy-row');
        const previewBtn = row.querySelector('.adminer-preview-row');

        if (hasCheckbox || hasActionCell) {
          skippedCount++;
          // SELALU update rowIndex meskipun sudah punya controls
          // Ini penting untuk memastikan rowIndex sesuai dengan index baru setelah load more
          if (copyBtn) copyBtn.dataset.rowIndex = actualIndex;
          if (previewBtn) previewBtn.dataset.rowIndex = actualIndex;
          if (hasCheckbox) hasCheckbox.dataset.rowIndex = actualIndex;
          return;
        }

        addedCount++;
        console.log('[Adminer Ext] ➕ Menambahkan controls ke row:', {
          index: actualIndex,
          rowFirstCell: row.querySelector('td')?.textContent?.substring(0, 30)
        });

        const actionCell = document.createElement('td');
        actionCell.className = 'adminer-action-cell';
        actionCell.setAttribute('data-adminer-extension', 'true');
        actionCell.style.cssText = 'padding: 4px 8px; border: 1px solid #cbd5e0; text-align: center;';
        actionCell.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); }, true);

        const newCopyBtn = document.createElement('button');
        newCopyBtn.type = 'button';
        newCopyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        newCopyBtn.className = 'adminer-copy-row';
        newCopyBtn.dataset.rowIndex = actualIndex;
        newCopyBtn.title = 'Copy row';
        newCopyBtn.setAttribute('data-adminer-extension', 'true');
        newCopyBtn.style.cssText = `padding: 6px 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; pointer-events: auto;`;
        newCopyBtn.addEventListener('mouseenter', () => { newCopyBtn.style.background = '#45a049'; newCopyBtn.style.transform = 'scale(1.05)'; });
        newCopyBtn.addEventListener('mouseleave', () => { newCopyBtn.style.background = '#4CAF50'; newCopyBtn.style.transform = 'scale(1)'; });

        const newPreviewBtn = document.createElement('button');
        newPreviewBtn.type = 'button';
        newPreviewBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        newPreviewBtn.className = 'adminer-preview-row';
        newPreviewBtn.dataset.rowIndex = actualIndex;
        newPreviewBtn.title = 'Preview row';
        newPreviewBtn.setAttribute('data-adminer-extension', 'true');
        newPreviewBtn.style.cssText = `padding: 6px 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; pointer-events: auto;`;
        newPreviewBtn.addEventListener('mouseenter', () => { newPreviewBtn.style.background = '#0b7dda'; newPreviewBtn.style.transform = 'scale(1.05)'; });
        newPreviewBtn.addEventListener('mouseleave', () => { newPreviewBtn.style.background = '#2196F3'; newPreviewBtn.style.transform = 'scale(1)'; });

        actionCell.appendChild(newCopyBtn);
        actionCell.appendChild(newPreviewBtn);
        row.insertBefore(actionCell, row.firstChild);

        const checkboxCell = document.createElement('td');
        checkboxCell.setAttribute('data-adminer-extension', 'true');
        checkboxCell.style.cssText = 'padding: 4px 8px; border: 1px solid #cbd5e0; text-align: center; position: relative;';
        // Jangan tambahkan event listener yang memblokir - biarkan checkbox bisa diklik
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'adminer-row-checkbox';
        checkbox.dataset.rowIndex = actualIndex;
        checkbox.style.cssText = 'cursor: pointer; width: 18px; height: 18px; margin: 0;';
        checkboxCell.appendChild(checkbox);
        row.insertBefore(checkboxCell, actionCell.nextSibling);
      } catch (e) {
        console.error('[Adminer Ext] ❌ Error processing row:', e);
      }
    });

  } catch (e) {
    console.error('[Adminer Ext] ❌ Error in addControlsToTable:', e);
    return;
  }

  if (!tbody) return;

  try {
    // SELALU gunakan direct query untuk mendapatkan semua rows, tapi filter berdasarkan table
    const allRowsAfter = Array.from(document.querySelectorAll('table tbody tr'));
    const tableRowsAfter = allRowsAfter.filter(row => row.closest('table') === table);
    
    let rowsWithActions = 0;
    let rowsWithoutActions = 0;

    // Update rowIndex berdasarkan index dari tableRowsAfter (sudah di-filter berdasarkan table)
    tableRowsAfter.forEach((row, idx) => {
      const copyBtn = row.querySelector('.adminer-copy-row');
      const previewBtn = row.querySelector('.adminer-preview-row');
      const checkbox = row.querySelector('.adminer-row-checkbox');

      if (copyBtn || previewBtn) rowsWithActions++;
      else rowsWithoutActions++;

      // rowIndex harus sesuai dengan index di tableRowsAfter (sudah di-filter)
      if (copyBtn) copyBtn.dataset.rowIndex = idx;
      if (previewBtn) previewBtn.dataset.rowIndex = idx;
      if (checkbox) checkbox.dataset.rowIndex = idx;
    });

    // Log hanya jika ada rows tanpa actions atau ada rows yang ditambahkan
    if (rowsWithoutActions > 0 || addedCount > 0) {
      console.log('[Adminer Ext] 📊 addControlsToTable selesai:', {
        totalRows: allRowsAfter.length, rowsWithActions, rowsWithoutActions,
        addedCount, skippedCount,
        warning: rowsWithoutActions > 0 ? `⚠️ ${rowsWithoutActions} rows TIDAK punya actions!` : '✅ Semua row punya actions'
      });
    }
  } catch (e) {
    console.error('[Adminer Ext] ❌ Error updating rowIndex:', e);
  }

  // Select all handler
  const selectAll = document.getElementById('adminer-select-all');
  if (selectAll) {
    // Hapus handler lama jika ada
    if (selectAll._adminerSelectAllHandler) {
      selectAll.removeEventListener('change', selectAll._adminerSelectAllHandler);
    }
    
    // Setup event untuk select all checkbox
    const selectAllHandler = (e) => {
      const isChecked = e.target.checked;
      
      // Update semua checkbox per row
      document.querySelectorAll('.adminer-row-checkbox').forEach(cb => {
        cb.checked = isChecked;
      });
    };
    
    selectAll._adminerSelectAllHandler = selectAllHandler;
    selectAll.addEventListener('change', selectAllHandler);
  }

  // Event delegation untuk click di tbody
  // HAPUS handler lama jika ada
  if (tbody._adminerClickHandler) {
    tbody.removeEventListener('click', tbody._adminerClickHandler, true);
    tbody._adminerClickHandler = null;
  }
  if (tbody._adminerMouseDownHandler) {
    tbody.removeEventListener('mousedown', tbody._adminerMouseDownHandler, true);
    tbody._adminerMouseDownHandler = null;
  }

  // Event delegation menggunakan document untuk catch semua clicks (termasuk rows baru)
  // Ini lebih reliable karena tidak bergantung pada tbody yang mungkin diganti
  const clickHandler = async (e) => {
    const target = e.target;
    const copyBtn = target.closest('.adminer-copy-row');
    const previewBtn = target.closest('.adminer-preview-row');

    if (copyBtn) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      const rowIndex = parseInt(copyBtn.dataset.rowIndex);
      console.log('[Adminer Ext] 🖱️ Copy button diklik:', { rowIndex, dataset: copyBtn.dataset });
      if (!isNaN(rowIndex) && rowIndex >= 0) {
        try { await copyRow(rowIndex); }
        catch (err) { 
          console.error('[Adminer Ext] ❌ Error saat copy:', err);
          showToast('Error saat copy: ' + err.message, 'error', 3000); 
        }
      } else {
        console.error('[Adminer Ext] ❌ Index baris tidak valid untuk copy:', rowIndex);
        showToast('Index baris tidak valid untuk copy!', 'error', 2500);
      }
      return false;
    }

    if (previewBtn) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      const rowIndex = parseInt(previewBtn.dataset.rowIndex);
      console.log('[Adminer Ext] 🖱️ Preview button diklik:', { rowIndex, dataset: previewBtn.dataset });
      if (!isNaN(rowIndex) && rowIndex >= 0) {
        try { 
          showRowPreview(rowIndex); 
        }
        catch (err) { 
          console.error('[Adminer Ext] ❌ Error saat membuka preview:', err);
          showToast('Error saat membuka preview: ' + err.message, 'error', 3000); 
        }
      } else {
        console.error('[Adminer Ext] ❌ Index baris tidak valid untuk preview:', rowIndex);
        showToast('Index baris tidak valid untuk preview!', 'error', 2500);
      }
      return false;
    }
  };

  const mouseDownHandler = (e) => {
    const target = e.target;
    if (target.closest('.adminer-copy-row') || target.closest('.adminer-preview-row')) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    }
  };

  // Simpan handler di tbody untuk reference
  tbody._adminerClickHandler = clickHandler;
  tbody._adminerMouseDownHandler = mouseDownHandler;
  
  // Pasang event listener di tbody
  tbody.addEventListener('click', clickHandler, true);
  tbody.addEventListener('mousedown', mouseDownHandler, true);
  
  // JUGA pasang di document untuk catch rows yang mungkin di luar tbody scope
  // Tapi hanya untuk buttons extension kita
  if (!document._adminerGlobalClickHandler) {
    document._adminerGlobalClickHandler = clickHandler;
    document.addEventListener('click', clickHandler, true);
    console.log('[Adminer Ext] ✅ Global click handler di-setup');
  }
}

// Fetch data lengkap dari export Adminer
async function fetchFullDataFromExport(selectedRowIndices = []) {
  try {
    const table = findAdminerTable();
    if (!table) return null;

    // Ambil URL dan parameter dari halaman saat ini
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Build export URL
    const baseUrl = currentUrl.split('?')[0];
    const exportParams = new URLSearchParams();
    
    // Copy parameter penting dari URL saat ini
    if (urlParams.get('pgsql')) exportParams.set('pgsql', urlParams.get('pgsql'));
    if (urlParams.get('username')) exportParams.set('username', urlParams.get('username'));
    if (urlParams.get('db')) exportParams.set('db', urlParams.get('db'));
    if (urlParams.get('ns')) exportParams.set('ns', urlParams.get('ns'));
    if (urlParams.get('select')) exportParams.set('select', urlParams.get('select'));
    
    // Build form data untuk export
    const formData = new FormData();
    
    // Ambil primary key dari row yang dipilih
    const tableData = extractTableData(table);
    if (!tableData) return null;
    
    // Cari primary key column (biasanya 'id' atau kolom pertama)
    const idColumnIndex = tableData.headers.findIndex(h => h.toLowerCase() === 'id');
    let primaryKeyName = idColumnIndex >= 0 ? tableData.headers[idColumnIndex] : tableData.headers[0];
    
    // Tambahkan check[] untuk setiap row yang dipilih
    selectedRowIndices.forEach(rowIdx => {
      const rowData = tableData.data.find(r => r.index === rowIdx);
      if (rowData && idColumnIndex >= 0 && rowData.data[idColumnIndex]) {
        const pkValue = rowData.data[idColumnIndex];
        if (pkValue && pkValue !== 'NULL' && pkValue.trim() !== '') {
          formData.append('check[]', `where[${primaryKeyName}]=${pkValue}`);
        }
      }
    });
    
    // Jika tidak ada row yang dipilih, ambil semua row yang terlihat
    if (selectedRowIndices.length === 0) {
      tableData.data.forEach(rowData => {
        if (idColumnIndex >= 0 && rowData.data[idColumnIndex]) {
          const pkValue = rowData.data[idColumnIndex];
          if (pkValue && pkValue !== 'NULL' && pkValue.trim() !== '') {
            formData.append('check[]', `where[${primaryKeyName}]=${pkValue}`);
          }
        }
      });
    }
    
    // Set export parameters
    formData.append('output', 'text');
    formData.append('format', 'sql');
    formData.append('export', 'Export');
    formData.append('separator', 'csv');
    
    // Ambil token dari halaman (jika ada)
    const tokenInput = document.querySelector('input[name="token"]');
    if (tokenInput) {
      formData.append('token', tokenInput.value);
    }
    
    // Fetch export data
    const exportUrl = `${baseUrl}?${exportParams.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout
    
    const response = await fetch(exportUrl, {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
      body: formData,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn('[Adminer Ext] ⚠️ Export fetch gagal:', response.status);
      return null;
    }
    
    const exportText = await response.text();
    
    // Debug: log response untuk troubleshooting
    console.log('[Adminer Ext] 🔍 Export response preview:', exportText.substring(0, 500));
    
    // Parse SQL INSERT statement untuk extract data
    return parseExportData(exportText, tableData.headers);
    
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[Adminer Ext] ⚠️ Export fetch timeout');
    } else {
      console.error('[Adminer Ext] ❌ Error fetching export:', err);
    }
    return null;
  }
}

// Parse SQL INSERT statement untuk extract data lengkap
function parseExportData(exportText, headers) {
  try {
    // Cek apakah response adalah HTML (mungkin ada wrapper)
    let sqlText = exportText;
    
    // Jika response adalah HTML, cari <pre> atau <code> yang berisi SQL
    const htmlMatch = exportText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) || 
                      exportText.match(/<code[^>]*>([\s\S]*?)<\/code>/i) ||
                      exportText.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i);
    
    if (htmlMatch) {
      sqlText = htmlMatch[1];
      console.log('[Adminer Ext] ✅ SQL ditemukan di HTML tag');
    }
    
    // Cari pattern INSERT INTO ... VALUES ...
    // Pattern lebih fleksibel: bisa ada whitespace, newline, dll
    let insertMatch = sqlText.match(/INSERT\s+INTO[^(]+\([^)]+\)\s+VALUES\s*([\s\S]+?);/i) ||
                      sqlText.match(/INSERT\s+INTO[^(]+\([^)]+\)\s*VALUES\s*([\s\S]+?);/i) ||
                      sqlText.match(/INSERT\s+INTO[^V]+VALUES\s*([\s\S]+?);/i);
    
    if (!insertMatch) {
      // Coba pattern alternatif tanpa semicolon di akhir
      insertMatch = sqlText.match(/INSERT\s+INTO[^(]+\([^)]+\)\s+VALUES\s*([\s\S]+)/i) ||
                    sqlText.match(/INSERT\s+INTO[^(]+\([^)]+\)\s*VALUES\s*([\s\S]+)/i);
      
      if (insertMatch) {
        console.log('[Adminer Ext] ✅ INSERT statement ditemukan (tanpa semicolon)');
      }
    }
    
    if (!insertMatch) {
      // Coba cari pattern yang lebih umum
      insertMatch = sqlText.match(/VALUES\s*\(([\s\S]+?)\)/i);
      if (insertMatch) {
        console.log('[Adminer Ext] ✅ VALUES ditemukan (pattern alternatif)');
      }
    }
    
    if (!insertMatch) {
      console.warn('[Adminer Ext] ⚠️ INSERT statement tidak ditemukan');
      console.log('[Adminer Ext] 🔍 Response text length:', sqlText.length);
      console.log('[Adminer Ext] 🔍 Response text preview (first 2000 chars):', sqlText.substring(0, 2000));
      console.log('[Adminer Ext] 🔍 Contains INSERT?', sqlText.includes('INSERT'));
      console.log('[Adminer Ext] 🔍 Contains VALUES?', sqlText.includes('VALUES'));
      return null;
    }
    
    // Extract column names dari INSERT INTO statement
    let insertIntoMatch = sqlText.match(/INSERT\s+INTO[^(]+\(([^)]+)\)/i);
    if (!insertIntoMatch) {
      // Coba pattern alternatif
      insertIntoMatch = sqlText.match(/INSERT\s+INTO\s+[^(]+\(([^)]+)\)/i);
    }
    
    let exportColumnNames = [];
    if (insertIntoMatch) {
      exportColumnNames = insertIntoMatch[1]
        .split(',')
        .map(col => col.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      console.log('[Adminer Ext] ✅ Column names extracted:', exportColumnNames.length);
    } else {
      console.warn('[Adminer Ext] ⚠️ Column names tidak ditemukan, gunakan headers dari table');
      exportColumnNames = headers;
    }
    
    const valuesText = insertMatch[1].trim();
    console.log('[Adminer Ext] ✅ VALUES text length:', valuesText.length);
    
    return parseValues(valuesText, exportColumnNames, headers);
    
  } catch (err) {
    console.error('[Adminer Ext] ❌ Error parsing export data:', err);
    return null;
  }
}

// Parse VALUES text untuk extract data
function parseValues(valuesText, exportColumnNames, headers) {
  try {
    // Parse VALUES - split rows dengan lebih hati-hati
    // Pattern: (value1, value2, ...), (value1, value2, ...)
    const rows = [];
    let depth = 0;
    let inQuotes = false;
    let quoteChar = null;
    let currentRow = '';
    let escapeNext = false;
    
    for (let i = 0; i < valuesText.length; i++) {
      const char = valuesText[i];
      
      if (escapeNext) {
        currentRow += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        currentRow += char;
        continue;
      }
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        currentRow += char;
        continue;
      }
      
      if (inQuotes && char === quoteChar) {
        // Check if it's escaped quote (double quote) or end of string
        if (i + 1 < valuesText.length && valuesText[i + 1] === quoteChar) {
          currentRow += char + char;
          i++; // Skip next quote
          continue;
        }
        inQuotes = false;
        quoteChar = null;
        currentRow += char;
        continue;
      }
      
      if (!inQuotes) {
        if (char === '(') {
          depth++;
          if (depth === 1) {
            // Start of new row, reset currentRow
            currentRow = '';
            continue;
          }
        } else if (char === ')') {
          depth--;
          if (depth === 0) {
            // End of row
            rows.push(currentRow.trim());
            currentRow = '';
            // Skip comma and whitespace after )
            i++;
            while (i < valuesText.length && (valuesText[i] === ',' || valuesText[i] === ' ' || valuesText[i] === '\n' || valuesText[i] === '\t' || valuesText[i] === '\r')) {
              i++;
            }
            i--; // Adjust for loop increment
            continue;
          }
        }
      }
      
      currentRow += char;
    }
    
    // Jika masih ada currentRow (untuk single row tanpa closing paren di akhir)
    if (currentRow.trim() && rows.length === 0) {
      rows.push(currentRow.trim());
    }
    
    // Parse each row to extract values
    const parsedData = rows.map(rowText => {
      const values = [];
      let current = '';
      let inQuotes = false;
      let quoteChar = null;
      let escapeNext = false;
      let depth = 0;
      
      for (let i = 0; i < rowText.length; i++) {
        const char = rowText[i];
        
        if (escapeNext) {
          current += char;
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          current += char;
          continue;
        }
        
        if (!inQuotes && (char === '"' || char === "'")) {
          inQuotes = true;
          quoteChar = char;
          current += char;
          continue;
        }
        
        if (inQuotes && char === quoteChar) {
          // Check if it's escaped quote
          if (i + 1 < rowText.length && rowText[i + 1] === quoteChar) {
            current += char + char;
            i++;
            continue;
          }
          inQuotes = false;
          quoteChar = null;
          current += char;
          continue;
        }
        
        if (!inQuotes) {
          if (char === '(' || char === '[' || char === '{') {
            depth++;
            current += char;
            continue;
          } else if (char === ')' || char === ']' || char === '}') {
            depth--;
            current += char;
            continue;
          } else if (char === ',' && depth === 0) {
            // End of value (only if not inside brackets)
            values.push(current.trim());
            current = '';
            // Skip whitespace after comma
            i++;
            while (i < rowText.length && (rowText[i] === ' ' || rowText[i] === '\t')) {
              i++;
            }
            i--; // Adjust for loop increment
            continue;
          }
        }
        
        current += char;
      }
      
      // Add last value
      if (current.trim()) {
        values.push(current.trim());
      }
      
      // Clean values: remove quotes, handle NULL
      return values.map(val => {
        val = val.trim();
        if (val === 'NULL' || val === 'null') return 'NULL';
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          // Remove outer quotes and unescape
          val = val.slice(1, -1);
          // Unescape: '' -> ', "" -> "
          val = val.replace(/''/g, "'").replace(/""/g, '"');
        }
        return val;
      });
    });
    
    // Map export columns ke table headers jika urutan berbeda
    let mappedData = parsedData;
    if (exportColumnNames.length > 0 && exportColumnNames.length === headers.length) {
      // Buat mapping index: exportIndex -> tableHeaderIndex
      const columnMapping = headers.map(tableHeader => {
        const exportIndex = exportColumnNames.findIndex(expCol => 
          expCol.toLowerCase() === tableHeader.toLowerCase()
        );
        return exportIndex >= 0 ? exportIndex : -1;
      });
      
      // Reorder data sesuai dengan urutan table headers
      mappedData = parsedData.map(row => {
        return columnMapping.map(expIdx => {
          if (expIdx >= 0 && expIdx < row.length) {
            return row[expIdx];
          }
          return 'NULL';
        });
      });
    }
    
    console.log('[Adminer Ext] ✅ Parsed export data:', { 
      rows: mappedData.length, 
      columns: mappedData[0]?.length,
      exportColumns: exportColumnNames.length,
      tableColumns: headers.length
    });
    return mappedData;
    
  } catch (err) {
    console.error('[Adminer Ext] ❌ Error parsing export data:', err);
    return null;
  }
}

// Copy row tertentu
async function copyRow(rowIndex) {
  try {
    const table = findAdminerTable();
    if (!table) { showToast('Table tidak ditemukan!', 'error', 2500); return; }

    // Cari row berdasarkan index dari direct query
    const directRows = Array.from(document.querySelectorAll('table tbody tr'));
    const tableRows = directRows.filter(row => row.closest('table') === table);
    
    if (rowIndex < 0 || rowIndex >= tableRows.length) {
      showToast(`Index baris tidak valid: ${rowIndex} (total: ${tableRows.length})`, 'error', 2500);
      return;
    }

    const tableData = extractTableData(table);
    if (!tableData) { showToast('Gagal membaca data table!', 'error', 2500); return; }

    // Tampilkan loading
    showToast('⏳ Mengambil data lengkap...', 'success', 2000);
    
    // Fetch data lengkap dari export
    const exportData = await fetchFullDataFromExport([rowIndex]);
    
    let rowDataObj;
    if (exportData && exportData.length > 0) {
      // Cari primary key untuk mapping
      const idColumnIndex = tableData.headers.findIndex(h => h.toLowerCase() === 'id');
      const currentRowData = tableData.data.find(r => r.index === rowIndex);
      
      if (idColumnIndex >= 0 && currentRowData) {
        const currentPkValue = currentRowData.data[idColumnIndex];
        
        // Cari row di export data yang sesuai dengan primary key
        const exportRow = exportData.find(expRow => {
          if (expRow.length > idColumnIndex) {
            // Compare primary key value (bisa dengan atau tanpa quotes)
            const expPkValue = expRow[idColumnIndex].replace(/^["']|["']$/g, '');
            return expPkValue === currentPkValue || expPkValue === currentPkValue.replace(/^["']|["']$/g, '');
          }
          return false;
        }) || exportData[0]; // Fallback ke first row jika tidak ditemukan
        
        rowDataObj = {
          index: rowIndex,
          data: exportRow.slice(0, tableData.headers.length) // Match dengan jumlah headers
        };
      } else {
        // Gunakan first row dari export jika tidak ada primary key
        rowDataObj = {
          index: rowIndex,
          data: exportData[0].slice(0, tableData.headers.length)
        };
      }
    } else {
      // Fallback ke data dari table
      rowDataObj = tableData.data.find(r => r.index === rowIndex);
      if (!rowDataObj) {
        if (rowIndex < tableData.data.length) {
          rowDataObj = { index: rowIndex, data: tableData.data[rowIndex].data };
        } else {
          showToast(`Index baris tidak valid: ${rowIndex} (total: ${tableData.data.length})`, 'error', 2500);
          return;
        }
      }
    }

    const text = formatAsCSV({ headers: tableData.headers, data: [rowDataObj] });
    const success = await copyToClipboard(text);

    if (success) {
      showToast('Berhasil menyalin baris!', 'success', 2000);
    } else {
      showToast('Gagal menyalin data!', 'error', 2500);
    }
  } catch (err) {
    console.error('Error in copyRow:', err);
    showToast('Error saat copy: ' + err.message, 'error', 3000);
  }
}

// Copy semua row yang terpilih
async function copySelectedRows() {
  const table = findAdminerTable();
  if (!table) return;

  const checkboxes = document.querySelectorAll('.adminer-row-checkbox:checked');
  if (checkboxes.length === 0) { showToast('Pilih minimal satu baris!', 'error', 2500); return; }

  const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.rowIndex));
  const tableData = extractTableData(table);
  
  if (!tableData) { showToast('Gagal membaca data table!', 'error', 2500); return; }

  // Tampilkan loading
  showToast('⏳ Mengambil data lengkap...', 'success', 2000);
  
  // Fetch data lengkap dari export
  const exportData = await fetchFullDataFromExport(selectedIndices);
  
  let selectedData;
  if (exportData && exportData.length > 0) {
    // Cari primary key untuk mapping
    const idColumnIndex = tableData.headers.findIndex(h => h.toLowerCase() === 'id');
    
    // Map export data ke selected indices berdasarkan primary key
    const mappedData = selectedIndices.map(originalIdx => {
      const currentRowData = tableData.data.find(r => r.index === originalIdx);
      if (!currentRowData) return null;
      
      if (idColumnIndex >= 0) {
        const currentPkValue = currentRowData.data[idColumnIndex];
        
        // Cari row di export data yang sesuai dengan primary key
        const exportRow = exportData.find(expRow => {
          if (expRow.length > idColumnIndex) {
            const expPkValue = expRow[idColumnIndex].replace(/^["']|["']$/g, '');
            return expPkValue === currentPkValue || expPkValue === currentPkValue.replace(/^["']|["']$/g, '');
          }
          return false;
        });
        
        if (exportRow) {
          return {
            index: originalIdx,
            data: exportRow.slice(0, tableData.headers.length)
          };
        }
      }
      
      // Fallback: gunakan data dari table jika tidak ditemukan di export
      return currentRowData;
    }).filter(Boolean);
    
    selectedData = {
      headers: tableData.headers,
      data: mappedData
    };
  } else {
    // Fallback ke data dari table
    selectedData = {
      headers: tableData.headers,
      data: selectedIndices.map(idx => {
        const rowData = tableData.data.find(r => r.index === idx);
        return rowData || (idx < tableData.data.length ? tableData.data[idx] : null);
      }).filter(Boolean)
    };
  }

  const text = formatAsCSV(selectedData);
  const success = await copyToClipboard(text);

  if (success) showToast(`Berhasil menyalin ${selectedData.data.length} baris!`, 'success', 2000);
  else showToast('Gagal menyalin data!', 'error', 2500);
}

// Helper function untuk safe string operations
function safeSubstring(str, start, end) {
  try {
    if (str == null) return '';
    const s = typeof str === 'string' ? str : String(str);
    return s.substring(start || 0, end || s.length);
  } catch (err) {
    return '';
  }
}

// Preview row
function showRowPreview(rowIndex) {
  try {
    const table = findAdminerTable();
    if (!table) { showToast('Table tidak ditemukan!', 'error', 2500); return; }

    // Cari row berdasarkan index dari direct query
    const directRows = Array.from(document.querySelectorAll('table tbody tr'));
    const tableRows = directRows.filter(row => row.closest('table') === table);
    
    if (rowIndex < 0 || rowIndex >= tableRows.length) {
      showToast(`Index baris tidak valid: ${rowIndex} (total: ${tableRows.length})`, 'error', 2500);
      return;
    }

    const tableData = extractTableData(table);
    if (!tableData) { showToast('Gagal membaca data table!', 'error', 2500); return; }

    // Cari data yang sesuai dengan rowIndex
    let rowData = tableData.data.find(r => r.index === rowIndex);
    if (!rowData) {
      // Fallback: gunakan index langsung jika tidak ditemukan
      if (rowIndex < tableData.data.length) {
        rowData = tableData.data[rowIndex];
      } else {
        showToast(`Data baris tidak ditemukan! (index: ${rowIndex}, total: ${tableData.data.length})`, 'error', 2500);
        return;
      }
    }
    
    if (!rowData) { showToast('Data baris tidak ditemukan!', 'error', 2500); return; }

    const oldModal = document.getElementById('adminer-row-preview-modal');
    if (oldModal) oldModal.remove();

    let visibleColumns = tableData.headers.map((_, idx) => idx);
    let excludedColumns = [];

    const modal = document.createElement('div');
    modal.id = 'adminer-row-preview-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);`;

    const renderTable = () => {
      let html = '<table style="width: 100%; border-collapse: collapse; font-size: 14px;"><thead><tr>';
      html += '<th style="padding: 14px 16px; background: #1e293b; color: white; border: 1px solid #334155; width: 40px; text-align: center;"><input type="checkbox" id="adminer-preview-select-all" style="cursor: pointer; width: 18px; height: 18px;"></th>';
      html += '<th style="padding: 14px 16px; background: #1e293b; color: white; border: 1px solid #334155; text-align: left; font-weight: 700; font-size: 13px; letter-spacing: 0.5px;">Column</th>';
      html += '<th style="padding: 14px 16px; background: #1e293b; color: white; border: 1px solid #334155; text-align: left; font-weight: 700; font-size: 13px; letter-spacing: 0.5px;">Value</th>';
      html += '<th style="padding: 14px 16px; background: #1e293b; color: white; border: 1px solid #334155; text-align: center; font-weight: 700; font-size: 13px; width: 80px;">Copy</th>';
      html += '</tr></thead><tbody>';

      tableData.headers.forEach((header, idx) => {
        if (!visibleColumns.includes(idx) || excludedColumns.includes(idx)) return;
        const value = rowData.data[idx] || 'NULL';
        const valueTrimmed = value.trim();
        
        // Deteksi data panjang: lebih dari 100 karakter ATAU mengandung JSON array/object
        // TAPI exclude array kosong [] dan null
        const isEmptyArray = valueTrimmed === '[]';
        const isNull = valueTrimmed === 'NULL' || valueTrimmed === 'null' || valueTrimmed === '';
        const isLongValue = !isEmptyArray && !isNull && (
          value.length > 100 || 
          (valueTrimmed.startsWith('[') && valueTrimmed.length > 2) || 
          (valueTrimmed.startsWith('{') && valueTrimmed.length > 2)
        );
        const valueId = `adminer-preview-value-${idx}`;
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        html += `<tr style="background: ${bg}; transition: background 0.2s;">`;
        html += `<td style="padding: 14px 16px; border: 1px solid #e2e8f0; text-align: center; background: ${bg};"><input type="checkbox" class="adminer-preview-column-select" data-column-index="${idx}" checked style="cursor: pointer; width: 18px; height: 18px;"></td>`;
        html += `<td style="padding: 14px 16px; border: 1px solid #e2e8f0; background: #f1f5f9; font-weight: 600; width: 250px; color: #1e293b; font-size: 13px;">${escapeHtml(header)}</td>`;
        html += `<td style="padding: 14px 16px; border: 1px solid #e2e8f0; word-wrap: break-word; position: relative; min-width: 400px; max-width: 800px; background: ${bg};">`;
        // Format JSON jika terdeteksi
        let displayValue = value;
        if ((valueTrimmed.startsWith('{') && valueTrimmed.endsWith('}')) || 
            (valueTrimmed.startsWith('[') && valueTrimmed.endsWith(']'))) {
          try {
            const parsed = JSON.parse(valueTrimmed);
            displayValue = JSON.stringify(parsed, null, 2);
          } catch (e) {
            // Bukan JSON valid, gunakan as-is
          }
        }
        
        // Simpan raw value (dengan HTML jika ada) untuk expand
        const rawValueEscaped = escapeHtml(JSON.stringify({ raw: value }));
        
        html += `<div id="${valueId}" class="adminer-preview-value-cell" data-raw-value="${rawValueEscaped}" style="max-height: ${isLongValue ? '200px' : 'none'}; overflow-y: ${isLongValue ? 'auto' : 'visible'}; overflow-x: auto; word-break: break-word; white-space: pre-wrap; font-family: 'Courier New', 'Monaco', 'Consolas', monospace; font-size: 13px; line-height: 1.6; ${isLongValue ? 'padding-right: 100px;' : ''}">${escapeHtml(displayValue)}</div>`;
        if (isLongValue) {
          html += `<button class="adminer-preview-expand-value" data-value-id="${valueId}" data-expanded="false" onclick="return false;" style="position: absolute; top: 6px; right: 6px; background: #dbeafe; color: #1e40af; border: 2px solid #1e40af; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-size: 12px; font-weight: 700; z-index: 1000; white-space: nowrap; transition: all 0.2s; pointer-events: auto; hover:background: #bfdbfe; hover:border-color: #1e3a8a; hover:-translate-y-0.5; hover:shadow-md;" title="Klik untuk melihat data lengkap">📖 Expand</button>`;
        }
        html += `</td>`;
        html += `<td style="padding: 14px 16px; border: 1px solid #e2e8f0; text-align: center; background: ${bg};">`;
        html += `<button class="adminer-preview-copy-value" data-value-id="${valueId}" style="background: #dcfce7; color: #16a34a; border: 2px solid #16a34a; border-radius: 8px; padding: 8px 12px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; min-width: 44px; font-weight: 600; transition: all 0.2s; hover:background: #bbf7d0; hover:border-color: #15803d; hover:-translate-y-0.5; hover:shadow-md; active:translate-y-0;" title="Copy full value">`;
        html += `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button></td></tr>`;
      });

      html += '</tbody></table>';
      return html;
    };

    modal.innerHTML = `
      <div style="background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.1); max-width: 1200px; width: 95vw; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; border: 1px solid #e2e8f0;">
        <div style="padding: 20px 28px; background: #1e293b; color: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0f172a;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 4px; height: 32px; background: #3b82f6; border-radius: 2px;"></div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.3px;">Preview Row #${rowIndex + 1}</h2>
          </div>
          <button id="adminer-close-preview" style="background: #475569; color: white; border: 2px solid #64748b; border-radius: 8px; padding: 10px 18px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; hover:background: #64748b; hover:border-color: #94a3b8;">✕ Close</button>
        </div>
        <div style="padding: 18px 28px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; display: flex; gap: 20px; flex-wrap: wrap; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-size: 13px; font-weight: 700; color: #1e293b; min-width: 50px;">Filter:</label>
            <input type="text" id="adminer-preview-filter" placeholder="Cari kolom..." style="padding: 10px 14px; border: 2px solid #cbd5e0; border-radius: 8px; font-size: 13px; width: 220px; background: white; font-weight: 500; transition: all 0.2s; focus:outline-none; focus:border-blue-500; focus:ring-2; focus:ring-blue-500/20;">
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-size: 13px; font-weight: 700; color: #1e293b; min-width: 80px;">Copy Type:</label>
            <select id="adminer-preview-copy-type" style="padding: 10px 36px 10px 14px; border: 2px solid #cbd5e0; border-radius: 8px; font-size: 13px; background: white; font-weight: 500; cursor: pointer; appearance: none; background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231e293b' d='M6 9L1 4l1.4-1.4L6 6.2l3.6-3.6L11 4z'/%3E%3C/svg%3E\"); background-repeat: no-repeat; background-position: right 12px center; transition: all 0.2s; focus:outline-none; focus:border-blue-500; focus:ring-2; focus:ring-blue-500/20;">
              <option value="both">Column + Value</option>
              <option value="column">Column Only</option>
              <option value="value">Value Only</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-size: 13px; font-weight: 700; color: #1e293b; min-width: 60px;">Format:</label>
            <select id="adminer-preview-copy-format" style="padding: 10px 36px 10px 14px; border: 2px solid #cbd5e0; border-radius: 8px; font-size: 13px; background: white; font-weight: 500; cursor: pointer; appearance: none; background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231e293b' d='M6 9L1 4l1.4-1.4L6 6.2l3.6-3.6L11 4z'/%3E%3C/svg%3E\"); background-repeat: no-repeat; background-position: right 12px center; transition: all 0.2s; focus:outline-none; focus:border-blue-500; focus:ring-2; focus:ring-blue-500/20;">
              <option value="default">Default (CSV)</option>
              <option value="formatted">Formatted</option>
            </select>
          </div>
        </div>
        <div id="adminer-preview-table-container" style="padding: 25px; overflow-y: auto; flex: 1;">${renderTable()}</div>
        <div style="padding: 20px 28px; border-top: 2px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="display: flex; gap: 12px;">
            <button id="adminer-preview-select-all-btn" style="background: #e0f2fe; color: #0369a1; border: 2px solid #0369a1; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-size: 13px; font-weight: 700; transition: all 0.2s; hover:background: #bae6fd; hover:border-color: #075985; hover:-translate-y-0.5; hover:shadow-md; active:translate-y-0;">Select All</button>
            <button id="adminer-preview-deselect-all-btn" style="background: #fee2e2; color: #dc2626; border: 2px solid #dc2626; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-size: 13px; font-weight: 700; transition: all 0.2s; hover:background: #fecaca; hover:border-color: #b91c1c; hover:-translate-y-0.5; hover:shadow-md; active:translate-y-0;">Deselect All</button>
          </div>
          <button id="adminer-copy-preview" style="background: #dcfce7; color: #16a34a; border: 2px solid #16a34a; border-radius: 8px; padding: 12px 24px; cursor: pointer; font-size: 14px; font-weight: 700; transition: all 0.2s; hover:background: #bbf7d0; hover:border-color: #15803d; hover:-translate-y-0.5; hover:shadow-lg; active:translate-y-0;">Copy Selected</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const tableContainer = modal.querySelector('#adminer-preview-table-container');
    const filterInput = modal.querySelector('#adminer-preview-filter');
    const copyTypeSelect = modal.querySelector('#adminer-preview-copy-type');
    const copyFormatSelect = modal.querySelector('#adminer-preview-copy-format');
    
    // Add focus effects untuk input dan select
    if (filterInput) {
      filterInput.addEventListener('focus', function() {
        this.style.borderColor = '#3b82f6';
        this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
      });
      filterInput.addEventListener('blur', function() {
        this.style.borderColor = '#cbd5e0';
        this.style.boxShadow = 'none';
      });
    }
    
    if (copyTypeSelect) {
      copyTypeSelect.addEventListener('focus', function() {
        this.style.borderColor = '#3b82f6';
        this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
      });
      copyTypeSelect.addEventListener('blur', function() {
        this.style.borderColor = '#cbd5e0';
        this.style.boxShadow = 'none';
      });
    }
    
    if (copyFormatSelect) {
      copyFormatSelect.addEventListener('focus', function() {
        this.style.borderColor = '#3b82f6';
        this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
      });
      copyFormatSelect.addEventListener('blur', function() {
        this.style.borderColor = '#cbd5e0';
        this.style.boxShadow = 'none';
      });
    }

    const attachTableEventListeners = () => {
      const newSelectAll = modal.querySelector('#adminer-preview-select-all');
      if (newSelectAll) {
        newSelectAll.addEventListener('change', (e) => {
          modal.querySelectorAll('.adminer-preview-column-select').forEach(cb => { cb.checked = e.target.checked; });
        });
      }
      
      // Expand button hover effect
      modal.querySelectorAll('.adminer-preview-expand-value').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
          this.style.background = '#bfdbfe';
          this.style.borderColor = '#1e3a8a';
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 4px 8px rgba(30, 64, 175, 0.2)';
        });
        btn.addEventListener('mouseleave', function() {
          this.style.background = '#dbeafe';
          this.style.borderColor = '#1e40af';
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = 'none';
        });
      });
      
      // Copy value button
      modal.querySelectorAll('.adminer-preview-copy-value').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
          this.style.background = '#bbf7d0';
          this.style.borderColor = '#15803d';
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 4px 8px rgba(22, 163, 74, 0.2)';
        });
        btn.addEventListener('mouseleave', function() {
          this.style.background = '#dcfce7';
          this.style.borderColor = '#16a34a';
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = 'none';
        });
        btn.addEventListener('click', async (e) => {
          e.preventDefault(); e.stopPropagation();
          
          // Ambil data dari valueDiv
          // Gunakan rawValue jika ada (dengan HTML tags), jika tidak gunakan textContent
          const valueId = btn.dataset.valueId || btn.closest('tr')?.querySelector('.adminer-preview-value-cell')?.id;
          let valueToCopy = '';
          let columnName = '';
          
          if (valueId) {
            const valueDiv = document.getElementById(valueId);
            if (valueDiv) {
              // Ambil nama kolom dari row (kolom kedua)
              const row = valueDiv.closest('tr');
              if (row) {
                const columnCell = row.querySelector('td:nth-child(2)');
                if (columnCell) {
                  columnName = columnCell.textContent.trim();
                }
              }
              
              // Cek apakah ada expand button dan belum expanded
              const expandBtn = row?.querySelector('.adminer-preview-expand-value[data-value-id="' + valueId + '"]');
              const isExpanded = expandBtn?.dataset.expanded === 'true';
              
              // Jika ada expand button dan belum expanded, expand dulu
              if (expandBtn && !isExpanded) {
                // Tampilkan loading indicator
                const origBtnHtml = btn.innerHTML;
                btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dashoffset" dur="1s" values="31.416;0" repeatCount="indefinite"/></circle></svg>';
                btn.disabled = true;
                
                // Trigger expand dengan dispatchEvent untuk memastikan handler terpanggil
                const clickEvent = new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  view: window
                });
                expandBtn.dispatchEvent(clickEvent);
                
                // Tunggu data lengkap muncul (polling dengan timeout)
                const startLength = valueDiv.textContent.length;
                let attempts = 0;
                const maxAttempts = 50; // 5 detik (50 * 100ms)
                
                while (attempts < maxAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                  const currentLength = valueDiv.textContent.length;
                  
                  // Cek apakah data sudah lebih panjang atau expand button sudah expanded
                  if (currentLength > startLength || expandBtn.dataset.expanded === 'true') {
                    // Tunggu sedikit lagi untuk memastikan data sudah lengkap
                    await new Promise(resolve => setTimeout(resolve, 300));
                    break;
                  }
                  attempts++;
                }
                
                // Restore button
                btn.innerHTML = origBtnHtml;
                btn.disabled = false;
              }
              
              // Gunakan textContent sebagai primary source (sudah menampilkan data dengan benar termasuk HTML tags sebagai text)
              valueToCopy = valueDiv.textContent || valueDiv.innerText || '';
              
              // Jika textContent kosong atau terlalu pendek, coba dari rawValue
              if (!valueToCopy || valueToCopy.trim().length < 2) {
                if (valueDiv.dataset.rawValue) {
                  try {
                    // Decode HTML entities dulu sebelum parse JSON
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = valueDiv.dataset.rawValue;
                    const decodedRawValue = tempDiv.textContent || tempDiv.innerText || valueDiv.dataset.rawValue;
                    
                    // Coba parse sebagai JSON
                    const rawData = JSON.parse(decodedRawValue);
                    valueToCopy = rawData.raw || decodedRawValue;
                  } catch (e) {
                    // Jika bukan JSON, gunakan decoded value langsung
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = valueDiv.dataset.rawValue;
                    valueToCopy = tempDiv.textContent || tempDiv.innerText || valueDiv.dataset.rawValue;
                  }
                }
              }
            }
          }
          
          // Fallback: gunakan dataset.value jika valueDiv tidak ditemukan
          if (!valueToCopy && btn.dataset.value) {
            valueToCopy = btn.dataset.value;
          }
          
          const success = await copyToClipboard(valueToCopy.trim());
          if (success) {
            // Tampilkan toast dengan nama kolom
            const toastMessage = columnName 
              ? `Berhasil copy kolom: ${columnName}` 
              : 'Berhasil copy data!';
            showToast(toastMessage, 'success', 2000);
            
            const orig = btn.innerHTML;
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
          } else {
            showToast('Gagal copy data!', 'error', 2000);
          }
        }, true);
      });
      
      // Event delegation untuk expand/collapse button - lebih reliable
      // Hapus listener lama jika ada
      if (tableContainer._adminerExpandHandler) {
        tableContainer.removeEventListener('click', tableContainer._adminerExpandHandler, true);
      }
      
      tableContainer._adminerExpandHandler = async (e) => {
        const expandBtn = e.target.closest('.adminer-preview-expand-value');
        if (!expandBtn) return;
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const valueId = expandBtn.dataset.valueId;
        if (!valueId) {
          console.error('[Adminer Ext] ❌ valueId tidak ditemukan di button');
          return;
        }
        
        // Extract column index dari valueId (format: adminer-preview-value-{idx})
        const columnIdx = parseInt(valueId.replace('adminer-preview-value-', ''));
        if (isNaN(columnIdx)) {
          console.error('[Adminer Ext] ❌ Column index tidak valid:', valueId);
          return;
        }
        
        const valueDiv = document.getElementById(valueId);
        if (!valueDiv) {
          console.error('[Adminer Ext] ❌ Value div tidak ditemukan:', valueId);
          return;
        }
        
        const isExpanded = expandBtn.dataset.expanded === 'true';
        console.log('[Adminer Ext] 🔄 Toggle expand:', { 
          valueId, 
          columnIdx,
          isExpanded, 
          currentMaxHeight: valueDiv.style.maxHeight,
          valueLength: valueDiv.textContent.length
        });
        
        if (isExpanded) {
          // Collapse
          valueDiv.style.maxHeight = '200px';
          valueDiv.style.height = '';
          valueDiv.style.overflowY = 'auto';
          valueDiv.style.overflowX = 'auto';
          expandBtn.textContent = '📖 Expand';
          expandBtn.dataset.expanded = 'false';
          expandBtn.title = 'Klik untuk melihat data lengkap';
          expandBtn.style.background = '#2196F3';
        } else {
          // Expand - ambil data lengkap dari cell asli Adminer dengan simulasi CTRL+Click
          // Tampilkan loading indicator
          expandBtn.textContent = '⏳ Loading...';
          expandBtn.style.background = '#FF9800';
          expandBtn.disabled = true;
          
          // Langsung expand UI dulu untuk feedback cepat
          valueDiv.style.maxHeight = 'none';
          valueDiv.style.height = 'auto';
          valueDiv.style.overflowY = 'visible';
          valueDiv.style.overflowX = 'auto';
          
          try {
            const table = findAdminerTable();
            if (table) {
              // Cari row yang sesuai berdasarkan rowIndex
              const directRows = Array.from(document.querySelectorAll('table tbody tr'));
              const tableRows = directRows.filter(r => r.closest('table') === table);
              
              if (rowIndex >= 0 && rowIndex < tableRows.length) {
                const targetRow = tableRows[rowIndex];
                const cells = targetRow.querySelectorAll('td, th');
                
                // Cari cell index yang sesuai dengan column index
                // Perlu mapping karena preview sudah filter kolom
                const tableData = extractTableData(table);
                if (tableData && columnIdx < tableData.headers.length) {
                  const headerName = tableData.headers[columnIdx];
                  
                  // Cari cell berdasarkan header name
                  const headerRow = table.querySelector('thead tr');
                  let targetCellIndex = -1;
                  
                  if (headerRow) {
                    headerRow.querySelectorAll('th').forEach((th, idx) => {
                      if (th.classList.contains('adminer-checkbox-header') || 
                          th.classList.contains('adminer-action-header')) return;
                      const link = th.querySelector('a');
                      const text = link ? link.textContent.trim() : th.textContent.trim();
                      if (text && text.toLowerCase() !== 'modify' && text === headerName) {
                        targetCellIndex = idx;
                      }
                    });
                  }
                  
                  if (targetCellIndex >= 0 && cells[targetCellIndex]) {
                    const originalCell = cells[targetCellIndex];
                    
                    // Debug: Log informasi penting saja (dikurangi untuk performa)
                    console.log('[Adminer Ext] 🔍 Cell asli ditemukan:', { 
                      targetCellIndex, 
                      headerName,
                      currentTextLength: originalCell.textContent.length,
                      hasTitle: !!originalCell.title,
                      titleLength: originalCell.title?.length || 0
                    });
                    
                    // Coba ambil data lengkap dari berbagai sumber tanpa membuka edit mode
                    let fullData = null;
                    
                    // 1. Cek title attribute (Adminer kadang simpan data lengkap di sini)
                    if (originalCell.title && originalCell.title.length > valueDiv.textContent.length) {
                      fullData = originalCell.title;
                      console.log('[Adminer Ext] ✅ Data lengkap ditemukan di title attribute');
                    }
                    
                    // 2. Cek data attributes
                    if (!fullData) {
                      for (const key in originalCell.dataset) {
                        const dataValue = originalCell.dataset[key];
                        if (dataValue && dataValue.length > valueDiv.textContent.length) {
                          fullData = dataValue;
                          console.log('[Adminer Ext] ✅ Data lengkap ditemukan di data attribute:', key);
                          break;
                        }
                      }
                    }
                    
                    // 3. Cek innerHTML untuk data lengkap (mungkin ada di hidden element)
                    if (!fullData) {
                      // Cek semua child elements untuk data lengkap
                      const allChildren = originalCell.querySelectorAll('*');
                      for (const child of allChildren) {
                        const childText = child.textContent || child.innerText || child.value;
                        if (childText && childText.trim().length > valueDiv.textContent.length) {
                          fullData = childText.trim();
                          console.log('[Adminer Ext] ✅ Data lengkap ditemukan di child element:', child.tagName);
                          break;
                        }
                      }
                      
                      // Jika belum, cek innerHTML secara keseluruhan
                      if (!fullData) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = originalCell.innerHTML;
                        const allText = tempDiv.textContent || tempDiv.innerText;
                        if (allText && allText.trim().length > valueDiv.textContent.length) {
                          fullData = allText.trim();
                          console.log('[Adminer Ext] ✅ Data lengkap ditemukan di innerHTML');
                        }
                      }
                      
                      // Cek juga textarea, input, atau pre/code yang mungkin ada
                      if (!fullData) {
                        const textarea = originalCell.querySelector('textarea');
                        const input = originalCell.querySelector('input[type="text"], input[type="hidden"]');
                        const pre = originalCell.querySelector('pre');
                        const code = originalCell.querySelector('code');
                        
                        if (textarea && textarea.value && textarea.value.length > valueDiv.textContent.length) {
                          fullData = textarea.value;
                          console.log('[Adminer Ext] ✅ Data lengkap ditemukan di textarea');
                        } else if (input && input.value && input.value.length > valueDiv.textContent.length) {
                          fullData = input.value;
                          console.log('[Adminer Ext] ✅ Data lengkap ditemukan di input');
                        } else if (pre && pre.textContent && pre.textContent.length > valueDiv.textContent.length) {
                          fullData = pre.textContent;
                          console.log('[Adminer Ext] ✅ Data lengkap ditemukan di pre');
                        } else if (code && code.textContent && code.textContent.length > valueDiv.textContent.length) {
                          fullData = code.textContent;
                          console.log('[Adminer Ext] ✅ Data lengkap ditemukan di code');
                        }
                      }
                    }
                    
                    // 4. Fetch langsung dari URL edit Adminer untuk ambil data lengkap (prioritas tinggi)
                    if (!fullData) {
                      console.log('[Adminer Ext] 🔄 Mencoba fetch langsung dari URL edit Adminer...');
                      
                      // Update button untuk menunjukkan sedang loading
                      expandBtn.textContent = '⏳ Fetching...';
                      expandBtn.style.background = '#FF9800';
                      
                      try {
                        // Cari table name dan primary key dari URL atau dari table
                        const table = findAdminerTable();
                        if (table) {
                          // Cari table name dari URL halaman saat ini
                          const currentUrl = window.location.href;
                          const urlParams = new URLSearchParams(window.location.search);
                          const tableName = urlParams.get('select') || urlParams.get('table');
                          
                          if (tableName) {
                            // Cari primary key value dari row
                            // Biasanya primary key ada di kolom dengan nama 'id' atau kolom pertama
                            const rowData = tableData.data[rowIndex];
                            let primaryKeyValue = null;
                            let primaryKeyName = 'id'; // Default
                            
                            // Coba cari kolom 'id' terlebih dahulu (paling umum)
                            const idColumnIndex = tableData.headers.findIndex(h => h.toLowerCase() === 'id');
                            if (idColumnIndex >= 0 && rowData.data[idColumnIndex]) {
                              const rawValue = rowData.data[idColumnIndex];
                              // Pastikan value adalah string, bukan array/object
                              if (typeof rawValue === 'string' && rawValue !== 'NULL' && rawValue.trim() !== '') {
                                primaryKeyValue = rawValue;
                                primaryKeyName = tableData.headers[idColumnIndex];
                                console.log('[Adminer Ext] ✅ Primary key ditemukan (id):', { name: primaryKeyName, value: primaryKeyValue.substring(0, 50), type: typeof rawValue });
                              } else {
                                console.warn('[Adminer Ext] ⚠️ Primary key value bukan string:', { name: tableData.headers[idColumnIndex], value: rawValue, type: typeof rawValue, isArray: Array.isArray(rawValue) });
                              }
                            } 
                            // Jika tidak ada 'id', coba kolom pertama yang tidak NULL
                            if (!primaryKeyValue) {
                              for (let i = 0; i < tableData.headers.length; i++) {
                                const rawValue = rowData.data[i];
                                // Pastikan value adalah string, bukan array/object
                                if (rawValue && typeof rawValue === 'string' && rawValue !== 'NULL' && rawValue.trim() !== '') {
                                  primaryKeyValue = rawValue;
                                  primaryKeyName = tableData.headers[i];
                                  console.log('[Adminer Ext] ✅ Primary key ditemukan (kolom pertama):', { name: primaryKeyName, value: primaryKeyValue.substring(0, 50), type: typeof rawValue });
                                  break;
                                } else if (rawValue && (typeof rawValue !== 'string' || Array.isArray(rawValue))) {
                                  console.warn('[Adminer Ext] ⚠️ Skip kolom (bukan string):', { name: tableData.headers[i], value: rawValue, type: typeof rawValue, isArray: Array.isArray(rawValue) });
                                }
                              }
                            }
                            
                            // Validasi: pastikan primary key value adalah string yang valid
                            // Convert ke string jika perlu, dan pastikan bukan array/object
                            let pkValueStr = null;
                            if (primaryKeyValue) {
                              if (typeof primaryKeyValue === 'string') {
                                pkValueStr = primaryKeyValue.trim();
                              } else if (typeof primaryKeyValue === 'number') {
                                pkValueStr = String(primaryKeyValue);
                              } else if (Array.isArray(primaryKeyValue)) {
                                console.warn('[Adminer Ext] ⚠️ Primary key value adalah array, skip:', primaryKeyValue);
                                pkValueStr = null;
                              } else if (typeof primaryKeyValue === 'object') {
                                console.warn('[Adminer Ext] ⚠️ Primary key value adalah object, skip:', primaryKeyValue);
                                pkValueStr = null;
                              } else {
                                pkValueStr = String(primaryKeyValue).trim();
                              }
                            }
                            
                            if (pkValueStr && pkValueStr !== '') {
                              // Build URL edit - hanya ambil parameter penting, hapus yang tidak perlu
                              const baseUrl = currentUrl.split('?')[0];
                              const newParams = new URLSearchParams();
                              
                              // Ambil parameter penting dari URL saat ini
                              if (urlParams.get('pgsql')) newParams.set('pgsql', urlParams.get('pgsql'));
                              if (urlParams.get('username')) newParams.set('username', urlParams.get('username'));
                              if (urlParams.get('db')) newParams.set('db', urlParams.get('db'));
                              if (urlParams.get('ns')) newParams.set('ns', urlParams.get('ns'));
                              
                              // Set edit parameter
                              newParams.set('edit', tableName);
                              
                              // Format where parameter sesuai Adminer: where[column_name]=value
                              // pkValueStr sudah di-validasi di atas
                              newParams.set(`where[${primaryKeyName}]`, pkValueStr);
                              
                              const editUrl = `${baseUrl}?${newParams.toString()}`;
                              
                              // Log URL details (dikurangi untuk performa)
                              console.log('[Adminer Ext] 🔍 Fetching edit URL:', editUrl.substring(0, 150));
                              
                              // Fetch URL edit dengan timeout lebih cepat
                              const controller = new AbortController();
                              const timeoutId = setTimeout(() => controller.abort(), 3000); // Timeout 3 detik
                              
                              const response = await fetch(editUrl, {
                                method: 'GET',
                                credentials: 'include',
                                signal: controller.signal,
                                headers: {
                                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                  'X-Requested-With': 'XMLHttpRequest'
                                }
                              });
                              
                              clearTimeout(timeoutId);
                              
                              if (response.ok) {
                                const html = await response.text();
                                
                                // Cek apakah response adalah error page
                                if (html.includes('Fatal error') || html.includes('Uncaught TypeError') || html.includes('Stack trace')) {
                                  console.error('[Adminer Ext] ❌ Response adalah error page, skip parsing');
                                  console.error('[Adminer Ext] ❌ Error details:', html.substring(0, 500));
                                } else {
                                  // Optimasi: gunakan DOMParser untuk parsing lebih cepat
                                  const parser = new DOMParser();
                                  const doc = parser.parseFromString(html, 'text/html');
                                  const tempDiv = doc.body || doc.documentElement;
                                  
                                  // Cari textarea dengan name sesuai column name
                                  // Format: name='fields[column_name]' atau name="fields[column_name]"
                                  const columnName = tableData.headers[columnIdx];
                                  const expectedName = `fields[${columnName}]`;
                                  
                                  // Gunakan querySelectorAll dan filter manual untuk menghindari masalah dengan kurung siku
                                  const allTextareas = tempDiv.querySelectorAll('textarea');
                                  let textarea = null;
                                  
                                  for (const ta of allTextareas) {
                                    const nameAttr = ta.getAttribute('name');
                                    // Match exact: fields[column_name]
                                    if (nameAttr === expectedName) {
                                      textarea = ta;
                                      console.log('[Adminer Ext] ✅ Textarea ditemukan (exact match):', { 
                                        columnName, 
                                        nameAttr,
                                        valuePreview: (ta.textContent || ta.value || '').substring(0, 50)
                                      });
                                      break;
                                    }
                                    // Fallback: coba match tanpa quotes
                                    else if (nameAttr && nameAttr.replace(/['"]/g, '') === expectedName) {
                                      textarea = ta;
                                      console.log('[Adminer Ext] ✅ Textarea ditemukan (match tanpa quotes):', { 
                                        columnName, 
                                        nameAttr,
                                        valuePreview: (ta.textContent || ta.value || '').substring(0, 50)
                                      });
                                      break;
                                    }
                                  }
                                  
                                  // Debug: log semua textarea jika tidak ditemukan
                                  if (!textarea) {
                                    console.warn('[Adminer Ext] ⚠️ Textarea tidak ditemukan untuk column:', columnName, 'expected:', expectedName);
                                    console.log('[Adminer Ext] 🔍 Semua textarea yang ada:', Array.from(allTextareas).map(t => {
                                      try {
                                        const textValue = t.textContent || t.value || '';
                                        const preview = safeSubstring(textValue, 0, 30);
                                        return {
                                          name: t.getAttribute('name'),
                                          valuePreview: preview
                                        };
                                      } catch (err) {
                                        return {
                                          name: t.getAttribute('name'),
                                          valuePreview: '[Error reading value]'
                                        };
                                      }
                                    }));
                                  }
                                  
                                  if (textarea) {
                                    // Baca value dari textarea (bisa textContent atau value)
                                    // Ambil raw value dari textarea (bisa textContent atau value)
                                    // textContent akan decode HTML entities, value akan ambil as-is
                                    let rawValue = textarea.value || textarea.textContent || textarea.innerText || '';
                                    
                                    // Simpan raw value dengan HTML tags (jika ada)
                                    // Jangan decode dulu, kita akan format JSON jika perlu
                                    let decodedValue = rawValue;
                                    
                                    // Jika value kosong, coba dari textContent (untuk HTML content)
                                    if (!rawValue || rawValue.trim() === '') {
                                      rawValue = textarea.textContent || textarea.innerText || '';
                                      decodedValue = rawValue;
                                    }
                                    
                                    const currentValue = valueDiv.textContent.trim();
                                    // Gunakan rawValue untuk comparison (dengan HTML tags)
                                    const fetchedValue = rawValue.trim();
                                    
                                    // Validasi: hanya update jika data yang di-fetch lebih panjang DAN berbeda dari data asli
                                    // Jangan update jika data asli adalah [] atau NULL dan data yang di-fetch sama atau lebih pendek
                                    const isCurrentEmpty = currentValue === '[]' || currentValue === 'NULL' || currentValue === '';
                                    const isFetchedLonger = fetchedValue.length > currentValue.length;
                                    const isFetchedDifferent = fetchedValue !== currentValue;
                                    
                                    try {
                                      console.log('[Adminer Ext] 🔍 Validasi data:', {
                                        columnName,
                                        currentValue: safeSubstring(currentValue, 0, 50),
                                        currentLength: currentValue.length,
                                        fetchedValue: safeSubstring(fetchedValue, 0, 50),
                                        fetchedLength: fetchedValue.length,
                                        isCurrentEmpty,
                                        isFetchedLonger,
                                        isFetchedDifferent,
                                        shouldUpdate: isFetchedLonger && isFetchedDifferent && (!isCurrentEmpty || fetchedValue.length > 2)
                                      });
                                    } catch (logErr) {
                                      console.warn('[Adminer Ext] ⚠️ Error logging validation:', logErr);
                                    }
                                    
                                    // Hanya update jika:
                                    // 1. Data yang di-fetch lebih panjang
                                    // 2. Data berbeda dari yang sudah ada
                                    // 3. Jika data asli kosong ([] atau NULL), pastikan data yang di-fetch benar-benar ada (lebih dari 2 karakter)
                                    if (isFetchedLonger && isFetchedDifferent && (!isCurrentEmpty || fetchedValue.length > 2)) {
                                      // Simpan raw value dengan HTML tags (jika ada)
                                      fullData = rawValue;
                                      
                                      // Format JSON jika terdeteksi sebagai JSON
                                      let displayValue = fullData.trim();
                                      const trimmed = displayValue.trim();
                                      
                                      // Cek apakah ini JSON object atau array
                                      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                                          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                                        try {
                                          const parsed = JSON.parse(trimmed);
                                          displayValue = JSON.stringify(parsed, null, 2);
                                          console.log('[Adminer Ext] ✅ JSON formatted');
                                        } catch (e) {
                                          // Bukan JSON valid, gunakan as-is
                                          console.log('[Adminer Ext] ⚠️ Bukan JSON valid, gunakan as-is');
                                        }
                                      }
                                      
                                      // Simpan raw value untuk copy (dengan HTML jika ada)
                                      valueDiv.dataset.rawValue = fullData;
                                      
                                      // Tampilkan dengan textContent untuk preserve HTML tags sebagai text
                                      // HTML tags akan ditampilkan sebagai text (tidak di-render)
                                      valueDiv.textContent = displayValue;
                                      
                                      // Set style untuk monospace font untuk JSON dan formatting
                                      valueDiv.style.fontFamily = "'Courier New', 'Monaco', 'Consolas', monospace";
                                      valueDiv.style.fontSize = '13px';
                                      valueDiv.style.lineHeight = '1.6';
                                      valueDiv.style.whiteSpace = 'pre-wrap';
                                      valueDiv.style.wordBreak = 'break-word';
                                      
                                      expandBtn.textContent = '📕 Collapse';
                                      expandBtn.dataset.expanded = 'true';
                                      expandBtn.style.background = '#4CAF50';
                                      expandBtn.disabled = false;
                                      try {
                                        console.log('[Adminer Ext] ✅ Data lengkap diambil dari edit URL:', { 
                                          columnName, 
                                          rawLength: rawValue.length,
                                          decodedLength: fetchedValue.length,
                                          preview: safeSubstring(fetchedValue, 0, 100)
                                        });
                                      } catch (logErr) {
                                        console.warn('[Adminer Ext] ⚠️ Error logging success:', logErr);
                                      }
                                      // Data sudah ditemukan dan di-update, skip langkah selanjutnya
                                      // Button state sudah di-update di atas, langsung exit
                                      return;
                                    } else {
                                      try {
                                        console.warn('[Adminer Ext] ⚠️ Data dari edit URL tidak valid untuk update:', {
                                          columnName,
                                          reason: !isFetchedLonger ? 'Data tidak lebih panjang' : 
                                                  !isFetchedDifferent ? 'Data sama dengan yang sudah ada' :
                                                  isCurrentEmpty && fetchedValue.length <= 2 ? 'Data asli kosong dan fetched data terlalu pendek' : 'Unknown',
                                          currentValue: safeSubstring(currentValue, 0, 30),
                                          fetchedValue: safeSubstring(fetchedValue, 0, 30)
                                        });
                                      } catch (logErr) {
                                        console.warn('[Adminer Ext] ⚠️ Error logging warning:', logErr);
                                      }
                                    }
                                  } else {
                                    console.warn('[Adminer Ext] ⚠️ Textarea tidak ditemukan untuk column:', columnName);
                                    // Debug: list semua textarea yang ada
                                    const allTextareasFound = tempDiv.querySelectorAll('textarea');
                                    console.log('[Adminer Ext] 🔍 Textareas yang ditemukan:', Array.from(allTextareasFound).map(t => ({
                                      name: t.getAttribute('name'),
                                      hasValue: !!(t.textContent || t.value)
                                    })));
                                  }
                                }
                              } else {
                                const errorText = await response.text().catch(() => '');
                                console.error('[Adminer Ext] ❌ Error fetching edit URL:', response.status, response.statusText, errorText.substring(0, 200));
                              }
                            } else {
                              console.warn('[Adminer Ext] ⚠️ Primary key value tidak ditemukan');
                            }
                          } else {
                            console.warn('[Adminer Ext] ⚠️ Table name tidak ditemukan dari URL');
                          }
                        }
                      } catch (err) {
                        if (err.name === 'AbortError') {
                          console.warn('[Adminer Ext] ⚠️ Fetch timeout (3 detik), skip...');
                        } else {
                          console.error('[Adminer Ext] ❌ Error saat fetch edit URL:', err);
                        }
                        // Update button state meskipun error
                        expandBtn.textContent = '📕 Collapse';
                        expandBtn.dataset.expanded = 'true';
                        expandBtn.style.background = '#4CAF50';
                        expandBtn.disabled = false;
                      }
                    }
                    
                    // 5. Intercept fetch request saat CTRL+Click untuk ambil data dari response (fallback - skip jika sudah ada data)
                    if (!fullData) {
                      console.log('[Adminer Ext] 🔄 Mencoba intercept fetch untuk ambil data lengkap...');
                      
                      // Setup interceptor sementara untuk catch fetch request
                      let fetchData = null;
                      const originalFetch = window.fetch;
                      const tempFetchInterceptor = async function(...args) {
                        const response = await originalFetch.apply(this, args);
                        const url = args[0]?.toString() || '';
                        
                        // Cek jika ini request untuk data cell (biasanya mengandung parameter khusus)
                        if (url.includes('select=') || url.includes('edit=') || url.includes('where=')) {
                          console.log('[Adminer Ext] 🔍 Fetch request terdeteksi:', url.substring(0, 150));
                          
                          try {
                            const clonedResponse = response.clone();
                            const html = await clonedResponse.text();
                            
                            // Optimasi: gunakan DOMParser untuk parsing lebih cepat
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(html, 'text/html');
                            const tempDiv = doc.body || doc.documentElement;
                            
                            // Cari textarea yang sesuai dengan column name
                            const columnName = tableData.headers[columnIdx];
                            const expectedName = `fields[${columnName}]`;
                            const allTextareas = tempDiv.querySelectorAll('textarea');
                            
                            let matchedTextarea = null;
                            for (const ta of allTextareas) {
                              const nameAttr = ta.getAttribute('name');
                              if (nameAttr === expectedName || nameAttr?.replace(/['"]/g, '') === expectedName) {
                                matchedTextarea = ta;
                                break;
                              }
                            }
                            
                            if (matchedTextarea) {
                              const textareaValue = matchedTextarea.textContent || matchedTextarea.value || '';
                              const currentValue = valueDiv.textContent.trim();
                              const isCurrentEmpty = currentValue === '[]' || currentValue === 'NULL' || currentValue === '';
                              
                              // Hanya ambil jika lebih panjang, berbeda, dan jika current kosong, pastikan fetched lebih dari 2 karakter
                              if (textareaValue.trim().length > currentValue.length && 
                                  textareaValue.trim() !== currentValue &&
                                  (!isCurrentEmpty || textareaValue.trim().length > 2)) {
                                fetchData = textareaValue.trim();
                                console.log('[Adminer Ext] ✅ Data lengkap ditemukan di textarea (intercept):', {
                                  columnName,
                                  currentLength: currentValue.length,
                                  fetchedLength: textareaValue.trim().length
                                });
                              }
                            } else {
                              // Fallback: cari text yang lebih panjang (tapi lebih hati-hati)
                              const allText = tempDiv.textContent || tempDiv.innerText;
                              const currentValue = valueDiv.textContent.trim();
                              const isCurrentEmpty = currentValue === '[]' || currentValue === 'NULL' || currentValue === '';
                              
                              if (allText && allText.trim().length > currentValue.length && 
                                  allText.trim() !== currentValue &&
                                  (!isCurrentEmpty || allText.trim().length > 2)) {
                                // Coba extract dari pre atau code
                                const pre = tempDiv.querySelector('pre');
                                const code = tempDiv.querySelector('code');
                                
                                if (pre && pre.textContent && pre.textContent.trim().length > currentValue.length) {
                                  fetchData = pre.textContent.trim();
                                  console.log('[Adminer Ext] ✅ Data lengkap ditemukan di pre (intercept)');
                                } else if (code && code.textContent && code.textContent.trim().length > currentValue.length) {
                                  fetchData = code.textContent.trim();
                                  console.log('[Adminer Ext] ✅ Data lengkap ditemukan di code (intercept)');
                                }
                              }
                            }
                          } catch (err) {
                            console.error('[Adminer Ext] ❌ Error membaca fetch response:', err);
                          }
                        }
                        
                        return response;
                      };
                      
                      // Pasang interceptor sementara
                      window.fetch = tempFetchInterceptor;
                      
                      // Intercept edit mode - cegah form edit terbuka
                      const preventEditMode = (e) => {
                        if (e.target.closest('form') || e.target.closest('[action*="edit"]')) {
                          e.preventDefault();
                          e.stopPropagation();
                          e.stopImmediatePropagation();
                          return false;
                        }
                      };
                      
                      document.addEventListener('submit', preventEditMode, true);
                      document.addEventListener('click', preventEditMode, true);
                      
                      // Setup observer untuk detect popup muncul
                      let popupObserver = null;
                      const popupPromise = new Promise((resolve) => {
                        popupObserver = new MutationObserver((mutations) => {
                          const popup = document.querySelector('.jush, .popup, [class*="popup"], [id*="popup"], [class*="modal"]:not(#adminer-row-preview-modal):not(#adminer-column-toggle-modal)');
                          if (popup && !popup.id?.startsWith('adminer-')) {
                            if (!popup.querySelector('form[action*="edit"]') && !popup.querySelector('input[type="submit"][value*="Save"]')) {
                              resolve(popup);
                            }
                          }
                        });
                        popupObserver.observe(document.body, { childList: true, subtree: true });
                      });
                      
                      // Simulasi CTRL+Click
                      const ctrlClickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        ctrlKey: true,
                        button: 0,
                        view: window
                      });
                      originalCell.dispatchEvent(ctrlClickEvent);
                      
                      // Tunggu popup atau fetch data (max 1 detik - lebih cepat)
                      try {
                        const [adminerPopup, _] = await Promise.race([
                          Promise.all([
                            popupPromise,
                            new Promise(resolve => setTimeout(() => resolve(null), 1000))
                          ]),
                          new Promise(resolve => setTimeout(() => resolve([null, null]), 1000))
                        ]);
                        
                        // Tunggu sebentar untuk fetch interceptor (lebih cepat)
                        await new Promise(resolve => setTimeout(resolve, 150));
                        
                        if (popupObserver) popupObserver.disconnect();
                        
                        // Gunakan data dari fetch interceptor jika ada
                        if (fetchData) {
                          fullData = fetchData;
                          // Langsung update UI
                          valueDiv.textContent = fullData.trim();
                          expandBtn.textContent = '📕 Collapse';
                          expandBtn.dataset.expanded = 'true';
                          expandBtn.style.background = '#4CAF50';
                          expandBtn.disabled = false;
                          console.log('[Adminer Ext] ✅ Data lengkap diambil dari fetch interceptor');
                        } else if (adminerPopup) {
                          console.log('[Adminer Ext] ✅ Popup Adminer muncul, ambil data...');
                          const popupText = adminerPopup.textContent || adminerPopup.innerText;
                          if (popupText && popupText.trim().length > valueDiv.textContent.length) {
                            fullData = popupText.trim();
                            // Langsung update UI
                            valueDiv.textContent = fullData.trim();
                            expandBtn.textContent = '📕 Collapse';
                            expandBtn.dataset.expanded = 'true';
                            expandBtn.style.background = '#4CAF50';
                            expandBtn.disabled = false;
                            console.log('[Adminer Ext] ✅ Data lengkap diambil dari popup Adminer');
                          }
                        }
                        
                        // Update button state jika tidak ada data
                        if (!fullData) {
                          expandBtn.textContent = '📕 Collapse';
                          expandBtn.dataset.expanded = 'true';
                          expandBtn.style.background = '#4CAF50';
                          expandBtn.disabled = false;
                        }
                        
                        // TUTUP POPUP SECARA AGRESIF
                        if (adminerPopup) {
                          const closePopup = () => {
                            if (!adminerPopup || !adminerPopup.parentElement) return;
                            
                            const closeBtn = adminerPopup.querySelector('button, .close, [onclick*="close"], [onclick*="Close"], input[type="button"][value*="close" i], [aria-label*="close" i]');
                            if (closeBtn) {
                              closeBtn.click();
                              return;
                            }
                            
                            const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true });
                            adminerPopup.dispatchEvent(escEvent);
                            window.dispatchEvent(escEvent);
                            
                            adminerPopup.style.display = 'none';
                            adminerPopup.style.visibility = 'hidden';
                            adminerPopup.style.opacity = '0';
                            
                            setTimeout(() => {
                              if (adminerPopup.parentElement) {
                                adminerPopup.remove();
                              }
                            }, 100);
                          };
                          
                          closePopup();
                          setTimeout(closePopup, 50);
                          setTimeout(closePopup, 100);
                          setTimeout(closePopup, 200);
                          setTimeout(closePopup, 500);
                        }
                        
                        // Restore fetch interceptor
                        window.fetch = originalFetch;
                        document.removeEventListener('submit', preventEditMode, true);
                        document.removeEventListener('click', preventEditMode, true);
                      } catch (err) {
                        if (popupObserver) popupObserver.disconnect();
                        window.fetch = originalFetch;
                        document.removeEventListener('submit', preventEditMode, true);
                        document.removeEventListener('click', preventEditMode, true);
                        console.error('[Adminer Ext] ❌ Error saat menunggu popup:', err);
                      }
                    }
                    
                    // Update valueDiv dengan data lengkap jika ditemukan
                    const currentValue = valueDiv.textContent.trim();
                    const isCurrentEmpty = currentValue === '[]' || currentValue === 'NULL' || currentValue === '';
                    
                    // Validasi: hanya update jika:
                    // 1. fullData ada dan lebih panjang
                    // 2. fullData berbeda dari current value
                    // 3. Jika current kosong, pastikan fullData lebih dari 2 karakter (bukan hanya whitespace)
                    if (fullData && 
                        fullData.trim().length > currentValue.length && 
                        fullData.trim() !== currentValue &&
                        (!isCurrentEmpty || fullData.trim().length > 2)) {
                      valueDiv.textContent = fullData.trim();
                      try {
                        const oldVal = safeSubstring(currentValue, 0, 30);
                        const newVal = safeSubstring(fullData.trim(), 0, 30);
                        console.log('[Adminer Ext] ✅ Data lengkap di-update:', { 
                          oldValue: oldVal,
                          oldLength: currentValue.length, 
                          newValue: newVal,
                          newLength: fullData.trim().length,
                          improvement: fullData.trim().length - currentValue.length
                        });
                      } catch (logErr) {
                        console.warn('[Adminer Ext] ⚠️ Error logging update:', logErr);
                      }
                    } else {
                      if (fullData) {
                        try {
                          const currVal = safeSubstring(currentValue, 0, 30);
                          const fullVal = safeSubstring(fullData.trim(), 0, 30);
                          console.warn('[Adminer Ext] ⚠️ Data tidak di-update karena validasi gagal:', {
                            currentValue: currVal,
                            currentLength: currentValue.length,
                            fullData: fullVal,
                            fullDataLength: fullData.trim().length,
                            isCurrentEmpty,
                            reason: !fullData.trim() ? 'fullData kosong' :
                                    fullData.trim().length <= currentValue.length ? 'fullData tidak lebih panjang' :
                                    fullData.trim() === currentValue ? 'fullData sama dengan current' :
                                    isCurrentEmpty && fullData.trim().length <= 2 ? 'current kosong dan fullData terlalu pendek' : 'unknown'
                          });
                        } catch (logErr) {
                          console.warn('[Adminer Ext] ⚠️ Error logging validation failure:', logErr);
                        }
                      }
                      // Jika data tidak ditemukan, coba ambil dari cell asli dengan cara berbeda
                      // Mungkin data lengkap ada tapi terpotong karena CSS atau truncation
                      const cellClone = originalCell.cloneNode(true);
                      // Hapus semua style yang mungkin membatasi tampilan
                      cellClone.querySelectorAll('*').forEach(el => {
                        el.style.maxWidth = 'none';
                        el.style.overflow = 'visible';
                        el.style.textOverflow = 'clip';
                        el.style.whiteSpace = 'pre-wrap';
                      });
                      
                      const clonedText = cellClone.textContent || cellClone.innerText;
                      if (clonedText && clonedText.trim().length > valueDiv.textContent.length) {
                        valueDiv.textContent = clonedText.trim();
                        console.log('[Adminer Ext] ✅ Data diambil dari cell clone (tanpa style limit):', { length: clonedText.trim().length });
                      } else {
                        console.warn('[Adminer Ext] ⚠️ Data lengkap tidak ditemukan. Data mungkin sudah terpotong di source Adminer.');
                        console.warn('[Adminer Ext] ⚠️ Cell info:', {
                          textContent: originalCell.textContent.length,
                          innerHTML: originalCell.innerHTML.length,
                          title: originalCell.title?.length || 0
                        });
                      }
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('[Adminer Ext] ❌ Error saat mengambil data lengkap:', err);
            // Pastikan button state di-update meskipun error
            expandBtn.textContent = '📕 Collapse';
            expandBtn.dataset.expanded = 'true';
            expandBtn.style.background = '#4CAF50';
            expandBtn.disabled = false;
          } finally {
            // Pastikan button state selalu di-update di akhir
            if (expandBtn.dataset.expanded !== 'true') {
              expandBtn.textContent = '📕 Collapse';
              expandBtn.dataset.expanded = 'true';
              expandBtn.title = 'Klik untuk collapse';
              expandBtn.style.background = '#4CAF50';
              expandBtn.disabled = false;
            }
          }
          
          // Scroll ke element untuk memastikan terlihat (tanpa delay untuk lebih cepat)
          valueDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      };
      
      tableContainer.addEventListener('click', tableContainer._adminerExpandHandler, true);
      console.log('[Adminer Ext] ✅ Expand/collapse event handler di-setup');
    };
    attachTableEventListeners();

    filterInput.addEventListener('input', () => {
      const filterText = filterInput.value.toLowerCase();
      visibleColumns = filterText === ''
        ? tableData.headers.map((_, idx) => idx)
        : tableData.headers.map((h, idx) => ({ h, idx })).filter(({ h }) => h.toLowerCase().includes(filterText)).map(({ idx }) => idx);
      visibleColumns = visibleColumns.filter(idx => !excludedColumns.includes(idx));
      tableContainer.innerHTML = renderTable();
      attachTableEventListeners();
    });

    // Add hover effects untuk buttons
    const selectAllBtn = modal.querySelector('#adminer-preview-select-all-btn');
    const deselectAllBtn = modal.querySelector('#adminer-preview-deselect-all-btn');
    const copyPreviewBtn = modal.querySelector('#adminer-copy-preview');
    const closePreviewBtn = modal.querySelector('#adminer-close-preview');
    
    if (selectAllBtn) {
      selectAllBtn.addEventListener('mouseenter', function() {
        this.style.background = '#bae6fd';
        this.style.borderColor = '#075985';
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 4px 8px rgba(3, 105, 161, 0.2)';
      });
      selectAllBtn.addEventListener('mouseleave', function() {
        this.style.background = '#e0f2fe';
        this.style.borderColor = '#0369a1';
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
      });
      selectAllBtn.addEventListener('click', () => {
        modal.querySelectorAll('.adminer-preview-column-select').forEach(cb => { cb.checked = true; });
      });
    }
    
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('mouseenter', function() {
        this.style.background = '#fecaca';
        this.style.borderColor = '#b91c1c';
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.2)';
      });
      deselectAllBtn.addEventListener('mouseleave', function() {
        this.style.background = '#fee2e2';
        this.style.borderColor = '#dc2626';
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
      });
      deselectAllBtn.addEventListener('click', () => {
        modal.querySelectorAll('.adminer-preview-column-select').forEach(cb => { cb.checked = false; });
      });
    }
    
    if (copyPreviewBtn) {
      copyPreviewBtn.addEventListener('mouseenter', function() {
        this.style.background = '#bbf7d0';
        this.style.borderColor = '#15803d';
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 12px rgba(22, 163, 74, 0.3)';
      });
      copyPreviewBtn.addEventListener('mouseleave', function() {
        this.style.background = '#dcfce7';
        this.style.borderColor = '#16a34a';
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
      });
      copyPreviewBtn.addEventListener('click', async (e) => {
        e.preventDefault(); e.stopPropagation();
        const selectedColumns = Array.from(modal.querySelectorAll('.adminer-preview-column-select:checked'))
          .map(cb => parseInt(cb.dataset.columnIndex));
        if (selectedColumns.length === 0) { showToast('Pilih minimal satu kolom!', 'error', 2500); return; }
        
        // Tampilkan loading indicator
        const origBtnText = copyPreviewBtn.textContent;
        copyPreviewBtn.textContent = '⏳ Expanding...';
        copyPreviewBtn.disabled = true;
        
        // Expand semua kolom yang punya expand button dan belum expanded
        const expandButtons = Array.from(modal.querySelectorAll('.adminer-preview-expand-value'));
        const unexpandedButtons = expandButtons.filter(btn => {
          const isChecked = btn.closest('tr')?.querySelector('.adminer-preview-column-select')?.checked;
          return isChecked && btn.dataset.expanded !== 'true';
        });
        
        // Trigger expand untuk semua yang belum expanded
        const expandPromises = unexpandedButtons.map(async (expandBtn) => {
          const valueId = expandBtn.dataset.valueId;
          if (!valueId) return;
          
          const valueDiv = document.getElementById(valueId);
          if (!valueDiv) return;
          
          const startLength = valueDiv.textContent.length;
          
          // Trigger expand
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          expandBtn.dispatchEvent(clickEvent);
          
          // Tunggu data lengkap muncul (polling dengan timeout)
          let attempts = 0;
          const maxAttempts = 50; // 5 detik
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            const currentLength = valueDiv.textContent.length;
            
            if (currentLength > startLength || expandBtn.dataset.expanded === 'true') {
              // Tunggu sedikit lagi untuk memastikan data sudah lengkap
              await new Promise(resolve => setTimeout(resolve, 300));
              break;
            }
            attempts++;
          }
        });
        
        // Tunggu semua expand selesai
        await Promise.all(expandPromises);
        
        // Update button text
        copyPreviewBtn.textContent = '⏳ Copying...';
        
        // Ambil nama kolom yang dipilih untuk toast
        const tableData = extractTableData(findAdminerTable());
        const selectedColumnNames = selectedColumns
          .map(idx => tableData?.headers[idx])
          .filter(Boolean);
        
        const success = await copyRowPreview(rowIndex, selectedColumns, copyTypeSelect.value, copyFormatSelect.value);
        
        // Restore button
        copyPreviewBtn.textContent = origBtnText;
        copyPreviewBtn.disabled = false;
        
        if (success) {
          const columnNamesText = selectedColumnNames.length > 3 
            ? `${selectedColumnNames.slice(0, 3).join(', ')} dan ${selectedColumnNames.length - 3} kolom lainnya`
            : selectedColumnNames.join(', ');
          showToast(`Berhasil copy ${selectedColumnNames.length} kolom: ${columnNamesText}`, 'success', 3000);
        } else {
          showToast('Gagal copy data!', 'error', 2500);
        }
      }, true);
    }

    if (closePreviewBtn) {
      closePreviewBtn.addEventListener('mouseenter', function() {
        this.style.background = '#64748b';
        this.style.borderColor = '#94a3b8';
        this.style.transform = 'translateY(-1px)';
      });
      closePreviewBtn.addEventListener('mouseleave', function() {
        this.style.background = '#475569';
        this.style.borderColor = '#64748b';
        this.style.transform = 'translateY(0)';
      });
      closePreviewBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation(); modal.remove();
      }, true);
    }

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); }, true);

    const escHandler = (e) => {
      if (e.key === 'Escape' && modal.parentElement) {
        e.preventDefault(); modal.remove();
        document.removeEventListener('keydown', escHandler, true);
      }
    };
    document.addEventListener('keydown', escHandler, true);

  } catch (error) {
    console.error('Error showing preview:', error);
    showToast('Error saat menampilkan preview: ' + error.message, 'error', 3000);
  }
}

// Copy row preview
async function copyRowPreview(rowIndex, selectedColumnIndices, copyType, copyFormat) {
  const table = findAdminerTable();
  if (!table) { showToast('Table tidak ditemukan!', 'error', 2500); return; }

  const tableData = extractTableData(table);
  if (!tableData) { showToast('Gagal membaca data table!', 'error', 2500); return; }

  if (rowIndex < 0 || rowIndex >= tableData.data.length) {
    showToast(`Index baris tidak valid: ${rowIndex}`, 'error', 2500); return;
  }

  const rowData = tableData.data[rowIndex];
  if (!rowData) { showToast('Data baris tidak ditemukan!', 'error', 2500); return; }

  const selectedHeaders = selectedColumnIndices.map(idx => tableData.headers[idx]);
  
  // Ambil data dari modal preview jika ada (untuk mendapatkan data lengkap yang sudah di-expand)
  const modal = document.getElementById('adminer-row-preview-modal');
  const selectedValues = selectedColumnIndices.map(idx => {
    if (modal) {
      // Cari valueDiv di modal preview berdasarkan column index
      const valueId = `adminer-preview-value-${idx}`;
      const valueDiv = modal.querySelector(`#${valueId}`);
      if (valueDiv) {
        // Gunakan textContent dari modal (sudah di-expand dan lengkap)
        const expandedValue = valueDiv.textContent || valueDiv.innerText || '';
        if (expandedValue && expandedValue.trim().length > 0) {
          return expandedValue.trim();
        }
      }
    }
    // Fallback ke data asli jika modal tidak ada atau valueDiv tidak ditemukan
    return rowData.data[idx] || 'NULL';
  });

  let text = '';
  if (copyFormat === 'formatted') {
    if (copyType === 'both') {
      const maxColLen = Math.max(...selectedHeaders.map(h => h.length));
      selectedHeaders.forEach((header, idx) => { text += `${header.padEnd(maxColLen)} : ${selectedValues[idx]}\n`; });
    } else if (copyType === 'column') {
      text = selectedHeaders.join('\n');
    } else {
      text = selectedValues.join('\n');
    }
  } else {
    if (copyType === 'both') text = selectedHeaders.join(',') + '\n' + selectedValues.join(',');
    else if (copyType === 'column') text = selectedHeaders.join(',');
    else text = selectedValues.join(',');
  }

  const success = await copyToClipboard(text);
  // Return success untuk ditangani oleh caller (toast sudah ditangani di caller)
  return success;
}

// Tombol di form Adminer
function addButtonsToAdminerForm() {
  if (document.getElementById('adminer-copy-all-btn')) return;

  const pageTitle = document.querySelector('h1')?.textContent?.toLowerCase() || '';
  if (pageTitle === 'select database' || pageTitle === 'select schema') return;

  const table = findAdminerTable();
  if (!table) return;

  const selectButton = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(btn => {
    const text = btn.textContent.trim() || btn.value;
    return text === 'Select' || text.toLowerCase().includes('select');
  });
  if (!selectButton) return;

  const actionContainer = selectButton.closest('td') || selectButton.closest('div') || selectButton.parentElement;
  if (!actionContainer) return;

  const buttonContainer = document.createElement('span');
  buttonContainer.id = 'adminer-buttons-container';
  buttonContainer.style.cssText = 'display: inline-flex; gap: 8px; align-items: center; margin-left: 10px;';

  const copyAllBtn = document.createElement('button');
  copyAllBtn.id = 'adminer-copy-all-btn';
  copyAllBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy Selected`;
  copyAllBtn.style.cssText = 'padding: 4px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; white-space: nowrap;';
  copyAllBtn.addEventListener('mouseenter', () => { copyAllBtn.style.background = '#45a049'; });
  copyAllBtn.addEventListener('mouseleave', () => { copyAllBtn.style.background = '#4CAF50'; });
  copyAllBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); copySelectedRows(); });

  const hideColumnBtn = document.createElement('button');
  hideColumnBtn.id = 'adminer-column-toggle';

  const updateHideColumnBadge = () => {
    const t = findAdminerTable();
    if (!t) return;
    const thead = t.querySelector('thead');
    const hr = thead ? thead.querySelector('tr') : null;
    if (!hr) return;

    const hdrs = [];
    hr.querySelectorAll('th').forEach((cell, idx) => {
      if (!cell.classList.contains('adminer-action-header') && !cell.classList.contains('adminer-checkbox-header')) {
        const link = cell.querySelector('a');
        const text = link ? link.textContent.trim() : cell.textContent.trim();
        if (text && text.toLowerCase() !== 'modify') hdrs.push({ index: idx, name: text });
      }
    });

    const hiddenCount = hdrs.filter(h => {
      const cell = hr.children[h.index];
      return cell && cell.style.display === 'none';
    }).length;

    hideColumnBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>Hide Columns${hiddenCount > 0 ? `<span style="background: #f44336; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; margin-left: 6px;">${hiddenCount}</span>` : ''}`;
  };

  updateHideColumnBadge();
  window.updateHideColumnBadge = updateHideColumnBadge;

  hideColumnBtn.style.cssText = 'padding: 4px 10px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; white-space: nowrap;';
  hideColumnBtn.addEventListener('mouseenter', () => { hideColumnBtn.style.background = '#0b7dda'; });
  hideColumnBtn.addEventListener('mouseleave', () => { hideColumnBtn.style.background = '#2196F3'; });
  hideColumnBtn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    showColumnToggleModal(() => { updateHideColumnBadge(); });
  });

  buttonContainer.appendChild(copyAllBtn);
  buttonContainer.appendChild(hideColumnBtn);
  actionContainer.appendChild(buttonContainer);
}

// Modal hide/show kolom
function showColumnToggleModal(onCloseCallback = null) {
  const table = findAdminerTable();
  if (!table) return;

  const oldModal = document.getElementById('adminer-column-toggle-modal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'adminer-column-toggle-modal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10002; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);';

  const thead = table.querySelector('thead');
  const headerRow = thead ? thead.querySelector('tr') : null;
  const originalHeaders = [];

  if (headerRow) {
    headerRow.querySelectorAll('th').forEach((cell, idx) => {
      if (!cell.classList.contains('adminer-action-header') && !cell.classList.contains('adminer-checkbox-header')) {
        const link = cell.querySelector('a');
        const text = link ? link.textContent.trim() : cell.textContent.trim();
        if (text && text.toLowerCase() !== 'modify') originalHeaders.push({ index: idx, name: text });
      }
    });
  }

  const hiddenColumns = originalHeaders.filter(h => {
    const cell = headerRow.children[h.index];
    return cell && cell.style.display === 'none';
  });

  let checkboxesHtml = '';
  originalHeaders.forEach(header => {
    const headerCell = headerRow.children[header.index];
    const isVisible = !headerCell.style.display || headerCell.style.display !== 'none';
    checkboxesHtml += `
      <div style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0; cursor: pointer;" onmouseover="this.style.background='#f7fafc'" onmouseout="this.style.background='white'">
        <label style="display: flex; align-items: center; cursor: pointer; margin: 0; width: 100%;">
          <input type="checkbox" class="adminer-column-toggle" data-column="${header.index}" ${isVisible ? 'checked' : ''} style="margin-right: 12px; cursor: pointer; width: 18px; height: 18px; accent-color: #2196F3;">
          <span style="font-size: 14px; color: #2d3748; flex: 1;">${escapeHtml(header.name)}</span>
        </label>
      </div>`;
  });

  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 500px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;">
      <div style="padding: 20px 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Show/Hide Columns</h2>
        ${hiddenColumns.length > 0 ? `<span id="adminer-hidden-badge" style="background: rgba(255,255,255,0.2); color: white; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.3);">${hiddenColumns.length} Hidden</span>` : ''}
      </div>
      <div style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; background: #f7fafc; display: flex; gap: 10px;">
        <button id="adminer-check-all" style="flex: 1; padding: 8px 12px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">✓ Check All</button>
        <button id="adminer-uncheck-all" style="flex: 1; padding: 8px 12px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">✗ Uncheck All</button>
      </div>
      <div style="padding: 10px 0; overflow-y: auto; max-height: 50vh;">${checkboxesHtml}</div>
      <div style="padding: 20px 25px; border-top: 1px solid #e2e8f0; background: #f7fafc; display: flex; justify-content: flex-end;">
        <button id="adminer-close-column-toggle" style="padding: 10px 20px; background: #e2e8f0; color: #4a5568; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Close</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const updateBadge = () => {
    const hidden = originalHeaders.filter(h => {
      const cell = headerRow.children[h.index];
      return cell && cell.style.display === 'none';
    }).length;
    const badge = modal.querySelector('#adminer-hidden-badge');
    if (badge) {
      badge.textContent = `${hidden} Hidden`;
      badge.style.display = hidden > 0 ? 'inline-block' : 'none';
    }
    setTimeout(() => { if (window.updateHideColumnBadge) window.updateHideColumnBadge(); }, 50);
  };

  const toggleColumns = (visible) => {
    modal.querySelectorAll('.adminer-column-toggle').forEach(cb => {
      cb.checked = visible;
      const colIndex = parseInt(cb.dataset.column);
      table.querySelectorAll(`th:nth-child(${colIndex + 1}), td:nth-child(${colIndex + 1})`).forEach(cell => {
        if (!cell.classList.contains('adminer-checkbox-header') && !cell.classList.contains('adminer-action-header') &&
          !cell.querySelector('.adminer-row-checkbox') && !cell.querySelector('.adminer-copy-row')) {
          cell.style.display = visible ? '' : 'none';
        }
      });
    });
    updateBadge();
  };

  document.getElementById('adminer-check-all').addEventListener('click', () => toggleColumns(true));
  document.getElementById('adminer-uncheck-all').addEventListener('click', () => toggleColumns(false));

  modal.querySelectorAll('.adminer-column-toggle').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const colIndex = parseInt(e.target.dataset.column);
      table.querySelectorAll(`th:nth-child(${colIndex + 1}), td:nth-child(${colIndex + 1})`).forEach(cell => {
        if (!cell.classList.contains('adminer-checkbox-header') && !cell.classList.contains('adminer-action-header') &&
          !cell.querySelector('.adminer-row-checkbox') && !cell.querySelector('.adminer-copy-row')) {
          cell.style.display = e.target.checked ? '' : 'none';
        }
      });
      updateBadge();
    });
  });

  const closeModal = () => {
    modal.remove();
    if (onCloseCallback) onCloseCallback();
    if (window.updateHideColumnBadge) window.updateHideColumnBadge();
  };

  document.getElementById('adminer-close-column-toggle').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
}

// ================================================================
// interceptTbodyManipulation — DIHAPUS, tidak perlu lagi
// Polling sederhana sudah cukup untuk catch semua perubahan
// ================================================================
function interceptTbodyManipulation() {
  // Fungsi kosong - tidak perlu intercept kompleks
  // Polling sederhana di startPolling() sudah cukup
}

// ================================================================
// interceptAjaxRequests — Intercept fetch untuk inject setelah load more
// ================================================================
function interceptAjaxRequests() {
  if (window._adminerFetchIntercepted) return; // Sudah di-setup
  window._adminerFetchIntercepted = true;
  
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Cek apakah ini request untuk load more data (mengandung page=)
    const url = args[0]?.toString() || '';
    if (url.includes('page=') && url.includes('select=')) {
      console.log('[Adminer Ext] 🔍 Fetch request terdeteksi (load more):', url.substring(0, 100));
      
      // Clone response untuk bisa dibaca
      const clonedResponse = response.clone();
      
      // Baca response sebagai text
      clonedResponse.text().then(html => {
        // Jika response mengandung <tr>, berarti ada rows baru
        if (html.includes('<tr')) {
          console.log('[Adminer Ext] ✅ Response mengandung rows baru, inject setelah delay...');
          
          // Inject setelah beberapa delay untuk memastikan DOM sudah ter-update
          setTimeout(() => {
            const table = findAdminerTable();
            if (table) {
              console.log('[Adminer Ext] 🔄 Inject setelah fetch response...');
              addControlsToTable(table);
            }
          }, 100);
          
          setTimeout(() => {
            const table = findAdminerTable();
            if (table) {
              console.log('[Adminer Ext] 🔄 Inject setelah fetch response (delay 300ms)...');
              addControlsToTable(table);
            }
          }, 300);
          
          setTimeout(() => {
            const table = findAdminerTable();
            if (table) {
              console.log('[Adminer Ext] 🔄 Inject setelah fetch response (delay 500ms)...');
              addControlsToTable(table);
            }
          }, 500);
        }
      }).catch(err => {
        console.error('[Adminer Ext] ❌ Error reading fetch response:', err);
      });
    }
    
    return response;
  };
  
  console.log('[Adminer Ext] ✅ Fetch interceptor di-setup');
}

// ================================================================
// interceptLoadMore — DIHAPUS, tidak perlu lagi
// Polling sederhana sudah cukup untuk catch semua perubahan
// ================================================================
function interceptLoadMore() {
  // Fungsi kosong - tidak perlu intercept kompleks
  // Polling sederhana di startPolling() sudah cukup
}

// ================================================================
// startPolling — Polling minimal, hanya untuk initial check
// ================================================================
function startPolling() {
  if (window._adminerIntervalId) {
    clearInterval(window._adminerIntervalId);
    window._adminerIntervalId = null;
  }

  // Polling minimal - hanya sekali untuk initial check, tidak looping terus
  // Trigger utama adalah saat klik "Load more data"
  let initialCheckDone = false;
  
  window._adminerIntervalId = setInterval(() => {
    try {
      // Hanya check sekali untuk initial load
      if (initialCheckDone) return;
      
      const directRows = Array.from(document.querySelectorAll('table tbody tr'));
      const rowsWithout = directRows.filter(r => !r.querySelector('.adminer-action-cell'));
      
      if (rowsWithout.length > 0) {
        console.log(`[Adminer Ext] 🔄 Initial check: ${rowsWithout.length} rows tanpa actions`);
        const table = findAdminerTable();
        if (table) {
          addControlsToTable(table);
        }
      }
      
      // Set flag setelah check pertama
      initialCheckDone = true;
      
      // Pastikan tombol ada
      if (!document.getElementById('adminer-copy-all-btn')) {
        addButtonsToAdminerForm();
      }
    } catch (e) {
      console.error('[Adminer Ext] ❌ Error in polling:', e);
    }
  }, 500); // Poll setiap 500ms, hanya untuk initial check
}

// ================================================================
// setupTbodyObserver
// ================================================================
function setupTbodyObserver() {
  const table = findAdminerTable();
  if (!table) return;

  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  // Observer sederhana pada tbody
  if (tbody._adminerObserver) {
    tbody._adminerObserver.disconnect();
  }

  tbody._adminerObserver = new MutationObserver(() => {
    const rowsWithout = Array.from(tbody.querySelectorAll('tr'))
      .filter(r => !r.querySelector('.adminer-action-cell'));
    if (rowsWithout.length > 0) {
      addControlsToTable(table);
    }
  });
  tbody._adminerObserver.observe(tbody, { childList: true, subtree: false });

  // Observer pada TABLE untuk deteksi tbody replacement
  if (table._adminerTableObserver) {
    table._adminerTableObserver.disconnect();
  }

  table._adminerTableObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'TBODY') {
          setTimeout(() => {
            setupTbodyObserver();
            addControlsToTable(table);
          }, 50);
        }
      });
    });
  });
  table._adminerTableObserver.observe(table, { childList: true });
}

// ================================================================
// setupMutationObserver
// ================================================================
function setupMutationObserver() {
  if (window._adminerBodyObserver) {
    window._adminerBodyObserver.disconnect();
    window._adminerBodyObserver = null;
  }

  let lastMutationTime = 0;
  const MUTATION_DEBOUNCE = 50; // Debounce 50ms

  const checkAndInject = () => {
    const now = Date.now();
    if (now - lastMutationTime < MUTATION_DEBOUNCE) return;
    lastMutationTime = now;

    // Gunakan direct query untuk mendapatkan semua rows
    const allRows = Array.from(document.querySelectorAll('table tbody tr'));
    const rowsWithout = allRows.filter(r => !r.querySelector('.adminer-action-cell'));

    if (rowsWithout.length > 0) {
      console.log(`[Adminer Ext] 🔍 MutationObserver: ${rowsWithout.length} rows tanpa actions dari ${allRows.length} total, inject...`);
      // Gunakan table dari row pertama
      const firstRow = allRows[0];
      if (firstRow) {
        const table = firstRow.closest('table');
        if (table) {
          // RE-INJECT SEMUA ROWS untuk memastikan event handler terpasang
          console.log('[Adminer Ext] 🔄 MutationObserver: Re-injecting controls...');
          addControlsToTable(table);
        }
      }
    }

    if (!document.getElementById('adminer-copy-all-btn')) addButtonsToAdminerForm();
  };

  window._adminerBodyObserver = new MutationObserver((mutations) => {
    // Cek apakah ada perubahan yang relevan (bukan dari extension kita)
    let hasRelevantChange = false;
    
    mutations.forEach(mutation => {
      // Cek added nodes
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          // Skip jika ini adalah elemen dari extension kita
          if (node.classList?.contains('adminer-action-cell') ||
              node.classList?.contains('adminer-ext-btn') ||
              node.id?.startsWith('adminer-')) {
            return;
          }
          
          // Jika ini adalah TR atau TBODY atau elemen yang mengandung TR, ini perubahan relevan
          if (node.tagName === 'TR' || node.tagName === 'TBODY' ||
              (node.querySelector && node.querySelector('tr'))) {
            hasRelevantChange = true;
          }
        }
      });
      
      // Cek removed nodes (tbody mungkin diganti)
      mutation.removedNodes.forEach(node => {
        if (node.nodeType === 1 && (node.tagName === 'TBODY' || node.tagName === 'TR')) {
          hasRelevantChange = true;
        }
      });
    });

    if (hasRelevantChange) {
      console.log('[Adminer Ext] 🔍 MutationObserver: Perubahan relevan terdeteksi');
      checkAndInject();
    }
  });

  // Observe seluruh body dengan subtree — mendeteksi semua perubahan DOM
  window._adminerBodyObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('[Adminer Ext] ✅ MutationObserver di-setup');
}

// ================================================================
// INIT — semua fungsi di atas sudah tersedia saat init dipanggil
// ================================================================
function init() {
  if (!isAdminerPage()) return;

  // Reset flag agar setup bisa berjalan ulang
  window._adminerSetupDone = false;

  // interceptAjaxRequests(); // Tidak perlu lagi, polling sudah cukup

  const setupAfterTableReady = () => {
    // Setup observer dan polling
    setupTbodyObserver();
    setupMutationObserver();
    startPolling();
    
    // Intercept AJAX requests untuk catch load more data
    interceptAjaxRequests();
    
    // Intercept click pada "Load more data" link secara eksplisit
    interceptLoadMoreClick();
  };
  
  // Intercept click pada "Load more data" link
  const interceptLoadMoreClick = () => {
    if (document._adminerLoadMoreClickHandler) return; // Sudah di-setup
    
    document._adminerLoadMoreClickHandler = (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      
      const linkText = link.textContent.toLowerCase().trim();
      const linkHref = link.getAttribute('href') || '';
      
      const isLoadMore = linkText.includes('load more') || linkText.includes('more data');
      const isPagination = linkHref.includes('page=');
      
      if (isLoadMore || isPagination) {
        console.log('[Adminer Ext] 🖱️ Load More/Pagination diklik:', {
          linkText: linkText.substring(0, 50),
          linkHref: linkHref.substring(0, 100),
          isLoadMore,
          isPagination
        });
        
        // Snapshot sebelum klik - gunakan direct query
        const directRowsBefore = document.querySelectorAll('table tbody tr');
        const rowCountBefore = directRowsBefore.length;
        
        console.log('[Adminer Ext] 📊 Snapshot SEBELUM klik:', {
          rowCountBefore,
          timestamp: new Date().toISOString()
        });
        
        // Trigger inject setelah klik dengan multiple delays
        // RE-INJECT SEMUA ROWS (termasuk yang lama) untuk memastikan event handler terpasang
        const injectAfterLoadMore = () => {
          const directRows = document.querySelectorAll('table tbody tr');
          const directRowCount = directRows.length;
          
          if (directRowCount > rowCountBefore) {
            console.log('[Adminer Ext] ✅ Rows baru terdeteksi:', {
              rowCountBefore,
              rowCountAfter: directRowCount,
              newRows: directRowCount - rowCountBefore
            });
          }
          
          // SELALU re-inject SEMUA rows (termasuk yang lama) untuk memastikan:
          // 1. Event handler terpasang ulang
          // 2. rowIndex di-update dengan benar
          // 3. Semua rows bisa di-select
          const firstRow = directRows[0];
          if (firstRow) {
            const table = firstRow.closest('table');
            if (table) {
              console.log('[Adminer Ext] 🔄 Re-injecting controls ke SEMUA rows...');
              addControlsToTable(table);
            }
          }
        };
        
        // Trigger dengan multiple delays untuk catch perubahan
        // Lebih agresif dengan lebih banyak delays
        [50, 100, 150, 200, 300, 400, 500, 700, 1000, 1500, 2000, 3000].forEach(delay => {
          setTimeout(injectAfterLoadMore, delay);
        });
      }
    };
    
    document.addEventListener('click', document._adminerLoadMoreClickHandler, true);
    console.log('[Adminer Ext] ✅ Load More click interceptor di-setup');
  };

  const tryInit = (attempts) => {
    const table = findAdminerTable();
    if (table) {
      const tbody = table.querySelector('tbody');
      if (tbody && tbody.querySelectorAll('tr').length > 0) {
        addControlsToTable(table);
        addButtonsToAdminerForm();

        if (!window._adminerSetupDone) {
          window._adminerSetupDone = true;
          setupAfterTableReady();
        }
        return;
      }
    }
    if (attempts < 50) setTimeout(() => tryInit(attempts + 1), 200);
  };

  tryInit(0);
}

// Jalankan saat halaman dimuat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}