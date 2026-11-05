import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OverdueProcessor } from './overdue.processor.js';
import { LeadStatus } from '../../../common/enums/lead-status.enum.js';
import { ActivityAction } from '../../../common/enums/activity-action.enum.js';
import type { Lead } from '../../leads/entities/lead.entity.js';

describe('OverdueProcessor', () => {
  let processor: OverdueProcessor;
  let mockLeadsRepo: any;
  let mockActivityService: any;
  let mockNotificationsService: any;
  let mockConfigService: any;

  const mockOverdueLead: Partial<Lead> = {
    id: 'lead-overdue-1',
    name: 'Overdue Prospect',
    serviceNeeded: 'comprehensive_consultation' as any,
    status: LeadStatus.NEW,
    isOverdue: false,
    assignedToId: 'sales-rep-uuid',
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago (> 24h)
  };

  beforeEach(() => {
    mockLeadsRepo = {
      find: vi.fn(),
      save: vi.fn().mockImplementation((lead) => Promise.resolve(lead)),
    };

    mockActivityService = {
      log: vi.fn().mockResolvedValue({}),
    };

    mockNotificationsService = {
      create: vi.fn().mockResolvedValue({}),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue('24'),
    };

    processor = new OverdueProcessor(
      mockLeadsRepo,
      mockActivityService,
      mockNotificationsService,
      mockConfigService,
    );
  });

  it('should return processed: 0 when no overdue leads exist', async () => {
    mockLeadsRepo.find.mockResolvedValue([]);

    const result = await processor.process({ name: 'check-overdue-leads', id: '1' } as any);

    expect(result.processed).toBe(0);
    expect(result.flagged).toBe(0);
    expect(mockLeadsRepo.save).not.toHaveBeenCalled();
    expect(mockActivityService.log).not.toHaveBeenCalled();
  });

  it('should flag overdue lead, save changes, log activity and send notification', async () => {
    const leadCopy = { ...mockOverdueLead };
    mockLeadsRepo.find.mockResolvedValue([leadCopy]);

    const result = await processor.process({ name: 'check-overdue-leads', id: '2' } as any);

    expect(result.processed).toBe(1);
    expect(result.flagged).toBe(1);
    expect(leadCopy.isOverdue).toBe(true);
    expect(mockLeadsRepo.save).toHaveBeenCalledWith(leadCopy);

    // Verify activity audit log was created
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: leadCopy.id,
        performedById: null, // Automated system cron
        action: ActivityAction.FLAGGED_OVERDUE,
        summary: expect.stringContaining('> 24h uncontacted'),
      }),
    );

    // Verify notification was sent to assigned rep
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: leadCopy.assignedToId,
        leadId: leadCopy.id,
        subject: expect.stringContaining('Overdue'),
      }),
    );
  });

  it('should skip notification if lead has no assigned rep', async () => {
    const unassignedLead = { ...mockOverdueLead, assignedToId: null };
    mockLeadsRepo.find.mockResolvedValue([unassignedLead]);

    const result = await processor.process({ name: 'check-overdue-leads', id: '3' } as any);

    expect(result.flagged).toBe(1);
    expect(unassignedLead.isOverdue).toBe(true);
    expect(mockActivityService.log).toHaveBeenCalled();
    expect(mockNotificationsService.create).not.toHaveBeenCalled();
  });
});

