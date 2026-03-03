// Ekstrak data dari tabel Adminer

// Ekstrak data dari tabel
function extractTableData(table, selectedColumns = null) {
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  
  if (!thead || !tbody) return null;
  
  // Ambil header (skip checkbox dan action)
  const headerRow = thead.querySelector('tr');
  if (!headerRow) return null;
  
  const headerCells = headerRow.querySelectorAll('th, td');
  const headers = [];
  const dataColumnIndices = [];
  
  Array.from(headerCells).forEach((cell, idx) => {
    // Skip kolom checkbox dan action
    if (cell.classList.contains('adminer-checkbox-header') || 
        cell.classList.contains('adminer-action-header')) {
      return;
    }
    
    const text = cell.textContent.trim();
    const link = cell.querySelector('a');
    const headerText = link ? link.textContent.trim() : text;
    
    if (headerText && headerText.toLowerCase() !== 'modify') {
      headers.push(headerText);
      dataColumnIndices.push(idx);
    }
  });
  
  // Filter kolom jika ada
  let columnIndices = dataColumnIndices;
  if (selectedColumns && selectedColumns.length > 0) {
    const filteredIndices = [];
    selectedColumns.forEach(colName => {
      const headerIdx = headers.findIndex(h => h.toLowerCase() === colName.toLowerCase());
      if (headerIdx !== -1) {
        filteredIndices.push(dataColumnIndices[headerIdx]);
      }
    });
    columnIndices = filteredIndices;
  }
  
  // Ambil data baris - SELALU baca dari DOM terbaru
  const rows = tbody.querySelectorAll('tr');
  const data = [];
  
  rows.forEach((row, rowIndex) => {
    const cells = row.querySelectorAll('td, th');
    const rowData = [];
    
    columnIndices.forEach(originalColIdx => {
      if (cells[originalColIdx]) {
        // Skip jika ini adalah cell checkbox atau action
        const cell = cells[originalColIdx];
        if (cell.querySelector('.adminer-row-checkbox') || 
            cell.querySelector('.adminer-copy-row') ||
            cell.querySelector('.adminer-preview-row')) {
          return;
        }
        
        let cellText = cell.textContent.trim();
        cellText = cellText.replace(/\s+/g, ' ');
        rowData.push(cellText);
      } else {
        rowData.push('');
      }
    });
    
    if (rowData.some(cell => cell !== '')) {
      data.push({
        index: rowIndex,
        data: rowData
      });
    }
  });
  
  // Filter headers sesuai dengan columnIndices yang digunakan
  const usedHeaders = columnIndices.map(origIdx => {
    const headerIdx = dataColumnIndices.indexOf(origIdx);
    return headers[headerIdx];
  }).filter(Boolean);
  
  return {
    headers: usedHeaders,
    data: data
  };
}
