import {
  PiggyBank,
  Briefcase,
  Wallet,
  GraduationCap,
  Sprout,
  Home,
  Car,
  Coins,
  Building2,
  Repeat,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

/** Single shared product-icon mapping consumed by Header mega menus and catalogue pages. */
export const ACCOUNT_ICONS = {
  'everyday-savings': PiggyBank,
  'trade-current': Briefcase,
  'payroll-salary': Wallet,
  'campus-student': GraduationCap,
  'sprout-minor': Sprout,
};

export const LOAN_ICONS = {
  'home-loan': Home,
  'business-loan': Briefcase,
  'agriculture-loan': Sprout,
  'vehicle-loan': Car,
  'gold-loan': Coins,
  'loan-against-property': Building2,
  'education-loan': GraduationCap,
};

export const INVESTMENT_ICONS = {
  'fixed-deposit': PiggyBank,
  'recurring-deposit': Repeat,
  'systematic-investment-plan': TrendingUp,
  'sukanya-samriddhi': ShieldCheck,
};
