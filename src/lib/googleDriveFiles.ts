import { supabase } from './supabaseClient';

const SUPABASE_URL = 'https://tmygylckkbocgunlubik.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRteWd5bGNra2JvY2d1bmx1YmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTEyODAsImV4cCI6MjA4MTYyNzI4MH0.SYo3IcVUBGfHs1PZGgP8wtPhvmtQQ6ytW9_H7NW20SE';

export interface DriveFolder {
  id: string;
  name: string;
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
  downloadUrl: string;
  viewUrl: string;
}

export interface DriveListResult {
  folders: DriveFolder[];
  files: DriveFile[];
}

export async function listDriveFiles(folderId?: string): Promise<DriveListResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const params = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
  const response = await fetch(`${SUPABASE_URL}/functions/v1/list-drive-files${params}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to list Drive files');
  return data as DriveListResult;
}

export async function searchDriveFiles(query: string): Promise<DriveFile[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/list-drive-files?search=${encodeURIComponent(query)}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to search Drive files');
  return (data as DriveListResult).files;
}

/** Extract a Drive file ID from a download URL or view URL. Returns null if not a Drive URL. */
export function extractDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // https://drive.google.com/uc?id=FILE_ID&export=download
    const id = parsed.searchParams.get('id');
    if (id) return id;
    // https://drive.google.com/file/d/FILE_ID/view
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/list-drive-files?fileId=${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Delete failed with status ${response.status}`);
  }
}
