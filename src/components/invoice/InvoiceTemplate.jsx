// src/components/invoice/InvoiceTemplate.jsx
import React from "react";
import { format, isValid } from "date-fns";

const safeNumber = (val) => {
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
};

const formatDateSafe = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return isValid(d) ? format(d, "dd/MMM/yyyy") : String(dateString);
};

export default function InvoiceTemplate({ invoice, vendor, stampScale = 1 }) {
  if (!invoice || !vendor) return null;

  const rate = safeNumber(invoice.rate);
  const cgst = safeNumber(invoice.cgst);
  const sgst = safeNumber(invoice.sgst);
  const grandTotal = safeNumber(invoice.grand_total);

  return (
    <div
      style={{
        width: "794px",
        minWidth: "794px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      className="bg-white text-black p-8 box-border shadow-xs border border-neutral-200 print:border-none print:shadow-none print:p-0 print:m-0 print:!w-full"
    >
      <div className="border-2 border-black">
        {/* Header */}
        <div className="border-b-2 border-black p-4 text-center">
          <h1 className="text-2xl font-bold tracking-wide uppercase break-words">
            {vendor.vendor_name || "Vendor Name"}
          </h1>
          {vendor.address && (
            <p className="text-xs mt-1 leading-relaxed whitespace-pre-line break-words">
              {vendor.address}
            </p>
          )}
          {vendor.gstin && (
            <p className="text-xs font-semibold mt-0.5 break-all">
              GSTIN: {vendor.gstin}
            </p>
          )}
        </div>

        {/* Customer & Invoice Meta Grid */}
        <div className="divide-y-2 divide-black text-xs">
          <div className="grid grid-cols-12 items-stretch">
            <div className="col-span-2 border-r border-black p-2 font-bold flex items-center">
              NAME
            </div>
            <div className="col-span-4 border-r border-black p-2 break-words leading-snug">
              : {invoice.customer_name || ""}
            </div>
            <div className="col-span-2 border-r border-black p-2 font-bold flex items-center">
              MODE:
            </div>
            <div className="col-span-4 p-2 break-words leading-snug">
              {invoice.mode || "CHOLA"}
            </div>
          </div>

          <div className="grid grid-cols-12 items-stretch">
            <div className="col-span-2 border-r border-black p-2 font-bold flex items-center">
              MOBILE NO.
            </div>
            <div className="col-span-4 border-r border-black p-2 break-all leading-snug font-mono">
              : {invoice.customer_mobile || ""}
            </div>
            <div className="col-span-2 border-r border-black p-2 font-bold flex items-center">
              DATE:
            </div>
            <div className="col-span-4 p-2 leading-snug font-mono">
              {formatDateSafe(invoice.invoice_date)}
            </div>
          </div>

          <div className="grid grid-cols-12 items-stretch">
            <div className="col-span-2 border-r border-black p-2 font-bold flex items-center">
              ADDRESS
            </div>
            <div className="col-span-4 border-r border-black p-2 break-words leading-relaxed">
              : {invoice.customer_address || ""}
            </div>
            <div className="col-span-2 border-r border-black p-2 font-bold flex items-center">
              INVOICE NO.:
            </div>
            {/* Centered vertically and horizontally with large prominent bold text */}
            <div className="col-span-4 p-2 flex items-center justify-center text-center font-black text-base break-all leading-none font-mono tracking-wider">
              {invoice.invoice_number || ""}
            </div>
          </div>

          <div className="grid grid-cols-12 items-stretch">
            <div className="col-span-2 border-r border-black p-2 font-bold flex items-center">
              APP. ID
            </div>
            <div className="col-span-10 p-2 break-all leading-snug font-mono">
              {invoice.delivery_order_number || ""}
            </div>
          </div>
        </div>

        {/* Product Table Header */}
        <div className="border-t-2 border-b-2 border-black bg-neutral-100 font-bold text-xs text-center">
          <div className="grid grid-cols-12 items-stretch">
            <div className="col-span-3 border-r border-black p-2 text-left">
              DESCRIPTION
            </div>
            <div className="col-span-1 border-r border-black p-2">QTY.</div>
            <div className="col-span-2 border-r border-black p-2">RATE</div>
            <div className="col-span-2 border-r border-black p-2">CGST</div>
            <div className="col-span-2 border-r border-black p-2">SGST</div>
            <div className="col-span-2 p-2">AMOUNT</div>
          </div>
        </div>

        {/* Product Details Row */}
        <div className="border-b border-black text-xs">
          <div className="grid grid-cols-12 items-stretch">
            <div className="col-span-3 border-r border-black p-2 text-left space-y-1">
              <p className="font-semibold break-words leading-snug">
                {invoice.product_description || "Product"}
              </p>
              {invoice.product_model && (
                <p className="break-words leading-snug">
                  <span className="font-medium">MODEL:</span> {invoice.product_model}
                </p>
              )}
              {invoice.imei_serial && (
                <div className="mt-1 pt-1 border-t border-dotted border-gray-400">
                  <p className="font-bold text-xs leading-none">IMEI / SERIAL:</p>
                  <p className="break-all font-mono font-bold text-sm tracking-wide leading-tight mt-0.5">
                    {invoice.imei_serial}
                  </p>
                </div>
              )}
            </div>
            <div className="col-span-1 border-r border-black p-2 text-center font-mono">
              {invoice.quantity || 1}
            </div>
            <div className="col-span-2 border-r border-black p-2 text-right break-words font-mono">
              {rate.toFixed(2)}
            </div>
            <div className="col-span-2 border-r border-black p-2 text-right break-words font-mono">
              {cgst.toFixed(2)}
            </div>
            <div className="col-span-2 border-r border-black p-2 text-right break-words font-mono">
              {sgst.toFixed(2)}
            </div>
            <div className="col-span-2 p-2 text-right font-medium break-words font-mono">
              {grandTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Spacer Lines */}
        <div className="border-b-2 border-black min-h-[6.25rem] flex">
          <div className="grid grid-cols-12 w-full self-stretch">
            <div className="col-span-3 border-r border-black" />
            <div className="col-span-1 border-r border-black" />
            <div className="col-span-2 border-r border-black" />
            <div className="col-span-2 border-r border-black" />
            <div className="col-span-2 border-r border-black" />
            <div className="col-span-2" />
          </div>
        </div>

        {/* Terms & Grand Total */}
        <div>
          <div className="grid grid-cols-12 text-xs items-stretch">
            <div className="col-span-6 border-r border-black p-3 space-y-1.5 leading-relaxed">
              <p className="font-bold underline">TERMS & CONDITIONS:</p>
              <p className="break-words">
                1. PURCHASED MOBILE WILL BE PROVIDED WITH 1 YEAR WARRANTY.
              </p>
              <p className="break-words">
                2. BATTERY AND CHARGER WILL HAVE 6-MONTHS WARRANTY PERIOD.
              </p>
              <p className="break-words">
                3. WARRANTY WILL BE PROVIDED AT COMPANY'S AUTHORISED SERVICE CENTER BASED ON THE CONDITION OF THE MOBILE & ACCESSORIES.
              </p>
            </div>

            <div className="col-span-6 p-3 flex flex-col justify-between">
              <div className="flex justify-between items-start border-b border-black pb-2 gap-2">
                <span className="font-bold text-sm shrink-0">GRAND TOTAL:</span>
                <span className="text-lg font-black tracking-tight text-right break-words font-mono">
                  Rs.
                  {grandTotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="text-center mt-4">
                <p className="text-xs font-bold uppercase break-words">
                  {vendor.vendor_name}
                </p>

                {vendor.stamp_url ? (
                  <div className="py-2 flex items-center justify-center">
                    <img
                      src={vendor.stamp_url}
                      alt="Stamp"
                      style={{
                        transform: `scale(${stampScale})`,
                        transformOrigin: "center",
                      }}
                      className="max-h-24 max-w-[200px] object-contain transition-transform duration-150"
                    />
                  </div>
                ) : (
                  <div className="h-16" />
                )}

                <p className="text-xs+ font-bold tracking-wider border-t border-dashed border-black pt-1 max-w-[220px] mx-auto">
                  AUTHORISED SIGNATORY
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}