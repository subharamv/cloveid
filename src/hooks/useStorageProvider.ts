import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { uploadZipToGoogleDrive } from '@/lib/googleDriveUpload';

export type StorageProvider = 'supabase' | 'google_drive';

const SETTING_KEY = 'storage_provider';

export const useStorageProvider = () => {
  const [provider, setProvider] = useState<StorageProvider>('supabase');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProvider();
  }, []);

  const fetchProvider = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();

      setProvider(data?.value === 'google_drive' ? 'google_drive' : 'supabase');
    } catch {
      setProvider('supabase');
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = async (newProvider: StorageProvider) => {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: SETTING_KEY, value: newProvider, updated_at: new Date().toISOString() });

    if (!error) setProvider(newProvider);
    return { error };
  };

  /**
   * Upload a ZIP blob to the active storage provider.
   * Returns the public URL of the stored file.
   */
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

    // Supabase Storage path
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

  return { provider, loading, updateProvider, refreshProvider: fetchProvider, uploadZip };
};
