// Utility functions untuk Adminer Extension

// Escape HTML untuk mencegah XSS
function escapeHtml(text) {
  if (text === null || text === undefined) return 'NULL';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format data ke CSV
function formatAsCSV(tableData, delimiter = ',') {
  if (!tableData || !tableData.headers || !tableData.data) {
    return '';
  }
  
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

// Format data ke format rapih (formatted)
function formatAsFormatted(tableData, copyType = 'both') {
  if (!tableData || !tableData.headers || !tableData.data) {
    return '';
  }
  
  const lines = [];
  
  tableData.data.forEach((row, rowIdx) => {
    if (rowIdx > 0) lines.push(''); // Baris kosong antar row
    
    row.data.forEach((value, colIdx) => {
      const header = tableData.headers[colIdx];
      if (copyType === 'column') {
        lines.push(`${header}:`);
      } else if (copyType === 'value') {
        lines.push(value);
      } else {
        lines.push(`${header}: ${value}`);
      }
    });
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

// Tampilkan toast notification yang otomatis hilang
function showToast(message, type = 'success', duration = 2000) {
  // Hapus toast lama jika ada
  const oldToast = document.getElementById('adminer-toast');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.id = 'adminer-toast';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 14px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 100000;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 500;
    animation: slideInRight 0.3s ease-out;
    max-width: 400px;
  `;
  
  // Tambahkan animasi CSS
  if (!document.getElementById('adminer-toast-style')) {
    const style = document.createElement('style');
    style.id = 'adminer-toast-style';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
      ${type === 'success' 
        ? '<polyline points="20 6 9 17 4 12"></polyline>'
        : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
      }
    </svg>
    <span>${escapeHtml(message)}</span>
  `;
  
  document.body.appendChild(toast);
  
  // Auto remove setelah duration
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, duration);
}
