// Deteksi Adminer page dan find table

// Deteksi Adminer
function isAdminerPage() {
  // Pengecualian: Jangan aktif di domain tertentu
  const hostname = window.location.hostname.toLowerCase();
  const excludedDomains = [
    'github.com',
    'github.io',
    'gitlab.com',
    'bitbucket.org',
    'stackoverflow.com',
    'stackexchange.com'
  ];
  
  if (excludedDomains.some(domain => hostname.includes(domain))) {
    return false;
  }
  
  // Cek URL - lebih spesifik, harus ada path adminer
  const url = window.location.href.toLowerCase();
  const urlMatches = url.includes('/adminer') || 
                     url.includes('/vendor/adminer') ||
                     url.includes('adminer.php') ||
                     (url.includes('adminer') && (url.includes('?') || url.includes('#')));
  
  // Cek title - harus mengandung "adminer" dan bukan hanya di URL
  const title = document.title.toLowerCase();
  const titleMatches = title.includes('adminer') && !title.includes('github');
  
  // Cek header/body untuk teks "Adminer" dengan versi (contoh: "Adminer 4.8.1 5.4.2")
  const bodyText = document.body.textContent || '';
  const headerText = document.querySelector('h1, h2, .header, header')?.textContent || '';
  const hasAdminerVersion = /Adminer\s+[\d.]+\s+[\d.]+/.test(bodyText) || 
                            /Adminer\s+[\d.]+\s+[\d.]+/.test(headerText);
  
  // Cek apakah ada elemen khas Adminer - HARUS ada minimal 2 dari berikut:
  const hasDatabaseSelect = document.querySelector('select[name="database"], select[name="db"]') !== null;
  const hasSchemaSelect = document.querySelector('select[name="schema"]') !== null;
  const hasAdminerLinks = document.querySelector('a[href*="select"], a[href*="table"]') !== null;
  const hasDataTable = document.querySelector('table') && 
                       document.querySelector('table thead') && 
                       document.querySelector('table tbody');
  
  // Harus ada minimal 2 elemen khas Adminer
  const adminerElementCount = [hasDatabaseSelect, hasSchemaSelect, hasAdminerLinks, hasDataTable]
    .filter(Boolean).length;
  const hasAdminerElements = adminerElementCount >= 2;
  
  // Cek apakah ada form khas Adminer (login form atau query form)
  const hasAdminerForm = document.querySelector('form[action*="adminer"], form input[name="username"], form input[type="password"]') !== null ||
                         document.querySelector('form input[name="select"], form input[name="search"]') !== null;
  
  // Return true hanya jika:
  // 1. URL mengandung adminer ATAU title mengandung adminer
  // 2. DAN ada versi Adminer ATAU ada elemen khas Adminer (minimal 2)
  // 3. DAN tidak di domain yang dikecualikan
  const urlOrTitleMatch = urlMatches || titleMatches;
  const hasAdminerSignature = hasAdminerVersion || hasAdminerElements || hasAdminerForm;
  
  return urlOrTitleMatch && hasAdminerSignature;
}

// Temukan tabel data Adminer - hanya tabel yang berisi data rows, bukan database list
function findAdminerTable() {
  // Cari semua tabel dengan thead dan tbody
  const tables = document.querySelectorAll('table');
  
  for (const table of tables) {
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    if (!thead || !tbody) continue;
    
    const headerRow = thead.querySelector('tr');
    if (!headerRow) continue;
    
    const headerText = headerRow.textContent.toLowerCase();
    
    // Skip tabel database list - harus ada "database" DAN "collation" DAN "refresh"
    if (headerText.includes('database') && headerText.includes('collation') && headerText.includes('refresh')) {
      continue;
    }
    
    // Skip tabel schema list - harus ada "schema" DAN "collation"
    if (headerText.includes('schema') && headerText.includes('collation') && !headerText.includes('select:')) {
      continue;
    }
    
    // Pastikan ada data rows
    const rows = tbody.querySelectorAll('tr');
    if (rows.length > 0) {
      return table;
    }
  }
  
  return null;
}
