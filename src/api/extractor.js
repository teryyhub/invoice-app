async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return window.pdfjsLib;
}

export async function extractDataFromFile(file) {
  const isImage = file.type.startsWith("image/");
  if (isImage) {
    return {
      status: "success",
      output: {
        vendor_code: null, vendor_name: null, vendor_address: null,
        delivery_order_number: null, delivery_date: null,
        customer_name: null, customer_mobile: null, customer_address: null,
        manufacturer: null, category: null, model: null,
        imei_serial: null, product_price: null,
      },
    };
  }

  try {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    let lines = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
      lines.push(...content.items.map(item => item.str.trim()).filter(s => s.length > 0));
    }

    if (!fullText.trim() || fullText.length < 10) {
      return { status: "error", message: "PDF appears to be a scanned image." };
    }

    const output = parseDeliveryOrderText(fullText, lines);
    return { status: "success", output };
  } catch (err) {
    console.error("PDF extraction error:", err);
    return { status: "error", output: null };
  }
}

function parseDeliveryOrderText(text, lines) {
  const cleanText = text.replace(/\s+/g, " ");
  const extract = (regex) => {
    const match = cleanText.match(regex);
    return match ? match[1].trim() : null;
  };

  // --- 1. VENDOR CODE, VENDOR NAME, VENDOR ADDRESS (Precision Line-Based Logic) ---
  // Structure after "To:":
  //   Line 0: To:
  //   Line 1: CDAP000127         <-- vendor_code
  //   Line 2: M/S SRI LAKSHMI MOBILES  <-- vendor_name
  //   Line 3+: address lines     <-- vendor_address (until a known section break)
  let vendor_code = null;
  let vendor_name = null;
  let vendor_address = null;

  const toIdx = lines.findIndex(l => l.toUpperCase().includes("TO:"));
  if (toIdx >= 0) {
    // Find vendor_code: first line after "To:" matching CDAP pattern
    let codeIdx = -1;
    for (let i = toIdx + 1; i < lines.length && i < toIdx + 6; i++) {
      if (/^CDAP\d+$/i.test(lines[i].trim())) {
        vendor_code = lines[i].trim().toUpperCase();
        codeIdx = i;
        break;
      }
    }

    if (codeIdx >= 0) {
      // vendor_name: next non-empty line after vendor_code
      let nameIdx = -1;
      for (let i = codeIdx + 1; i < lines.length && i < codeIdx + 4; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        vendor_name = line;
        nameIdx = i;
        break;
      }

      // vendor_address: lines after vendor_name until we hit a date pattern,
      // "We hereby", or another known section marker
      if (nameIdx >= 0) {
        const addressLines = [];
        for (let i = nameIdx + 1; i < lines.length && i < nameIdx + 8; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          // Stop at section breaks
          if (
            /^(We hereby|Date:|Please note|CUSTOMER|PRODUCT)/i.test(line) ||
            /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(line)
          ) break;
          addressLines.push(line);
        }
        if (addressLines.length > 0) {
          vendor_address = addressLines.join(", ");
        }
      }
    }
  }

  // Fallback: extract vendor_code from text if line-based failed
  if (!vendor_code) {
    const codeMatch = cleanText.match(/\b(CDAP\d{6,})\b/i);
    if (codeMatch) vendor_code = codeMatch[1].toUpperCase();
  }

  // --- 2. DELIVERY DATE ---
  let delivery_date = null;
  const dateMatch = cleanText.match(/Date:\s*(\d{1,2}[-\/\.]\s*\d{1,2}[-\/\.]\s*\d{2,4})/i);
  if (dateMatch) {
    delivery_date = dateMatch[1].replace(/\s+/g, "");
  }

  // --- 3. APPLICATION ID (full CDAP...B... string) ---
  // The short vendor code is CDAP000127; the Application ID is the longer CDAP000127B01217641
  const delivery_order_number =
    extract(/Application\s*ID:\s*([A-Z0-9]+)/i) ||
    extract(/\b(CDAP[A-Z0-9]{10,})\b/i);

  // --- 4. CUSTOMER DETAILS ---
  const customer_name = extract(/Customer\s*Name:\s*(.+?)\s*Mobile:/i);
  const customer_mobile = extract(/Mobile:\s*([6-9]\d{9})/i);
  const customer_address = extract(/Customer\s*Address:\s*(.+?)\s*PRODUCT\s*DETAILS/i);

  // --- 5. PRODUCT FIELDS ---
  const manufacturer = extract(/Manufacturer:\s*([A-Z0-9\s]+?)\s*Category:/i);
  const category = extract(/Category:\s*([A-Z0-9\s]+?)\s*Model:/i);
  const model = extract(/Model:\s*(.+?)\s*IMEI\/Serial/i);
  const imei_serial = extract(/IMEI\/Serial\s*Number:\s*([\w\/\-]{5,30})/i);

  // --- 6. PRICE ---
  const priceMatch = cleanText.match(/Product\s*Price\s*[:\-]?\s*(?:Rs\.?\s*)?(\d[\d,]*)/i) ||
                     cleanText.match(/A\.\s*Product\s*Price\s+(\d[\d,]+)/i);
  const product_price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : null;

  return {
    vendor_code,
    vendor_name,
    vendor_address,
    delivery_order_number,
    delivery_date,
    customer_name,
    customer_mobile,
    customer_address,
    manufacturer,
    category,
    model,
    imei_serial,
    product_price,
  };
}