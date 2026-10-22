// src/pages/Help.jsx
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, LifeBuoy, MessageCircle, BookOpen, ArrowRight } from 'lucide-react';

const FAQS = [
  {
    category: "Getting Started",
    items: [
      { q: "How do I generate my first invoice?", a: "Go to the 'Generate Invoice' page, upload a delivery order PDF or Image, and the system will automatically extract the data. Review it and click 'Generate'." },
      { q: "Where can I add my shop details?", a: "Navigate to 'Vendor Settings' to add your shop name, GSTIN, and upload your official stamp image." },
    ]
  },
  {
    category: "Billing & Taxes",
    items: [
      { q: "How are CGST and SGST calculated?", a: "The system currently calculates taxes based on a standard rate of 7.63% each for a total of 15.26% GST on the product price." },
      { q: "Can I change the tax rates?", a: "Currently, rates are fixed based on the business requirements. Please contact support for customization." },
    ]
  },
  {
    category: "Technical",
    items: [
      { q: "Which file formats are supported for uploads?", a: "We support PDF, PNG, and JPG formats for delivery order extraction." },
      { q: "What happens if data is not extracted correctly?", a: "You can manually edit any field in the 'Invoice Details' card before clicking 'Generate Invoice'." },
    ]
  }
];

export default function Help() {
  const [search, setSearch] = useState('');

  const filteredFaqs = FAQS.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.q.toLowerCase().includes(search.toLowerCase()) || 
      item.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      <div className="text-center space-y-1">
        <h1 className="text-base font-bold text-foreground">Help & Support</h1>
        <p className="text-[10px] text-muted-foreground">Find answers to your questions or contact our support team</p>
      </div>

      <div className="relative max-w-sm mx-auto">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input 
          placeholder="Search for a question..." 
          className="pl-8 h-7 text-xs bg-card" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer rounded-lg border-border/80 shadow-none bg-card">
          <CardContent className="p-3.5 flex flex-col items-center text-center space-y-1.5">
            <div className="p-2 bg-primary/10 rounded-full text-primary"><BookOpen className="w-4 h-4" /></div>
            <h3 className="font-semibold text-xs text-foreground">User Guide</h3>
            <p className="text-[10px] text-muted-foreground">Step-by-step tutorials on using the platform</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer rounded-lg border-border/80 shadow-none bg-card">
          <CardContent className="p-3.5 flex flex-col items-center text-center space-y-1.5">
            <div className="p-2 bg-primary/10 rounded-full text-primary"><MessageCircle className="w-4 h-4" /></div>
            <h3 className="font-semibold text-xs text-foreground">Live Chat</h3>
            <p className="text-[10px] text-muted-foreground">Connect with a support agent in real-time</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer rounded-lg border-border/80 shadow-none bg-card">
          <CardContent className="p-3.5 flex flex-col items-center text-center space-y-1.5">
            <div className="p-2 bg-primary/10 rounded-full text-primary"><LifeBuoy className="w-4 h-4" /></div>
            <h3 className="font-semibold text-xs text-foreground">Ticket Support</h3>
            <p className="text-[10px] text-muted-foreground">Submit a request for technical issues</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-primary" /> Frequently Asked Questions
        </h2>
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">No matching FAQs found.</div>
        ) : (
          filteredFaqs.map((cat, idx) => (
            <div key={idx} className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{cat.category}</h3>
              <Accordion type="single" collapsible className="w-full space-y-1">
                {cat.items.map((item, i) => (
                  <AccordionItem key={i} value={`item-${idx}-${i}`} className="border border-border/80 rounded-lg px-3 bg-card shadow-none">
                    <AccordionTrigger className="text-left font-semibold text-xs py-2 hover:no-underline">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-2">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))
        )}
      </div>
    </div>
  );
}