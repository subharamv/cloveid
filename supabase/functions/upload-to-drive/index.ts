import { corsHeaders } from '../_shared/cors.ts';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FALLBACK_FOLDER_ID = '0AInOeJo8pGboUk9PVA';

async function getRootFolderId(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return FALLBACK_FOLDER_ID;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/system_settings?key=eq.google_drive_folder_id&select=value`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    );
    const rows = await res.json();
    const id = rows?.[0]?.value;
    return id || FALLBACK_FOLDER_ID;
  } catch {
    return FALLBACK_FOLDER_ID;
  }
}

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

// Finds an existing folder or creates it — always uses supportsAllDrives so it works in Shared Drives
async function findOrCreateFolder(
  name: string,
  parentId: string,
  accessToken: string,
): Promise<string> {
  const query =
    `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;

  const searchRes = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Folder does not exist yet — create it inside the parent (Shared Drive)
  const createRes = await fetch(`${DRIVE_API}/files?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });

  const createData = await createRes.json();
  if (!createData.id) {
    throw new Error('Failed to create folder: ' + JSON.stringify(createData));
  }
  return createData.id;
}

async function uploadFile(
  fileName: string,
  fileBlob: Blob,
  folderId: string,
  accessToken: string,
): Promise<string> {
  const metadata = { name: fileName, parents: [folderId] };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileBlob);

  // supportsAllDrives=true is required for uploads into Shared Drive folders
  const uploadRes = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id&supportsAllDrives=true`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );

  const uploadData = await uploadRes.json();
  if (!uploadData.id) {
    throw new Error('Failed to upload file: ' + JSON.stringify(uploadData));
  }
  return uploadData.id;
}

async function makePublic(fileId: string, accessToken: string): Promise<void> {
  await fetch(`${DRIVE_API}/files/${fileId}/permissions?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) throw new Error('Google service account not configured');

    const serviceAccount = JSON.parse(serviceAccountJson);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    const uploadType = (formData.get('type') as string) || 'single';
    const batchName = formData.get('batchName') as string | null;

    if (!file || !fileName) throw new Error('Missing file or fileName');

    const accessToken = await getAccessToken(serviceAccount);
    const rootFolderId = await getRootFolderId();

    let targetFolderId: string;

    if (uploadType === 'raw_photo') {
      targetFolderId = await findOrCreateFolder('Photos', rootFolderId, accessToken);
    } else if (uploadType === 'processed_photo') {
      const employeeId = formData.get('employeeId') as string;
      if (!employeeId) throw new Error('Missing employeeId for processed_photo type');
      const processedFolderId = await findOrCreateFolder('Processed Photos', rootFolderId, accessToken);
      targetFolderId = await findOrCreateFolder(employeeId, processedFolderId, accessToken);
    } else {
      const now = new Date();
      const monthFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthFolderId = await findOrCreateFolder(monthFolder, rootFolderId, accessToken);

      if (uploadType === 'batch' && batchName) {
        const batchesFolderId = await findOrCreateFolder('Batches', monthFolderId, accessToken);
        targetFolderId = await findOrCreateFolder(batchName, batchesFolderId, accessToken);
      } else {
        targetFolderId = await findOrCreateFolder('Single Cards', monthFolderId, accessToken);
      }
    }

    const fileId = await uploadFile(fileName, file, targetFolderId, accessToken);
    await makePublic(fileId, accessToken);

    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
    const downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;

    return new Response(JSON.stringify({ success: true, fileId, fileUrl, downloadUrl }), {
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
