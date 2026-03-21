import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { INTEGRATION_MAP } from '../../../lib/integrations/registry';

export const dynamic = 'force-dynamic';

// GET — list user's integrations
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ integrations: integrations || [] });
}

// POST — enable/configure an integration
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { provider, config = {}, enabled = true } = body;

  if (!provider || !INTEGRATION_MAP.has(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('integrations')
    .upsert(
      {
        user_id: user.id,
        provider,
        config,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ integration: data });
}

// DELETE — disable an integration
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');

  if (!provider) {
    return NextResponse.json({ error: 'Provider required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
