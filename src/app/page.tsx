import { createClient } from '@/utils/supabase/server';
import { redirect } from 'expo-router';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    redirect('/(auth)/login');
  }

  // Fetch user's data from Supabase
  const { data: expenses } = await supabase.from('expenses').select();
  const { data: groups } = await supabase.from('groups').select();
  const { data: payments } = await supabase.from('payments').select();

  redirect('/(tabs)/home');
}
