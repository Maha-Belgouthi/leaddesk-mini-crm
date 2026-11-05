import * as bcrypt from 'bcrypt';
import AppDataSource from '../data-source.js';
import { Client } from '../../modules/clients/entities/client.entity.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { Lead } from '../../modules/leads/entities/lead.entity.js';
import { Note } from '../../modules/notes/entities/note.entity.js';
import { ActivityLog } from '../../modules/activity/entities/activity-log.entity.js';
import { Notification } from '../../modules/notifications/entities/notification.entity.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { LeadStatus } from '../../common/enums/lead-status.enum.js';
import { LeadSource } from '../../common/enums/lead-source.enum.js';
import { LeadService } from '../../common/enums/lead-service.enum.js';
import { ActivityAction } from '../../common/enums/activity-action.enum.js';
import { ScoringService } from '../../modules/leads/scoring.service.js';

export async function runSeed(): Promise<void> {
  console.log('--- Starting LeadDesk Mini-CRM Database Seeder ---');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const clientRepo = AppDataSource.getRepository(Client);
  const userRepo = AppDataSource.getRepository(User);
  const leadRepo = AppDataSource.getRepository(Lead);
  const noteRepo = AppDataSource.getRepository(Note);
  const activityRepo = AppDataSource.getRepository(ActivityLog);
  const notificationRepo = AppDataSource.getRepository(Notification);

  const scoringService = new ScoringService();

  // 1. Idempotency Check
  const existingClient = await clientRepo.findOneBy({ slug: 'apex-dental' });
  if (existingClient) {
    console.log('Seeded data already exists. Cleaning up existing leads and notes to re-seed cleanly...');
    await notificationRepo.delete({});
    await activityRepo.delete({});
    await noteRepo.delete({});
    await leadRepo.delete({});
    await userRepo.delete({});
    await clientRepo.delete({});
  }

  // 2. Seed 3 Diverse Clients
  console.log('Seeding 3 Business Clients...');
  const apexClient = clientRepo.create({
    name: 'Apex Dental Care',
    slug: 'apex-dental',
    email: 'contact@apexdental.local',
    phone: '+91 98111 22233',
  });

  const horizonClient = clientRepo.create({
    name: 'Horizon Institute of Technology',
    slug: 'horizon-tech',
    email: 'admissions@horizontech.edu',
    phone: '+91 98222 33344',
  });

  const quickfixClient = clientRepo.create({
    name: 'QuickFix Automotive Services',
    slug: 'quickfix-auto',
    email: 'service@quickfixauto.local',
    phone: '+91 98333 44455',
  });

  const [savedApex, savedHorizon, savedQuickfix] = await clientRepo.save([
    apexClient,
    horizonClient,
    quickfixClient,
  ]);

  // 3. Seed 4 Key Users (Known credentials for evaluator testing)
  console.log('Seeding 4 Users with encrypted bcrypt passwords...');
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const salesPasswordHash = await bcrypt.hash('Sales@123456', 10);
  const clientPasswordHash = await bcrypt.hash('Client@123456', 10);

  const adminUser = userRepo.create({
    email: 'admin@leaddesk.local',
    passwordHash: adminPasswordHash,
    fullName: 'Super Administrator',
    role: UserRole.ADMIN,
    clientId: null,
    isActive: true,
  });

  const sales1User = userRepo.create({
    email: 'sales1@leaddesk.local',
    passwordHash: salesPasswordHash,
    fullName: 'Aarav Patel',
    role: UserRole.SALES_EXECUTIVE,
    clientId: savedApex.id,
    isActive: true,
  });

  const sales2User = userRepo.create({
    email: 'sales2@leaddesk.local',
    passwordHash: salesPasswordHash,
    fullName: 'Priya Sundaram',
    role: UserRole.SALES_EXECUTIVE,
    clientId: savedHorizon.id,
    isActive: true,
  });

  const clientUser = userRepo.create({
    email: 'client@apex.local',
    passwordHash: clientPasswordHash,
    fullName: 'Dr. Vikram Malhotra',
    role: UserRole.CLIENT,
    clientId: savedApex.id,
    isActive: true,
  });

  const [savedAdmin, savedSales1, savedSales2, savedClientUser] = await userRepo.save([
    adminUser,
    sales1User,
    sales2User,
    clientUser,
  ]);

  console.log(`Created users:
  - Admin: admin@leaddesk.local / Admin@123456
  - Sales Rep 1: sales1@leaddesk.local / Sales@123456 (Apex Dental)
  - Sales Rep 2: sales2@leaddesk.local / Sales@123456 (Horizon Tech)
  - Client: client@apex.local / Client@123456 (Apex Dental)`);

  // 4. Seed 50 Diverse Leads
  console.log('Seeding 50 diverse leads across pipeline stages and clients...');

  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;

  const leadRawData = [
    // --- APEX DENTAL CARE (Clinic) --- 22 Leads
    { name: 'Rohan Sharma', phone: '+91 98765 00001', service: LeadService.COMPREHENSIVE_CONSULTATION, budget: 85000, source: LeadSource.WEBSITE, status: LeadStatus.NEW, hoursAgo: 2, overdue: false, assigned: savedSales1 },
    { name: 'Ananya Deshmukh', phone: '+91 98765 00002', service: LeadService.REGULAR_TREATMENT, budget: 25000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.NEW, hoursAgo: 5, overdue: false, assigned: savedSales1 },
    { name: 'Suresh Menon', phone: '+91 98765 00003', service: LeadService.BASIC_CHECKUP, budget: 5000, source: LeadSource.FACEBOOK, status: LeadStatus.NEW, hoursAgo: 10, overdue: false, assigned: null },
    // Overdue NEW leads (>24h)
    { name: 'Kavita Pillai', phone: '+91 98765 00004', service: LeadService.COMPREHENSIVE_CONSULTATION, budget: 120000, source: LeadSource.REFERRAL, status: LeadStatus.NEW, hoursAgo: 36, overdue: true, assigned: savedSales1 },
    { name: 'Devendra Joshi', phone: '+91 98765 00005', service: LeadService.REGULAR_TREATMENT, budget: 35000, source: LeadSource.WEBSITE, status: LeadStatus.NEW, hoursAgo: 48, overdue: true, assigned: savedSales1 },
    // Contacted
    { name: 'Meera Iyer', phone: '+91 98765 00006', service: LeadService.COMPREHENSIVE_CONSULTATION, budget: 95000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.CONTACTED, hoursAgo: 20, contactLag: 0.5, overdue: false, assigned: savedSales1 },
    { name: 'Alok Mukherjee', phone: '+91 98765 00007', service: LeadService.REGULAR_TREATMENT, budget: 40000, source: LeadSource.FACEBOOK, status: LeadStatus.CONTACTED, hoursAgo: 26, contactLag: 2, overdue: false, assigned: savedSales1 },
    { name: 'Tanvi Saxena', phone: '+91 98765 00008', service: LeadService.BASIC_CHECKUP, budget: 8000, source: LeadSource.WEBSITE, status: LeadStatus.CONTACTED, hoursAgo: 15, contactLag: 1.5, overdue: false, assigned: savedSales1 },
    { name: 'Gautam Singhal', phone: '+91 98765 00009', service: LeadService.COMPREHENSIVE_CONSULTATION, budget: 150000, source: LeadSource.REFERRAL, status: LeadStatus.CONTACTED, hoursAgo: 40, contactLag: 6, overdue: false, assigned: savedSales1 },
    { name: 'Pooja Hegde', phone: '+91 98765 00010', service: LeadService.REGULAR_TREATMENT, budget: 30000, source: LeadSource.OTHER, status: LeadStatus.CONTACTED, hoursAgo: 30, contactLag: 28, overdue: false, assigned: savedSales1 },
    // Proposal Sent
    { name: 'Nikhil Mathur', phone: '+91 98765 00011', service: LeadService.COMPREHENSIVE_CONSULTATION, budget: 180000, source: LeadSource.REFERRAL, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 45, contactLag: 1, overdue: false, assigned: savedSales1 },
    { name: 'Sneha Kulkarni', phone: '+91 98765 00012', service: LeadService.REGULAR_TREATMENT, budget: 60000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 50, contactLag: 3, overdue: false, assigned: savedSales1 },
    { name: 'Abhinav Bhatnagar', phone: '+91 98765 00013', service: LeadService.COMPREHENSIVE_CONSULTATION, budget: 110000, source: LeadSource.WEBSITE, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 60, contactLag: 0.8, overdue: false, assigned: savedSales1 },
    { name: 'Divya Nair', phone: '+91 98765 00014', service: LeadService.REGULAR_TREATMENT, budget: 55000, source: LeadSource.FACEBOOK, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 72, contactLag: 4, overdue: false, assigned: savedSales1 },
    { name: 'Karan Mehra', phone: '+91 98765 00015', service: LeadService.COMPREHENSIVE_CONSULTATION, budget: 200000, source: LeadSource.REFERRAL, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 35, contactLag: 0.5, overdue: false, assigned: savedSales1 },
    // Won
    { name: 'Dr. Siddharth Sen', phone: '+91 98765 00016', service: LeadService.COMPREHENSIVE_CONSULTATION, budget: 220000, source: LeadSource.REFERRAL, status: LeadStatus.WON, hoursAgo: 90, contactLag: 0.5, overdue: false, assigned: savedSales1 },
    { name: 'Sunita Chawla', phone: '+91 98765 00017', service: LeadService.REGULAR_TREATMENT, budget: 65000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.WON, hoursAgo: 100, contactLag: 2, overdue: false, assigned: savedSales1 },
    { name: 'Harish Goel', phone: '+91 98765 00018', service: LeadService.COMPREHENSIVE_CONSULTATION, budget: 140000, source: LeadSource.WEBSITE, status: LeadStatus.WON, hoursAgo: 120, contactLag: 1, overdue: false, assigned: savedSales1 },
    // Lost
    { name: 'Pankaj Vohra', phone: '+91 98765 00019', service: LeadService.BASIC_CHECKUP, budget: 3000, source: LeadSource.FACEBOOK, status: LeadStatus.LOST, hoursAgo: 80, contactLag: 15, overdue: false, assigned: savedSales1 },
    { name: 'Richa Bhardwaj', phone: '+91 98765 00020', service: LeadService.REGULAR_TREATMENT, budget: 20000, source: LeadSource.OTHER, status: LeadStatus.LOST, hoursAgo: 110, contactLag: 5, overdue: false, assigned: savedSales1 },
    { name: 'Deepak Ahuja', phone: '+91 98765 00021', service: LeadService.COMPREHENSIVE_CONSULTATION, budget: 50000, source: LeadSource.WEBSITE, status: LeadStatus.NEW, hoursAgo: 8, overdue: false, assigned: savedSales1 },
    { name: 'Nandini Das', phone: '+91 98765 00022', service: LeadService.REGULAR_TREATMENT, budget: 45000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.CONTACTED, hoursAgo: 24, contactLag: 1, overdue: false, assigned: savedSales1 },

    // --- HORIZON INSTITUTE OF TECHNOLOGY (College) --- 18 Leads
    { name: 'Aryan Kapoor', phone: '+91 98765 00023', service: LeadService.FULL_DEGREE_COURSE, budget: 250000, source: LeadSource.WEBSITE, status: LeadStatus.NEW, hoursAgo: 3, overdue: false, assigned: savedSales2 },
    { name: 'Ishita Roy', phone: '+91 98765 00024', service: LeadService.CERTIFICATION_PROGRAM, budget: 45000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.NEW, hoursAgo: 6, overdue: false, assigned: savedSales2 },
    { name: 'Manish Tyagi', phone: '+91 98765 00025', service: LeadService.GENERAL_INQUIRY, budget: 10000, source: LeadSource.FACEBOOK, status: LeadStatus.NEW, hoursAgo: 12, overdue: false, assigned: null },
    // Overdue
    { name: 'Ritu Ganguly', phone: '+91 98765 00026', service: LeadService.FULL_DEGREE_COURSE, budget: 200000, source: LeadSource.REFERRAL, status: LeadStatus.NEW, hoursAgo: 40, overdue: true, assigned: savedSales2 },
    { name: 'Vikas Nambiar', phone: '+91 98765 00027', service: LeadService.CERTIFICATION_PROGRAM, budget: 50000, source: LeadSource.OTHER, status: LeadStatus.NEW, hoursAgo: 52, overdue: true, assigned: savedSales2 },
    // Contacted
    { name: 'Shruti Bajpai', phone: '+91 98765 00028', service: LeadService.FULL_DEGREE_COURSE, budget: 220000, source: LeadSource.WEBSITE, status: LeadStatus.CONTACTED, hoursAgo: 18, contactLag: 0.6, overdue: false, assigned: savedSales2 },
    { name: 'Rajeev Srivastava', phone: '+91 98765 00029', service: LeadService.CERTIFICATION_PROGRAM, budget: 60000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.CONTACTED, hoursAgo: 22, contactLag: 2, overdue: false, assigned: savedSales2 },
    { name: 'Varun Grover', phone: '+91 98765 00030', service: LeadService.GENERAL_INQUIRY, budget: 15000, source: LeadSource.FACEBOOK, status: LeadStatus.CONTACTED, hoursAgo: 28, contactLag: 3.5, overdue: false, assigned: savedSales2 },
    { name: 'Madhuri Dixit', phone: '+91 98765 00031', service: LeadService.FULL_DEGREE_COURSE, budget: 240000, source: LeadSource.REFERRAL, status: LeadStatus.CONTACTED, hoursAgo: 48, contactLag: 8, overdue: false, assigned: savedSales2 },
    // Proposal Sent
    { name: 'Aditya Chopra', phone: '+91 98765 00032', service: LeadService.FULL_DEGREE_COURSE, budget: 230000, source: LeadSource.REFERRAL, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 42, contactLag: 0.9, overdue: false, assigned: savedSales2 },
    { name: 'Kritika Kamra', phone: '+91 98765 00033', service: LeadService.CERTIFICATION_PROGRAM, budget: 70000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 55, contactLag: 1.8, overdue: false, assigned: savedSales2 },
    { name: 'Rohit Bal', phone: '+91 98765 00034', service: LeadService.FULL_DEGREE_COURSE, budget: 195000, source: LeadSource.WEBSITE, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 65, contactLag: 2.5, overdue: false, assigned: savedSales2 },
    { name: 'Simran Walia', phone: '+91 98765 00035', service: LeadService.CERTIFICATION_PROGRAM, budget: 80000, source: LeadSource.FACEBOOK, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 70, contactLag: 4, overdue: false, assigned: savedSales2 },
    // Won
    { name: 'Tarun Tahiliani', phone: '+91 98765 00036', service: LeadService.FULL_DEGREE_COURSE, budget: 260000, source: LeadSource.REFERRAL, status: LeadStatus.WON, hoursAgo: 85, contactLag: 0.7, overdue: false, assigned: savedSales2 },
    { name: 'Zoya Akhtar', phone: '+91 98765 00037', service: LeadService.CERTIFICATION_PROGRAM, budget: 90000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.WON, hoursAgo: 95, contactLag: 1.2, overdue: false, assigned: savedSales2 },
    // Lost
    { name: 'Farhan Zaidi', phone: '+91 98765 00038', service: LeadService.GENERAL_INQUIRY, budget: 5000, source: LeadSource.OTHER, status: LeadStatus.LOST, hoursAgo: 75, contactLag: 12, overdue: false, assigned: savedSales2 },
    { name: 'Monika Batra', phone: '+91 98765 00039', service: LeadService.FULL_DEGREE_COURSE, budget: 180000, source: LeadSource.FACEBOOK, status: LeadStatus.LOST, hoursAgo: 105, contactLag: 25, overdue: false, assigned: savedSales2 },
    { name: 'Arjun Rampal', phone: '+91 98765 00040', service: LeadService.CERTIFICATION_PROGRAM, budget: 55000, source: LeadSource.WEBSITE, status: LeadStatus.CONTACTED, hoursAgo: 16, contactLag: 1, overdue: false, assigned: savedSales2 },

    // --- QUICKFIX AUTOMOTIVE SERVICES (Local Shop) --- 10 Leads
    { name: 'Balwant Singh', phone: '+91 98765 00041', service: LeadService.ANNUAL_MAINTENANCE, budget: 120000, source: LeadSource.WEBSITE, status: LeadStatus.NEW, hoursAgo: 4, overdue: false, assigned: null },
    { name: 'Gurpreet Kaur', phone: '+91 98765 00042', service: LeadService.REPAIR_SERVICE, budget: 35000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.NEW, hoursAgo: 9, overdue: false, assigned: null },
    // Overdue
    { name: 'Jagdish Yadav', phone: '+91 98765 00043', service: LeadService.ANNUAL_MAINTENANCE, budget: 110000, source: LeadSource.REFERRAL, status: LeadStatus.NEW, hoursAgo: 38, overdue: true, assigned: null },
    // Contacted
    { name: 'Satish Chandra', phone: '+91 98765 00044', service: LeadService.REPAIR_SERVICE, budget: 40000, source: LeadSource.FACEBOOK, status: LeadStatus.CONTACTED, hoursAgo: 21, contactLag: 1.2, overdue: false, assigned: null },
    { name: 'Lalit Mohan', phone: '+91 98765 00045', service: LeadService.GENERAL_INQUIRY, budget: 8000, source: LeadSource.OTHER, status: LeadStatus.CONTACTED, hoursAgo: 25, contactLag: 3, overdue: false, assigned: null },
    { name: 'Ravinder Verma', phone: '+91 98765 00046', service: LeadService.ANNUAL_MAINTENANCE, budget: 130000, source: LeadSource.GOOGLE_ADS, status: LeadStatus.CONTACTED, hoursAgo: 32, contactLag: 0.8, overdue: false, assigned: null },
    // Proposal Sent
    { name: 'Om Prakash', phone: '+91 98765 00047', service: LeadService.ANNUAL_MAINTENANCE, budget: 145000, source: LeadSource.REFERRAL, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 46, contactLag: 0.5, overdue: false, assigned: null },
    { name: 'Birender Malik', phone: '+91 98765 00048', service: LeadService.REPAIR_SERVICE, budget: 50000, source: LeadSource.WEBSITE, status: LeadStatus.PROPOSAL_SENT, hoursAgo: 58, contactLag: 2, overdue: false, assigned: null },
    // Won
    { name: 'Kuldeep Gill', phone: '+91 98765 00049', service: LeadService.ANNUAL_MAINTENANCE, budget: 160000, source: LeadSource.REFERRAL, status: LeadStatus.WON, hoursAgo: 88, contactLag: 0.6, overdue: false, assigned: null },
    // Lost
    { name: 'Pradeep Pandey', phone: '+91 98765 00050', service: LeadService.REPAIR_SERVICE, budget: 15000, source: LeadSource.FACEBOOK, status: LeadStatus.LOST, hoursAgo: 92, contactLag: 18, overdue: false, assigned: null },
  ];

  const clientMap = (index: number) => {
    if (index < 22) return savedApex;
    if (index < 40) return savedHorizon;
    return savedQuickfix;
  };

  const createdLeads: Lead[] = [];

  for (let i = 0; i < leadRawData.length; i++) {
    const raw = leadRawData[i];
    const client = clientMap(i);
    const createdAt = new Date(now - raw.hoursAgo * ONE_HOUR);

    const firstContactedAt =
      raw.contactLag !== undefined
        ? new Date(createdAt.getTime() + raw.contactLag * ONE_HOUR)
        : null;

    const { score, breakdown } = scoringService.calculateScore({
      status: raw.status,
      source: raw.source,
      serviceNeeded: raw.service,
      budget: raw.budget,
      createdAt,
      firstContactedAt,
    });

    const lead = leadRepo.create({
      clientId: client.id,
      name: raw.name,
      phone: raw.phone,
      email: `${raw.name.toLowerCase().replace(/[^a-z]/g, '.')}@example.com`,
      serviceNeeded: raw.service,
      budget: raw.budget,
      message: `Prospective inquiry for ${raw.service} with budget ₹${raw.budget.toLocaleString('en-IN')}`,
      source: raw.source,
      status: raw.status,
      score,
      scoreBreakdown: breakdown,
      assignedToId: raw.assigned ? raw.assigned.id : null,
      isOverdue: raw.overdue,
      firstContactedAt,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + 10 * 60 * 1000),
    });

    createdLeads.push(lead);
  }

  const savedLeads = await leadRepo.save(createdLeads);
  console.log(`Saved ${savedLeads.length} diverse leads with calculated rule-based scores.`);

  // 5. Seed Activity Logs, Notes, and Notifications for selected leads
  console.log('Seeding activity logs, notes, and notifications...');

  for (let i = 0; i < savedLeads.length; i++) {
    const lead = savedLeads[i];
    const author = lead.assignedToId === savedSales1.id ? savedSales1 : savedSales2;

    // Activity: Initial Lead Creation
    await activityRepo.save(
      activityRepo.create({
        leadId: lead.id,
        performedById: null,
        action: ActivityAction.STATUS_CHANGE,
        newValue: { status: LeadStatus.NEW, score: lead.score },
        summary: `Lead created via public inquiry form (${lead.source})`,
        createdAt: lead.createdAt,
      }),
    );

    // Overdue Flag activity
    if (lead.isOverdue) {
      await activityRepo.save(
        activityRepo.create({
          leadId: lead.id,
          performedById: null,
          action: ActivityAction.FLAGGED_OVERDUE,
          summary: 'Lead automatically flagged as overdue (> 24h uncontacted in NEW status)',
          createdAt: new Date(lead.createdAt.getTime() + 24.5 * ONE_HOUR),
        }),
      );
    }

    // Contacted notes and activities
    if (lead.status !== LeadStatus.NEW && lead.firstContactedAt) {
      await activityRepo.save(
        activityRepo.create({
          leadId: lead.id,
          performedById: author.id,
          action: ActivityAction.STATUS_CHANGE,
          oldValue: { status: LeadStatus.NEW },
          newValue: { status: LeadStatus.CONTACTED },
          summary: 'Status updated from NEW to CONTACTED',
          createdAt: lead.firstContactedAt,
        }),
      );

      // Public Note
      await noteRepo.save(
        noteRepo.create({
          leadId: lead.id,
          authorId: author.id,
          content: `Initial phone consultation completed. Client interested in ${lead.serviceNeeded}.`,
          isInternal: false,
          createdAt: new Date(lead.firstContactedAt.getTime() + 15 * 60 * 1000),
        }),
      );

      // Internal Note (confidential / margin discussion)
      await noteRepo.save(
        noteRepo.create({
          leadId: lead.id,
          authorId: author.id,
          content: `Internal note: Customer requested flexible installment plan on budget ₹${lead.budget}. Target 15% margin minimum.`,
          isInternal: true,
          createdAt: new Date(lead.firstContactedAt.getTime() + 20 * 60 * 1000),
        }),
      );
    }

    // Notification for assigned reps on high-value leads
    if (lead.assignedToId && lead.budget >= 100000) {
      await notificationRepo.save(
        notificationRepo.create({
          recipientId: lead.assignedToId,
          leadId: lead.id,
          subject: '🔥 High-Value Lead Assigned',
          body: `High-value lead "${lead.name}" for ${lead.serviceNeeded} (Budget: ₹${lead.budget.toLocaleString('en-IN')}, Score: ${lead.score})`,
          isRead: lead.status === LeadStatus.WON,
          createdAt: lead.createdAt,
        }),
      );
    }
  }

  console.log('--- Database Seeding Completed Successfully! ---');
}

// Direct execution when invoked via CLI runner
if (process.argv[1]?.includes('seed.ts')) {
  runSeed()
    .then(async () => {
      await AppDataSource.destroy();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Seeding failed with error:', error);
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(1);
    });
}

