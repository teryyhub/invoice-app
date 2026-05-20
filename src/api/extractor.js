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
    return { status: "success", output: {
      vendor_name: null, delivery_order_number: null, delivery_date: null,
      customer_name: null, customer_mobile: null, customer_address: null,
      manufacturer: null, category: null, model: null,
      imei_serial: null, product_price: null,
    }};
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
      fullText += content.items.map(item => item.str).join(" ") + "\n";
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
  const lines = text.split(/\s{2,}|\n/).map(l => l.trim()).filter(Boolean);
  const full = text.replace(/\s+/g, " ");

  const get = (patterns) => {
    for (const pattern of patterns) {
      const match = full.match(pattern);
      if (match) return match[1]?.trim() || null;
    }
    return null;
  };

  // Vendor name: after "To: CDAP300243 SREE VASAVI MOBILES"
  let vendor_name = get([
    /To:\s*CDAP\d+\s+([A-Z][A-Z\s]+?)(?:\s+[\d\/])/,
    /To:\s*[A-Z0-9]+\s+([A-Z][A-Z\s]+?)(?:\s+\d)/,
  ]);
  if (!vendor_name) {
    const toIdx = lines.findIndex(l => /^To:?$/i.test(l) || l.startsWith("To:"));
    if (toIdx >= 0) {
      for (let i = toIdx + 1; i < toIdx + 5; i++) {
        if (lines[i] && !/^CDAP\d+$/i.test(lines[i])) { vendor_name = lines[i]; break; }
      }
    }
  }

  const appId = get([
    /Application\s*ID:\s*(CDAP[A-Z0-9]+)/i,
    /\b(CDAP[A-Z0-9]{5,}B[0-9]+)\b/,
    /\b(CDAP[A-Z0-9]{5,}X[0-9]+)\b/,
  ]);

  const rawDate = get([
    /Date:\s*(\d{1,2}-\d{1,2}-\s*\d{4})/i,
    /Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ]);
  const delivery_date = rawDate ? rawDate.replace(/\s+/g, "") : null;

  const customer_name = get([
    /Customer Name:\s*([A-Za-z\s]+?)(?:\s{2,}|Mobile:|$)/i,
    /Customer Name:\s*([^\n]+)/i,
  ]);

  const customer_mobile = get([
    /Mobile:\s*(\d{10})/i,
    /\b([6-9]\d{9})\b/,
  ]);

  const customer_address = get([
    /Customer Address:\s*(.+?)(?=\s{2,}|PRODUCT DETAILS|Manufacturer)/i,
    /Customer Address:\s*([^\n]+)/i,
  ]);

  const manufacturer = get([/Manufacturer:\s*([A-Za-z0-9\s]+?)(?:\s{2,}|Category:|$)/i]);
  const category = get([/Category:\s*([A-Za-z\s]+?)(?:\s{2,}|Model:|$)/i, /(MOBILE PHONE|smartphone|tablet)/i]);
  const model = get([/Model:\s*([^\s][^\n]+?)(?:\s{2,}|IMEI|$)/i]);
  const imei_serial = get([/IMEI\/Serial\s*Number:\s*(\d{15})/i, /\b(\d{15})\b/]);

  const priceMatch = full.match(/A\.\s*Product\s*Price\s+(\d[\d,]*)/i)
    || full.match(/Product\s*Price\s*[:\-]?\s*(?:Rs\.?\s*)?(\d[\d,]*)/i);
  const product_price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : null;

  return {
    vendor_name, delivery_order_number: appId, delivery_date,
    customer_name, customer_mobile, customer_address,
    manufacturer, category, model, imei_serial, product_price,
  };
}