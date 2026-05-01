const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vdficanwgmimdkqdtixc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZmljYW53Z21pbWRrcWR0aXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUyMzYxMywiZXhwIjoyMDkzMDk5NjEzfQ.sCioE4S7w2MVfomT2e9ADist-9gM_UP_RcDhdBIdAIY'
);

async function main() {
  const { data, error } = await supabase.storage.from('evidence').upload('test.txt', Buffer.from('hello'), { upsert: true });
  console.log('Upload:', data, error);
}
main();
