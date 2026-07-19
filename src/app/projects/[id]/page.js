'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import ProjectForm from '../../../components/projects/ProjectForm';
import PaymentScheduleManager from '../../../components/projects/PaymentScheduleManager';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import { projectsAPI, dashboardAPI, tasksAPI, labourAPI } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function fmt(n) {
  if (!n) return '—';
  const num = Number(n);
  if (num >= 10000000) return `₹${(num/10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num/100000).toFixed(1)}L`;
  return `₹${num.toLocaleString()}`;
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-stone-50 last:border-0">
      <span className="text-xs text-stone-400 min-w-[120px]">{label}</span>
      <span className="text-xs font-medium text-stone-700 text-right">{value}</span>
    </div>
  );
}

function TaskRow({ task }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-stone-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-stone-700 truncate">{task.title}</p>
        <p className="text-[10px] text-stone-400">{task.assignedTo?.name || 'Unassigned'}</p>
      </div>
      <Badge status={task.priority}/>
      <Badge status={task.status}/>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [labourCost, setLabourCost] = useState(0);       // lifetime total paid on this project
  const [labourCount, setLabourCount] = useState(0);      // number of labourers on this project
  const [todayLabourCost, setTodayLabourCost] = useState(0); // amount earned today specifically
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);
  const [geoForm, setGeoForm] = useState({ geofenceLat: '', geofenceLng: '', geofenceRadius: '300' });
  const [savingGeo, setSavingGeo] = useState(false);

  const canEdit = user && ['SUPER_ADMIN','PROJECT_MANAGER'].includes(user.role);
  const canManagePayments = user && ['SUPER_ADMIN','FINANCE'].includes(user.role);
  const canSeeBudget = user && ['SUPER_ADMIN','FINANCE'].includes(user.role);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      const [{ data: pd }, { data: sd }, { data: td }, { data: ld }, { data: tad }] = await Promise.all([
        projectsAPI.getById(id),
        dashboardAPI.getProjectSummary(id),
        tasksAPI.getAll({ projectId: id, limit: 10 }),
        labourAPI.getLabourers({ projectId: id }),
        labourAPI.getAttendance({ projectId: id, date: todayStr }),
      ]);
      setProject(pd.project);
      setSummary(sd);
      setTasks(td.tasks);

      // Lifetime labour cost + headcount for this project (amountPaid is
      // computed server-side from attendance, so this is always accurate)
      const projectLabourers = ld.labourers || [];
      setLabourCost(projectLabourers.reduce((sum, l) => sum + Number(l.amountPaid || 0), 0));
      setLabourCount(projectLabourers.length);

      // Amount actually earned by labour today specifically
      const todayRecords = tad.attendance || [];
      const todayCost = todayRecords.reduce((sum, r) => {
        const dailyWage = Number(r.labourer?.proposedAmount || 0);
        if (r.status === 'PRESENT') return sum + dailyWage;
        if (r.status === 'HALF_DAY') return sum + dailyWage / 2;
        return sum;
      }, 0);
      setTodayLabourCost(todayCost);

      setGeoForm({
        geofenceLat: pd.project.geofenceLat ? String(pd.project.geofenceLat) : '',
        geofenceLng: pd.project.geofenceLng ? String(pd.project.geofenceLng) : '',
        geofenceRadius: pd.project.geofenceRadius ? String(pd.project.geofenceRadius) : '300',
      });
    } catch {
      toast.error('Project not found');
      router.replace('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (formData) => {
    await projectsAPI.update(id, formData);
    toast.success('Project updated');
    setEditOpen(false);
    load();
  };

  const handleGeoSave = async (e) => {
    e.preventDefault();
    setSavingGeo(true);
    try {
      await projectsAPI.updateGeofence(id, {
        geofenceLat: parseFloat(geoForm.geofenceLat),
        geofenceLng: parseFloat(geoForm.geofenceLng),
        geofenceRadius: parseInt(geoForm.geofenceRadius),
      });
      toast.success('Geo-fence updated');
      setGeoOpen(false);
      load();
    } catch { toast.error('Failed to update geo-fence'); }
    finally { setSavingGeo(false); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl space-y-4 animate-fade-in">
          <div className="shimmer h-8 w-64 rounded"/>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_,i) => <div key={i} className="card p-4 shimmer h-28"/>)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) return null;

  const taskStatusMap = {};
  summary?.taskStats?.forEach(s => { taskStatusMap[s.status] = s._count.id; });
  const completedTasks = (taskStatusMap['COMPLETED'] || 0) + (taskStatusMap['VERIFIED'] || 0);
  const totalTasks = Object.values(taskStatusMap).reduce((a, b) => a + b, 0);
  const taskPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // PO count from summary — shown to PM instead of budget
  const poCount = summary?.purchaseOrderCount ?? '—';

  // KPI strip: Budget shown only to SUPER_ADMIN/FINANCE; PM sees PO Count instead.
  // "Today's Labour" now shows amount spent today (not headcount) —
  // Labour Cost shows the running lifetime total for this project.
  const kpiCards = canSeeBudget
    ? [
        { label: 'Estimated Budget',            value: fmt(project.budget)   },
        { label: 'PO Spend',          value: fmt(summary?.totalPOSpend) },
        // { label: 'Labour Cost',       value: fmt(labourCost)       },
        { label: "Cost Spent on Labour",    value: fmt(todayLabourCost)  },
        { label: 'Task Progress',     value: `${taskPct}%`         },
      ]
    : [
        { label: 'Purchase Orders',   value: poCount                },
        // { label: 'Labour Cost',       value: fmt(labourCost)        },
        { label:  "Cost Spent on Labour",value: fmt(todayLabourCost)   },
        { label: 'Task Progress',     value: `${taskPct}%`          },
      ];

  return (
    <DashboardLayout
      title={project.name}
      subtitle={project.address || 'No address set'}
      actions={canEdit && (
        <div className="flex gap-2">
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setGeoOpen(true)}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1C5.24 1 3 3.24 3 6c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.4"/></svg>
            Geo-fence
          </button>
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setEditOpen(true)}>Edit</button>
        </div>
      )}
    >
      <div className="max-w-5xl space-y-5 animate-fade-in">
        {/* Status + badge */}
        <div className="flex items-center gap-2">
          <Badge status={project.status} dot/>
          {project.geofenceLat && (
            <span className="badge bg-green-50 text-green-700">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1C5.24 1 3 3.24 3 6c0 4 5 9 5 9s5-5 5-9c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.5"/></svg>
              Geo-fence active · {project.geofenceRadius}m
            </span>
          )}
        </div>

        {/* KPI strip */}
        <div className={`grid gap-3 ${canSeeBudget ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {kpiCards.map(k => (
            <div key={k.label} className="card px-4 py-3">
              <p className="text-[10px] text-stone-400 uppercase tracking-wide mb-1">{k.label}</p>
              <p className="text-xl font-semibold text-stone-800 font-display">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Task progress bar */}
        {totalTasks > 0 && (
          <div className="card px-4 py-3">
            <div className="flex justify-between text-xs text-stone-500 mb-2">
              <span className="font-medium">Task completion</span>
              <span>{completedTasks} / {totalTasks} done ({taskPct}%)</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-stone-800 rounded-full transition-all" style={{ width: `${taskPct}%` }}/>
            </div>
            <div className="flex gap-4 mt-2">
              {Object.entries(taskStatusMap).map(([s, c]) => (
                <div key={s} className="flex items-center gap-1">
                  <Badge status={s}/>
                  <span className="text-[10px] text-stone-400 font-mono">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Project info */}
          <div className="card p-4">
            <p className="section-title">Project Info</p>
            {project.description && <p className="text-xs text-stone-500 mb-3 leading-relaxed">{project.description}</p>}
            <InfoRow label="Manager"           value={project.manager?.name}/>
            <InfoRow label="Client"            value={project.client?.name}/>
            <InfoRow label="Start Date"        value={project.startDate ? format(new Date(project.startDate), 'dd MMM yyyy') : null}/>
            <InfoRow label="End Date"          value={project.endDate   ? format(new Date(project.endDate),   'dd MMM yyyy') : null}/>
            <InfoRow label="Address"           value={project.address}/>
            <InfoRow label="Labour Cost"       value={fmt(labourCost)}/>
            <InfoRow label="Today's Labour"    value={fmt(todayLabourCost)}/>
            <InfoRow label="Labourers"         value={labourCount ? String(labourCount) : null}/>
            {/* Budget rows — only for admin/finance */}
            {canSeeBudget && (
              <>
                <InfoRow label="Budget"        value={fmt(project.budget)}/>
                <InfoRow label="PO Spend"      value={fmt(summary?.totalPOSpend)}/>
              </>
            )}
            <InfoRow label="Geo-fence Lat"     value={project.geofenceLat?.toFixed(6)}/>
            <InfoRow label="Geo-fence Lng"     value={project.geofenceLng?.toFixed(6)}/>
            <InfoRow label="Geo-fence Radius"  value={project.geofenceLat ? `${project.geofenceRadius}m` : null}/>
          </div>

          {/* Recent tasks */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="section-title mb-0">Recent Tasks</p>
              <a href={`/tasks?projectId=${id}`} className="text-[10px] text-stone-400 hover:text-stone-600">View all →</a>
            </div>
            {tasks.length === 0
              ? <p className="text-xs text-stone-300 py-4 text-center">No tasks yet</p>
              : tasks.map(t => <TaskRow key={t.id} task={t}/>)
            }
          </div>
        </div>

        {/* Payment Schedule — only for admin/finance */}
        {canManagePayments && (
          <PaymentScheduleManager
            projectId={id}
            tasks={tasks}
            userRole={user.role}
          />
        )}
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Project" width="max-w-xl">
        <ProjectForm initial={project} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)}/>
      </Modal>

      {/* Geo-fence modal */}
      <Modal open={geoOpen} onClose={() => setGeoOpen(false)} title="Update Geo-fence" width="max-w-sm">
        <form onSubmit={handleGeoSave} className="p-5 space-y-4">
          <p className="text-xs text-stone-500">Set the GPS coordinates and radius for engineer punch-in validation.</p>
          <div>
            <label className="label">Latitude</label>
            <input className="input" value={geoForm.geofenceLat} onChange={e => setGeoForm(p=>({...p,geofenceLat:e.target.value}))} placeholder="28.5355" required/>
          </div>
          <div>
            <label className="label">Longitude</label>
            <input className="input" value={geoForm.geofenceLng} onChange={e => setGeoForm(p=>({...p,geofenceLng:e.target.value}))} placeholder="77.3910" required/>
          </div>
          <div>
            <label className="label">Radius (meters)</label>
            <input className="input" value={geoForm.geofenceRadius} onChange={e => setGeoForm(p=>({...p,geofenceRadius:e.target.value}))} placeholder="300"/>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button type="button" className="btn-secondary" onClick={() => setGeoOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingGeo}>
              {savingGeo ? 'Saving…' : 'Update Geo-fence'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}