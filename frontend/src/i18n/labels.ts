import { CatalogoEventoItem, catalogLabel } from '../lib/catalogoEventos';
import { formatDateBr } from '../lib/dateBr';
import { Certificate, EventItem, Institution, Participant } from '../types';
import type { TranslateFn } from './locale';

const CATEGORY_I18N: Record<string, string> = {
  technology: 'eventMeta.category.technology',
  business: 'eventMeta.category.business',
  design: 'eventMeta.category.design',
  data_science: 'eventMeta.category.dataScience',
};

const TYPE_I18N: Record<string, string> = {
  workshop: 'eventMeta.type.workshop',
  seminar: 'eventMeta.type.seminar',
  exam_prep: 'eventMeta.type.examPrep',
  summit: 'eventMeta.type.summit',
  conference: 'eventMeta.type.conference',
};

const MODALITY_I18N: Record<string, string> = {
  online: 'eventMeta.modality.online',
  presencial: 'eventMeta.modality.inPerson',
};

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
    case 'Cancelled':
      return t('status.event.cancelled');
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

export function labelStudentStatus(t: TranslateFn, status: Participant['status']): string {
  switch (status) {
    case 'Verified':
      return t('status.student.verified');
    case 'Pending':
      return t('status.student.pending');
    case 'Rejected':
      return t('status.student.rejected');
    default:
      return status;
  }
}

export function labelEventCategory(
  t: TranslateFn,
  category: string,
  catalog: CatalogoEventoItem[] = [],
  locale = 'pt-BR',
): string {
  if (catalog.some((item) => item.kind === 'categoria' && item.slug === category)) {
    return catalogLabel(catalog, 'categoria', category, locale);
  }
  const key = CATEGORY_I18N[category];
  return key ? t(key) : category;
}

export function labelEventType(
  t: TranslateFn,
  type: string,
  catalog: CatalogoEventoItem[] = [],
  locale = 'pt-BR',
): string {
  if (catalog.some((item) => item.kind === 'tipo' && item.slug === type)) {
    return catalogLabel(catalog, 'tipo', type, locale);
  }
  const key = TYPE_I18N[type];
  return key ? t(key) : type;
}

export function labelEventModality(
  t: TranslateFn,
  modality: string,
  catalog: CatalogoEventoItem[] = [],
  locale = 'pt-BR',
): string {
  if (catalog.some((item) => item.kind === 'modalidade' && item.slug === modality)) {
    return catalogLabel(catalog, 'modalidade', modality, locale);
  }
  const key = MODALITY_I18N[modality];
  return key ? t(key) : modality;
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

export function formatDisplayDate(isoDate: string, _dateLocale: string, fallback: string): string {
  return formatDateBr(isoDate) || fallback;
}
