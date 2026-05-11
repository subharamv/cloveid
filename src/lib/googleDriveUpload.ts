import { supabase } from './supabaseClient';

const SUPABASE_URL = 'https://tmygylckkbocgunlubik.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRteWd5bGNra2JvY2d1bmx1YmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTEyODAsImV4cCI6MjA4MTYyNzI4MH0.SYo3IcVUBGfHs1PZGgP8wtPhvmtQQ6ytW9_H7NW20SE';

export interface DriveUploadResult {
  fileId: string;
  fileUrl: string;
  downloadUrl: string;
}

export async function uploadCardImageToDrive(
  imageBlob: Blob,
  fileName: string,
  employeeId: string,
): Promise<DriveUploadResult> {
  const formData = new FormData();
  formData.append('file', imageBlob, fileName);
  formData.append('fileName', fileName);
  formData.append('type', 'processed_photo');
  formData.append('employeeId', employeeId);

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-to-drive`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Google Drive upload failed');

  return { fileId: data.fileId, fileUrl: data.fileUrl, downloadUrl: data.downloadUrl };
}

export async function uploadZipToGoogleDrive(
  zipBlob: Blob,
  fileName: string,
  type: 'single' | 'batch',
  batchName?: string,
): Promise<DriveUploadResult> {
  const formData = new FormData();
  formData.append('file', zipBlob, fileName);
  formData.append('fileName', fileName);
  formData.append('type', type);
  if (batchName) formData.append('batchName', batchName);

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  // Use direct fetch so the browser sets the correct multipart/form-data boundary.
  // supabase.functions.invoke doesn't reliably handle FormData content-type.
  const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-to-drive`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Google Drive upload failed');

  return { fileId: data.fileId, fileUrl: data.fileUrl, downloadUrl: data.downloadUrl };
}
