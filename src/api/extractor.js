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
      fullText += content.items.map((item) => item.str).join(" ") + "\n";
    }

    console.log("PDF extracted text:", fullText);
    const output = parseDeliveryOrderText(fullText);
    console.log("Parsed output:", output);

    if (!fullText.trim()) return { status: "error", output: null };
    return { status: "success", output };
  } catch (err) {
    console.error("PDF extraction error:", err);
    return { status: "error", output: null };
  }
}

function parseDeliveryOrderText(text) {
  // Normalize: collapse runs of spaces/tabs to single space, keep newlines
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  // Single-space collapsed version for regex matching
  const full = text.replace(/[ \t]+/g, " ");

  const get = (patterns) => {
    for (const pattern of patterns) {
      const match = full.match(pattern);
      if (match) return match[1]?.trim() || null;
    }
    return null;
  };

  // --- Vendor name ---
  // Layout: "To:" on one line, next line is "CDAP300243", then vendor name
  let vendor_name = null;
  const toLineIdx = lines.findIndex((l) => /^To:?$/i.test(l));
  if (toLineIdx >= 0) {
    for (let i = toLineIdx + 1; i < toLineIdx + 6; i++) {
      if (lines[i] && /^CDAP\d+$/i.test(lines[i])) {
        if (lines[i + 1]) { vendor_name = lines[i + 1]; break; }
      }
    }
  }
  // Fallback: inline "To: CDAP... NAME"
  if (!vendor_name) {
    vendor_name = get([/To:\s*CDAP\d+\s+([A-Z][A-Z\s]+?)(?:\s{2,}|\d|$)/]);
  }

  // --- Application ID / Delivery Order Number ---
  const appId = get([
    /Application\s*ID:\s*(CDAP[A-Z0-9]+)/i,
    /\b(CDAP[A-Z0-9]{6,})\b/,
  ]);

  // --- Date ---
  // Handle split date across lines: "Date: 29-04-" ... "2026"
  let delivery_date = null;
  for (let i = 0; i < lines.length; i++) {
    // Case 1: date fully on one line
    let m = lines[i].match(/Date:\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i);
    if (m) { delivery_date = m[1].replace(/\s+/g, ""); break; }
    // Case 2: date split across lines ("Date: 29-04-" ... "2026")
    m = lines[i].match(/Date:\s*(\d{1,2}[-\/]\d{1,2}[-\/])\s*$/i);
    if (m && lines[i + 1]) {
      const yearMatch = lines[i + 1].match(/^(\d{4})/);
      if (yearMatch) { delivery_date = m[1] + yearMatch[1]; break; }
    }
  }

  // --- Customer fields ---
  const customer_name = get([
    /Customer Name:\s*([A-Za-z][A-Za-z\s]+?)(?:\s{2,}|Mobile:|$)/i,
  ]);

  const customer_mobile = get([
    /Mobile:\s*([6-9]\d{9})\b/i,
    /\b([6-9]\d{9})\b/,
  ]);

  // Address: after label, until section break or next known label
  const customer_address =
    get([/Customer Address:\s*(.+?)(?=\s{2,}|PRODUCT DETAILS|Manufacturer:|$)/is]) ||
    (() => {
      const idx = lines.findIndex((l) => /Customer Address:/i.test(l));
      if (idx < 0) return null;
      const addrOnSameLine = lines[idx].replace(/Customer Address:/i, "").trim();
      if (addrOnSameLine) return addrOnSameLine;
      return lines[idx + 1] || null;
    })();

  // --- Product fields ---
  const manufacturer =
    get([/Manufacturer:\s*([A-Za-z0-9]+)(?:\s{2,}|Category:|$)/i]) ||
    (() => {
      const idx = lines.findIndex((l) => /^Manufacturer:$/i.test(l));
      return idx >= 0 ? lines[idx + 1] : null;
    })();

  const category =
    get([/Category:\s*([A-Za-z\s]+?)(?:\s{2,}|Model:|$)/i]) ||
    (() => {
      const idx = lines.findIndex((l) => /^Category:$/i.test(l));
      return idx >= 0 ? lines[idx + 1] : null;
    })();

  // Model can span two lines: "SMART PHONES -\nRENO15C12256CPH2801"
  let model = null;
  const modelLabelIdx = lines.findIndex((l) => /^Model:$/i.test(l));
  if (modelLabelIdx >= 0) {
    const parts = [];
    for (let i = modelLabelIdx + 1; i < modelLabelIdx + 4; i++) {
      if (!lines[i] || /^(IMEI|Scheme Name|Manufacturer|Category)/i.test(lines[i])) break;
      parts.push(lines[i].trim());
    }
    model = parts.join(" ") || null;
  }
  if (!model) {
    model = get([/Model:\s*(.+?)(?=\s{2,}|IMEI|Scheme|$)/i]);
    if (model && model.endsWith("-")) {
      const afterModel = full.match(/Model:\s*.+?(-)\s+([A-Z0-9]+)/i);
      if (afterModel) model = model + " " + afterModel[2];
    }
  }

  const imei_serial = get([
    /IMEI\/Serial\s*Number:\s*(\d{10,20})/i,
    /\b(\d{15})\b/,
  ]);

  // Product price: "A. Product Price   44999"
  const priceMatch =
    full.match(/A\.\s*Product\s*Price\s+(\d[\d,]*)/i) ||
    full.match(/Product\s*Price\s*[:\-]?\s*(?:Rs\.?\s*)?(\d[\d,]*)/i);
  const product_price = priceMatch
    ? parseFloat(priceMatch[1].replace(/,/g, ""))
    : null;

  return {
    vendor_name,
    delivery_order_number: appId,
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