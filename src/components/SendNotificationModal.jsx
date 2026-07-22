'use client';
import { useState, useEffect } from 'react';
import { notificationsAPI, usersAPI, projectsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import Modal from './ui/Modal';
const RECIPIENT_OPTIONS = [
  { v: 'all',      l: 'All Clients' },
  { v: 'client',   l: 'Specific Client' },
  { v: 'project',  l: 'By Project' },
];

// Drop this modal into any Super Admin page:
//
//   const [sendOpen, setSendOpen] = useState(false);
//   <button className="btn-primary" onClick={() => setSendOpen(true)}>
//     Send Notification
//   </button>
//   <SendNotificationModal open={sendOpen} onClose={() => setSendOpen(false)} />
//
export default function SendNotificationModal({ open, onClose }) {
  const [recipientType, setRecipientType] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset form each time the modal is opened fresh
  useEffect(() => {
    if (open) {
      setRecipientType('all');
      setTitle('');
      setBody('');
      setClientId('');
      setProjectId('');
    }
  }, [open]);

  // Lazily load clients / projects only when their dropdown is needed
  useEffect(() => {
    if (!open) return;
    if (recipientType === 'client' && clients.length === 0) {
      setLoadingLists(true);
      usersAPI.getByRole('CLIENT')
        .then(({ data }) => setClients(data.users || data || []))
        .catch(() => toast.error('Could not load clients'))
        .finally(() => setLoadingLists(false));
    }
    if (recipientType === 'project' && projects.length === 0) {
      setLoadingLists(true);
      projectsAPI.getAll()
        .then(({ data }) => setProjects(data.projects || data || []))
        .catch(() => toast.error('Could not load projects'))
        .finally(() => setLoadingLists(false));
    }
  }, [open, recipientType]);

  const canSubmit =
    title.trim() && body.trim() &&
    (recipientType === 'all' ||
      (recipientType === 'client' && clientId) ||
      (recipientType === 'project' && projectId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    const payload = { title: title.trim(), body: body.trim() };
    if (recipientType === 'client') payload.clientId = clientId;
    if (recipientType === 'project') payload.projectId = projectId;

    setSubmitting(true);
    try {
      const { data } = await notificationsAPI.broadcast(payload);
      toast.success(data.message || 'Notification sent');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send notification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Send Notification" width="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {/* Recipient */}
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Recipient</label>
          <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
            {RECIPIENT_OPTIONS.map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => setRecipientType(v)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  recipientType === v
                    ? 'bg-white text-stone-800 shadow-sm'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {recipientType === 'client' && (
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input w-full"
              disabled={loadingLists}
            >
              <option value="">{loadingLists ? 'Loading…' : 'Select a client'}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.email}</option>
              ))}
            </select>
          </div>
        )}

        {recipientType === 'project' && (
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input w-full"
              disabled={loadingLists}
            >
              <option value="">{loadingLists ? 'Loading…' : 'Select a project'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Site closed for maintenance"
            className="input w-full"
            maxLength={120}
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the notification message…"
            rows={4}
            className="input w-full resize-none"
            maxLength={500}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send Notification'}
          </button>
        </div>
      </form>
    </Modal>
  );
}