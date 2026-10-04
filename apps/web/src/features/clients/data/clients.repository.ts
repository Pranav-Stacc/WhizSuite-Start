import 'server-only';
import type { ClientStatus, Platform } from '@agency-os/contracts';
import { clientsLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export interface BrandKit {
  primary: string;
  secondary: string;
  accent: string;
  voice: string;
  hashtags: string[];
  pillars: string[];
}

export interface Client extends Entity {
  name: string;
  industry: string;
  website: string;
  tier: string;
  status: ClientStatus;
  color: string;
  contactName: string;
  contactEmail: string;
  health: number;
  retainerMinor: number;
  platforms: Platform[];
  since: string;
  ownerId: string;
  brand: BrandKit;
}

const rupees = (value: number): number => value * 100;

export const clientsRepository = createRepository<Client>('clients', () => [
  {
    id: 'cl-lumen',
    name: 'Lumen Coffee Co.',
    industry: 'Food & Beverage',
    website: 'lumencoffee.com',
    tier: 'Growth',
    status: 'ACTIVE',
    color: '#F59E0B',
    contactName: 'Neha Kapoor',
    contactEmail: 'neha@lumencoffee.com',
    health: 92,
    retainerMinor: rupees(85000),
    platforms: ['instagram', 'facebook', 'tiktok'],
    since: daysFromNow(-420),
    ownerId: 'm-priya',
    brand: { primary: '#F59E0B', secondary: '#78350F', accent: '#FDE68A', voice: 'Warm, playful, a little nerdy about beans.', hashtags: ['#LumenMornings', '#BrewBetter'], pillars: ['Origin stories', 'Barista tips', 'Community'] },
  },
  {
    id: 'cl-orbit',
    name: 'Orbit Fitness',
    industry: 'Health & Fitness',
    website: 'orbitfit.in',
    tier: 'Scale',
    status: 'ACTIVE',
    color: '#38BDF8',
    contactName: 'Vikram Rao',
    contactEmail: 'vikram@orbitfit.in',
    health: 78,
    retainerMinor: rupees(120000),
    platforms: ['instagram', 'youtube', 'tiktok'],
    since: daysFromNow(-300),
    ownerId: 'm-priya',
    brand: { primary: '#38BDF8', secondary: '#0C4A6E', accent: '#E0F2FE', voice: 'Motivating, direct, zero fluff.', hashtags: ['#OrbitStrong', '#MoveDaily'], pillars: ['Workouts', 'Transformations', 'Nutrition'] },
  },
  {
    id: 'cl-verde',
    name: 'Verde Skincare',
    industry: 'Beauty',
    website: 'verdeskin.com',
    tier: 'Growth',
    status: 'ACTIVE',
    color: '#34D399',
    contactName: 'Ananya Sen',
    contactEmail: 'ananya@verdeskin.com',
    health: 64,
    retainerMinor: rupees(95000),
    platforms: ['instagram', 'facebook', 'youtube'],
    since: daysFromNow(-210),
    ownerId: 'm-aarav',
    brand: { primary: '#34D399', secondary: '#064E3B', accent: '#D1FAE5', voice: 'Calm, science-backed, reassuring.', hashtags: ['#VerdeGlow', '#CleanSkin'], pillars: ['Ingredients', 'Routines', 'Dermatologist Q&A'] },
  },
  {
    id: 'cl-nimbus',
    name: 'Nimbus Cloud',
    industry: 'B2B SaaS',
    website: 'nimbus.cloud',
    tier: 'Scale',
    status: 'ACTIVE',
    color: '#A78BFA',
    contactName: 'Rahul Verma',
    contactEmail: 'rahul@nimbus.cloud',
    health: 88,
    retainerMinor: rupees(150000),
    platforms: ['linkedin', 'x', 'youtube'],
    since: daysFromNow(-540),
    ownerId: 'm-aarav',
    brand: { primary: '#A78BFA', secondary: '#312E81', accent: '#EDE9FE', voice: 'Confident, technical, concise.', hashtags: ['#NimbusDev', '#CloudNative'], pillars: ['Product updates', 'Engineering', 'Customer wins'] },
  },
  {
    id: 'cl-urban',
    name: 'Urban Threads',
    industry: 'Fashion',
    website: 'urbanthreads.co',
    tier: 'Starter',
    status: 'ONBOARDING',
    color: '#FB7185',
    contactName: 'Tara Malhotra',
    contactEmail: 'tara@urbanthreads.co',
    health: 70,
    retainerMinor: rupees(60000),
    platforms: ['instagram', 'tiktok'],
    since: daysFromNow(-12),
    ownerId: 'm-priya',
    brand: { primary: '#FB7185', secondary: '#4C0519', accent: '#FFE4E6', voice: 'Bold, streetwise, trend-first.', hashtags: ['#UrbanThreads', '#StreetEdit'], pillars: ['Lookbooks', 'Drops', 'Creators'] },
  },
  {
    id: 'cl-atlas',
    name: 'Atlas Realty',
    industry: 'Real Estate',
    website: 'atlasrealty.in',
    tier: 'Growth',
    status: 'PAUSED',
    color: '#60A5FA',
    contactName: 'Dev Patel',
    contactEmail: 'dev@atlasrealty.in',
    health: 41,
    retainerMinor: rupees(70000),
    platforms: ['facebook', 'linkedin', 'youtube'],
    since: daysFromNow(-700),
    ownerId: 'm-aarav',
    brand: { primary: '#60A5FA', secondary: '#1E3A8A', accent: '#DBEAFE', voice: 'Trustworthy, premium, informative.', hashtags: ['#AtlasHomes'], pillars: ['Listings', 'Market insights', 'Testimonials'] },
  },
], clientsLive);
