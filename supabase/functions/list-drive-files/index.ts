const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ROOT_FOLDER_ID = '0AInOeJo8pGboUk9PVA';

function base64urlEncodeString(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken(serviceAccount: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlEncodeString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64urlEncodeString(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }));

  const signingInput = `${header}.${payload}`;

  const pemKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const pemContents = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${base64urlEncodeBytes(new Uint8Array(signatureBuffer))}`;

  const tokenBody = new URLSearchParams();
  tokenBody.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  tokenBody.set('assertion', jwt);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString(),
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(data));
  }
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) throw new Error('Google service account not configured');
    const serviceAccount = JSON.parse(serviceAccountJson);

    // DELETE: permanently delete a file
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const fileId = url.searchParams.get('fileId');
      if (!fileId) throw new Error('Missing fileId');

      const accessToken = await getAccessToken(serviceAccount);
      const res = await fetch(
        `${DRIVE_API}/files/${fileId}?supportsAllDrives=true`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (res.status !== 204 && !res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error('Drive API error: ' + JSON.stringify(errData));
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET: list folder contents or global search
    const accessToken = await getAccessToken(serviceAccount);
    const url = new URL(req.url);
    const folderId = url.searchParams.get('folderId') || ROOT_FOLDER_ID;
    const searchTerm = url.searchParams.get('search') || '';

    let driveQuery: string;
    let queryParams: string;

    if (searchTerm) {
      // Global search across all files in the shared drive
      const escaped = searchTerm.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      driveQuery = `name contains '${escaped}' and mimeType != 'application/vnd.google-apps.folder' and trashed=false`;
      queryParams = '&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=name';
    } else {
      driveQuery = `'${folderId}' in parents and trashed=false`;
      queryParams = '&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=folder,name';
    }

    const fields = 'files(id,name,mimeType,size,modifiedTime,parents)';
    const res = await fetch(
      `${DRIVE_API}/files?q=${encodeURIComponent(driveQuery)}&fields=${encodeURIComponent(fields)}${queryParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const data = await res.json();
    if (!res.ok) throw new Error('Drive API error: ' + JSON.stringify(data));

    const folders: { id: string; name: string }[] = [];
    const files: { id: string; name: string; size: number; modifiedTime: string; downloadUrl: string; viewUrl: string }[] = [];

    for (const item of (data.files || [])) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        folders.push({ id: item.id, name: item.name });
      } else {
        files.push({
          id: item.id,
          name: item.name,
          size: item.size ? parseInt(item.size) : 0,
          modifiedTime: item.modifiedTime || '',
          downloadUrl: `https://drive.google.com/uc?id=${item.id}&export=download`,
          viewUrl: `https://drive.google.com/file/d/${item.id}/view`,
        });
      }
    }

    return new Response(JSON.stringify({ folders, files }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
