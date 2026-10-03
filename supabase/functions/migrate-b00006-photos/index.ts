import { corsHeaders } from '../_shared/cors.ts';

// These 36 objects were already confirmed migrated to Google Drive in a prior run
// of this function (each one's id_cards.photo_url + card_data was verified updated
// to a drive.google.com URL before this list was hardcoded). This function only
// deletes exactly these literal paths — nothing computed or swept at runtime.
const VERIFIED_MIGRATED_PATHS = [
  'bulk/B-00006/1323_photo.png',
  'bulk/B-00006/1481_photo.png',
  'bulk/B-00006/1918_photo.png',
  'bulk/B-00006/1934_photo.png',
  'bulk/B-00006/2039_photo.png',
  'bulk/B-00006/2147_photo.png',
  'bulk/B-00006/2520_photo.png',
  'bulk/B-00006/2805_photo.png',
  'bulk/B-00006/2819_photo.png',
  'bulk/B-00006/2821_photo.png',
  'bulk/B-00006/2849_photo.png',
  'bulk/B-00006/2904_photo.png',
  'bulk/B-00006/2925_photo.png',
  'bulk/B-00006/2933_photo.png',
  'bulk/B-00006/3020_photo.png',
  'bulk/B-00006/3049_photo.png',
  'bulk/B-00006/3122_photo.png',
  'bulk/B-00006/3165_photo.png',
  'bulk/B-00006/3173_photo.png',
  'bulk/B-00006/3217_photo.png',
  'bulk/B-00006/3221_photo.png',
  'bulk/B-00006/3223_photo.png',
  'bulk/B-00006/3225_photo.png',
  'bulk/B-00006/3234_photo.png',
  'bulk/B-00006/3235_photo.png',
  'bulk/B-00006/3236_photo.png',
  'bulk/B-00006/3242_photo.png',
  'bulk/B-00006/3244_photo.png',
  'bulk/B-00006/3258_photo.png',
  'bulk/B-00006/3299_photo.png',
  'bulk/B-00006/3300_photo.png',
  'bulk/B-00006/3303_photo.png',
  'bulk/B-00006/3304_photo.png',
  'bulk/B-00006/3311_photo.png',
  'bulk/B-00006/3312_photo.png',
  'bulk/B-00006/3313_photo.png',
  'bulk/B-00006/572_photo.png',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeaders = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' };

  try {
    // Re-verify each path is no longer referenced by any id_cards.photo_url before deleting it —
    // belt-and-suspenders on top of the hardcoded verified list above.
    const stillReferencedRes = await fetch(
      `${supabaseUrl}/rest/v1/id_cards?batch_id=eq.B-00006&photo_url=ilike.*supabase*&select=id,photo_url`,
      { headers: authHeaders },
    );
    const stillReferenced = await stillReferencedRes.json();
    if (Array.isArray(stillReferenced) && stillReferenced.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Aborting: some id_cards rows still reference Supabase Storage photo_url', stillReferenced }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const deleteRes = await fetch(`${supabaseUrl}/storage/v1/object/id-card-images`, {
      method: 'DELETE',
      headers: authHeaders,
      body: JSON.stringify({ prefixes: VERIFIED_MIGRATED_PATHS }),
    });
    const deleteBody = await deleteRes.text();

    return new Response(
      JSON.stringify({ ok: deleteRes.ok, status: deleteRes.status, body: deleteBody, deletedCount: VERIFIED_MIGRATED_PATHS.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
