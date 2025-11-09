import mongoose, { Document, Schema } from 'mongoose';

// Job interface
export interface IJob extends Document {
  // Basic Info
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  
  // Job Details
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'TEMPORARY';
  experienceLevel: 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD' | 'EXECUTIVE';
  remote: boolean;
  
  // Salary
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  
  // Visa Information
  visaSponsorship: {
    h1b: boolean;
    opt: boolean;
    stemOpt: boolean;
  };
  
  // Source Information
  source: 'USAJOBS' | 'REMOTEOK' | 'ARBEITNOW' | 'CAREERJET' | 'JOOBLE' | 'UNIVERSITY' | 'HANDSHAKE' | 'HANDSHAKE-MOCK' | 'LINKEDIN' | 'LINKEDIN-MOCK' | 'MANUAL';
  sourceJobId: string;
  sourceUrl: string;

  // University-specific (if applicable)
  isUniversityJob: boolean;
  universityName?: string;
  isCampusExclusive?: boolean;
  
  // Metadata
  postedDate: Date;
  expiryDate?: Date;
  companyLogo?: string;
  companyWebsite?: string;
  applicationUrl: string;
  
  // AI-generated insights
  skillsRequired: string[];
  industryTags: string[];
  
  // Engagement metrics
  views: number;
  applications: number;
  
  // Status
  isActive: boolean;
  isFeatured: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastRefreshed: Date;
}

// Job schema
const JobSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: [String],
    responsibilities: [String],
    
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY'],
      required: true,
    },
    experienceLevel: {
      type: String,
      enum: ['ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'],
      default: 'MID',
    },
    remote: {
      type: Boolean,
      default: false,
    },
    
    // Salary
    salaryMin: Number,
    salaryMax: Number,
    salaryCurrency: {
      type: String,
      default: 'USD',
    },
    
    // Visa
    visaSponsorship: {
      h1b: {
        type: Boolean,
        default: false,
      },
      opt: {
        type: Boolean,
        default: false,
      },
      stemOpt: {
        type: Boolean,
        default: false,
      },
    },
    
    // Source
    source: {
      type: String,
      enum: ['USAJOBS', 'REMOTEOK', 'ARBEITNOW', 'CAREERJET', 'JOOBLE', 'UNIVERSITY', 'HANDSHAKE', 'HANDSHAKE-MOCK', 'LINKEDIN', 'LINKEDIN-MOCK', 'MANUAL'],
      required: true,
    },
    sourceJobId: {
      type: String,
      required: true,
      index: true,
    },
    sourceUrl: {
      type: String,
      required: true,
    },

    // University
    isUniversityJob: {
      type: Boolean,
      default: false,
    },
    universityName: String,
    isCampusExclusive: {
      type: Boolean,
      default: false,
    },
    
    // Metadata
    postedDate: {
      type: Date,
      required: true,
      index: true,
    },
    expiryDate: Date,
    companyLogo: String,
    companyWebsite: String,
    applicationUrl: {
      type: String,
      required: true,
    },
    
    // AI insights
    skillsRequired: [String],
    industryTags: [String],
    
    // Metrics
    views: {
      type: Number,
      default: 0,
    },
    applications: {
      type: Number,
      default: 0,
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    
    lastRefreshed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
JobSchema.index({ source: 1, sourceJobId: 1 }, { unique: true });
JobSchema.index({ isActive: 1, postedDate: -1 });
JobSchema.index({ 'visaSponsorship.h1b': 1, isActive: 1 });
JobSchema.index({ 'visaSponsorship.opt': 1, isActive: 1 });
JobSchema.index({ isUniversityJob: 1, isActive: 1 });
JobSchema.index({ title: 'text', description: 'text', company: 'text' });

// Method to increment view count
JobSchema.methods.incrementViews = async function (): Promise<void> {
  this.views += 1;
  await this.save();
};

// Method to increment application count
JobSchema.methods.incrementApplications = async function (): Promise<void> {
  this.applications += 1;
  await this.save();
};

export default mongoose.model<IJob>('Job', JobSchema);