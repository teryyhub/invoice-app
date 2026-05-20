import React from "react";
import { format } from "date-fns";

export default function InvoiceTemplate({ invoice, vendor, stampScale = 1 }) {
  if (!invoice || !vendor) return null;

  return (
    <div className="bg-white text-black p-8 w-[210mm] mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="border-2 border-black">
        {/* Header */}
        <div className="border-b-2 border-black p-4 text-center">
          <h1 className="text-xl md:text-2xl font-bold tracking-wide">{vendor.vendor_name}</h1>
          <p className="text-xs mt-1">{vendor.address}</p>
          <p className="text-xs">GSTIN: {vendor.gstin}</p>
        </div>

        {/* Customer Info */}
        <div className="border-b-2 border-black">
          <div className="grid grid-cols-12 text-xs">
            <div className="col-span-2 border-r border-black p-2 font-bold">NAME</div>
            <div className="col-span-4 border-r border-black p-2">: {invoice.customer_name}</div>
            <div className="col-span-2 border-r border-black p-2 font-bold">MODE:</div>
            <div className="col-span-4 p-2">{invoice.mode || "CHOLA"}</div>
          </div>
        </div>
        <div className="border-b-2 border-black">
          <div className="grid grid-cols-12 text-xs">
            <div className="col-span-2 border-r border-black p-2 font-bold">MOBILE NO.</div>
            <div className="col-span-4 border-r border-black p-2">: {invoice.customer_mobile}</div>
            <div className="col-span-2 border-r border-black p-2 font-bold">DATE:</div>
            <div className="col-span-4 p-2">{invoice.invoice_date ? format(new Date(invoice.invoice_date), "dd/MMM/yyyy") : ""}</div>
          </div>
        </div>
        <div className="border-b-2 border-black">
          <div className="grid grid-cols-12 text-xs">
            <div className="col-span-2 border-r border-black p-2 font-bold">ADDRESS</div>
            <div className="col-span-4 border-r border-black p-2">: {invoice.customer_address}</div>
            <div className="col-span-2 border-r border-black p-2 font-bold">INVOICE NO.:</div>
            <div className="col-span-4 p-2 font-bold">{invoice.invoice_number}</div>
          </div>
        </div>
        <div className="border-b-2 border-black">
          <div className="grid grid-cols-12 text-xs">
            <div className="col-span-2 border-r border-black p-2 font-bold">APP. ID</div>
            <div className="col-span-10 p-2">{invoice.delivery_order_number || ""}</div>
          </div>
        </div>

        {/* Product Table Header */}
        <div className="border-b-2 border-black bg-gray-50">
          <div className="grid grid-cols-12 text-xs font-bold text-center">
            <div className="col-span-3 border-r border-black p-2">DESCRIPTION</div>
            <div className="col-span-1 border-r border-black p-2">QTY.</div>
            <div className="col-span-2 border-r border-black p-2">RATE</div>
            <div className="col-span-2 border-r border-black p-2">CGST</div>
            <div className="col-span-2 border-r border-black p-2">SGST</div>
            <div className="col-span-2 p-2">AMOUNT</div>
          </div>
        </div>

        {/* Product Row */}
        <div className="border-b border-black">
          <div className="grid grid-cols-12 text-xs text-center">
            <div className="col-span-3 border-r border-black p-2 text-left">
              <p className="font-medium">{invoice.product_description}</p>
              {invoice.product_model && <p className="mt-0.5">MODEL: {invoice.product_model}</p>}
              {invoice.imei_serial && <p>IMEI:</p>}
              {invoice.imei_serial && <p className="ml-2">{invoice.imei_serial}</p>}
            </div>
            <div className="col-span-1 border-r border-black p-2">{invoice.quantity || 1}</div>
            <div className="col-span-2 border-r border-black p-2">{(invoice.rate || 0).toFixed(2)}</div>
            <div className="col-span-2 border-r border-black p-2">{(invoice.cgst || 0).toFixed(2)}</div>
            <div className="col-span-2 border-r border-black p-2">{(invoice.sgst || 0).toFixed(2)}</div>
            <div className="col-span-2 p-2">{(invoice.grand_total || 0).toFixed(2)}</div>
          </div>
        </div>

        {/* Empty rows */}
        <div className="border-b border-black" style={{ minHeight: "200px" }}>
          <div className="grid grid-cols-12 h-full">
            <div className="col-span-3 border-r border-black" />
            <div className="col-span-1 border-r border-black" />
            <div className="col-span-2 border-r border-black" />
            <div className="col-span-2 border-r border-black" />
            <div className="col-span-2 border-r border-black" />
            <div className="col-span-2" />
          </div>
        </div>

        {/* Terms & Grand Total */}
        <div className="border-t-2 border-black">
          <div className="grid grid-cols-12 text-xs">
            <div className="col-span-6 border-r border-black p-3">
              <p className="font-bold mb-1">TERMS & CONDITIONS:</p>
              <p>1. PURCHASED MOBILE WILL BE PROVIDED WITH 1 YEAR WARRANTY.</p>
              <p>2. BATTERY AND CHARGER WILL HAVE 6-MONTHS WARRANTY PERIOD.</p>
              <p>3. WARRANTY WILL BE PROVIDED AT COMPANY'S AUTHORISED SERVICE CENTER BASED ON THE CONDITION OF THE MOBILE & ACCESORIES.</p>
            </div>
            <div className="col-span-6 p-3 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <p className="font-bold">GRAND TOTAL:</p>
                <p className="text-lg font-bold">Rs.{(invoice.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-center mt-2">
                <p className="text-xs font-bold">{vendor.vendor_name}</p>
                {vendor.stamp_url && (
                  <img
                    src={vendor.stamp_url}
                    alt="Stamp"
                    style={{ transform: `scale(${stampScale})`, transformOrigin: "center", transition: "transform 0.2s" }}
                    className="w-full max-w-[220px] h-32 mx-auto mt-2 object-contain"
                  />
                )}
                <p className="text-xs mt-1">AUTHORISED SIGNATORY</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
