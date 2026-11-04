import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotesService } from './notes.service.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { ActivityAction } from '../../common/enums/activity-action.enum.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

describe('NotesService', () => {
  let notesService: NotesService;
  let mockNotesRepo: any;
  let mockActivityService: any;

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-uuid-1',
    email: 'admin@leaddesk.local',
    fullName: 'Admin User',
    role: UserRole.ADMIN,
    clientId: null,
  };

  const mockSalesUser: AuthenticatedUser = {
    id: 'sales-uuid-1',
    email: 'sales@leaddesk.local',
    fullName: 'Sales Rep',
    role: UserRole.SALES_EXECUTIVE,
    clientId: 'client-1',
  };

  const mockClientUser: AuthenticatedUser = {
    id: 'client-uuid-1',
    email: 'client@clinic.local',
    fullName: 'Client Rep',
    role: UserRole.CLIENT,
    clientId: 'client-1',
  };

  beforeEach(() => {
    mockNotesRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((dto) => ({ ...dto, id: 'note-uuid-1' })),
      save: vi.fn().mockImplementation((note) => Promise.resolve(note)),
    };

    mockActivityService = {
      log: vi.fn().mockResolvedValue({}),
    };

    notesService = new NotesService(mockNotesRepo, mockActivityService);
  });

  describe('findByLeadScoped (Privacy Filter)', () => {
    it('should query with isInternal: false when requested by CLIENT user', async () => {
      await notesService.findByLeadScoped('lead-1', mockClientUser);

      expect(mockNotesRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { leadId: 'lead-1', isInternal: false },
        }),
      );
    });

    it('should query all notes without isInternal filter when requested by SALES_EXECUTIVE', async () => {
      await notesService.findByLeadScoped('lead-1', mockSalesUser);

      expect(mockNotesRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { leadId: 'lead-1' },
        }),
      );
    });

    it('should query all notes without isInternal filter when requested by ADMIN', async () => {
      await notesService.findByLeadScoped('lead-1', mockAdminUser);

      expect(mockNotesRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { leadId: 'lead-1' },
        }),
      );
    });
  });

  describe('createScoped (Internal Privacy in Activity Log)', () => {
    it('should log generic "Internal note added" in activity log when note is internal', async () => {
      const secretContent = 'Confidential client margin review: budget is flexible';

      await notesService.createScoped(
        'lead-1',
        { content: secretContent, isInternal: true },
        mockSalesUser,
      );

      expect(mockActivityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          action: ActivityAction.NOTE_ADDED,
          summary: 'Internal note added',
        }),
      );

      // Verify the confidential text was NOT exposed in the activity log summary
      const logCall = mockActivityService.log.mock.calls[0][0];
      expect(logCall.summary).not.toContain(secretContent);
    });

    it('should log note snippet in activity log when note is public', async () => {
      const publicContent = 'Called the prospect, agreed to meet next Monday at 10 AM';

      await notesService.createScoped(
        'lead-1',
        { content: publicContent, isInternal: false },
        mockSalesUser,
      );

      expect(mockActivityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          action: ActivityAction.NOTE_ADDED,
          summary: expect.stringContaining('Called the prospect'),
        }),
      );
    });

    it('should force isInternal: false when created by CLIENT user', async () => {
      const savedNote = await notesService.createScoped(
        'lead-1',
        { content: 'Client inquiry question', isInternal: true },
        mockClientUser,
      );

      expect(savedNote.isInternal).toBe(false);
    });
  });
});

