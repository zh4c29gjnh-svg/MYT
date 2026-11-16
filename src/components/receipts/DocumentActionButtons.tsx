/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Printer,
  Image as ImageIcon,
  FileDown,
  CloudUpload,
  CheckCircle2,
  Loader2,
  Eye,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  exportElementAsPng,
  exportElementAsPdf,
  prepareAndTriggerPrint,
  triggerPrint,
  unmountPrintImage,
  PreparedPrintResult,
} from '../../utils/exportUtils.ts';
import { uploadToGoogleDrive } from '../../services/googleWorkspace.ts';
import { getAccessToken, googleSignIn } from '../../services/googleAuth.ts';
import confetti from 'canvas-confetti';

interface DocumentActionButtonsProps {
  elementId: string;
  documentTitle: string;
  fileName: string;
  onPreviewToggle?: () => void;
  isPreviewMode?: boolean;
  onSaveToSystem?: () => void;
  documentData?: any;
}

export const DocumentActionButtons: React.FC<DocumentActionButtonsProps> = ({
  elementId,
  documentTitle,
  fileName,
  onPreviewToggle,
  isPreviewMode = false,
  onSaveToSystem,
  documentData,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printModalState, setPrintModalState] = useState<PreparedPrintResult | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveResult, setDriveResult] = useState<{ id: string; url?: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  const handlePrint = async () => {
    setIsPrinting(true);
    setMessage(null);
    try {
      const prepared = await prepareAndTriggerPrint(elementId);
      if (prepared) {
        // Always open the in-app Print Preview & Print Controller modal if the native dialog
        // was blocked by the preview iframe, or so the user can print/open PDF directly.
        if (!prepared.dialogOpened) {
          setPrintModalState(prepared);
        } else {
          unmountPrintImage();
          setMessage('ส่งคำสั่งพิมพ์เอกสาร A4 เรียบร้อยแล้ว');
          setTimeout(() => setMessage(null), 4000);
        }
      } else {
        setMessage('เกิดข้อผิดพลาดในการเตรียมหน้าเอกสารสำหรับพิมพ์');
      }
    } catch (err: any) {
      setMessage(`เกิดข้อผิดพลาดในการพิมพ์: ${err?.message || err}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleClosePrintModal = () => {
    if (printModalState?.pdfBlobUrl) {
      URL.revokeObjectURL(printModalState.pdfBlobUrl);
    }
    unmountPrintImage();
    setPrintModalState(null);
  };

  const handleDownloadPdfFromPrintModal = () => {
    if (!printModalState) return;
    const finalName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const link = document.createElement('a');
    link.href = printModalState.pdfBlobUrl;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSavePng = async () => {
    setIsExportingPng(true);
    setMessage(null);
    try {
      const ok = await exportElementAsPng(elementId, `${fileName}.png`);
      if (ok) {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
        setMessage('บันทึกรูปภาพ PNG เรียบร้อยแล้ว');
      } else {
        setMessage('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
      }
    } catch (err: any) {
      setMessage(`เกิดข้อผิดพลาด: ${err?.message || err}`);
    } finally {
      setIsExportingPng(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleSavePdf = async () => {
    setIsExportingPdf(true);
    setMessage(null);
    try {
      const ok = await exportElementAsPdf(elementId, `${fileName}.pdf`);
      if (ok) {
        confetti({ particleCount: 35, spread: 70, origin: { y: 0.8 } });
        setMessage('บันทึกเอกสาร PDF เรียบร้อยแล้ว');
      } else {
        setMessage('เกิดข้อผิดพลาดในการสร้าง PDF');
      }
    } catch (err: any) {
      setMessage(`เกิดข้อผิดพลาด: ${err?.message || err}`);
    } finally {
      setIsExportingPdf(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleUploadDrive = async () => {
    setIsUploadingDrive(true);
    setMessage(null);
    setDriveResult(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        try {
          const authResult = await googleSignIn();
          if (!authResult) {
            setMessage('กรุณาลงชื่อเข้าใช้ Google เพื่อบันทึกไฟล์');
            setIsUploadingDrive(false);
            return;
          }
        } catch (authErr: any) {
          setMessage(authErr.message || 'หน้าต่างเข้าสู่ระบบถูกปิด กรุณาลองใหม่อีกครั้ง');
          setIsUploadingDrive(false);
          return;
        }
      }

      const backupPayload = JSON.stringify(
        {
          title: documentTitle,
          exportedAt: new Date().toISOString(),
          app: 'MYT Construction Management',
          data: documentData,
        },
        null,
        2
      );

      const res = await uploadToGoogleDrive(
        `${fileName}_backup.json`,
        backupPayload,
        'application/json'
      );

      if (res) {
        setDriveResult({ id: res.id, url: res.webViewLink });
        confetti({ particleCount: 45, spread: 80, origin: { y: 0.7 } });
        setMessage('บันทึกข้อมูลเข้า Google Drive สำเร็จ!');
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'ไม่สามารถบันทึกเข้า Google Drive ได้');
    } finally {
      setIsUploadingDrive(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm mb-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800 text-sm">การดำเนินการเอกสาร:</span>
            {onPreviewToggle && (
              <button
                type="button"
                onClick={onPreviewToggle}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  isPreviewMode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Eye className="w-4 h-4 mr-1.5" />
                {isPreviewMode ? 'ปิดมุมมองจำลอง' : 'แสดงตัวอย่างก่อนพิมพ์'}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
              title="พิมพ์เอกสารออกเครื่องพิมพ์ขนาด A4"
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-1.5" />
              )}
              {isPrinting ? 'กำลังเตรียมหน้าพิมพ์...' : 'พิมพ์เอกสาร'}
            </button>

            {/* PNG button */}
            <button
              type="button"
              onClick={handleSavePng}
              disabled={isExportingPng}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              {isExportingPng ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4 mr-1.5" />
              )}
              บันทึก PNG
            </button>

            {/* PDF button */}
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isExportingPdf}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-1.5" />
              )}
              บันทึก PDF
            </button>

            {/* Google Drive Upload */}
            <button
              type="button"
              onClick={handleUploadDrive}
              disabled={isUploadingDrive}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
              title="บันทึกข้อมูลเข้า Google Drive"
            >
              {isUploadingDrive ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4 mr-1.5" />
              )}
              บันทึกเข้า Google Drive
            </button>

            {/* Save to System if callback provided */}
            {onSaveToSystem && (
              <button
                type="button"
                onClick={onSaveToSystem}
                className="inline-flex items-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                บันทึกเข้าระบบ
              </button>
            )}
          </div>
        </div>

        {/* Notifications / Feedback */}
        {message && (
          <div className="mt-3 p-2.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-between">
            <span>{message}</span>
            {driveResult?.url && (
              <a
                href={driveResult.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center ml-2"
              >
                เปิดไฟล์ใน Google Drive
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* In-App A4 Print Preview & Print Controller Modal */}
      {printModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 print:hidden">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Top Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    หน้าต่างเตรียมพิมพ์เอกสาร A4 ({fileName})
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    คลิกไอคอนเครื่องพิมพ์ 🖨️ มุมขวาบนของเอกสารด้านล่าง หรือกดปุ่มสีน้ำเงินเพื่อเปิดสั่งพิมพ์ทันที
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Open PDF in New Tab for unrestricted native printing */}
                <a
                  href={printModalState.pdfBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  เปิดหน้าต่างสั่งพิมพ์ (แท็บใหม่)
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>

                {/* Direct System Print Retry */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (printIframeRef.current?.contentWindow) {
                        printIframeRef.current.contentWindow.focus();
                        printIframeRef.current.contentWindow.print();
                      } else {
                        triggerPrint();
                      }
                    } catch {
                      triggerPrint();
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  สั่งพิมพ์ทันที
                </button>

                {/* Download PDF */}
                <button
                  type="button"
                  onClick={handleDownloadPdfFromPrintModal}
                  className="inline-flex items-center px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 mr-1.5" />
                  ดาวน์โหลด PDF
                </button>

                {/* Close Modal */}
                <button
                  type="button"
                  onClick={handleClosePrintModal}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Embedded PDF & A4 Print Preview Area */}
            <div className="flex-1 bg-slate-200 overflow-y-auto p-4 flex flex-col items-center gap-4">
              {/* Native Browser PDF Print Frame (includes Chrome's built-in 🖨️ Print button) */}
              <div className="w-full h-[68vh] bg-slate-800 rounded-xl overflow-hidden shadow-inner border border-slate-300">
                <iframe
                  ref={printIframeRef}
                  src={printModalState.pdfBlobUrl}
                  title={`Print Preview ${fileName}`}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
