import 'server-only';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export const LeadStages = ['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
export type LeadStage = (typeof LeadStages)[number];

export interface Lead extends Entity {
  company: string;
  contact: string;
  email: string;
  industry: string;
  website?: string;
  source: string;
  stage: LeadStage;
  valueMinor: number;
  ownerId: string;
  nextStep: string;
  nextStepAt?: string;
  createdAt: string;
  convertedClientId?: string;
}

const rupees = (value: number): number => value * 100;

export const leadsRepository = createRepository<Lead>('leads', () => [
  { id: 'l1', company: 'Spice Route Kitchens', contact: 'Imran Qureshi', email: 'imran@spiceroute.in', industry: 'Restaurants', source: 'Referral', stage: 'NEW', valueMinor: rupees(90000), ownerId: 'm-aarav', nextStep: 'Intro call', nextStepAt: daysFromNow(1, 11), createdAt: daysFromNow(-1) },
  { id: 'l2', company: 'PeakPhysio Clinics', contact: 'Dr. Leena Rao', email: 'leena@peakphysio.com', industry: 'Healthcare', source: 'Website', stage: 'NEW', valueMinor: rupees(75000), ownerId: 'm-priya', nextStep: 'Qualify budget', nextStepAt: daysFromNow(2, 15), createdAt: daysFromNow(-2) },
  { id: 'l3', company: 'Zenith EV', contact: 'Kunal Bhatia', email: 'kunal@zenithev.co', industry: 'Automotive', source: 'LinkedIn', stage: 'CONTACTED', valueMinor: rupees(220000), ownerId: 'm-aarav', nextStep: 'Send case studies', nextStepAt: daysFromNow(0, 17), createdAt: daysFromNow(-6) },
  { id: 'l4', company: 'Bloom Florals', contact: 'Ishita Jain', email: 'ishita@bloomflorals.in', industry: 'Retail', source: 'Instagram DM', stage: 'CONTACTED', valueMinor: rupees(45000), ownerId: 'm-priya', nextStep: 'Follow up', nextStepAt: daysFromNow(3, 12), createdAt: daysFromNow(-4) },
  { id: 'l5', company: 'Finwise Capital', contact: 'Rohit Menon', email: 'rohit@finwise.io', industry: 'Fintech', source: 'Event', stage: 'PROPOSAL', valueMinor: rupees(320000), ownerId: 'm-aarav', nextStep: 'Proposal review call', nextStepAt: daysFromNow(2, 16), createdAt: daysFromNow(-12) },
  { id: 'l6', company: 'Trailhead Outdoors', contact: 'Sneha Pillai', email: 'sneha@trailhead.in', industry: 'Retail', source: 'Referral', stage: 'PROPOSAL', valueMinor: rupees(130000), ownerId: 'm-priya', nextStep: 'Revise scope', nextStepAt: daysFromNow(1, 14), createdAt: daysFromNow(-9) },
  { id: 'l7', company: 'Kalpa Wellness', contact: 'Dr. Aditi Rao', email: 'aditi@kalpa.health', industry: 'Wellness', source: 'Website', stage: 'NEGOTIATION', valueMinor: rupees(180000), ownerId: 'm-aarav', nextStep: 'Contract signature', nextStepAt: daysFromNow(4, 11), createdAt: daysFromNow(-18) },
  { id: 'l8', company: 'Sundar Jewellers', contact: 'Meenal Sundar', email: 'meenal@sundarjewels.in', industry: 'Luxury', source: 'Referral', stage: 'WON', valueMinor: rupees(160000), ownerId: 'm-aarav', nextStep: 'Kickoff', createdAt: daysFromNow(-30) },
  { id: 'l9', company: 'QuickMart Express', contact: 'Harsh Vora', email: 'harsh@quickmart.in', industry: 'Retail', source: 'Cold email', stage: 'LOST', valueMinor: rupees(60000), ownerId: 'm-priya', nextStep: 'Revisit next quarter', createdAt: daysFromNow(-25) },
]);
