import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { upstoxAdapter } from '../../../../../lib/integrations/adapters/upstox-adapter';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { redirectUrl } = await upstoxAdapter.connect(user.id);
    return NextResponse.json({ redirectUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate Upstox connection' },
      { status: 500 }
    );
  }
}
