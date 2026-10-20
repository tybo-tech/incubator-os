const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocalApi = hostname === 'localhost' || hostname === '127.0.0.1';

export const Constants = {
  Currency: 'ZAR', // Fixed: Use proper ISO currency code for South African Rand
  LocalUser: 'currentUser',
  // Production API: https://app.rbttacesd.co.za/api/
  // Alternate production API: https://incubatoros.tybo.co.za/api/
  ApiBase: isLocalApi
    ? 'http://localhost:8080/'
    : 'https://app.rbttacesd.co.za/api/',

  // This is for admins, advisors, and any user that needs to see all companies.
  // It should not be used for regular users.
  MainCompanyId: 99,

  Images: {
    South32Logo: 'https://api.rbttacesd.co.za/image-library/south32-logo.png',
    Yes: 'https://api.rbttacesd.co.za/image-library/yes.png',
    No: 'https://api.rbttacesd.co.za/image-library/no.png',
  },
};
