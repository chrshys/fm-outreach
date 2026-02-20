export type SonarEnrichResult = {
  contactEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  website: string | null;
  socialLinks: {
    facebook: string | null;
    instagram: string | null;
  };
  products: string[];
  structuredProducts: Array<{ name: string; category: string }>;
  salesChannels: string[];
  sellsOnline: boolean;
  businessDescription: string;
  structuredDescription: {
    summary: string;
    specialties: string[];
    certifications: string[];
  };
  locationDescription: string;
  imagePrompt: string;
  citations: string[];
};
