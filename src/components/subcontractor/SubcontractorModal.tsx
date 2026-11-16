/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Subcontractor } from '../../types/types.ts';
import { X, UserCheck, Upload, Image as ImageIcon, Trash2, CreditCard } from 'lucide-react';

interface SubcontractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subcontractor: Subcontractor) => void;
  initialData?: Subcontractor | null;
}

export const SubcontractorModal: React.FC<SubcontractorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Subcontractor>>({
    name: '',
    idCardNumber: '',
    address: '',
    phone: '',
    skillType: 'งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง',
    bankName: 'ธนาคารกสิกรไทย',
    bankAccount: '',
    idCardImage: '',
    notes: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        idCardNumber: '',
        address: '',
        phone: '',
        skillType: 'งานจ้างเหมาเฉพาะค่าแรงงานโครงสร้าง',
        bankName: 'ธนาคารกสิกรไทย',
        bankAccount: '',
        idCardImage: '',
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปภาพเกิน 8MB กรุณาเลือกรูปภาพที่มีขนาดเล็กลง');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({ ...prev, idCardImage: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, idCardImage: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const subcontractor: Subcontractor = {
      id: initialData?.id || `sub-${Date.now()}`,
      name: formData.name.trim(),
      idCardNumber: formData.idCardNumber?.trim() || '',
      address: formData.address?.trim() || '',
      phone: formData.phone?.trim() || '',
      skillType: formData.skillType?.trim() || 'งานจ้างเหมาทั่วไป',
      bankName: formData.bankName,
      bankAccount: formData.bankAccount,
      idCardImage: formData.idCardImage || '',
      notes: formData.notes,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(subcontractor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-lg">
              {initialData ? 'แก้ไขข้อมูลผู้รับเหมา (ผรม.)' : '1.1 เพิ่มข้อมูลผู้รับเหมา (ผรม.)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ชื่อ - นามสกุล ผู้รับเหมา <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น นายบรรเลง ร่องกล้า หรือ หจก. ทรัพย์อนันต์"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              หมายเลขบัตรประจำตัวประชาชน (13 หลัก)
            </label>
            <input
              type="text"
              placeholder="เช่น 1 1002 01884 92 0"
              value={formData.idCardNumber || ''}
              onChange={(e) => setFormData({ ...formData, idCardNumber: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Thai ID Card Photo Upload Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <CreditCard className="w-4 h-4 mr-1.5 text-blue-600" />
                รูปถ่ายสำเนาบัตรประจำตัวประชาชน
              </label>
              {formData.idCardImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  ลบรูปบัตร
                </button>
              )}
            </div>

            {formData.idCardImage ? (
              <div className="relative border border-slate-300 rounded-xl overflow-hidden bg-white group">
                <img
                  src={formData.idCardImage}
                  alt="สำเนาบัตรประชาชน"
                  className="w-full max-h-48 object-contain bg-slate-900/5 p-2"
                />
                <div className="p-2 text-center bg-slate-100 text-[11px] text-slate-600 border-t border-slate-200">
                  แนบรูปบัตรประชาชนเรียบร้อยแล้ว (คลิกเปลี่ยนรูปได้ด้านล่าง)
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer hover:bg-blue-50/40 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-1.5">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  คลิกเพื่ออัปโหลดรูปภาพบัตรประชาชน
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  รองรับไฟล์รูปภาพ JPG, PNG, WEBP (ขนาดไม่เกิน 8MB)
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ที่อยู่ตามบัตรประชาชน / สำนักงาน
            </label>
            <textarea
              rows={2}
              placeholder="เช่น 24/9 ซอยลาดพร้าว 122 แขวงพลับพลา เขตวังทองหลาง กทม. 10310"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <input
                type="text"
                placeholder="เช่น 081-456-7890"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ความเชี่ยวชาญ / ประเภทงาน
              </label>
              <input
                type="text"
                placeholder="เช่น เช่าเครื่องจักร, งานโครงสร้าง, ทาสี"
                value={formData.skillType || ''}
                onChange={(e) => setFormData({ ...formData, skillType: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ธนาคาร
              </label>
              <select
                value={formData.bankName || 'ธนาคารกสิกรไทย'}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="ธนาคารกสิกรไทย">ธนาคารกสิกรไทย (KBANK)</option>
                <option value="ธนาคารไทยพาณิชย์">ธนาคารไทยพาณิชย์ (SCB)</option>
                <option value="ธนาคารกรุงเทพ">ธนาคารกรุงเทพ (BBL)</option>
                <option value="ธนาคารกรุงไทย">ธนาคารกรุงไทย (KTB)</option>
                <option value="ธนาคารกรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา (BAY)</option>
                <option value="ธนาคารทหารไทยธนชาต">ธนาคารทหารไทยธนชาต (TTB)</option>
                <option value="ธนาคารออมสิน">ธนาคารออมสิน (GSB)</option>
                <option value="พร้อมเพย์">พร้อมเพย์ (PromptPay)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                เลขที่บัญชี
              </label>
              <input
                type="text"
                placeholder="เช่น 023-2-89412-3"
                value={formData.bankAccount || ''}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              หมายเหตุ / บันทึกเพิ่มเติม
            </label>
            <input
              type="text"
              placeholder="เช่น มีรถขุด 2 คัน, พร้อมเริ่มงานได้ทันที"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              บันทึกข้อมูล ผรม.
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
