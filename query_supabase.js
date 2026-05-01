const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vdficanwgmimdkqdtixc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZmljYW53Z21pbWRrcWR0aXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUyMzYxMywiZXhwIjoyMDkzMDk5NjEzfQ.sCioE4S7w2MVfomT2e9ADist-9gM_UP_RcDhdBIdAIY'
);
async function main() {
  const { data } = await supabase.from('reports').select('id, photo_urls, created_at').order('created_at', { ascending: false }).limit(1);
  console.log(JSON.stringify(data, null, 2));
  
  // Also list files in the bucket
  const { data: files } = await supabase.storage.from('evidence').list('', { limit: 10 });
  console.log('Files in bucket root:', JSON.stringify(files, null, 2));
}
main();
