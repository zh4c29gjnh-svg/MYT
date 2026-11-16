/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project } from '../../types/types.ts';
import { Calendar, CheckCircle, Clock, Table, CalendarRange, Layers } from 'lucide-react';
import { exportToGoogleSheets } from '../../services/googleWorkspace.ts';
import { getTaskProgressPercent } from './ProjectKanban.tsx';
import { GeneralWorkflowView } from './GeneralWorkflowView.tsx';

interface TimelineViewProps {
  project: Project;
  projects?: Project[];
  onUpdateProject?: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
  onSelectProject?: (project: Project) => void;
}

const DEFAULT_GROUPS = [
  { id: 'g1', name: 'งานงวดที่ 1' },
  { id: 'g2', name: 'งานงวดที่ 2' },
  { id: 'g3', name: 'งานงวดที่ 3' },
  { id: 'g4', name: 'งานเครื่องจักร' },
  { id: 'g5', name: 'คอนกรีต' },
];

export const TimelineView: React.FC<TimelineViewProps> = ({
  project,
  projects,
  onUpdateProject,
  onDeleteProject,
  onSelectProject,
}) => {
  const [viewMode, setViewMode] = useState<'workflow' | 'summary'>('workflow');
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const groups =
    project.groups && project.groups.length > 0
      ? project.groups
      : project.groupsInitialized
      ? []
      : DEFAULT_GROUPS;

  const handleExportTimelineSheets = async () => {
    try {
      const headerRow = [
        'ลำดับ',
        'งวดงาน / หมวดหมู่',
        'กิจกรรมการทำงาน',
        'วันที่เริ่ม',
        'วันที่สิ้นสุด',
        'ความคืบหน้า (%)',
        'ระดับความสำคัญ',
        'สถานะ',
        'วันที่บันทึกเสร็จสิ้น',
      ];

      const dataRows = project.tasks.map((task, idx) => {
        const pct = getTaskProgressPercent(task);
        return [
          idx + 1,
          task.groupName,
          task.title,
          task.startDate || '-',
          task.endDate || '-',
          `${pct}%`,
          task.priority,
          pct >= 100 ? 'เสร็จสิ้นแล้ว' : pct > 0 ? 'กำลังดำเนินการ' : 'รอดำเนินการ',
          task.completionDate || '-',
        ];
      });

      const res = await exportToGoogleSheets(
        `แผนงาน_${project.name}_${new Date().toISOString().split('T')[0]}`,
        headerRow,
        dataRows
      );

      if (res) {
        setExportStatus('ส่งออกตารางแผนงานไปที่ Google Sheets เรียบร้อยแล้ว!');
        setTimeout(() => setExportStatus(null), 4000);
      }
    } catch (err: any) {
      setExportStatus(`ข้อผิดพลาด: ${err?.message || err}`);
      setTimeout(() => setExportStatus(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-blue-600 font-semibold mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>2.3 ตารางแสดงแผนงานตามช่วงเวลา (Timeline & General Workflow)</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">{project.name}</h3>
          <p className="text-xs text-slate-500">
            ระยะเวลาโครงการ: {project.startDate} ถึง {project.endDate} (รวม {project.tasks.length} กิจกรรม)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('workflow')}
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'workflow'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5 mr-1.5" />
              General Workflow (ตาราง Gantt รายวัน)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'summary'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              ตารางสรุปตามงวดงาน
            </button>
          </div>

          <button
            onClick={handleExportTimelineSheets}
            className="inline-flex items-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Table className="w-4 h-4 mr-1.5" />
            ส่งออกแผนงานเข้า Google Sheets
          </button>
        </div>
      </div>

      {exportStatus && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold">
          {exportStatus}
        </div>
      )}

      {viewMode === 'workflow' && onUpdateProject ? (
        <GeneralWorkflowView
          project={project}
          projects={projects && projects.length > 0 ? projects : [project]}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
          onSelectProject={onSelectProject}
        />
      ) : (
        /* Timeline Gantt Representation */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-x-auto">
          <h4 className="font-bold text-slate-800 text-sm mb-4">
            ตารางจำแนกตามงวดงานและความคืบหน้า
          </h4>

        <div className="space-y-6">
          {groups.map((group, grpIdx) => {
            const groupTasks = project.tasks.filter((t) => t.groupName === group.name);
            const completedCount = groupTasks.filter((t) => getTaskProgressPercent(t) >= 100).length;
            const percent =
              groupTasks.length > 0
                ? Math.round(
                    groupTasks.reduce((acc, t) => acc + getTaskProgressPercent(t), 0) /
                      groupTasks.length
                  )
                : 0;

            return (
              <div key={group.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      {grpIdx + 1}
                    </span>
                    <h5 className="font-bold text-slate-900 text-sm">{group.name}</h5>
                    <span className="text-xs text-slate-500">
                      ({completedCount}/{groupTasks.length} กิจกรรมเสร็จสิ้น)
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-blue-600">{percent}%</span>
                    <div className="w-32 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Sub tasks list */}
                <div className="divide-y divide-slate-200/60 bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
                  {groupTasks.map((task) => {
                    const taskPct = getTaskProgressPercent(task);
                    const isDone = taskPct >= 100;
                    return (
                      <div
                        key={task.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {isDone ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          <div>
                            <span
                              className={`font-medium block ${
                                isDone ? 'text-slate-800' : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </span>
                            {(task.startDate || task.endDate) && (
                              <span className="text-[11px] text-blue-600 font-medium inline-flex items-center mt-0.5">
                                <Calendar className="w-3 h-3 mr-1" />
                                เริ่ม {task.startDate || '-'} ถึง {task.endDate || '-'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isDone ? 'bg-emerald-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${taskPct}%` }}
                              ></div>
                            </div>
                            <span
                              className={`font-bold text-[11px] min-w-[34px] text-right ${
                                isDone
                                  ? 'text-emerald-600'
                                  : taskPct > 0
                                  ? 'text-blue-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {taskPct}%
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              task.priority === 'High'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px] min-w-[90px] text-right">
                            {task.completionDate || (isDone ? 'เสร็จสิ้น' : `ดำเนินการ ${taskPct}%`)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {groupTasks.length === 0 && (
                    <div className="p-3 text-center text-slate-400">ยังไม่มีกิจกรรมในงวดนี้</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
};
