export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  city: string;
  country: string;
  role: string;
  hearAboutUs: string;
  primaryInstrument: string[];
  secondaryInstruments: string[];
  experience: string;
  bio: string;
  youtubeChannel: string;
  agreeTerms: boolean;
}

export interface Instrument {
  id: string;
  name: string;
  icon: any;
}