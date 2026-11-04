import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { LeadStatus } from '../../common/enums/lead-status.enum.js';
import { LeadSource } from '../../common/enums/lead-source.enum.js';
import { LeadService } from '../../common/enums/lead-service.enum.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { Lead } from './entities/lead.entity.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

describe('LeadsService', () => {
  let leadsService: LeadsService;
  let mockLeadsRepo: any;
  let mockScoringService: any;
  let mockClientsService: any;
  let mockUsersService: any;
  let mockActivityService: any;
  let mockNotificationsService: any;

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-uuid-1',
    email: 'admin@leaddesk.local',
    fullName: 'Admin User',
    role: UserRole.ADMIN,
    clientId: null,
  };

  const mockSalesUser: AuthenticatedUser = {
    id: 'sales-uuid-1',
    email: 'sales1@leaddesk.local',
    fullName: 'Sales Executive 1',
    role: UserRole.SALES_EXECUTIVE,
    clientId: 'client-uuid-1',
  };

  const mockOtherSalesUser: AuthenticatedUser = {
    id: 'sales-uuid-2',
    email: 'sales2@leaddesk.local',
    fullName: 'Sales Executive 2',
    role: UserRole.SALES_EXECUTIVE,
    clientId: 'client-uuid-1',
  };

  const mockClientUser: AuthenticatedUser = {
    id: 'client-user-uuid-1',
    email: 'client@apex.local',
    fullName: 'Client Manager',
    role: UserRole.CLIENT,
    clientId: 'client-uuid-1',
  };

  const sampleLead: Partial<Lead> = {
    id: 'lead-uuid-100',
    clientId: 'client-uuid-1',
    name: 'John Doe',
    phone: '+91 99887 76655',
    email: 'john@example.com',
    serviceNeeded: LeadService.COMPREHENSIVE_CONSULTATION,
    budget: 75000,
    message: 'Interested in services',
    source: LeadSource.WEBSITE,
    status: LeadStatus.NEW,
    score: 50,
    scoreBreakdown: { statusPoints: 10, speedPoints: 0, sourcePoints: 15, budgetPoints: 15, servicePoints: 20, rawTotal: 60, finalScore: 50 },
    assignedToId: 'sales-uuid-1',
    isOverdue: false,
    firstContactedAt: null,
    createdAt: new Date('2026-11-01T10:00:00Z'),
  };

  beforeEach(() => {
    mockLeadsRepo = {
      create: vi.fn().mockImplementation((dto) => ({ ...dto, id: 'new-lead-id' })),
      save: vi.fn().mockImplementation((lead) => Promise.resolve(lead)),
      find: vi.fn().mockResolvedValue([sampleLead]),
      findOne: vi.fn().mockResolvedValue({ ...sampleLead }),
      findOneBy: vi.fn().mockResolvedValue({ ...sampleLead }),
      count: vi.fn().mockResolvedValue(0),
    };

    mockScoringService = {
      calculateScore: vi.fn().mockReturnValue({
        score: 65,
        breakdown: { statusPoints: 30, speedPoints: 20, sourcePoints: 15, budgetPoints: 15, servicePoints: 20, rawTotal: 100, finalScore: 65 },
      }),
    };

    mockClientsService = {
      findBySlug: vi.fn().mockResolvedValue({
        id: 'client-uuid-1',
        name: 'Apex Dental Care',
        slug: 'apex-dental',
      }),
    };

    mockUsersService = {
      findOne: vi.fn().mockResolvedValue({ id: 'sales-uuid-1', fullName: 'Sales One' }),
      findSalesExecutivesByClient: vi.fn().mockResolvedValue([
        { id: 'sales-uuid-1', fullName: 'Sales 1' },
        { id: 'sales-uuid-2', fullName: 'Sales 2' },
      ]),
    };

    mockActivityService = {
      log: vi.fn().mockResolvedValue({}),
    };

    mockNotificationsService = {
      create: vi.fn().mockResolvedValue({}),
    };

    leadsService = new LeadsService(
      mockLeadsRepo,
      mockScoringService,
      mockClientsService,
      mockUsersService,
      mockActivityService,
      mockNotificationsService,
    );
  });

  describe('Least Open Leads Auto-Assignment', () => {
    it('should assign lead to the sales executive with the lowest open lead count', async () => {
      // Sales 1 has 5 open leads; Sales 2 has 2 open leads
      mockLeadsRepo.count.mockImplementation((query: any) => {
        if (query.where.assignedToId === 'sales-uuid-1') return Promise.resolve(5);
        if (query.where.assignedToId === 'sales-uuid-2') return Promise.resolve(2);
        return Promise.resolve(0);
      });

      const assignedId = await leadsService.autoAssignLead('client-uuid-1');
      expect(assignedId).toBe('sales-uuid-2');
    });

    it('should deterministically tie-break by userId ascending when counts are equal', async () => {
      mockLeadsRepo.count.mockResolvedValue(3);

      const assignedId = await leadsService.autoAssignLead('client-uuid-1');
      expect(assignedId).toBe('sales-uuid-1');
    });

    it('should return null when no sales executives exist for client', async () => {
      mockUsersService.findSalesExecutivesByClient.mockResolvedValue([]);

      const assignedId = await leadsService.autoAssignLead('client-uuid-1');
      expect(assignedId).toBeNull();
    });
  });

  describe('createPublicLead (Honeypot & Validation)', () => {
    it('should silently succeed without database persistence if honeypot is populated', async () => {
      const result = await leadsService.createPublicLead('apex-dental', {
        name: 'Spam Bot',
        phone: '1234567890',
        email: 'spam@bot.net',
        serviceNeeded: LeadService.GENERAL_INQUIRY,
        budget: 5000,
        message: 'Spam offer text',
        website: 'http://spam-link.ru', // Bot trapped
      });

      expect(result.success).toBe(true);
      expect(mockLeadsRepo.save).not.toHaveBeenCalled();
      expect(mockActivityService.log).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if client slug does not exist', async () => {
      mockClientsService.findBySlug.mockResolvedValue(null);

      await expect(
        leadsService.createPublicLead('non-existent-client', {
          name: 'Jane Doe',
          phone: '+91 99999 88888',
          email: 'jane@example.com',
          serviceNeeded: LeadService.GENERAL_INQUIRY,
          budget: 20000,
          message: 'Hello, need info',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create lead, calculate score, log activity and create notification for assigned rep', async () => {
      const result = await leadsService.createPublicLead('apex-dental', {
        name: 'Jane Doe',
        phone: '+91 99999 88888',
        email: 'jane@example.com',
        serviceNeeded: LeadService.COMPREHENSIVE_CONSULTATION,
        budget: 75000,
        message: 'Inquiry details',
        source: LeadSource.WEBSITE,
      });

      expect(result.success).toBe(true);
      expect(mockLeadsRepo.save).toHaveBeenCalled();
      expect(mockActivityService.log).toHaveBeenCalled();
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });
  });

  describe('Single-Lead Query Scoping (Key Refinement #8)', () => {
    it('should allow ADMIN to view any lead', async () => {
      const lead = await leadsService.findOneScoped('lead-uuid-100', mockAdminUser);
      expect(lead).toBeDefined();
      expect(lead.id).toBe('lead-uuid-100');
    });

    it('should return 404 when CLIENT user accesses a lead belonging to another client', async () => {
      mockLeadsRepo.findOne.mockResolvedValue({
        ...sampleLead,
        clientId: 'different-client-uuid',
      });

      await expect(
        leadsService.findOneScoped('lead-uuid-100', mockClientUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 404 when SALES_EXECUTIVE accesses a lead assigned to another rep', async () => {
      // sampleLead is assigned to 'sales-uuid-1', but requesting user is 'sales-uuid-2'
      await expect(
        leadsService.findOneScoped('lead-uuid-100', mockOtherSalesUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow SALES_EXECUTIVE to view lead assigned to themselves', async () => {
      const lead = await leadsService.findOneScoped('lead-uuid-100', mockSalesUser);
      expect(lead).toBeDefined();
      expect(lead.assignedToId).toBe(mockSalesUser.id);
    });
  });

  describe('Pipeline State Machine (updateStatus)', () => {
    it('should allow valid transition from NEW to CONTACTED and set firstContactedAt', async () => {
      const updated = await leadsService.updateStatus(
        'lead-uuid-100',
        LeadStatus.CONTACTED,
        mockAdminUser,
      );

      expect(updated.status).toBe(LeadStatus.CONTACTED);
      expect(updated.firstContactedAt).toBeInstanceOf(Date);
      expect(mockScoringService.calculateScore).toHaveBeenCalled();
      expect(mockActivityService.log).toHaveBeenCalled();
    });

    it('should allow valid transition from CONTACTED to PROPOSAL_SENT', async () => {
      mockLeadsRepo.findOne.mockResolvedValue({
        ...sampleLead,
        status: LeadStatus.CONTACTED,
        firstContactedAt: new Date(),
      });

      const updated = await leadsService.updateStatus(
        'lead-uuid-100',
        LeadStatus.PROPOSAL_SENT,
        mockAdminUser,
      );

      expect(updated.status).toBe(LeadStatus.PROPOSAL_SENT);
    });

    it('should reject invalid transition from NEW to WON with BadRequestException', async () => {
      await expect(
        leadsService.updateStatus('lead-uuid-100', LeadStatus.WON, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid transition from WON to any status with BadRequestException', async () => {
      mockLeadsRepo.findOne.mockResolvedValue({
        ...sampleLead,
        status: LeadStatus.WON,
      });

      await expect(
        leadsService.updateStatus('lead-uuid-100', LeadStatus.PROPOSAL_SENT, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
