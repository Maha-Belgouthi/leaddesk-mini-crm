import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';
import {
  type Lead,
  LeadStatus,
  UserRole,
  type Note,
  type ActivityLog,
  type User,
} from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import {
  X,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  UserCheck,
  FileText,
  History,
  Lock,
  Send,
  Loader2,
  Check,
} from 'lucide-react';

interface LeadDetailModalProps {
  leadId: string;
  onClose: () => void;
  onLeadUpdated: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  leadId,
  onClose,
  onLeadUpdated,
}) => {
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [salesReps, setSalesReps] = useState<User[]>([]);

  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'activity'>('details');
  const [isLoading, setIsLoading] = useState(true);

  // Note form state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteIsInternal, setNewNoteIsInternal] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Status & Assignment state
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchLeadData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [leadRes, notesRes, activityRes] = await Promise.all([
        apiClient.get(`/leads/${leadId}`),
        apiClient.get(`/leads/${leadId}/notes`),
        apiClient.get(`/leads/${leadId}/activity`),
      ]);

      setLead(leadRes.data);
      setSelectedStatus(leadRes.data.status);
      setSelectedAssignee(leadRes.data.assignedToId || '');
      setNotes(notesRes.data);
      setActivities(activityRes.data);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Could not load lead details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalesReps = async () => {
    try {
      const { data } = await apiClient.get('/users');
      setSalesReps(data.filter((u: User) => u.role === UserRole.SALES_EXECUTIVE));
    } catch {
      // Ignore if user cannot list users
    }
  };

  useEffect(() => {
    fetchLeadData();
    if (user?.role === UserRole.ADMIN) {
      fetchSalesReps();
    }
  }, [leadId, user?.role]);

  const handleUpdateStatus = async () => {
    if (!selectedStatus || selectedStatus === lead?.status) return;
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      await apiClient.patch(`/leads/${leadId}/status`, { status: selectedStatus });
      await fetchLeadData();
      onLeadUpdated();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssignLead = async () => {
    if (!selectedAssignee || selectedAssignee === lead?.assignedToId) return;
    setIsAssigning(true);
    setActionError(null);
    try {
      await apiClient.patch(`/leads/${leadId}/assign`, { assignedToId: selectedAssignee });
      await fetchLeadData();
      onLeadUpdated();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to assign lead');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    setIsAddingNote(true);
    setActionError(null);
    try {
      await apiClient.post(`/leads/${leadId}/notes`, {
        content: newNoteContent,
        isInternal: newNoteIsInternal,
      });
      setNewNoteContent('');
      setNewNoteIsInternal(false);
      await fetchLeadData();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-100 border-slate-200';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {lead?.name || 'Lead Details'}
            </h3>
            <p className="text-xs text-slate-500">
              {lead?.client?.name} • ID: {lead?.id.slice(0, 8)}...
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {actionError && (
          <div className="m-4 mb-0 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {actionError}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Lead Overview & Scoring
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            Notes ({notes.length})
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'activity'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            Activity Log ({activities.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-600" />
              <p className="text-xs">Loading lead details...</p>
            </div>
          ) : !lead ? (
            <div className="text-center py-8 text-slate-500 text-sm">Lead not found.</div>
          ) : activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Top Banner: Status & Score */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Pipeline Stage
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">{lead.status}</span>
                    {lead.isOverdue && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Overdue
                      </span>
                    )}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${getScoreColor(lead.score)}`}>
                  <span className="text-[11px] font-semibold opacity-75 uppercase tracking-wider block mb-1">
                    Lead Quality Score
                  </span>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-2xl font-black">{lead.score}</span>
                    <span className="text-xs opacity-75 font-semibold">/ 100</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Assigned Representative
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>{lead.assignedTo?.fullName || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* Status Advance Controls */}
              {user?.role !== UserRole.CLIENT && (
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      Advance Pipeline Status
                    </h4>
                    <p className="text-[11px] text-indigo-800">
                      Changes automatically recalculate the lead's quality score.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
                      className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={LeadStatus.NEW}>NEW</option>
                      <option value={LeadStatus.CONTACTED}>CONTACTED</option>
                      <option value={LeadStatus.PROPOSAL_SENT}>PROPOSAL_SENT</option>
                      <option value={LeadStatus.WON}>WON</option>
                      <option value={LeadStatus.LOST}>LOST</option>
                    </select>

                    <button
                      onClick={handleUpdateStatus}
                      disabled={isUpdatingStatus || selectedStatus === lead.status}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save Status
                    </button>
                  </div>
                </div>
              )}

              {/* Reassign Controls (Admin only) */}
              {user?.role === UserRole.ADMIN && salesReps.length > 0 && (
                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                      Reassign Sales Representative
                    </h4>
                    <p className="text-[11px] text-purple-800">
                      Transfer lead ownership to another sales executive.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Unassigned</option>
                      {salesReps.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.fullName} ({rep.email})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleAssignLead}
                      disabled={isAssigning || selectedAssignee === (lead.assignedToId || '')}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {isAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                      Assign
                    </button>
                  </div>
                </div>
              )}

              {/* Lead Contact Info & Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Contact Details
                  </h4>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lead.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lead.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Inquiry submitted: {new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                  {lead.firstContactedAt && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Contacted: {new Date(lead.firstContactedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Requirement Summary
                  </h4>
                  <div>
                    <span className="text-slate-500">Service Needed: </span>
                    <span className="font-semibold text-slate-800">{lead.serviceNeeded}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Estimated Budget: </span>
                    <span className="font-semibold text-slate-800">
                      ₹{lead.budget.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Channel Source: </span>
                    <span className="font-semibold text-slate-800">{lead.source}</span>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  Prospect Message
                </h4>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{lead.message}</p>
              </div>

              {/* Scoring Factor Breakdown Card */}
              {lead.scoreBreakdown && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Itemized Score Breakdown
                    </h4>
                    <span className="text-xs font-bold text-indigo-700">
                      Total: {lead.scoreBreakdown.rawTotal} raw pts → {lead.scoreBreakdown.finalScore}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-center">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Status</span>
                      <span className="font-black text-slate-900 text-sm">
                        +{lead.scoreBreakdown.statusPoints}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Contact Speed</span>
                      <span className="font-black text-slate-900 text-sm">
                        +{lead.scoreBreakdown.speedPoints}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Source</span>
                      <span className="font-black text-slate-900 text-sm">
                        +{lead.scoreBreakdown.sourcePoints}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Budget (₹)</span>
                      <span className="font-black text-slate-900 text-sm">
                        +{lead.scoreBreakdown.budgetPoints}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-500 block">Service Tier</span>
                      <span className="font-black text-slate-900 text-sm">
                        +{lead.scoreBreakdown.servicePoints}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'notes' ? (
            <div className="space-y-6">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-3">
                <textarea
                  required
                  rows={3}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Record an interaction note, call summary, or customer question..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />

                <div className="flex items-center justify-between">
                  {/* Internal Privacy checkbox (hidden from CLIENT users) */}
                  {user?.role !== UserRole.CLIENT ? (
                    <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newNoteIsInternal}
                        onChange={(e) => setNewNoteIsInternal(e.target.checked)}
                        className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" />
                        Internal Note (Hidden from client)
                      </span>
                    </label>
                  ) : <div />}

                  <button
                    type="submit"
                    disabled={isAddingNote || !newNoteContent.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {isAddingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Add Note
                  </button>
                </div>
              </form>

              {/* Notes Timeline */}
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-xs">No notes recorded yet.</p>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-3.5 rounded-xl border text-xs ${
                        note.isInternal
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          {note.author?.fullName || 'Team Member'}
                          {note.isInternal && (
                            <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-amber-600" />
                              Internal
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Activity Tab */
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs">No activity entries recorded yet.</p>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {activities.map((act) => (
                    <div key={act.id} className="relative text-xs">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{act.action}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(act.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{act.summary}</p>
                      {act.performedBy && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          By: {act.performedBy.fullName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
