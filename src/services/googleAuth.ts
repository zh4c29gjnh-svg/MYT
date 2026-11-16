/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/meetings.space.created',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let customUser: any = null;

// Auth state listeners
type AuthSuccessCallback = (user: any, token: string) => void;
type AuthFailureCallback = () => void;
const listeners: { success?: AuthSuccessCallback; failure?: AuthFailureCallback }[] = [];

export const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const initAuth = (
  onAuthSuccess?: AuthSuccessCallback,
  onAuthFailure?: AuthFailureCallback
) => {
  if (onAuthSuccess || onAuthFailure) {
    listeners.push({ success: onAuthSuccess, failure: onAuthFailure });
  }

  // Check if we already have custom token and user
  if (cachedAccessToken && customUser) {
    if (onAuthSuccess) onAuthSuccess(customUser, cachedAccessToken);
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        listeners.forEach((l) => l.success?.(user, cachedAccessToken!));
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        customUser = null;
        listeners.forEach((l) => l.failure?.());
      }
    } else if (!customUser) {
      cachedAccessToken = null;
      listeners.forEach((l) => l.failure?.());
    }
  });
};

/**
 * Request Access Token via Google Identity Services (GIS) Token Client
 * Works smoothly in modern browser iframe environments
 */
const signInWithGis = async (): Promise<{ user: any; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    // Wait for window.google if not ready yet
    const checkGsi = () => {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        return false;
      }
      return true;
    };

    const proceed = () => {
      const google = (window as any).google;
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId,
          scope: SCOPES.join(' '),
          prompt: 'select_account',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              if (tokenResponse.error === 'popup_closed') {
                reject(
                  new Error(
                    'หน้าต่างลงชื่อเข้าใช้ Google ถูกปิดก่อนทำรายการเสร็จสิ้น กรุณากดลองใหม่อีกครั้ง'
                  )
                );
              } else {
                reject(new Error(`ข้อผิดพลาดการเชื่อมต่อ: ${tokenResponse.error}`));
              }
              return;
            }

            if (!tokenResponse.access_token) {
              reject(new Error('ไม่พบ Access Token จาก Google'));
              return;
            }

            cachedAccessToken = tokenResponse.access_token;

            // Fetch user info with the token
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${cachedAccessToken}` },
              });
              if (res.ok) {
                const info = await res.json();
                customUser = {
                  displayName: info.name || info.email,
                  email: info.email,
                  photoURL: info.picture,
                  uid: info.sub,
                };
              } else {
                customUser = {
                  displayName: 'ผู้ใช้งาน Google Workspace',
                  email: 'google-user@workspace',
                  uid: 'gsi-user',
                };
              }
            } catch {
              customUser = {
                displayName: 'ผู้ใช้งาน Google Workspace',
                email: 'google-user@workspace',
                uid: 'gsi-user',
              };
            }

            listeners.forEach((l) => l.success?.(customUser, tokenResponse.access_token));
            resolve({ user: customUser, accessToken: tokenResponse.access_token });
          },
        });

        tokenClient.requestAccessToken();
      } catch (err: any) {
        reject(err);
      }
    };

    if (checkGsi()) {
      proceed();
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (checkGsi()) {
          clearInterval(interval);
          proceed();
        } else if (attempts > 15) {
          clearInterval(interval);
          reject(new Error('Google Identity Services ยังโหลดไม่พร้อม'));
        }
      }, 200);
    }
  });
};

/**
 * Universal Google Sign In
 * Tries Google Identity Services first, falls back to Firebase signInWithPopup
 */
export const googleSignIn = async (): Promise<{
  user: any;
  accessToken: string;
} | null> => {
  if (isSigningIn) return null;
  isSigningIn = true;

  try {
    // 1. Try Google Identity Services
    if ((window as any).google?.accounts?.oauth2) {
      try {
        const res = await signInWithGis();
        return res;
      } catch (gisErr: any) {
        console.warn('GIS sign in attempted, checking fallback:', gisErr);
        if (gisErr.message?.includes('หน้าต่างลงชื่อเข้าใช้')) {
          throw gisErr;
        }
      }
    }

    // 2. Fallback to Firebase signInWithPopup
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่พบ Access Token จากการเข้าสู่ระบบ Google');
    }

    cachedAccessToken = credential.accessToken;
    customUser = result.user;
    listeners.forEach((l) => l.success?.(customUser, cachedAccessToken!));
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign in error:', error);
    let friendlyMessage = error.message;

    if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup_closed')) {
      friendlyMessage =
        'หน้าต่างลงชื่อเข้าใช้ Google ถูกปิดก่อนทำรายการเสร็จสิ้น กรุณากดปุ่มลองใหม่อีกครั้ง';
    } else if (error.code === 'auth/popup-blocked') {
      friendlyMessage =
        'เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาคลิกที่แถบที่อยู่ (URL) ด้านบนเพื่ออนุญาต Always allow pop-ups';
    } else if (error.code === 'auth/cancelled-popup-request') {
      friendlyMessage = 'คำขอก่อนหน้าถูกยกเลิก กรุณากดลองใหม่อีกครั้ง';
    } else if (error.code === 'auth/network-request-failed') {
      friendlyMessage = 'การเชื่อมต่อเครือข่ายขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ต';
    }

    const err = new Error(friendlyMessage);
    (err as any).code = error.code;
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch {}
  cachedAccessToken = null;
  customUser = null;
  listeners.forEach((l) => l.failure?.());
};
