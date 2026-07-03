'use client';
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { projectsAPI, photosAPI, uploadsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

// ── Icons ──────────────────────────────────────────────────────────────────
function SiteMapIcon({ size = 18, className = '' }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M1 3l4.5-1.5L10 3l4.5-1.5V12L10 13.5 5.5 12 1 13.5V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M5.5 1.5V12M10 3v10.5" stroke="currentColor" strokeWidth="1.2"/>
  </svg>;
}
function UploadIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 11V2M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>;
}
function CloseIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>;
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-stone-100 rounded-lg ${className}`} />;
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SiteMapsPage() {
  const { user } = useAuth();

  const [projects, setProjects]       = useState([]);
  const [projectsLoading, setPLoad]   = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [maps, setMaps]               = useState([]);
  const [mapsLoading, setMapsLoading] = useState(false);

  const [caption, setCaption]         = useState('');
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive]   = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const fileInputRef = useRef(null);

  // ── Load projects on mount ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setPLoad(true);
      try {
        const { data } = await projectsAPI.getAll({ limit: 200 });
        const list = data.projects || data.data || data || [];
        setProjects(list);
        if (list.length && !selectedProjectId) setSelectedProjectId(list[0].id);
      } catch {
        setProjects([]);
      }
      setPLoad(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load maps whenever the selected site changes ──────────────────────
  useEffect(() => {
    if (!selectedProjectId) return;
    loadMaps(selectedProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const loadMaps = async (projectId) => {
    setMapsLoading(true);
    try {
      const { data } = await photosAPI.getAll({
        projectId,
        entityType: 'SITE_MAP',
        limit: 100,
      });
      setMaps(data.photos || []);
    } catch {
      setMaps([]);
    }
    setMapsLoading(false);
  };

  // ── Upload handling ────────────────────────────────────────────────────
  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (!files.length || !selectedProjectId) return;

    setUploading(true);
    setUploadError('');
    try {
      for (const file of files) {
        await uploadsAPI.uploadSiteMap(file, selectedProjectId, caption || undefined);
      }
      setCaption('');
      await loadMaps(selectedProjectId);
    } catch (err) {
      setUploadError(
        err.friendlyMessage || err.response?.data?.error || 'Upload failed. Please try again.'
      );
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <DashboardLayout>
      <div className="max-w-[1000px] mx-auto space-y-6 px-1">

        {/* Header */}
        <header className="pt-1">
          <h1 className="text-2xl font-semibold text-stone-800 leading-tight">Site Maps</h1>
          <p className="text-sm text-stone-400 mt-1">Upload and manage site map images for each project</p>
        </header>

        {/* Site selector */}
        <div className="card p-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">
            Select Site
          </label>
          {projectsLoading ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : projects.length === 0 ? (
            <p className="text-sm text-stone-400">No projects found for your account.</p>
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full max-w-md border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Upload area */}
        {selectedProjectId && (
          <div className="card p-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-widest text-stone-400">
              Upload Map{selectedProject ? ` — ${selectedProject.name}` : ''}
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-colors ${
                dragActive ? 'border-stone-400 bg-stone-50' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                <UploadIcon />
              </div>
              <p className="text-sm text-stone-600">
                {uploading ? 'Uploading…' : 'Drag & drop map images here, or click to browse'}
              </p>
              <p className="text-xs text-stone-400">JPG, PNG or WEBP — you can select multiple files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={uploading}
              />
            </div>

            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (optional) — e.g. 'Ground floor layout v2'"
              disabled={uploading}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:opacity-50"
            />

            {uploadError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {uploadError}
              </p>
            )}
          </div>
        )}

        {/* Gallery */}
        {selectedProjectId && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Maps for this site {maps.length > 0 && `(${maps.length})`}
              </h2>
            </div>

            {mapsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
              </div>
            ) : maps.length === 0 ? (
              <div className="card p-8 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <SiteMapIcon size={20} />
                </div>
                <p className="text-sm text-stone-500">No site maps uploaded yet</p>
                <p className="text-xs text-stone-400">Upload one above to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {maps.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => setLightboxUrl(photo.url)}
                    className="card p-0 overflow-hidden text-left group"
                  >
                    <div className="aspect-[4/3] bg-stone-100 overflow-hidden">
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Site map'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-medium text-stone-700 truncate">
                        {photo.caption || 'Untitled map'}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        {formatDate(photo.capturedAt || photo.createdAt)}
                        {photo.uploadedBy?.name ? ` · ${photo.uploadedBy.name}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/80 hover:text-white"
            onClick={() => setLightboxUrl(null)}
          >
            <CloseIcon size={22} />
          </button>
          <img
            src={lightboxUrl}
            alt="Site map"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </DashboardLayout>
  );
}