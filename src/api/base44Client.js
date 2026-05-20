// Drop-in replacement for base44Client using Supabase
// Usage stays the same: import { base44 } from '@/api/base44Client'

import { supabase } from './supabaseClient';

function makeEntity(table) {
  return {
    async list(orderField = '-created_at', limit = 200) {
      const ascending = !orderField.startsWith('-');
      const field = orderField.replace(/^-/, '').replace('created_date', 'created_at');
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(field, { ascending })
        .limit(limit);
      if (error) throw error;
      return data;
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async create(record) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from(table)
        .insert({ ...record, created_by: user?.email })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, record) {
      const { data, error } = await supabase
        .from(table)
        .update(record)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id };
    },

    async filter(filters = {}) {
      let query = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  };
}

// File upload via Supabase Storage
async function UploadFile({ file }) {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('uploads').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('uploads').getPublicUrl(path);
  return { file_url: data.publicUrl };
}

// AI extraction via Claude API (replaces base44.integrations.Core.ExtractDataFromUploadedFile)
async function ExtractDataFromUploadedFile({ file_url, json_schema }) {
  try {
    // Fetch the file as base64
    const response = await fetch(file_url);
    const blob = await response.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const mediaType = blob.type || 'image/jpeg';
    const isPdf = mediaType === 'application/pdf';

    // Build the prompt from the schema
    const fields = Object.entries(json_schema.properties || {})
      .map(([k, v]) => `- ${k}: ${v.description || v.type}`)
      .join('\n');

    const prompt = `Extract the following fields from this delivery order document and return ONLY a valid JSON object with no extra text:\n\n${fields}`;

    const contentBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [contentBlock, { type: 'text', text: prompt }],
          },
        ],
      }),
    });

    const result = await apiResponse.json();
    const text = result.content?.map(c => c.text || '').join('') || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const output = JSON.parse(clean);
    return { status: 'success', output };
  } catch (e) {
    console.error('Extraction error:', e);
    return { status: 'error', output: null };
  }
}

export const base44 = {
  entities: {
    Invoice: makeEntity('invoices'),
    VendorProfile: makeEntity('vendor_profiles'),
  },
  integrations: {
    Core: {
      UploadFile,
      ExtractDataFromUploadedFile,
    },
  },
};
