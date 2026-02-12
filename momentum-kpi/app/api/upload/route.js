import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  'https://bnzbaywpfzfochqurqte.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuemJheXdwZnpmb2NocXVycXRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMxNTQxNiwiZXhwIjoyMDg0ODkxNDE2fQ.OqouY0Iyna8tjV8jFFNffIYihE4p9AcyMhNgj0BljU4'
);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const filePath = formData.get('filePath');

    if (!file || !filePath) {
      return NextResponse.json({ error: 'Missing file or filePath' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from('deal-documents')
      .upload(filePath, buffer, {
        upsert: true,
        contentType: file.type || 'application/pdf',
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('deal-documents')
      .getPublicUrl(filePath);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    console.error('Upload route error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
