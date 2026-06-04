import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { uploadZipToGoogleDrive } from '@/lib/googleDriveUpload';

export type StorageProvider = 'supabase' | 'google_drive';

const FALLBACK_FOLDER_ID = '0AInOeJo8pGboUk9PVA';

/** Extract a Drive folder ID from either a full URL or a bare ID string. */
export function extractDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;
  return null;
}

export const useStorageProvider = () => {
  const [provider, setProvider] = useState<StorageProvider>('supabase');
  const [loading, setLoading] = useState(true);
  const [driveFolderId, setDriveFolderId] = useState<string>(FALLBACK_FOLDER_ID);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>(
    `https://drive.google.com/drive/folders/${FALLBACK_FOLDER_ID}`,
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['storage_provider', 'google_drive_folder_id', 'google_drive_folder_url']);

      const map: Record<string, string> = {};
      (data ?? []).forEach((row: { key: string; value: string }) => {
        map[row.key] = row.value;
      });

      setProvider(map['storage_provider'] === 'google_drive' ? 'google_drive' : 'supabase');

      if (map['google_drive_folder_id']) {
        setDriveFolderId(map['google_drive_folder_id']);
        setDriveFolderUrl(
          map['google_drive_folder_url'] ||
            `https://drive.google.com/drive/folders/${map['google_drive_folder_id']}`,
        );
      }
    } catch {
      setProvider('supabase');
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = async (newProvider: StorageProvider) => {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'storage_provider', value: newProvider, updated_at: new Date().toISOString() });

    if (!error) setProvider(newProvider);
    return { error };
  };

  /** Save a new Google Drive folder URL/ID to system_settings. */
  const updateDriveFolder = async (urlOrId: string): Promise<{ error: any }> => {
    const folderId = extractDriveFolderId(urlOrId);
    if (!folderId) return { error: new Error('Invalid Google Drive folder URL or ID') };

    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

    const { error } = await supabase.from('system_settings').upsert([
      { key: 'google_drive_folder_id', value: folderId, updated_at: new Date().toISOString() },
      { key: 'google_drive_folder_url', value: folderUrl, updated_at: new Date().toISOString() },
    ]);

    if (!error) {
      setDriveFolderId(folderId);
      setDriveFolderUrl(folderUrl);
    }
    return { error };
  };

  const uploadZip = async (
    zipBlob: Blob,
    fileName: string,
    type: 'single' | 'batch' = 'single',
    batchName?: string,
  ): Promise<string> => {
    if (provider === 'google_drive') {
      const result = await uploadZipToGoogleDrive(zipBlob, fileName, type, batchName);
      return result.downloadUrl;
    }

    const path = `zips/${fileName}`;
    const { error } = await supabase.storage
      .from('id-card-images')
      .upload(path, zipBlob, { upsert: true });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('id-card-images')
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  };

  return {
    provider,
    loading,
    driveFolderId,
    driveFolderUrl,
    updateProvider,
    updateDriveFolder,
    refreshProvider: fetchSettings,
    uploadZip,
  };
};
