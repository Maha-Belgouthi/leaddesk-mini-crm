import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Lead } from './entities/lead.entity.js';
import { ScoringService } from './scoring.service.js';
import { ClientsService } from '../clients/clients.service.js';
import { UsersService } from '../users/users.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { LeadStatus } from '../../common/enums/lead-status.enum.js';
import { LeadSource } from '../../common/enums/lead-source.enum.js';
import { ActivityAction } from '../../common/enums/activity-action.enum.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { CreatePublicLeadDto } from './dto/create-public-lead.dto.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

export const VALID_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.CONTACTED, LeadStatus.LOST],
  [LeadStatus.CONTACTED]: [LeadStatus.PROPOSAL_SENT, LeadStatus.LOST],
  [LeadStatus.PROPOSAL_SENT]: [LeadStatus.WON, LeadStatus.LOST],
  [LeadStatus.WON]: [], // Terminal state
  [LeadStatus.LOST]: [LeadStatus.NEW], // Allowed to reopen
};

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepo: Repository<Lead>,
    private readonly scoringService: ScoringService,
    private readonly clientsService: ClientsService,
    private readonly usersService: UsersService,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Deterministic 'Least Open Leads' auto-assignment algorithm.
   * Assigns incoming lead to the active sales executive with the lowest active pipeline workload.
   */
  async autoAssignLead(clientId: string): Promise<string | null> {
    const executives = await this.usersService.findSalesExecutivesByClient(clientId);

    if (!executives || executives.length === 0) {
      return null;
    }

    const workloads = await Promise.all(
      executives.map(async (exec) => {
        const count = await this.leadsRepo.count({
          where: {
            clientId,
            assignedToId: exec.id,
            status: Not(In([LeadStatus.WON, LeadStatus.LOST])),
          },
        });
        return { userId: exec.id, count };
      }),
    );

    // Sort by open lead count ascending; tie-break deterministically by userId ascending
    workloads.sort((a, b) => a.count - b.count || a.userId.localeCompare(b.userId));

    return workloads[0].userId;
  }

  /**
   * Handles public website/landing page lead inquiries.
   * Includes honeypot anti-spam verification and automatic scoring.
   */
  async createPublicLead(
    clientSlug: string,
    dto: CreatePublicLeadDto,
  ): Promise<{ success: boolean; leadId?: string; score?: number; message?: string }> {
    // Honeypot spam trap: if populated, silently return success without database persistence
    if (dto.website && dto.website.trim().length > 0) {
      return { success: true, message: 'Inquiry received successfully' };
    }

    const client = await this.clientsService.findBySlug(clientSlug);
    if (!client) {
      throw new NotFoundException(`Client not found for slug: ${clientSlug}`);
    }

    const assignedToId = await this.autoAssignLead(client.id);

    const { score, breakdown } = this.scoringService.calculateScore({
      status: LeadStatus.NEW,
      source: dto.source ?? LeadSource.WEBSITE,
      serviceNeeded: dto.serviceNeeded,
      budget: dto.budget,
    });

    const lead = this.leadsRepo.create({
      clientId: client.id,
      name: dto.name,
      phone: dto.phone,
      email: dto.email.toLowerCase().trim(),
      serviceNeeded: dto.serviceNeeded,
      budget: dto.budget,
      message: dto.message,
      source: dto.source ?? LeadSource.WEBSITE,
      status: LeadStatus.NEW,
      score,
      scoreBreakdown: breakdown,
      assignedToId,
      isOverdue: false,
    });

    const savedLead = await this.leadsRepo.save(lead);

    // Record creation in activity audit log
    await this.activityService.log({
      leadId: savedLead.id,
      performedById: null,
      action: ActivityAction.STATUS_CHANGE,
      newValue: { status: LeadStatus.NEW, score },
      summary: `Lead created via public inquiry form (${dto.source ?? LeadSource.WEBSITE})`,
    });

    // Notify assigned representative
    if (assignedToId) {
      await this.notificationsService.create({
        recipientId: assignedToId,
        leadId: savedLead.id,
        subject: 'New Lead Assigned',
        body: `New lead "${savedLead.name}" for ${savedLead.serviceNeeded} (Score: ${savedLead.score})`,
      });
    }

    return {
      success: true,
      leadId: savedLead.id,
      score: savedLead.score,
    };
  }

  /**
   * Retrieves leads scoped by user role.
   * CLIENT users see only their client's leads.
   * SALES_EXECUTIVE sees their assigned leads.
   * ADMIN sees all leads.
   */
  async findAll(user: AuthenticatedUser, clientId?: string): Promise<Lead[]> {
    const where: any = {};

    if (user.role === UserRole.CLIENT) {
      if (!user.clientId) {
        return [];
      }
      where.clientId = user.clientId;
    } else if (user.role === UserRole.SALES_EXECUTIVE) {
      where.assignedToId = user.id;
      if (clientId) {
        where.clientId = clientId;
      }
    } else if (clientId) {
      where.clientId = clientId;
    }

    return this.leadsRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: { client: true, assignedTo: true },
    });
  }

  /**
   * Single-lead retrieval with strict role scoping and 404 anti-enumeration.
   */
  async findOneScoped(id: string, user: AuthenticatedUser): Promise<Lead> {
    const lead = await this.leadsRepo.findOne({
      where: { id },
      relations: { client: true, assignedTo: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Role-based visibility enforcement
    if (user.role === UserRole.CLIENT && lead.clientId !== user.clientId) {
      throw new NotFoundException('Lead not found');
    }

    if (user.role === UserRole.SALES_EXECUTIVE && lead.assignedToId !== user.id) {
      // Return 404 instead of 403 to prevent ID enumeration (Key Refinement #8)
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  /**
   * Pipeline state machine with valid transition enforcement and automatic score recalculation.
   */
  async updateStatus(
    id: string,
    targetStatus: LeadStatus,
    user: AuthenticatedUser,
  ): Promise<Lead> {
    const lead = await this.findOneScoped(id, user);

    if (lead.status === targetStatus) {
      return lead;
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[lead.status] || [];
    if (!allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid pipeline transition from "${lead.status}" to "${targetStatus}". Allowed: [${allowedTransitions.join(', ')}]`,
      );
    }

    const oldStatus = lead.status;
    const oldScore = lead.score;
    lead.status = targetStatus;

    // Track first contact timestamp
    if (targetStatus === LeadStatus.CONTACTED && !lead.firstContactedAt) {
      lead.firstContactedAt = new Date();
    }

    // Recalculate multi-factor score
    const { score, breakdown } = this.scoringService.calculateScore({
      status: lead.status,
      source: lead.source,
      serviceNeeded: lead.serviceNeeded,
      budget: lead.budget,
      createdAt: lead.createdAt,
      firstContactedAt: lead.firstContactedAt,
    });

    lead.score = score;
    lead.scoreBreakdown = breakdown;

    const updatedLead = await this.leadsRepo.save(lead);

    // Audit log status transition
    await this.activityService.log({
      leadId: updatedLead.id,
      performedById: user.id,
      action: ActivityAction.STATUS_CHANGE,
      oldValue: { status: oldStatus, score: oldScore },
      newValue: { status: targetStatus, score },
      summary: `Status updated from ${oldStatus} to ${targetStatus}`,
    });

    // Audit score recalculation
    if (oldScore !== score) {
      await this.activityService.log({
        leadId: updatedLead.id,
        performedById: user.id,
        action: ActivityAction.SCORE_RECALCULATED,
        oldValue: { score: oldScore },
        newValue: { score, breakdown },
        summary: `Score recalculated from ${oldScore} to ${score}`,
      });
    }

    return updatedLead;
  }

  /**
   * Reassigns lead to a new representative.
   */
  async assignLead(
    id: string,
    assignedToId: string,
    user: AuthenticatedUser,
  ): Promise<Lead> {
    const lead = await this.findOneScoped(id, user);

    if (user.role === UserRole.CLIENT) {
      throw new ForbiddenException('Clients cannot reassign leads');
    }

    const targetUser = await this.usersService.findOne(assignedToId);
    if (!targetUser) {
      throw new NotFoundException('Target user to assign not found');
    }

    const oldAssigneeId = lead.assignedToId;
    lead.assignedToId = assignedToId;
    const saved = await this.leadsRepo.save(lead);

    await this.activityService.log({
      leadId: saved.id,
      performedById: user.id,
      action: ActivityAction.ASSIGNMENT_CHANGE,
      oldValue: { assignedToId: oldAssigneeId },
      newValue: { assignedToId },
      summary: `Lead reassigned to ${targetUser.fullName}`,
    });

    await this.notificationsService.create({
      recipientId: assignedToId,
      leadId: saved.id,
      subject: 'Lead Reassigned',
      body: `Lead "${saved.name}" has been reassigned to you.`,
    });

    return saved;
  }

  async findOne(id: string): Promise<Lead | null> {
    return this.leadsRepo.findOneBy({ id });
  }

  async create(data: Partial<Lead>): Promise<Lead> {
    const lead = this.leadsRepo.create(data);
    return this.leadsRepo.save(lead);
  }
}
