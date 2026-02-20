export type ApifyWebsiteResult = {
  emails: string[];
  phones: string[];
  socialLinks: {
    facebook: string | null;
    instagram: string | null;
  };
};
