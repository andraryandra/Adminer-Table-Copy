// JSON Formatter menggunakan Prettier
// Format JSON dengan indentasi yang rapi

// Function untuk format JSON string
function formatJSON(jsonString) {
  try {
    // Coba parse sebagai JSON dulu
    const parsed = JSON.parse(jsonString);
    
    // Format dengan indentasi 2 spaces
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    // Jika bukan JSON valid, return as-is
    return jsonString;
  }
}

// Function untuk detect dan format JSON (termasuk yang ada di dalam string)
function detectAndFormatJSON(text) {
  // Coba cari JSON object atau array di dalam text
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      const formatted = JSON.stringify(parsed, null, 2);
      
      // Replace JSON di text dengan formatted version
      return text.replace(jsonStr, formatted);
    } catch (e) {
      // Jika parse gagal, return original
      return text;
    }
  }
  
  return text;
}

// Function untuk escape HTML tapi preserve formatting
function escapeHtmlPreserveFormat(text) {
  if (text === null || text === undefined) return 'NULL';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Function untuk format dan display value dengan HTML preservation
function formatValueForDisplay(value, preserveHTML = false) {
  if (!value || value === 'NULL' || value === 'null') return 'NULL';
  
  const trimmed = value.trim();
  
  // Coba format sebagai JSON jika terlihat seperti JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const formatted = formatJSON(trimmed);
      return formatted;
    } catch (e) {
      // Bukan JSON valid, lanjutkan
    }
  }
  
  // Jika preserveHTML, return as-is (tapi escape untuk security)
  if (preserveHTML) {
    // Escape HTML untuk security, tapi kita akan render dengan innerHTML
    return escapeHtmlPreserveFormat(value);
  }
  
  return value;
}

// Export untuk use di file lain
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatJSON,
    detectAndFormatJSON,
    escapeHtmlPreserveFormat,
    formatValueForDisplay
  };
}
