const SUPABASE_URL = 'https://vdficanwgmimdkqdtixc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZmljYW53Z21pbWRrcWR0aXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUyMzYxMywiZXhwIjoyMDkzMDk5NjEzfQ.sCioE4S7w2MVfomT2e9ADist-9gM_UP_RcDhdBIdAIY';

// Use Supabase Management API to run raw SQL
const PROJECT_REF = 'vdficanwgmimdkqdtixc';

async function runSQL(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  console.log(res.status, text.slice(0, 500));
}

async function main() {
  await runSQL(`
    CREATE POLICY IF NOT EXISTS "auth_insert_evidence"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'evidence');
  `);

  await runSQL(`
    CREATE POLICY IF NOT EXISTS "auth_select_evidence"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'evidence');
  `);

  await runSQL(`
    CREATE POLICY IF NOT EXISTS "anon_select_evidence"
    ON storage.objects FOR SELECT TO anon
    USING (bucket_id = 'evidence');
  `);
}
main().catch(console.error);
