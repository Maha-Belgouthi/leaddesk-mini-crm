import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringService } from './scoring.service.js';
import { LeadStatus } from '../../common/enums/lead-status.enum.js';
import { LeadSource } from '../../common/enums/lead-source.enum.js';
import { LeadService } from '../../common/enums/lead-service.enum.js';

describe('ScoringService', () => {
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  describe('Status scoring and overrides', () => {
    it('should assign 10 status points for NEW status', () => {
      const result = scoringService.calculateScore({
        status: LeadStatus.NEW,
        source: LeadSource.WEBSITE,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 5000,
      });

      expect(result.breakdown.statusPoints).toBe(10);
    });

    it('should assign 30 status points for CONTACTED status', () => {
      const result = scoringService.calculateScore({
        status: LeadStatus.CONTACTED,
        source: LeadSource.WEBSITE,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 5000,
      });

      expect(result.breakdown.statusPoints).toBe(30);
    });

    it('should assign 60 status points for PROPOSAL_SENT status', () => {
      const result = scoringService.calculateScore({
        status: LeadStatus.PROPOSAL_SENT,
        source: LeadSource.WEBSITE,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 5000,
      });

      expect(result.breakdown.statusPoints).toBe(60);
    });

    it('should force final score to 100 when status is WON', () => {
      const result = scoringService.calculateScore({
        status: LeadStatus.WON,
        source: LeadSource.OTHER,
        serviceNeeded: LeadService.BASIC_CHECKUP,
        budget: 1000,
      });

      expect(result.score).toBe(100);
      expect(result.breakdown.finalScore).toBe(100);
    });

    it('should force final score to 0 when status is LOST', () => {
      const result = scoringService.calculateScore({
        status: LeadStatus.LOST,
        source: LeadSource.REFERRAL,
        serviceNeeded: LeadService.FULL_DEGREE_COURSE,
        budget: 200000,
      });

      expect(result.score).toBe(0);
      expect(result.breakdown.finalScore).toBe(0);
    });
  });

  describe('Contact Speed scoring (Key Refinement #2)', () => {
    const baseCreated = new Date('2026-11-01T10:00:00Z');

    it('should award 0 speed points for uncontacted leads in NEW status', () => {
      const result = scoringService.calculateScore({
        status: LeadStatus.NEW,
        source: LeadSource.WEBSITE,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 10000,
        createdAt: baseCreated,
        firstContactedAt: new Date('2026-11-01T10:15:00Z'),
      });

      expect(result.breakdown.speedPoints).toBe(0);
    });

    it('should award 20 speed points when contacted within 1 hour', () => {
      const result = scoringService.calculateScore({
        status: LeadStatus.CONTACTED,
        source: LeadSource.WEBSITE,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 10000,
        createdAt: baseCreated,
        firstContactedAt: new Date('2026-11-01T10:45:00Z'), // 45 mins
      });

      expect(result.breakdown.speedPoints).toBe(20);
    });

    it('should award 15 speed points when contacted between 1 and 4 hours', () => {
      const result = scoringService.calculateScore({
        status: LeadStatus.CONTACTED,
        source: LeadSource.WEBSITE,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 10000,
        createdAt: baseCreated,
        firstContactedAt: new Date('2026-11-01T12:30:00Z'), // 2.5 hours
      });

      expect(result.breakdown.speedPoints).toBe(15);
    });

    it('should award 10 speed points when contacted between 4 and 24 hours', () => {
      const result = scoringService.calculateScore({
        status: LeadStatus.CONTACTED,
        source: LeadSource.WEBSITE,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 10000,
        createdAt: baseCreated,
        firstContactedAt: new Date('2026-11-01T18:00:00Z'), // 8 hours
      });

      expect(result.breakdown.speedPoints).toBe(10);
    });

    it('should award 0 speed points when contacted after 24 hours', () => {
      const result = scoringService.calculateScore({
        status: LeadStatus.CONTACTED,
        source: LeadSource.WEBSITE,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 10000,
        createdAt: baseCreated,
        firstContactedAt: new Date('2026-11-02T15:00:00Z'), // 29 hours
      });

      expect(result.breakdown.speedPoints).toBe(0);
    });
  });

  describe('Source scoring', () => {
    it.each([
      [LeadSource.REFERRAL, 25],
      [LeadSource.GOOGLE_ADS, 20],
      [LeadSource.WEBSITE, 15],
      [LeadSource.FACEBOOK, 10],
      [LeadSource.OTHER, 5],
    ])('should award %i points for source %s', (source, expectedPoints) => {
      const result = scoringService.calculateScore({
        status: LeadStatus.NEW,
        source,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 5000,
      });

      expect(result.breakdown.sourcePoints).toBe(expectedPoints);
    });
  });

  describe('Budget scoring (INR ₹)', () => {
    it.each([
      [150000, 25], // >= ₹100,000 (1 Lakh+)
      [75000, 15],  // ₹50,000 - ₹99,999
      [25000, 10],  // ₹10,000 - ₹49,999
      [5000, 5],    // < ₹10,000
    ])('should award %i points for budget ₹%i', (budget, expectedPoints) => {
      const result = scoringService.calculateScore({
        status: LeadStatus.NEW,
        source: LeadSource.WEBSITE,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget,
      });

      expect(result.breakdown.budgetPoints).toBe(expectedPoints);
    });
  });

  describe('Service tier scoring', () => {
    it.each([
      [LeadService.COMPREHENSIVE_CONSULTATION, 20],
      [LeadService.FULL_DEGREE_COURSE, 20],
      [LeadService.ANNUAL_MAINTENANCE, 20],
      [LeadService.REGULAR_TREATMENT, 15],
      [LeadService.CERTIFICATION_PROGRAM, 15],
      [LeadService.REPAIR_SERVICE, 15],
      [LeadService.GENERAL_INQUIRY, 10],
      [LeadService.BASIC_CHECKUP, 10],
    ])('should award %i points for service %s', (serviceNeeded, expectedPoints) => {
      const result = scoringService.calculateScore({
        status: LeadStatus.NEW,
        source: LeadSource.WEBSITE,
        serviceNeeded,
        budget: 5000,
      });

      expect(result.breakdown.servicePoints).toBe(expectedPoints);
    });
  });

  describe('Normalized 0-100 Score Calculation', () => {
    it('should clamp and calculate accurate normalized score', () => {
      // Max possible normal lead:
      // Status PROPOSAL_SENT (60) + Speed <=1h (20) + Source REFERRAL (25) + Budget >=100k (25) + Service High (20) = 150 pts
      // 150 / 150 * 100 = 100
      const maxLead = scoringService.calculateScore({
        status: LeadStatus.PROPOSAL_SENT,
        source: LeadSource.REFERRAL,
        serviceNeeded: LeadService.COMPREHENSIVE_CONSULTATION,
        budget: 200000,
        createdAt: '2026-11-01T10:00:00Z',
        firstContactedAt: '2026-11-01T10:30:00Z',
      });

      expect(maxLead.breakdown.rawTotal).toBe(150);
      expect(maxLead.score).toBe(100);

      // Low lead:
      // Status NEW (10) + Speed (0) + Source OTHER (5) + Budget 2000 (5) + Service Basic (10) = 30 pts
      // 30 / 150 * 100 = 20
      const lowLead = scoringService.calculateScore({
        status: LeadStatus.NEW,
        source: LeadSource.OTHER,
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 2000,
      });

      expect(lowLead.breakdown.rawTotal).toBe(30);
      expect(lowLead.score).toBe(20);
    });
  });
});

