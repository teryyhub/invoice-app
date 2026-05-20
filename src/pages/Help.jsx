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
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="text-muted-foreground">Find answers to your questions or contact our support team</p>
      </div>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search for a question..." 
          className="pl-9" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-primary/10 rounded-full text-primary"><BookOpen className="w-6 h-6" /></div>
            <h3 className="font-semibold">User Guide</h3>
            <p className="text-xs text-muted-foreground">Step-by-step tutorials on using the platform</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-primary/10 rounded-full text-primary"><MessageCircle className="w-6 h-6" /></div>
            <h3 className="font-semibold">Live Chat</h3>
            <p className="text-xs text-muted-foreground">Connect with a support agent in real-time</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-primary/10 rounded-full text-primary"><LifeBuoy className="w-6 h-6" /></div>
            <h3 className="font-semibold">Ticket Support</h3>
            <p className="text-xs text-muted-foreground">Submit a request for technical issues</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2"><ArrowRight className="w-5 h-5 text-primary" /> Frequently Asked Questions</h2>
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No matching FAQs found.</div>
        ) : (
          filteredFaqs.map((cat, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{cat.category}</h3>
              <Accordion type="single-collapse" collapsible className="w-full">
                {cat.items.map((item, i) => (
                  <AccordionItem key={i} value={`item-${idx}-${i}`} className="border-border">
                    <AccordionTrigger className="text-left font-medium">{item.q}</Tigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
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
