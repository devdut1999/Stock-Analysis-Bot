import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { upstoxAdapter } from '../../../../../lib/integrations/adapters/upstox-adapter';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await upstoxAdapter.disconnect(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
