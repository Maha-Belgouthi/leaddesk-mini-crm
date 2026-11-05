import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';
import {
  type Lead,
  LeadStatus,
  UserRole,
  type Client,
} from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Search,
  Filter,
  Sparkles,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  RefreshCw,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';
import { LeadDetailModal } from '../components/LeadDetailModal.js';

export const LeadsBoard: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected lead for detail modal
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedClientId) {
        params.clientId = selectedClientId;
      }
      const { data } = await apiClient.get('/leads', { params });
      setLeads(data);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await apiClient.get('/clients');
      setClients(data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchLeads();
    if (user?.role === UserRole.ADMIN) {
      fetchClients();
    }
  }, [selectedClientId, user?.role]);

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesStatus =
      selectedStatus === 'ALL' || lead.status === selectedStatus;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      lead.name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.phone.includes(query) ||
      lead.serviceNeeded.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  // Analytics Metrics
  const totalLeads = leads.length;
  const newLeadsCount = leads.filter((l) => l.status === LeadStatus.NEW).length;
  const overdueCount = leads.filter((l) => l.isOverdue).length;
  const wonCount = leads.filter((l) => l.status === LeadStatus.WON).length;
  const avgScore =
    totalLeads > 0
      ? Math.round(leads.reduce((acc, l) => acc + (l.score || 0), 0) / totalLeads)
      : 0;

  const getScoreBadge = (score: number) => {
    if (score >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          {score}
        </span>
      );
    }
    if (score >= 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          {score}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        {score}
      </span>
    );
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case LeadStatus.NEW:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">NEW</span>;
      case LeadStatus.CONTACTED:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">CONTACTED</span>;
      case LeadStatus.PROPOSAL_SENT:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">PROPOSAL SENT</span>;
      case LeadStatus.WON:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">WON</span>;
      case LeadStatus.LOST:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">LOST</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Pipeline</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{totalLeads}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-600 block">New Inquiries</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">{newLeadsCount}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue (&gt;24h)
          </span>
          <span className="text-2xl font-black text-rose-700 mt-1 block">{overdueCount}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 block">Deals Won</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{wonCount}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-indigo-600 block">Average Score</span>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-2xl font-black text-indigo-700">{avgScore}</span>
            <span className="text-xs text-indigo-400 font-bold">/100</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
            {['ALL', 'NEW', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedStatus(tab)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  selectedStatus === tab
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Client Filter (for Admin) */}
            {user?.role === UserRole.ADMIN && (
              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={fetchLeads}
              title="Refresh leads"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, email, phone number, or requested service..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Leads Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-semibold">No leads match your filter criteria.</p>
            <p className="text-xs mt-1">Try selecting a different status tab or clearing your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3.5 px-4">Lead Name & Contact</th>
                  <th className="py-3.5 px-4">Service & Budget</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4 text-center">Stage</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setActiveLeadId(lead.id)}
                    className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                        {lead.name}
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {lead.phone}
                        </span>
                        <span className="flex items-center gap-1 hidden sm:flex">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {lead.email}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {lead.client?.name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{lead.serviceNeeded}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        ₹{lead.budget.toLocaleString('en-IN')} • <span className="capitalize">{lead.source}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getScoreBadge(lead.score)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getStatusBadge(lead.status)}
                        {lead.isOverdue && (
                          <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.assignedTo?.fullName || 'Unassigned'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLeadId(lead.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors cursor-pointer"
                      >
                        Inspect
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      {activeLeadId && (
        <LeadDetailModal
          leadId={activeLeadId}
          onClose={() => setActiveLeadId(null)}
          onLeadUpdated={fetchLeads}
        />
      )}
    </div>
  );
};
