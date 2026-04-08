import { PostgrestError } from '@supabase/supabase-js';

export const isAuthError = (error: PostgrestError | Error | null): boolean => {
    if (!error) return false;

    const message = error.message?.toLowerCase() || '';
    const code = 'code' in error ? error.code : '';

    return (
        message.includes('jwt') ||
        message.includes('session') ||
        message.includes('expired') ||
        message.includes('invalid') ||
        message.includes('unauthorized') ||
        code === '401' ||
        code === 'PGRST301'
    );
};

export const handleApiError = (error: PostgrestError | Error | null, onAuthError?: () => void): void => {
    if (isAuthError(error)) {
        console.error('Auth error detected:', error);
        onAuthError?.();
    } else {
        console.error('API error:', error);
    }
};
