/**
 * Storage Provider Abstraction Layer
 * 
 * This module provides a unified interface for accessing files from multiple
 * storage providers. Currently supports:
 * - Supabase Storage (default)
 * - Google Drive (planned)
 * - MEGA (planned)
 * - Dropbox (planned)
 * 
 * Usage:
 * ```typescript
 * import { getFileUrl, StorageProvider } from '@/lib/storageProvider';
 * 
 * const url = await getFileUrl(fileUrl, provider, externalFileId);
 * ```
 */

export type StorageProvider = 'supabase' | 'google_drive' | 'mega' | 'dropbox';

export interface StorageFile {
  id: string;
  url: string;
  provider: StorageProvider;
  expiresAt?: Date;
}

export interface StorageCredentials {
  apiKey?: string;
  folderId?: string;  // For Google Drive
  accessToken?: string;
}

/**
 * Get a signed/direct URL for a file based on its storage provider
 * 
 * @param fileUrl - The file URL or path stored in the database
 * @param provider - The storage provider (default: 'supabase')
 * @param externalFileId - External file ID for non-Supabase providers
 * @returns Promise<string> - The accessible URL for the file
 */
export const getFileUrl = async (
  fileUrl: string,
  provider: StorageProvider = 'supabase',
  externalFileId?: string | null
): Promise<string> => {
  switch (provider) {
    case 'supabase':
      // For Supabase, the URL is handled by the serve-pdf edge function
      // This returns the relative path which will be processed there
      return fileUrl;

    case 'google_drive':
      if (!externalFileId) {
        throw new Error('Google Drive file ID is required');
      }
      // Google Drive direct download/view URL
      // Note: The file must have appropriate sharing settings
      return `https://drive.google.com/uc?export=view&id=${externalFileId}`;

    case 'mega':
      if (!externalFileId) {
        throw new Error('MEGA file ID is required');
      }
      // MEGA requires special handling via their API or SDK
      // For now, we assume the externalFileId is a shareable link
      // In production, this should use MEGA's ephemeral link generation
      return externalFileId;

    case 'dropbox':
      if (!fileUrl) {
        throw new Error('Dropbox file URL is required');
      }
      // Convert Dropbox share URL to direct download URL
      // Replace www.dropbox.com with dl.dropboxusercontent.com
      // and ensure ?dl=1 is appended
      const dropboxUrl = fileUrl
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('?dl=0', '?dl=1');
      
      // If no query param exists, add it
      if (!dropboxUrl.includes('?')) {
        return `${dropboxUrl}?dl=1`;
      }
      return dropboxUrl;

    default:
      console.warn(`Unknown storage provider: ${provider}, falling back to direct URL`);
      return fileUrl;
  }
};

/**
 * Check if a storage provider is supported
 */
export const isSupportedProvider = (provider: string): provider is StorageProvider => {
  return ['supabase', 'google_drive', 'mega', 'dropbox'].includes(provider);
};

/**
 * Get display name for a storage provider
 */
export const getProviderDisplayName = (provider: StorageProvider): string => {
  const names: Record<StorageProvider, string> = {
    supabase: 'Cloud Storage',
    google_drive: 'Google Drive',
    mega: 'MEGA',
    dropbox: 'Dropbox',
  };
  return names[provider] || provider;
};

/**
 * Storage provider configuration for admin interface
 */
export const STORAGE_PROVIDERS: Array<{
  id: StorageProvider;
  name: string;
  description: string;
  maxFileSizeMB: number;
  freeStorageGB: number;
}> = [
  {
    id: 'supabase',
    name: 'Cloud Storage',
    description: 'Native storage with automatic signed URLs',
    maxFileSizeMB: 50,
    freeStorageGB: 1,
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'For large files. Paste shareable link.',
    maxFileSizeMB: 5000,
    freeStorageGB: 15,
  },
  {
    id: 'mega',
    name: 'MEGA',
    description: 'For very large files with encryption.',
    maxFileSizeMB: 10000,
    freeStorageGB: 20,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'For team collaboration files.',
    maxFileSizeMB: 2000,
    freeStorageGB: 2,
  },
];
