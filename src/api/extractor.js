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
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // We use a specific join to preserve some layout context
      fullText += content.items.map((item) => item.str).join(" ") + "\n";
    }

    if (!fullText.trim() || fullText.length < 10) {
      return { status: "error", message: "PDF appears to be a scanned image." };
    }

    const output = parseDeliveryOrderText(fullText);
    return { status: "success", output };
  } catch (err) {
    console.error("PDF extraction error:", err);
    return { status: "error", output: null };
  }
}

function parseDeliveryOrderText(text) {
  // Normalize whitespace but keep it predictable
  const cleanText = text.replace(/\s+/g, " ");

  const extract = (regex) => {
    const match = cleanText.match(regex);
    return match ? match[1].trim() : null;
  };

  // --- 1. VENDOR NAME (The trickiest part) ---
  // Logic: Find "To:", skip the CDAP number, then grab the text until the first comma or address-like number
  let vendor_name = null;
  const vendorMatch = cleanText.match(/To:\s*CDAP\d+\s+([^,0-9\n]+?)(?=\d{1,5},|\s{3,}|$)/i);
  if (vendorMatch) {
    vendor_name = vendorMatch[1].trim();
  } else {
    // Fallback: Just grab the text after CDAP
    vendor_name = extract(/To:\s*CDAP\d+\s+([A-Z\s]{3,})/i);
  }

  // --- 2. DELIVERY DATE ---
  // Now supports split dates like "29-04- 2026"
  let delivery_date = null;
  const dateMatch = cleanText.match(/Date:\s*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\s*\d{2,4})/i);
  if (dateMatch) {
    delivery_date = dateMatch[1].replace(/\s+/g, ""); // Remove the space/newline between day-month and year
  }

  // --- 3. APPLICATION ID ---
  const delivery_order_number = extract(/Application\s*ID:\s*([A-Z0-9]+)/i) || 
                                extract(/\b(CDAP[A-Z0-9]{10,})\b/i);

  // --- 4. CUSTOMER NAME ---
  const customer_name = extract(/Customer\s*Name:\s*(.+?)\s*Mobile:/i);

  // --- 5. CUSTOMER MOBILE ---
  const customer_mobile = extract(/Mobile:\s*([6-9]\d{9})/i);

  // --- 6. CUSTOMER ADDRESS ---
  const customer_address = extract(/Customer\s*Address:\s*(.+?)\s*PRODUCT\s*DETAILS/i);

  // --- 7. PRODUCT FIELDS ---
  const manufacturer = extract(/Manufacturer:\s*([A-Z0-9\s]+?)\s*Category:/i);
  const category = extract(/Category:\s*([A-Z0-9\s]+?)\s*Model:/i);
  const model = extract(/Model:\s*(.+?)\s*IMEI\/Serial/i);
  const imei_serial = extract(/IMEI\/Serial\s*Number:\s*(\d{10,20})/i);

  // --- 8. PRICE ---
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
