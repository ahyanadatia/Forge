// Shared types for Foundr MVP

// User type
export type User = {
  id: number;
  email: string;
  name: string;
  university?: string;
  graduationYear?: number;
  githubId: string;
  githubUsername: string;
  technicalCredibilityScore: number;
  executionScore: number;
  reliabilityScore: number;
  compositeScore: number;
  executionVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

// Sprint type
export type Sprint = {
  id: number;
  userId: number;
  type: string;
  status: 'pending' | 'in-progress' | 'completed';
  startDate: string;
  endDate: string;
  submissionUrl?: string;
  submissionRepo?: string;
  score?: number;
  verifiedBy?: number;
  createdAt: string;
};

// Team type
export type Team = {
  id: number;
  type: 'hackathon' | 'startup';
  members: number[];
  eventId?: number;
  status: 'forming' | 'active' | 'completed';
  createdAt: string;
};

// Feedback type
export type Feedback = {
  id: number;
  fromUserId: number;
  toUserId: number;
  teamId: number;
  reliability: number;
  communication: number;
  contribution: number;
  privateNotes?: string;
  createdAt: string;
};
