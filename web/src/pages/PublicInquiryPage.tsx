import React, { useState } from 'react';
import { apiClient } from '../api/client.js';
import { LeadService, LeadSource } from '../types/index.js';
import {
  Send,
  CheckCircle2,
  Building2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface PublicInquiryPageProps {
  onBackToLogin: () => void;
}

export const PublicInquiryPage: React.FC<PublicInquiryPageProps> = ({ onBackToLogin }) => {
  const [clientSlug, setClientSlug] = useState('apex-dental');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceNeeded, setServiceNeeded] = useState<LeadService>(
    LeadService.COMPREHENSIVE_CONSULTATION,
  );
  const [budget, setBudget] = useState('75000');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState<LeadSource>(LeadSource.WEBSITE);
  const [honeypot, setHoneypot] = useState(''); // Anti-spam trap field

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<{
    leadId?: string;
    score?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientPresets: Record<
    string,
    { name: string; tag: string; services: { id: LeadService; label: string }[] }
  > = {
    'apex-dental': {
      name: 'Apex Dental Care',
      tag: 'Premier Dental Clinic & Oral Surgery',
      services: [
        { id: LeadService.COMPREHENSIVE_CONSULTATION, label: 'Comprehensive Dental Consultation' },
        { id: LeadService.REGULAR_TREATMENT, label: 'Regular Dental Treatment & Cleaning' },
        { id: LeadService.BASIC_CHECKUP, label: 'Routine Dental Checkup' },
      ],
    },
    'horizon-tech': {
      name: 'Horizon Institute of Technology',
      tag: 'Engineering, Computing & Management Admissions',
      services: [
        { id: LeadService.FULL_DEGREE_COURSE, label: 'Full 4-Year B.Tech Degree Course' },
        { id: LeadService.CERTIFICATION_PROGRAM, label: 'Advanced Cloud & AI Certification' },
        { id: LeadService.GENERAL_INQUIRY, label: 'General Admissions Inquiry' },
      ],
    },
    'quickfix-auto': {
      name: 'QuickFix Automotive Services',
      tag: 'Multi-brand Vehicle Care & Maintenance',
      services: [
        { id: LeadService.ANNUAL_MAINTENANCE, label: 'Annual Vehicle Maintenance Package' },
        { id: LeadService.REPAIR_SERVICE, label: 'Engine & Transmission Repair Service' },
        { id: LeadService.GENERAL_INQUIRY, label: 'General Service Inquiry' },
      ],
    },
  };

  const currentClient = clientPresets[clientSlug];

  const handleClientChange = (newSlug: string) => {
    setClientSlug(newSlug);
    setServiceNeeded(clientPresets[newSlug].services[0].id);
    setSubmittedLead(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        name,
        phone,
        email,
        serviceNeeded,
        budget: parseInt(budget, 10) || 0,
        message,
        source,
      };

      // If user filled honeypot (bots)
      if (honeypot) {
        payload.website = honeypot;
      }

      const { data } = await apiClient.post(`/leads/public/${clientSlug}`, payload);

      setSubmittedLead({
        leadId: data.leadId,
        score: data.score,
      });

      // Clear form
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
      setHoneypot('');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to submit inquiry. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Staff Login
          </button>

          {/* Client Switcher for testing */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Switch Client:</span>
            <select
              value={clientSlug}
              onChange={(e) => handleClientChange(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="apex-dental">Apex Dental Care (Clinic)</option>
              <option value="horizon-tech">Horizon Institute (College)</option>
              <option value="quickfix-auto">QuickFix Automotive (Shop)</option>
            </select>
          </div>
        </div>

        {/* Card Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
          <div className="bg-linear-to-r from-indigo-600 to-indigo-800 p-6 sm:p-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-7 h-7 text-indigo-200" />
              <h2 className="text-2xl font-black tracking-tight">{currentClient.name}</h2>
            </div>
            <p className="text-indigo-100 text-sm">{currentClient.tag}</p>
          </div>

          <div className="p-6 sm:p-8">
            {submittedLead ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Thank You for Your Inquiry!
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                  Your inquiry has been successfully registered and assigned to our representative. We will contact you shortly.
                </p>

                {submittedLead.score !== undefined && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 font-semibold mb-6">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Automated Intent Score: <span className="font-black text-sm">{submittedLead.score}/100</span>
                  </div>
                )}

                <div>
                  <button
                    onClick={() => setSubmittedLead(null)}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ananya Sen"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Service Needed *
                    </label>
                    <select
                      value={serviceNeeded}
                      onChange={(e) => setServiceNeeded(e.target.value as LeadService)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      {currentClient.services.map((svc) => (
                        <option key={svc.id} value={svc.id}>
                          {svc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Estimated Budget (₹ INR) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="1000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      ₹{parseInt(budget || '0', 10).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      How Did You Hear About Us?
                    </label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value as LeadSource)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value={LeadSource.WEBSITE}>Website</option>
                      <option value={LeadSource.GOOGLE_ADS}>Google Search / Ads</option>
                      <option value={LeadSource.FACEBOOK}>Social Media / Facebook</option>
                      <option value={LeadSource.REFERRAL}>Friend / Family Referral</option>
                      <option value={LeadSource.OTHER}>Other Channel</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Your Requirements or Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please describe your specific requirements or preferred timing..."
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Honeypot hidden input for spam bot trap */}
                <div style={{ display: 'none' }} aria-hidden="true">
                  <label htmlFor="website-field">Leave this field blank</label>
                  <input
                    id="website-field"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Inquiry...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Inquiry
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

