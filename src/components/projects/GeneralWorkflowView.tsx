/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Project,
  ProjectGroup,
  ProjectTask,
  TaskPriority,
} from '../../types/types.ts';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  UserPlus,
  ArrowRight,
  Edit3,
  Trash2,
  Calendar,
  Check,
} from 'lucide-react';

interface GeneralWorkflowViewProps {
  project: Project;
  projects?: Project[];
  onUpdateProject: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
  onSelectProject?: (project: Project) => void;
}

export interface WorkflowBadgeOption {
  label: string;
  bgClass: string;
  textClass: string;
  marksCompleted?: boolean;
}

export const WORKFLOW_BADGE_OPTIONS: WorkflowBadgeOption[] = [
  {
    label: 'ทีมออกแบบ เตรียมแบบ',
    bgClass: 'bg-[#5c6672]',
    textClass: 'text-white',
  },
  {
    label: 'ทีมขายติดต่อลูกค้า',
    bgClass: 'bg-[#4ea866]',
    textClass: 'text-white',
  },
  {
    label: 'งานเสร็จเรียบร้อย',
    bgClass: 'bg-[#48a860]',
    textClass: 'text-white',
    marksCompleted: true,
  },
  {
    label: 'Completed',
    bgClass: 'bg-[#5ec299]',
    textClass: 'text-white',
    marksCompleted: true,
  },
  {
    label: 'To do',
    bgClass: 'bg-[#4a7ebb]',
    textClass: 'text-white',
  },
  {
    label: 'Pending',
    bgClass: 'bg-[#a6adb4]',
    textClass: 'text-white',
  },
  {
    label: 'In Progress',
    bgClass: 'bg-[#0ea5e9]',
    textClass: 'text-white',
  },
];

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function parseIsoDate(iso?: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null;
  const [y, m, d] = iso.trim().split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

function toIsoDate(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getBadgeStyle(badgeLabel?: string, fallbackCompleted?: boolean) {
  const label =
    badgeLabel || (fallbackCompleted ? 'Completed' : 'Pending');
  const found = WORKFLOW_BADGE_OPTIONS.find(
    (b) => b.label.toLowerCase() === label.toLowerCase()
  );
  if (found) return found;
  if (label.includes('เสร็จ') || label.toLowerCase() === 'completed') {
    return {
      label,
      bgClass: 'bg-[#5ec299]',
      textClass: 'text-white',
      marksCompleted: true,
    };
  }
  if (label.includes('ทีมขาย')) {
    return { label, bgClass: 'bg-[#4ea866]', textClass: 'text-white' };
  }
  if (label.includes('ทีมออกแบบ')) {
    return { label, bgClass: 'bg-[#5c6672]', textClass: 'text-white' };
  }
  if (label.toLowerCase() === 'to do') {
    return { label, bgClass: 'bg-[#4a7ebb]', textClass: 'text-white' };
  }
  return { label, bgClass: 'bg-[#a6adb4]', textClass: 'text-white' };
}

function recalculateProjectProgress(tasks: ProjectTask[]): number {
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((acc, t) => {
    const pct =
      typeof t.progressPercent === 'number'
        ? t.progressPercent
        : t.completed
        ? 100
        : t.status === 'in_progress'
        ? 50
        : 0;
    return acc + pct;
  }, 0);
  return Number((total / tasks.length).toFixed(1));
}

const TeamAvatarCluster: React.FC<{
  count?: number;
  doubleAvatar?: boolean;
  onClick?: () => void;
}> = ({ count = 0, doubleAvatar = false, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 shrink-0 group cursor-pointer"
      title="คลิกเพื่อแก้ไขผู้รับผิดชอบและจำนวนทีมงาน"
    >
      <div className="flex items-center -space-x-1.5">
        <span className="w-5 h-5 rounded-full bg-amber-100 border border-white flex items-center justify-center overflow-hidden shadow-2xs">
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <circle cx="12" cy="8" r="4" fill="#92400e" />
            <path
              d="M5 20c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5"
              fill="#d97706"
            />
          </svg>
        </span>
        {doubleAvatar && (
          <span className="w-5 h-5 rounded-full bg-emerald-100 border border-white flex items-center justify-center overflow-hidden shadow-2xs">
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <circle cx="12" cy="8" r="4" fill="#1e293b" />
              <path
                d="M5 20c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5"
                fill="#059669"
              />
            </svg>
          </span>
        )}
      </div>
      {count > 0 && (
        <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 group-hover:text-emerald-900">
          <UserPlus className="w-3 h-3 mr-0.5 text-emerald-600" />+{count}
        </span>
      )}
    </button>
  );
};

interface EditItemModalState {
  mode: 'create_project' | 'edit_project' | 'create_phase' | 'edit_phase' | 'create_task' | 'edit_task';
  projectId?: string;
  groupId?: string;
  taskId?: string;
  title: string;
  groupName: string;
  supervisorOrAssignee: string;
  teamCount: number;
  workflowBadge: string;
  startDate: string;
  endDate: string;
  priority: TaskPriority;
  hasSubArrow: boolean;
}

export const GeneralWorkflowView: React.FC<GeneralWorkflowViewProps> = ({
  project,
  projects,
  onUpdateProject,
  onDeleteProject,
  onSelectProject,
}) => {
  const allProjects = projects && projects.length > 0 ? projects : [project];
  const activeProject = project;

  // Filter & Search States matching KANNA screenshot
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterResponsible, setFilterResponsible] = useState<boolean>(false);
  const [filterIncomplete, setFilterIncomplete] = useState<boolean>(false);
  const [filterHasDate, setFilterHasDate] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<
    'newest' | 'oldest' | 'name' | 'progress'
  >('newest');

  // Calendar Window State (Syncs to active project's start date month)
  const [viewAnchorDate, setViewAnchorDate] = useState<Date>(() => {
    const parsed = parseIsoDate(activeProject.startDate);
    return parsed
      ? new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12, 0, 0)
      : new Date(2026, 5, 1, 12, 0, 0);
  });
  const [highlightedDateIso, setHighlightedDateIso] = useState<string>(() => {
    if (activeProject.id === 'prj-somjai') return '2026-06-10';
    return activeProject.startDate || '2026-06-10';
  });
  const [calendarSpanDays, setCalendarSpanDays] = useState<number>(28); // 28 days (e.g. 27 May - 23 June)

  // Whenever the selected project changes, jump calendar to that project's schedule month
  useEffect(() => {
    const parsed = parseIsoDate(activeProject.startDate);
    if (parsed) {
      setViewAnchorDate(
        new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12, 0, 0)
      );
      setHighlightedDateIso(
        activeProject.id === 'prj-somjai'
          ? '2026-06-10'
          : activeProject.startDate
      );
    }
  }, [activeProject.id, activeProject.startDate]);

  // Expand / Collapse states for Projects and Phases
  const [collapsedProjects, setCollapsedProjects] = useState<
    Record<string, boolean>
  >({});
  const [collapsedPhases, setCollapsedPhases] = useState<
    Record<string, boolean>
  >({});

  // Interactive Drag-to-Schedule state on the Gantt Grid
  const [dragSchedule, setDragSchedule] = useState<{
    targetType: 'project' | 'phase' | 'task';
    projectId: string;
    groupId?: string;
    taskId?: string;
    anchorIso: string;
    currentIso: string;
  } | null>(null);

  // Modal state for creating/editing Project, Phase, or Task
  const [modalState, setModalState] = useState<EditItemModalState | null>(null);

  // Build visible daily columns (starting 5 days before anchor month start so 27..30 of prev month appear just like screenshot!)
  const visibleDays = useMemo(() => {
    const start = new Date(
      viewAnchorDate.getFullYear(),
      viewAnchorDate.getMonth(),
      1,
      12,
      0,
      0
    );
    start.setDate(start.getDate() - 5); // e.g., May 27 when anchor is June 1
    const list: {
      iso: string;
      dayNum: number;
      dayShort: string;
      isWeekend: boolean;
      monthLabel: string;
    }[] = [];

    for (let i = 0; i < calendarSpanDays; i++) {
      const d = new Date(start.getTime());
      d.setDate(start.getDate() + i);
      const dow = d.getDay();
      list.push({
        iso: toIsoDate(d),
        dayNum: d.getDate(),
        dayShort: THAI_DAYS_SHORT[dow],
        isWeekend: dow === 0 || dow === 6,
        monthLabel: `${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`,
      });
    }
    return list;
  }, [viewAnchorDate, calendarSpanDays]);

  const currentMonthTitle = `${
    THAI_MONTHS_SHORT[viewAnchorDate.getMonth()]
  } ${viewAnchorDate.getFullYear()}`;

  // Single separated project view: never mix multiple projects together
  const filteredProjects = useMemo(() => {
    return [activeProject];
  }, [activeProject]);

  // Helper to filter tasks/phases within the single active project
  const filterProjectTasks = (tasks: ProjectTask[]) => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.groupName.toLowerCase().includes(q) && !activeProject.name.toLowerCase().includes(q)) {
        return false;
      }
      if (filterResponsible && !(t.assignedTo?.trim() || activeProject.supervisorName?.trim())) {
        return false;
      }
      if (filterIncomplete && t.completed) {
        return false;
      }
      if (filterHasDate && (!t.startDate || !t.endDate)) {
        return false;
      }
      return true;
    });
  };

  // Helper to shift calendar month
  const handleShiftMonth = (deltaMonths: number) => {
    setViewAnchorDate(
      (prev) =>
        new Date(prev.getFullYear(), prev.getMonth() + deltaMonths, 1, 12, 0, 0)
    );
  };

  const handleJumpToDate = (isoDate?: string) => {
    const parsed = parseIsoDate(isoDate);
    if (parsed) {
      setViewAnchorDate(
        new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12, 0, 0)
      );
      setHighlightedDateIso(toIsoDate(parsed));
    } else {
      // Jump to June 2026 reference
      setViewAnchorDate(new Date(2026, 5, 1, 12, 0, 0));
      setHighlightedDateIso('2026-06-10');
    }
  };

  // Cycle badge inline when clicked
  const handleCycleBadge = (
    targetType: 'project' | 'phase' | 'task',
    project: Project,
    groupId?: string,
    taskId?: string
  ) => {
    const labels = WORKFLOW_BADGE_OPTIONS.map((o) => o.label);
    if (targetType === 'project') {
      const idx = labels.indexOf(
        project.workflowBadge || 'ทีมออกแบบ เตรียมแบบ'
      );
      const next = labels[(idx + 1) % labels.length];
      onUpdateProject({ ...project, workflowBadge: next });
      return;
    }

    if (targetType === 'phase' && groupId) {
      const updatedGroups = project.groups.map((g) => {
        if (g.id !== groupId) return g;
        const idx = labels.indexOf(g.workflowBadge || 'To do');
        const next = labels[(idx + 1) % labels.length];
        return { ...g, workflowBadge: next };
      });
      onUpdateProject({ ...project, groups: updatedGroups });
      return;
    }

    if (targetType === 'task' && taskId) {
      const updatedTasks = project.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const currentLabel =
          t.workflowBadge || (t.completed ? 'Completed' : 'Pending');
        const idx = labels.indexOf(currentLabel);
        const next = labels[(idx + 1) % labels.length];
        const opt = WORKFLOW_BADGE_OPTIONS.find((o) => o.label === next);
        const isDone = !!opt?.marksCompleted;
        return {
          ...t,
          workflowBadge: next,
          completed: isDone,
          status: isDone
            ? ('completed' as const)
            : next === 'In Progress'
            ? ('in_progress' as const)
            : ('pending' as const),
          progressPercent: isDone ? 100 : t.progressPercent || 30,
        };
      });
      onUpdateProject({
        ...project,
        tasks: updatedTasks,
        progress: recalculateProjectProgress(updatedTasks),
      });
    }
  };

  // Commit drag-to-schedule dates on Gantt grid
  const commitDragSchedule = () => {
    if (!dragSchedule) return;
    const { targetType, projectId, groupId, taskId, anchorIso, currentIso } =
      dragSchedule;
    const startIso = anchorIso <= currentIso ? anchorIso : currentIso;
    const endIso = anchorIso <= currentIso ? currentIso : anchorIso;

    const proj =
      allProjects.find((p) => p.id === projectId) || activeProject;
    if (proj) {
      if (targetType === 'project') {
        onUpdateProject({ ...proj, startDate: startIso, endDate: endIso });
      } else if (targetType === 'phase' && groupId) {
        const updatedGroups = proj.groups.map((g) =>
          g.id === groupId ? { ...g, startDate: startIso, endDate: endIso } : g
        );
        onUpdateProject({ ...proj, groups: updatedGroups });
      } else if (targetType === 'task' && taskId) {
        const updatedTasks = proj.tasks.map((t) =>
          t.id === taskId ? { ...t, startDate: startIso, endDate: endIso } : t
        );
        onUpdateProject({ ...proj, tasks: updatedTasks });
      }
    }
    setDragSchedule(null);
  };

  // Save modal handler
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalState || !modalState.title.trim()) return;

    if (modalState.mode === 'create_project') {
      const newProjId = `prj-${Date.now()}`;
      const newProject: Project = {
        id: newProjId,
        code: `PRJ-${Math.floor(100 + Math.random() * 900)}`,
        name: modalState.title.trim(),
        location: 'กรุงเทพมหานคร',
        startDate: modalState.startDate || '2026-06-01',
        endDate: modalState.endDate || '2026-06-30',
        budget: 2000000,
        status: 'in_progress',
        supervisorName: modalState.supervisorOrAssignee || 'นายปริวิทย์ นวลนาค',
        isFollowed: true,
        progress: 0,
        teamCount: modalState.teamCount,
        workflowBadge: modalState.workflowBadge,
        groupsInitialized: true,
        groups: [
          {
            id: `grp-${Date.now()}-1`,
            name: `${modalState.title.trim()} Phase 1`,
            startDate: modalState.startDate || '2026-06-01',
            endDate: modalState.endDate || '2026-06-30',
            teamCount: 5,
            workflowBadge: 'To do',
          },
        ],
        tasks: [],
        createdAt: new Date().toISOString(),
      };
      onUpdateProject(newProject);
      if (onSelectProject) {
        onSelectProject(newProject);
      }
      setModalState(null);
      return;
    }

    const proj =
      allProjects.find((p) => p.id === modalState.projectId) || activeProject;
    if (!proj) {
      setModalState(null);
      return;
    }

    if (modalState.mode === 'edit_project') {
      onUpdateProject({
        ...proj,
        name: modalState.title.trim(),
        supervisorName: modalState.supervisorOrAssignee.trim(),
        teamCount: modalState.teamCount,
        workflowBadge: modalState.workflowBadge,
        startDate: modalState.startDate,
        endDate: modalState.endDate,
      });
    } else if (modalState.mode === 'create_phase') {
      const newGroup: ProjectGroup = {
        id: `grp-${Date.now()}`,
        name: modalState.title.trim(),
        assignedTo: modalState.supervisorOrAssignee.trim(),
        teamCount: modalState.teamCount,
        workflowBadge: modalState.workflowBadge,
        startDate: modalState.startDate || undefined,
        endDate: modalState.endDate || undefined,
      };
      onUpdateProject({
        ...proj,
        groupsInitialized: true,
        groups: [...(proj.groups || []), newGroup],
      });
    } else if (modalState.mode === 'edit_phase' && modalState.groupId) {
      const oldGroup = proj.groups.find((g) => g.id === modalState.groupId);
      const newPhaseName = modalState.title.trim();
      const updatedGroups = proj.groups.map((g) =>
        g.id === modalState.groupId
          ? {
              ...g,
              name: newPhaseName,
              assignedTo: modalState.supervisorOrAssignee.trim(),
              teamCount: modalState.teamCount,
              workflowBadge: modalState.workflowBadge,
              startDate: modalState.startDate || undefined,
              endDate: modalState.endDate || undefined,
            }
          : g
      );
      const updatedTasks = oldGroup
        ? proj.tasks.map((t) =>
            t.groupName === oldGroup.name ? { ...t, groupName: newPhaseName } : t
          )
        : proj.tasks;
      onUpdateProject({
        ...proj,
        groups: updatedGroups,
        tasks: updatedTasks,
      });
    } else if (modalState.mode === 'create_task') {
      const badgeOpt = WORKFLOW_BADGE_OPTIONS.find(
        (b) => b.label === modalState.workflowBadge
      );
      const isDone = !!badgeOpt?.marksCompleted;
      const newTask: ProjectTask = {
        id: `tsk-${Date.now()}`,
        projectId: proj.id,
        groupName: modalState.groupName,
        title: modalState.title.trim(),
        priority: modalState.priority,
        status: isDone ? 'completed' : 'pending',
        completed: isDone,
        progressPercent: isDone ? 100 : 0,
        assignedTo: modalState.supervisorOrAssignee.trim(),
        teamCount: modalState.teamCount,
        workflowBadge: modalState.workflowBadge,
        startDate: modalState.startDate || undefined,
        endDate: modalState.endDate || undefined,
        hasSubArrow: modalState.hasSubArrow,
        weightPercent: 10,
      };
      const nextTasks = [...proj.tasks, newTask];
      onUpdateProject({
        ...proj,
        tasks: nextTasks,
        progress: recalculateProjectProgress(nextTasks),
      });
    } else if (modalState.mode === 'edit_task' && modalState.taskId) {
      const badgeOpt = WORKFLOW_BADGE_OPTIONS.find(
        (b) => b.label === modalState.workflowBadge
      );
      const isDone = !!badgeOpt?.marksCompleted;
      const nextTasks = proj.tasks.map((t) =>
        t.id === modalState.taskId
          ? {
              ...t,
              title: modalState.title.trim(),
              groupName: modalState.groupName || t.groupName,
              assignedTo: modalState.supervisorOrAssignee.trim(),
              teamCount: modalState.teamCount,
              workflowBadge: modalState.workflowBadge,
              completed: isDone,
              status: isDone ? ('completed' as const) : ('pending' as const),
              progressPercent: isDone ? 100 : t.progressPercent || 30,
              startDate: modalState.startDate || undefined,
              endDate: modalState.endDate || undefined,
              hasSubArrow: modalState.hasSubArrow,
            }
          : t
      );
      onUpdateProject({
        ...proj,
        tasks: nextTasks,
        progress: recalculateProjectProgress(nextTasks),
      });
    }

    setModalState(null);
  };

  // Highlight search match in text like "Project **SomJai**" in the screenshot
  const renderHighlightedText = (text: string, isBoldBase = false) => {
    const q = searchQuery.trim();
    if (!q) {
      return (
        <span className={isBoldBase ? 'font-bold text-slate-900' : ''}>
          {text}
        </span>
      );
    }
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span className={isBoldBase ? 'font-semibold text-slate-800' : ''}>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <strong key={i} className="font-black text-slate-950 underline decoration-emerald-500/60">
              {part}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  // Renders the daily Gantt grid cells + bar for a single row
  const renderGanttRowCells = (
    targetType: 'project' | 'phase' | 'task',
    project: Project,
    startDate?: string,
    endDate?: string,
    barLabel?: string,
    groupId?: string,
    taskId?: string
  ) => {
    const isDraggingThisRow =
      dragSchedule &&
      dragSchedule.targetType === targetType &&
      dragSchedule.projectId === project.id &&
      dragSchedule.groupId === groupId &&
      dragSchedule.taskId === taskId;

    const effStart = isDraggingThisRow
      ? dragSchedule.anchorIso <= dragSchedule.currentIso
        ? dragSchedule.anchorIso
        : dragSchedule.currentIso
      : startDate;
    const effEnd = isDraggingThisRow
      ? dragSchedule.anchorIso <= dragSchedule.currentIso
        ? dragSchedule.currentIso
        : dragSchedule.anchorIso
      : endDate;

    const firstVisibleIso = visibleDays[0]?.iso || '';
    const lastVisibleIso = visibleDays[visibleDays.length - 1]?.iso || '';

    const hasSchedule = !!(effStart && effEnd);
    const isBarVisibleInWindow =
      hasSchedule && effEnd! >= firstVisibleIso && effStart! <= lastVisibleIso;

    // Show right jump arrow button [→] like KANNA when row has no visible bar or extends to right
    const showRightJumpArrow = !isBarVisibleInWindow || (hasSchedule && effEnd! > lastVisibleIso);

    return (
      <div
        className="grid relative select-none h-[42px]"
        style={{
          gridTemplateColumns: `repeat(${visibleDays.length}, minmax(30px, 1fr))`,
        }}
        onMouseLeave={() => {
          if (isDraggingThisRow) commitDragSchedule();
        }}
      >
        {visibleDays.map((day, dIdx) => {
          const inBar =
            hasSchedule && day.iso >= effStart! && day.iso <= effEnd!;
          const isBarStart =
            inBar && (dIdx === 0 || visibleDays[dIdx - 1].iso < effStart!);
          const isBarEnd =
            inBar &&
            (dIdx === visibleDays.length - 1 ||
              visibleDays[dIdx + 1].iso > effEnd!);

          return (
            <div
              key={day.iso}
              onMouseDown={() =>
                setDragSchedule({
                  targetType,
                  projectId: project.id,
                  groupId,
                  taskId,
                  anchorIso: day.iso,
                  currentIso: day.iso,
                })
              }
              onMouseEnter={() => {
                if (dragSchedule) {
                  setDragSchedule((prev) =>
                    prev ? { ...prev, currentIso: day.iso } : null
                  );
                }
              }}
              onMouseUp={commitDragSchedule}
              title={`คลิกหรือลากเพื่อตั้งวันที่ (${day.iso})`}
              className={`border-r border-b border-slate-200/80 h-[42px] relative flex items-center cursor-pointer transition-colors ${
                day.isWeekend ? 'bg-slate-100/75' : 'bg-white'
              } hover:bg-emerald-50/40`}
            >
              {inBar && (
                <div
                  className={`h-[24px] w-full bg-[#ccebd7]/95 border-y border-[#8fd1a8] flex items-center ${
                    isBarStart ? 'rounded-l-md border-l ml-0.5' : ''
                  } ${isBarEnd ? 'rounded-r-md border-r mr-0.5' : ''}`}
                >
                  {isBarStart && barLabel && (
                    <span className="text-[11px] font-semibold text-slate-800 pl-2 whitespace-nowrap z-10 pointer-events-none">
                      {barLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Quick Right Arrow [→] Button matching KANNA screenshot */}
        {showRightJumpArrow && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasSchedule) {
                handleJumpToDate(effStart);
              } else {
                // Default to setting dates in the current month
                const defStart = '2026-06-05';
                const defEnd = '2026-06-20';
                if (targetType === 'phase' && groupId) {
                  const updatedGroups = project.groups.map((g) =>
                    g.id === groupId
                      ? { ...g, startDate: defStart, endDate: defEnd }
                      : g
                  );
                  onUpdateProject({ ...project, groups: updatedGroups });
                } else if (targetType === 'task' && taskId) {
                  const updatedTasks = project.tasks.map((t) =>
                    t.id === taskId
                      ? { ...t, startDate: defStart, endDate: defEnd }
                      : t
                  );
                  onUpdateProject({ ...project, tasks: updatedTasks });
                }
              }
            }}
            title={
              hasSchedule
                ? `เลื่อนปฏิทินไปที่ ${effStart}`
                : 'คลิกเพื่อกำหนดแถบเวลาในเดือนนี้'
            }
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded bg-slate-200/90 hover:bg-emerald-600 text-slate-600 hover:text-white flex items-center justify-center shadow-2xs transition-colors z-20 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden font-sans">
      {/* ================================================================= */}
      {/* 1. TOP WORKFLOW HEADER BAR ("General workflow v" per project)     */}
      {/* ================================================================= */}
      <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center space-x-3">
          <div className="relative inline-flex items-center">
            <select
              value={activeProject.id}
              onChange={(e) => {
                const chosen = allProjects.find((p) => p.id === e.target.value);
                if (chosen && onSelectProject) {
                  onSelectProject(chosen);
                }
              }}
              className="appearance-none bg-transparent pr-7 py-1 text-base font-bold text-[#14804a] hover:text-[#0f683b] focus:outline-hidden cursor-pointer"
            >
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  General workflow • {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#14804a] pointer-events-none -ml-5" />
          </div>
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
            แยกเฉพาะโครงการ: {activeProject.name}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            คลิกหรือลากบนช่องวันที่เพื่อกำหนดแถบแผนงาน (Gantt) • คลิกที่ป้ายสถานะเพื่อเปลี่ยนสถานะทันที
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. FILTER & CALENDAR TOOLBAR (Matching KANNA screenshot)          */}
      {/* ================================================================= */}
      <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/40">
        {/* Left: Count + Search Box + 3 Checkboxes */}
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="text-sm font-bold text-slate-800 tabular-nums"
            title="จำนวนเฟสงานในโครงการนี้"
          >
            {(activeProject.groups || []).length || 1}
          </span>

          {/* Search Input */}
          <div className="relative w-56 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา เช่น SomJai, 7-11..."
              className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-4 h-4 rounded-full bg-slate-300 hover:bg-slate-400 text-white flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* 3 Filter Checkboxes */}
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterResponsible}
              onChange={(e) => setFilterResponsible(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
            />
            <span>รับผิดชอบ</span>
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterIncomplete}
              onChange={(e) => setFilterIncomplete(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
            />
            <span>ไม่สำเร็จ</span>
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterHasDate}
              onChange={(e) => setFilterHasDate(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
            />
            <span>มีการตั้งค่าวันที่</span>
          </label>
        </div>

        {/* Right: Month Navigation + Today Button + Span Selector */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleShiftMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 transition-colors cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 min-w-[78px] text-center tabular-nums">
              {currentMonthTitle}
            </span>
            <button
              type="button"
              onClick={() => handleShiftMonth(1)}
              className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-700 transition-colors cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleJumpToDate('2026-06-10')}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 transition-colors cursor-pointer"
          >
            วันนี้
          </button>

          <select
            value={calendarSpanDays}
            onChange={(e) => setCalendarSpanDays(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
          >
            <option value={28}>เดือน</option>
            <option value={14}>2 สัปดาห์</option>
            <option value={42}>6 สัปดาห์</option>
          </select>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. SPLIT-PANE TREE + DAILY CALENDAR GANTT GRID                    */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT PANE: HIERARCHICAL PROJECT / PHASE / TASK TREE (5 cols) */}
        <div className="lg:col-span-5 border-r border-slate-200 flex flex-col">
          {/* Left Subheader: + สร้างโปรเจกต์ & เรียง dropdown */}
          <div className="h-[60px] px-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-white">
            <button
              type="button"
              onClick={() =>
                setModalState({
                  mode: 'create_project',
                  title: '',
                  groupName: '',
                  supervisorOrAssignee: 'นายปริวิทย์ นวลนาค',
                  teamCount: 12,
                  workflowBadge: 'ทีมออกแบบ เตรียมแบบ',
                  startDate: '2026-05-27',
                  endDate: '2026-06-30',
                  priority: 'High',
                  hasSubArrow: false,
                })
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#14804a] hover:text-[#0f683b] py-1.5 px-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างโปรเจกต์</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
              <span className="font-semibold shrink-0">เรียง:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium truncate max-w-[190px] cursor-pointer"
              >
                <option value="newest">Creation date: Newest to Oldest</option>
                <option value="oldest">Creation date: Oldest to Newest</option>
                <option value="name">ชื่อโปรเจกต์ (ก-ฮ / A-Z)</option>
                <option value="progress">ความคืบหน้า (มากไปน้อย)</option>
              </select>
            </div>
          </div>

          {/* Left Tree Rows */}
          <div className="divide-y divide-slate-200/80">
            {filteredProjects.map((project) => {
              const isProjCollapsed = !!collapsedProjects[project.id];
              const projBadge = getBadgeStyle(project.workflowBadge, false);
              const projectGroups =
                project.groups && project.groups.length > 0
                  ? project.groups
                  : [
                      {
                        id: `${project.id}-default-g1`,
                        name: 'งานงวดที่ 1',
                        startDate: project.startDate,
                        endDate: project.endDate,
                        teamCount: 5,
                        workflowBadge: 'To do',
                      },
                    ];

              return (
                <React.Fragment key={project.id}>
                  {/* LEVEL 1: PROJECT ROW */}
                  <div className="h-[42px] px-3 flex items-center justify-between gap-2 bg-white hover:bg-slate-50/80 group transition-colors">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedProjects((prev) => ({
                            ...prev,
                            [project.id]: !prev[project.id],
                          }))
                        }
                        className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-slate-950 shrink-0 cursor-pointer"
                      >
                        {isProjCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span
                        onClick={() =>
                          setModalState({
                            mode: 'edit_project',
                            projectId: project.id,
                            title: project.name,
                            groupName: '',
                            supervisorOrAssignee: project.supervisorName || '',
                            teamCount: project.teamCount ?? 12,
                            workflowBadge:
                              project.workflowBadge || 'ทีมออกแบบ เตรียมแบบ',
                            startDate: project.startDate || '',
                            endDate: project.endDate || '',
                            priority: 'High',
                            hasSubArrow: false,
                          })
                        }
                        className="text-xs font-bold text-slate-900 truncate cursor-pointer hover:text-emerald-700"
                      >
                        {renderHighlightedText(project.name, true)}
                      </span>

                      {/* Quick hover buttons: + Phase & Edit */}
                      <div className="hidden group-hover:inline-flex items-center gap-1 ml-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setModalState({
                              mode: 'create_phase',
                              projectId: project.id,
                              title: '',
                              groupName: '',
                              supervisorOrAssignee:
                                project.supervisorName || 'นายปริวิทย์ นวลนาค',
                              teamCount: 5,
                              workflowBadge: 'To do',
                              startDate: project.startDate || '2026-06-01',
                              endDate: project.endDate || '2026-06-30',
                              priority: 'High',
                              hasSubArrow: false,
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                          title="เพิ่มเฟส / งวดงานในโปรเจกต์นี้"
                        >
                          + เฟส
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <TeamAvatarCluster
                        count={project.teamCount ?? 12}
                        onClick={() =>
                          setModalState({
                            mode: 'edit_project',
                            projectId: project.id,
                            title: project.name,
                            groupName: '',
                            supervisorOrAssignee: project.supervisorName || '',
                            teamCount: project.teamCount ?? 12,
                            workflowBadge:
                              project.workflowBadge || 'ทีมออกแบบ เตรียมแบบ',
                            startDate: project.startDate || '',
                            endDate: project.endDate || '',
                            priority: 'High',
                            hasSubArrow: false,
                          })
                        }
                      />

                      <button
                        type="button"
                        onClick={() => handleCycleBadge('project', project)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold truncate w-[86px] text-center cursor-pointer transition-opacity hover:opacity-90 ${projBadge.bgClass} ${projBadge.textClass}`}
                        title={`สถานะ: ${projBadge.label} (คลิกเพื่อสลับสถานะ)`}
                      >
                        {projBadge.label}
                      </button>
                    </div>
                  </div>

                  {/* LEVEL 2: PHASE / GROUP ROWS */}
                  {!isProjCollapsed &&
                    projectGroups.map((group) => {
                      const phaseKey = `${project.id}::${group.id}`;
                      const isPhaseCollapsed = !!collapsedPhases[phaseKey];
                      const phaseBadge = getBadgeStyle(
                        group.workflowBadge || 'To do'
                      );
                      const groupTasks = filterProjectTasks(
                        (project.tasks || []).filter(
                          (t) => t.groupName === group.name
                        )
                      );

                      return (
                        <React.Fragment key={phaseKey}>
                          <div className="h-[42px] pl-6 pr-3 flex items-center justify-between gap-2 bg-white hover:bg-slate-50/80 group transition-colors">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setCollapsedPhases((prev) => ({
                                    ...prev,
                                    [phaseKey]: !prev[phaseKey],
                                  }))
                                }
                                className="w-5 h-5 flex items-center justify-center text-emerald-600 hover:text-emerald-800 shrink-0 cursor-pointer"
                              >
                                {isPhaseCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <span
                                onClick={() =>
                                  setModalState({
                                    mode: 'edit_phase',
                                    projectId: project.id,
                                    groupId: group.id,
                                    title: group.name,
                                    groupName: group.name,
                                    supervisorOrAssignee:
                                      group.assignedTo ||
                                      project.supervisorName ||
                                      '',
                                    teamCount: group.teamCount ?? 5,
                                    workflowBadge:
                                      group.workflowBadge || 'To do',
                                    startDate: group.startDate || '',
                                    endDate: group.endDate || '',
                                    priority: 'High',
                                    hasSubArrow: false,
                                  })
                                }
                                className="text-xs font-medium text-slate-800 truncate cursor-pointer hover:text-emerald-700"
                              >
                                {renderHighlightedText(group.name)}
                              </span>

                              <div className="hidden group-hover:inline-flex items-center gap-1 ml-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalState({
                                      mode: 'create_task',
                                      projectId: project.id,
                                      groupId: group.id,
                                      title: '',
                                      groupName: group.name,
                                      supervisorOrAssignee:
                                        project.supervisorName ||
                                        'นายปริวิทย์ นวลนาค',
                                      teamCount: 4,
                                      workflowBadge: 'Pending',
                                      startDate:
                                        group.startDate ||
                                        project.startDate ||
                                        '2026-06-05',
                                      endDate:
                                        group.endDate ||
                                        project.endDate ||
                                        '2026-06-25',
                                      priority: 'High',
                                      hasSubArrow: false,
                                    })
                                  }
                                  className="px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                                  title="เพิ่มกิจกรรมในเฟสนี้"
                                >
                                  + กิจกรรม
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <TeamAvatarCluster
                                count={group.teamCount ?? 5}
                                onClick={() =>
                                  setModalState({
                                    mode: 'edit_phase',
                                    projectId: project.id,
                                    groupId: group.id,
                                    title: group.name,
                                    groupName: group.name,
                                    supervisorOrAssignee:
                                      group.assignedTo ||
                                      project.supervisorName ||
                                      '',
                                    teamCount: group.teamCount ?? 5,
                                    workflowBadge:
                                      group.workflowBadge || 'To do',
                                    startDate: group.startDate || '',
                                    endDate: group.endDate || '',
                                    priority: 'High',
                                    hasSubArrow: false,
                                  })
                                }
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  handleCycleBadge('phase', project, group.id)
                                }
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold truncate w-[86px] text-center cursor-pointer transition-opacity hover:opacity-90 ${phaseBadge.bgClass} ${phaseBadge.textClass}`}
                                title={`สถานะ: ${phaseBadge.label} (คลิกเพื่อสลับสถานะ)`}
                              >
                                {phaseBadge.label}
                              </button>
                            </div>
                          </div>

                          {/* LEVEL 3: TASK / SUB-ITEM ROWS */}
                          {!isPhaseCollapsed &&
                            groupTasks.map((task) => {
                              const taskBadge = getBadgeStyle(
                                task.workflowBadge,
                                task.completed
                              );
                              return (
                                <div
                                  key={task.id}
                                  className="h-[42px] pl-11 pr-3 flex items-center justify-between gap-2 bg-white hover:bg-slate-50/80 group transition-colors"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    {task.hasSubArrow ? (
                                      <ChevronRight className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                    ) : (
                                      <span className="w-2 shrink-0" />
                                    )}
                                    <span
                                      onClick={() =>
                                        setModalState({
                                          mode: 'edit_task',
                                          projectId: project.id,
                                          groupId: group.id,
                                          taskId: task.id,
                                          title: task.title,
                                          groupName: task.groupName,
                                          supervisorOrAssignee:
                                            task.assignedTo ||
                                            project.supervisorName ||
                                            '',
                                          teamCount: task.teamCount ?? 3,
                                          workflowBadge: taskBadge.label,
                                          startDate: task.startDate || '',
                                          endDate: task.endDate || '',
                                          priority: task.priority || 'High',
                                          hasSubArrow: !!task.hasSubArrow,
                                        })
                                      }
                                      className="text-xs text-slate-800 leading-tight line-clamp-2 cursor-pointer hover:text-emerald-700"
                                    >
                                      {renderHighlightedText(task.title)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <TeamAvatarCluster
                                      count={task.teamCount ?? 0}
                                      doubleAvatar={
                                        (task.teamCount ?? 0) === 4 ||
                                        (task.teamCount ?? 0) === 2
                                      }
                                      onClick={() =>
                                        setModalState({
                                          mode: 'edit_task',
                                          projectId: project.id,
                                          groupId: group.id,
                                          taskId: task.id,
                                          title: task.title,
                                          groupName: task.groupName,
                                          supervisorOrAssignee:
                                            task.assignedTo ||
                                            project.supervisorName ||
                                            '',
                                          teamCount: task.teamCount ?? 3,
                                          workflowBadge: taskBadge.label,
                                          startDate: task.startDate || '',
                                          endDate: task.endDate || '',
                                          priority: task.priority || 'High',
                                          hasSubArrow: !!task.hasSubArrow,
                                        })
                                      }
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCycleBadge(
                                          'task',
                                          project,
                                          group.id,
                                          task.id
                                        )
                                      }
                                      className={`px-2 py-0.5 rounded text-[11px] font-semibold truncate w-[86px] text-center cursor-pointer transition-opacity hover:opacity-90 ${taskBadge.bgClass} ${taskBadge.textClass}`}
                                      title={`สถานะ: ${taskBadge.label} (คลิกเพื่อสลับสถานะ)`}
                                    >
                                      {taskBadge.label}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}

            {filteredProjects.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                ไม่พบโปรเจกต์ที่ตรงกับเงื่อนไขการค้นหา
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: DAILY CALENDAR HEADER + GANTT BARS (7 cols) */}
        <div className="lg:col-span-7 overflow-x-auto flex flex-col">
          <div className="min-w-[840px]">
            {/* Calendar Header (60px height matching Left Subheader) */}
            <div className="h-[60px] border-b border-slate-200 bg-white flex flex-col justify-between">
              {/* Top Month Label */}
              <div className="px-3 pt-1 text-[11px] font-bold text-slate-700">
                {currentMonthTitle}
              </div>

              {/* Day Numbers + Day of Week Row */}
              <div
                className="grid text-center"
                style={{
                  gridTemplateColumns: `repeat(${visibleDays.length}, minmax(30px, 1fr))`,
                }}
              >
                {visibleDays.map((day) => {
                  const isHighlighted = day.iso === highlightedDateIso;
                  return (
                    <div
                      key={`hdr-${day.iso}`}
                      onClick={() => setHighlightedDateIso(day.iso)}
                      className={`pb-1 flex flex-col items-center justify-end cursor-pointer select-none ${
                        day.isWeekend ? 'bg-slate-100/70' : ''
                      }`}
                    >
                      <span
                        className={`w-5 h-5 flex items-center justify-center text-[11px] font-bold tabular-nums ${
                          isHighlighted
                            ? 'rounded-full bg-[#14804a] text-white shadow-2xs'
                            : 'text-slate-700'
                        }`}
                      >
                        {day.dayNum}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-none mt-0.5">
                        {day.dayShort}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Gantt Rows (Synchronized 1-to-1 with Left Tree Rows) */}
            <div>
              {filteredProjects.map((project) => {
                const isProjCollapsed = !!collapsedProjects[project.id];
                const projectGroups =
                  project.groups && project.groups.length > 0
                    ? project.groups
                    : [
                        {
                          id: `${project.id}-default-g1`,
                          name: 'งานงวดที่ 1',
                          startDate: project.startDate,
                          endDate: project.endDate,
                          teamCount: 5,
                          workflowBadge: 'To do',
                        },
                      ];

                return (
                  <React.Fragment key={`gantt-proj-${project.id}`}>
                    {/* LEVEL 1 GANTT ROW: PROJECT */}
                    {renderGanttRowCells(
                      'project',
                      project,
                      project.startDate,
                      project.endDate
                    )}

                    {/* LEVEL 2 GANTT ROWS: PHASES */}
                    {!isProjCollapsed &&
                      projectGroups.map((group) => {
                        const phaseKey = `${project.id}::${group.id}`;
                        const isPhaseCollapsed = !!collapsedPhases[phaseKey];
                        const groupTasks = filterProjectTasks(
                          (project.tasks || []).filter(
                            (t) => t.groupName === group.name
                          )
                        );

                        return (
                          <React.Fragment key={`gantt-phase-${phaseKey}`}>
                            {renderGanttRowCells(
                              'phase',
                              project,
                              group.startDate,
                              group.endDate,
                              undefined,
                              group.id
                            )}

                            {/* LEVEL 3 GANTT ROWS: TASKS */}
                            {!isPhaseCollapsed &&
                              groupTasks.map((task) => (
                                <React.Fragment key={`gantt-task-${task.id}`}>
                                  {renderGanttRowCells(
                                    'task',
                                    project,
                                    task.startDate,
                                    task.endDate,
                                    task.title,
                                    group.id,
                                    task.id
                                  )}
                                </React.Fragment>
                              ))}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. MODAL FOR CREATING / EDITING PROJECT, PHASE, OR TASK           */}
      {/* ================================================================= */}
      {modalState && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>
                  {modalState.mode === 'create_project' &&
                    'สร้างโปรเจกต์ใหม่ (General Workflow)'}
                  {modalState.mode === 'edit_project' &&
                    'แก้ไขข้อมูลโปรเจกต์'}
                  {modalState.mode === 'create_phase' &&
                    'เพิ่มเฟส / งวดงานใหม่'}
                  {modalState.mode === 'edit_phase' &&
                    'แก้ไขเฟส / งวดงาน'}
                  {modalState.mode === 'create_task' &&
                    'เพิ่มกิจกรรม / งานย่อยใหม่'}
                  {modalState.mode === 'edit_task' &&
                    'แก้ไขกิจกรรม / งานย่อย'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setModalState(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {modalState.mode.includes('project')
                    ? 'ชื่อโปรเจกต์'
                    : modalState.mode.includes('phase')
                    ? 'ชื่อเฟส / งวดงาน'
                    : 'ชื่อกิจกรรม / อาคาร / งานย่อย'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalState.title}
                  onChange={(e) =>
                    setModalState({ ...modalState, title: e.target.value })
                  }
                  placeholder={
                    modalState.mode.includes('project')
                      ? 'เช่น Project SomJai หรือ 7-11 สุขุมวิท'
                      : modalState.mode.includes('phase')
                      ? 'เช่น SomJai Phase 2 หรือ งานงวดที่ 1'
                      : 'เช่น Install Fire Alarm system หรือ Building 2'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ผู้รับผิดชอบหลัก
                  </label>
                  <input
                    type="text"
                    value={modalState.supervisorOrAssignee}
                    onChange={(e) =>
                      setModalState({
                        ...modalState,
                        supervisorOrAssignee: e.target.value,
                      })
                    }
                    placeholder="เช่น นายปริวิทย์ นวลนาค"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    จำนวนทีมงาน (+คน)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={modalState.teamCount}
                    onChange={(e) =>
                      setModalState({
                        ...modalState,
                        teamCount: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ป้ายสถานะ (Workflow Status)
                </label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {WORKFLOW_BADGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setModalState({
                          ...modalState,
                          workflowBadge: opt.label,
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-between cursor-pointer border ${
                        modalState.workflowBadge === opt.label
                          ? 'ring-2 ring-slate-900 border-transparent'
                          : 'border-transparent opacity-85 hover:opacity-100'
                      } ${opt.bgClass} ${opt.textClass}`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {modalState.workflowBadge === opt.label && (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={modalState.workflowBadge}
                  onChange={(e) =>
                    setModalState({
                      ...modalState,
                      workflowBadge: e.target.value,
                    })
                  }
                  placeholder="หรือพิมพ์สถานะกำหนดเอง..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                    วันที่เริ่มต้น (Start Date)
                  </label>
                  <input
                    type="date"
                    value={modalState.startDate}
                    onChange={(e) =>
                      setModalState({
                        ...modalState,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                    วันที่สิ้นสุด (End Date)
                  </label>
                  <input
                    type="date"
                    value={modalState.endDate}
                    onChange={(e) =>
                      setModalState({
                        ...modalState,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                {modalState.mode === 'edit_task' && modalState.taskId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const proj =
                        allProjects.find(
                          (p) => p.id === modalState.projectId
                        ) || activeProject;
                      if (proj) {
                        const nextTasks = proj.tasks.filter(
                          (t) => t.id !== modalState.taskId
                        );
                        onUpdateProject({
                          ...proj,
                          tasks: nextTasks,
                          progress: recalculateProjectProgress(nextTasks),
                        });
                      }
                      setModalState(null);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบกิจกรรม</span>
                  </button>
                ) : modalState.mode === 'edit_project' &&
                  modalState.projectId &&
                  onDeleteProject ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteProject(modalState.projectId!);
                      setModalState(null);
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบโปรเจกต์</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalState(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
