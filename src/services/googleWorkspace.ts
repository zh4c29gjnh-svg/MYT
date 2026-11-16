/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAccessToken } from './googleAuth.ts';

export interface DriveUploadedFile {
  id: string;
  name: string;
  webViewLink?: string;
}

/**
 * Uploads a JSON backup or document file to Google Drive using the Drive API
 */
export async function uploadToGoogleDrive(
  fileName: string,
  content: string | Blob,
  mimeType: string = 'application/json'
): Promise<DriveUploadedFile | null> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google เพื่อใช้งาน Google Drive');
  }

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: 'เอกสารระบบจัดการงานก่อสร้าง MYT Construction',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  let body: BodyInit;
  if (typeof content === 'string') {
    body =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      content +
      closeDelimiter;
  } else {
    // Blob handling
    const metadataPart = new Blob(
      [
        delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${mimeType}\r\n\r\n`,
      ],
      { type: 'text/plain' }
    );
    const closePart = new Blob([closeDelimiter], { type: 'text/plain' });
    body = new Blob([metadataPart, content, closePart], {
      type: `multipart/related; boundary=${boundary}`,
    });
  }

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Drive upload failed:', errorText);
    throw new Error(`บันทึก Google Drive ไม่สำเร็จ (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink,
  };
}

/**
 * List files created in Google Drive by this app
 */
export async function listDriveFiles(): Promise<Array<{ id: string; name: string; modifiedTime: string; webViewLink?: string }>> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const query = encodeURIComponent("trashed = false and name contains 'MYT'");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=20`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Failed to list drive files:', err);
    return [];
  }
}

/**
 * Export project task list or daily report to Google Sheets
 */
export async function exportToGoogleSheets(
  title: string,
  headerRow: string[],
  dataRows: (string | number)[][]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string } | null> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google เพื่อใช้งาน Google Sheets');
  }

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: 'ข้อมูล MYT',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`สร้าง Google Sheets ไม่สำเร็จ: ${errText}`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = created.spreadsheetUrl;

  // 2. Append values
  const values = [headerRow, ...dataRows];
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values,
      }),
    }
  );

  if (!appendRes.ok) {
    console.warn('Failed to append values to sheet, but sheet was created');
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Create a Google Meet space for site team coordination
 */
export async function createGoogleMeetMeeting(): Promise<{ meetingUri: string } | null> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google เพื่อสร้างห้อง Google Meet');
  }

  const res = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        accessType: 'OPEN',
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`สร้างห้องประชุม Meet ไม่สำเร็จ: ${errText}`);
  }

  const data = await res.json();
  return { meetingUri: data.meetingUri };
}
