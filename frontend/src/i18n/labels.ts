import { Certificate, EventItem, Institution, Student } from '../types';
import type { TranslateFn } from './locale';

export function labelInstitutionStatus(t: TranslateFn, status: Institution['status']): string {
  switch (status) {
    case 'Active':
      return t('status.institution.active');
    case 'Pending Review':
      return t('status.institution.pendingReview');
    case 'Suspended':
      return t('status.institution.suspended');
    default:
      return status;
  }
}

export function labelEventStatus(t: TranslateFn, status: EventItem['status']): string {
  switch (status) {
    case 'Upcoming':
      return t('status.event.upcoming');
    case 'Draft':
      return t('status.event.draft');
    case 'Completed':
      return t('status.event.completed');
    default:
      return status;
  }
}

export function labelCertificateStatus(t: TranslateFn, status: Certificate['status']): string {
  switch (status) {
    case 'Active':
      return t('status.certificate.active');
    case 'Expired':
      return t('status.certificate.expired');
    case 'Revoked':
      return t('status.certificate.revoked');
    default:
      return status;
  }
}

export function labelStudentStatus(t: TranslateFn, status: Student['status']): string {
  switch (status) {
    case 'Verified':
      return t('status.student.verified');
    case 'Pending':
      return t('status.student.pending');
    default:
      return status;
  }
}

export function labelEventCategory(t: TranslateFn, category: EventItem['category']): string {
  switch (category) {
    case 'Technology':
      return t('eventMeta.category.technology');
    case 'Business':
      return t('eventMeta.category.business');
    case 'Design':
      return t('eventMeta.category.design');
    case 'Data Science':
      return t('eventMeta.category.dataScience');
    default:
      return category;
  }
}

export function labelEventType(t: TranslateFn, type: EventItem['type']): string {
  switch (type) {
    case 'Workshop':
      return t('eventMeta.type.workshop');
    case 'Seminar':
      return t('eventMeta.type.seminar');
    case 'Exam Prep':
      return t('eventMeta.type.examPrep');
    case 'Summit':
      return t('eventMeta.type.summit');
    case 'Conference':
      return t('eventMeta.type.conference');
    default:
      return type;
  }
}

export function labelEventModality(t: TranslateFn, modality: EventItem['modality']): string {
  switch (modality) {
    case 'Online':
      return t('eventMeta.modality.online');
    case 'In-Person':
      return t('eventMeta.modality.inPerson');
    default:
      return modality;
  }
}

export function labelRole(t: TranslateFn, role: string): string {
  if (role === 'super_admin') return t('role.superAdmin');
  if (role === 'instituicao_admin') return t('role.institutionAdmin');
  return t('role.administrator');
}

export function formatMonthLabel(isoDate: string, dateLocale: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(dateLocale, { month: 'long' }).toUpperCase();
}

export function formatDisplayDate(isoDate: string, dateLocale: string, fallback: string): string {
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return dateObj.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return fallback;
}
