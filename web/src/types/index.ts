export enum UserRole {
  ADMIN = 'ADMIN',
  SALES_EXECUTIVE = 'SALES_EXECUTIVE',
  CLIENT = 'CLIENT',
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  WON = 'WON',
  LOST = 'LOST',
}

export enum LeadSource {
  WEBSITE = 'website',
  GOOGLE_ADS = 'google_ads',
  FACEBOOK = 'facebook',
  REFERRAL = 'referral',
  OTHER = 'other',
}

export enum LeadService {
  COMPREHENSIVE_CONSULTATION = 'comprehensive_consultation',
  FULL_DEGREE_COURSE = 'full_degree_course',
  ANNUAL_MAINTENANCE = 'annual_maintenance',
  REGULAR_TREATMENT = 'regular_treatment',
  CERTIFICATION_PROGRAM = 'certification_program',
  REPAIR_SERVICE = 'repair_service',
  GENERAL_INQUIRY = 'general_inquiry',
  BASIC_CHECKUP = 'basic_checkup',
}

export enum ActivityAction {
  STATUS_CHANGE = 'STATUS_CHANGE',
  ASSIGNMENT_CHANGE = 'ASSIGNMENT_CHANGE',
  NOTE_ADDED = 'NOTE_ADDED',
  SCORE_RECALCULATED = 'SCORE_RECALCULATED',
  FLAGGED_OVERDUE = 'FLAGGED_OVERDUE',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  clientId: string | null;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
}

export interface ScoreBreakdown {
  statusPoints: number;
  speedPoints: number;
  sourcePoints: number;
  budgetPoints: number;
  servicePoints: number;
  rawTotal: number;
  finalScore: number;
}

export interface Lead {
  id: string;
  clientId: string;
  client?: Client;
  name: string;
  phone: string;
  email: string;
  serviceNeeded: LeadService;
  budget: number;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  scoreBreakdown: ScoreBreakdown | null;
  assignedToId: string | null;
  assignedTo?: User | null;
  isOverdue: boolean;
  firstContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  leadId: string;
  authorId: string;
  author?: User;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  leadId: string;
  performedById: string | null;
  performedBy?: User | null;
  action: ActivityAction;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  summary: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  leadId: string | null;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

