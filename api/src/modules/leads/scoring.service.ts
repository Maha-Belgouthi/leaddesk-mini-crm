import { Injectable } from '@nestjs/common';
import { LeadStatus } from '../../common/enums/lead-status.enum.js';
import { LeadSource } from '../../common/enums/lead-source.enum.js';
import { LeadService } from '../../common/enums/lead-service.enum.js';

export interface ScoreCalculationInput {
  status: LeadStatus;
  source: LeadSource;
  serviceNeeded: LeadService;
  budget: number;
  createdAt?: Date | string;
  firstContactedAt?: Date | string | null;
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

@Injectable()
export class ScoringService {
  /**
   * Maximum potential raw points for normal pipeline stages (prior to WON/LOST override):
   * Status: 60 (PROPOSAL_SENT)
   * Speed: 20 (<= 1h)
   * Source: 25 (REFERRAL)
   * Budget: 25 (>= 100,000)
   * Service: 20 (High-value)
   * Total = 150 points
   */
  private static readonly MAX_RAW_POINTS = 150;

  /**
   * Calculates deterministic 0-100 lead score and itemized breakdown
   */
  calculateScore(input: ScoreCalculationInput): {
    score: number;
    breakdown: ScoreBreakdown;
  } {
    // 1. Status points
    const statusPoints = this.calculateStatusPoints(input.status);

    // 2. Contact speed points (0 for uncontacted leads)
    const speedPoints = this.calculateSpeedPoints(
      input.status,
      input.createdAt,
      input.firstContactedAt,
    );

    // 3. Source points
    const sourcePoints = this.calculateSourcePoints(input.source);

    // 4. Budget points (Indian Rupees ₹)
    const budgetPoints = this.calculateBudgetPoints(input.budget);

    // 5. Service tier points
    const servicePoints = this.calculateServicePoints(input.serviceNeeded);

    const rawTotal =
      statusPoints + speedPoints + sourcePoints + budgetPoints + servicePoints;

    let finalScore: number;

    // Direct terminal overrides
    if (input.status === LeadStatus.WON) {
      finalScore = 100;
    } else if (input.status === LeadStatus.LOST) {
      finalScore = 0;
    } else {
      // Normalize to 0-100 scale based on max possible raw score
      finalScore = Math.min(
        100,
        Math.max(
          0,
          Math.round((rawTotal / ScoringService.MAX_RAW_POINTS) * 100),
        ),
      );
    }

    const breakdown: ScoreBreakdown = {
      statusPoints,
      speedPoints,
      sourcePoints,
      budgetPoints,
      servicePoints,
      rawTotal,
      finalScore,
    };

    return { score: finalScore, breakdown };
  }

  private calculateStatusPoints(status: LeadStatus): number {
    switch (status) {
      case LeadStatus.NEW:
        return 10;
      case LeadStatus.CONTACTED:
        return 30;
      case LeadStatus.PROPOSAL_SENT:
        return 60;
      case LeadStatus.WON:
        return 60;
      case LeadStatus.LOST:
        return 0;
      default:
        return 0;
    }
  }

  private calculateSpeedPoints(
    status: LeadStatus,
    createdAt?: Date | string,
    firstContactedAt?: Date | string | null,
  ): number {
    // Key rule: uncontacted leads receive 0 speed points
    if (status === LeadStatus.NEW || !firstContactedAt || !createdAt) {
      return 0;
    }

    const createdTime = new Date(createdAt).getTime();
    const contactedTime = new Date(firstContactedAt).getTime();

    if (isNaN(createdTime) || isNaN(contactedTime) || contactedTime < createdTime) {
      return 0;
    }

    const elapsedHours = (contactedTime - createdTime) / (1000 * 60 * 60);

    if (elapsedHours <= 1) {
      return 20; // <= 1 hour
    }
    if (elapsedHours <= 4) {
      return 15; // 1 to 4 hours
    }
    if (elapsedHours <= 24) {
      return 10; // 4 to 24 hours
    }
    return 0; // > 24 hours
  }

  private calculateSourcePoints(source: LeadSource): number {
    switch (source) {
      case LeadSource.REFERRAL:
        return 25;
      case LeadSource.GOOGLE_ADS:
        return 20;
      case LeadSource.WEBSITE:
        return 15;
      case LeadSource.FACEBOOK:
        return 10;
      case LeadSource.OTHER:
      default:
        return 5;
    }
  }

  private calculateBudgetPoints(budget: number): number {
    const amount = Number(budget) || 0;

    if (amount >= 100000) {
      return 25; // ₹1,00,000+ (1 Lakh+)
    }
    if (amount >= 50000) {
      return 15; // ₹50,000 - ₹99,999
    }
    if (amount >= 10000) {
      return 10; // ₹10,000 - ₹49,999
    }
    return 5; // Under ₹10,000
  }

  private calculateServicePoints(service: LeadService): number {
    switch (service) {
      // High-value services
      case LeadService.COMPREHENSIVE_CONSULTATION:
      case LeadService.FULL_DEGREE_COURSE:
      case LeadService.ANNUAL_MAINTENANCE:
        return 20;

      // Standard services
      case LeadService.REGULAR_TREATMENT:
      case LeadService.CERTIFICATION_PROGRAM:
      case LeadService.REPAIR_SERVICE:
        return 15;

      // Basic inquiries
      case LeadService.GENERAL_INQUIRY:
      case LeadService.BASIC_CHECKUP:
      default:
        return 10;
    }
  }
}

