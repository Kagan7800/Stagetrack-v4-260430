import { useState, useEffect, useCallback, useRef } from 'react';

// Declare global types for Google APIs to prevent TypeScript errors
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
}

export function useGoogleDrive() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);

  const tokenClientRef = useRef<any>(null);
  const gapiInitializedRef = useRef<boolean>(false);
  const gisInitializedRef = useRef<boolean>(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
  const SCOPES = 'https://www.googleapis.com/auth/drive.file';
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

  // Helper to load external script dynamically
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });
  };

  // Initialize GAPI client
  const initializeGapiClient = useCallback(async () => {
    try {
      if (gapiInitializedRef.current) return;

      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client', {
          callback: resolve,
          onerror: () => reject(new Error('GAPI client loading failed')),
          timeout: 10000,
          ontimeout: () => reject(new Error('GAPI client load timed out')),
        });
      });

      await window.gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: [DISCOVERY_DOC],
      });

      gapiInitializedRef.current = true;

      // Check for an existing valid token in sessionStorage
      const storedTokenData = sessionStorage.getItem('gdrive_access_token');
      if (storedTokenData) {
        const { token, expiresAt } = JSON.parse(storedTokenData);
        // Ensure token has not expired yet (with a 1-minute buffer)
        if (Date.now() < expiresAt - 60000) {
          window.gapi.client.setToken(token);
          setIsConnected(true);
        } else {
          sessionStorage.removeItem('gdrive_access_token');
        }
      }
    } catch (err: any) {
      console.error('Error initializing GAPI client:', err);
      setError(err.message || 'Error initializing Google API client');
    }
  }, [apiKey]);

  // Initialize GIS token client
  const initializeGisClient = useCallback(() => {
    try {
      if (gisInitializedRef.current) return;

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setError(tokenResponse.error_description || 'OAuth2 authentication failed');
            return;
          }

          // Compute absolute expiration time (expires_in is in seconds)
          const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
          const tokenData = {
            token: tokenResponse,
            expiresAt,
          };

          sessionStorage.setItem('gdrive_access_token', JSON.stringify(tokenData));
          window.gapi.client.setToken(tokenResponse);
          setIsConnected(true);
          setError(null);
        },
      });

      tokenClientRef.current = client;
      gisInitializedRef.current = true;
    } catch (err: any) {
      console.error('Error initializing GIS client:', err);
      setError(err.message || 'Error initializing Google Identity Services client');
    }
  }, [clientId]);

  // Disconnect function to revoke token and clear local state
  const disconnect = useCallback(() => {
    try {
      const storedTokenData = sessionStorage.getItem('gdrive_access_token');
      if (storedTokenData) {
        const { token } = JSON.parse(storedTokenData);
        if (token && token.access_token && window.google?.accounts?.oauth2) {
          window.google.accounts.oauth2.revokeToken(token.access_token, () => {
            // Callback when revocation is done
          });
        }
      }
    } catch (err) {
      console.error('Error revoking token:', err);
    } finally {
      if (window.gapi?.client) {
        window.gapi.client.setToken(null);
      }
      sessionStorage.removeItem('gdrive_access_token');
      setIsConnected(false);
      setFiles([]);
    }
  }, []);

  // Load and initialize SDKs on mount
  useEffect(() => {
    let active = true;

    const initSDKs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!clientId || !apiKey) {
          throw new Error('Google Client ID or API Key is missing in environment variables');
        }

        // Dynamically load Google API client and Google Identity Services scripts
        await Promise.all([
          loadScript('https://apis.google.com/js/api.js'),
          loadScript('https://accounts.google.com/gsi/client'),
        ]);

        if (!active) return;

        // Initialize clients
        await initializeGapiClient();
        initializeGisClient();
      } catch (err: any) {
        if (active) {
          console.error('Failed to load/initialize Google SDKs:', err);
          setError(err.message || 'Failed to load Google SDKs');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    initSDKs();

    return () => {
      active = false;
    };
  }, [clientId, apiKey, initializeGapiClient, initializeGisClient]);

  // Connect function to request access token (triggers prompt popup)
  const connect = useCallback(() => {
    if (!tokenClientRef.current) {
      setError('Google Identity Services client is not initialized');
      return;
    }

    try {
      setError(null);
      // prompt: 'consent' forces showing the consent screen. 
      // Change to prompt: '' or omit to bypass prompt if already consented.
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      setError(err.message || 'Failed to request access token');
    }
  }, []);

  // List top 10 files from Google Drive
  const listFiles = useCallback(async (): Promise<GoogleDriveFile[]> => {
    if (!isConnected) {
      const errMsg = 'User is not connected to Google Drive';
      setError(errMsg);
      throw new Error(errMsg);
    }

    try {
      setError(null);
      const response = await window.gapi.client.drive.files.list({
        pageSize: 10,
        fields: 'files(id, name, mimeType, createdTime)',
      });

      const fileList = response.result.files || [];
      setFiles(fileList);
      return fileList;
    } catch (err: any) {
      console.error('Error listing files from Google Drive:', err);
      // Automatically disconnect if authorization error (e.g. 401) occurs
      if (err.status === 401) {
        disconnect();
      }
      const errMsg = err.result?.error?.message || err.message || 'Failed to retrieve files from Google Drive';
      setError(errMsg);
      throw new Error(errMsg);
    }
  }, [isConnected, disconnect]);

  return {
    isConnected,
    isLoading,
    error,
    files,
    connect,
    disconnect,
    listFiles,
  };
}
