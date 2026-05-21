async function loadPdfJs() {
  if (window.pdfjsLib) return windowPdfjsLib;
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
        vendor_name: null, delivery_order_number: null, delivery_date: null,
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
      // We also keep a version of the text split by what pdf.js considers "lines"
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

  // --- 1. VENDOR NAME (Precision Line-Based Logic) ---
  let vendor_name = null;
  // Find the "To:" label
  const toIdx = lines.findIndex(l => l.toUpperCase().includes("TO:"));
  if (toIdx >= 0) {
    // The layout is usually: 
    // Line 0: To:
    // Line 1: CDAP... (Application ID)
    // Line 2: VENDOR NAME
    // Line 3: Address...
    
    // Search the next 5 lines for the first line that is NOT the CDAP ID and NOT empty
    for (let i = toIdx + 1; i < lines.length && i < toIdx + 6; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (/^CDAP\d+$/i.test(line)) continue; // Skip the ID line
      
      // This is the vendor name. 
      // We take the text and split it at the first comma (where address usually starts)
      vendor_name = line.split(',')[0].trim();
      break;
    }
  }

  // --- 2. DELIVERY DATE (Fuzzy Regex) ---
  let delivery_date = null;
  const dateMatch = cleanText.match(/Date:\s*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\s*\d{2,4})/i);
  if (dateMatch) {
    delivery_date = dateMatch[1].replace(/\s+/g, "");
  }

  // --- 3. APPLICATION ID ---
  const delivery_order_number = extract(/Application\s*ID:\s*([A-Z0-9]+)/i) || 
                                extract(/\b(CDAP[A-Z0-9]{10,})\b/i);

  // --- 4. CUSTOMER DETAILS ---
  const customer_name = extract(/Customer\s*Name:\s*(.+?)\s*Mobile:/i);
  const customer_mobile = extract(/Mobile:\s*([6-9]\d{9})/i);
  const customer_address = extract(/Customer\s*Address:\s*(.+?)\s*PRODUCT\s*DETAILS/i);

  // --- 5. PRODUCT FIELDS ---
  const manufacturer = extract(/Manufacturer:\s*([A-Z0-9\s]+?)\s*Category:/i);
  const category = extract(/Category:\s*([A-Z0-9\s]+?)\s*Model:/i);
  const model = extract(/Model:\s*(.+?)\s*IMEI\/Serial/i);
  const imei_serial = extract(/IMEI\/Serial\s*Number:\s*(\d{10,20})/i);

  // --- 6. PRICE ---
  const priceMatch = cleanText.match(/Product\s*Price\s*[:\-]?\s*(?:Rs\.?\s*)?(\d[\d,]*)/i);
  const product_price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : null;

  return {
    vendor_name,
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
