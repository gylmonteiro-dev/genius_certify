export const DEFAULT_EVENT_COVER = '/capa-evento-padrao.svg';
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
const EXTENSIONS_BY_TYPE: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};

export type CoverFileError = 'type' | 'size';

export function resolveCoverSrc(url: string | null | undefined, failed: boolean): string {
  if (failed || !url) return DEFAULT_EVENT_COVER;
  return url;
}

export function coverObjectPosition(
  x: number | null | undefined,
  y: number | null | undefined,
): string {
  return `${focusPercent(x)}% ${focusPercent(y)}%`;
}

export function validateCoverFile(file: Pick<File, 'name' | 'type' | 'size'>): CoverFileError | null {
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
  if (!ALLOWED_EXT.has(extension) || file.size <= 0) return 'type';
  if (file.type && !ALLOWED_TYPES.has(file.type)) return 'type';
  if (file.type && !EXTENSIONS_BY_TYPE[file.type]?.includes(extension)) return 'type';
  if (file.size > COVER_MAX_BYTES) return 'size';
  return null;
}

export function shouldUploadCover(file: File | null): boolean {
  return file != null;
}

export function shouldRemoveCover(
  file: File | null,
  removeRequested: boolean,
  hasExisting: boolean,
): boolean {
  return file == null && removeRequested && hasExisting;
}

export async function applyCoverAfterSave<T extends { id: string }>(args: {
  saved: T;
  file: File | null;
  removeRequested: boolean;
  hasExisting: boolean;
  upload: (id: string, file: File) => Promise<T>;
  removeCover: (id: string) => Promise<T>;
}): Promise<{ curso: T; coverFailed: boolean }> {
  try {
    if (args.file) {
      return { curso: await args.upload(args.saved.id, args.file), coverFailed: false };
    }
    if (shouldRemoveCover(args.file, args.removeRequested, args.hasExisting)) {
      return { curso: await args.removeCover(args.saved.id), coverFailed: false };
    }
    return { curso: args.saved, coverFailed: false };
  } catch {
    return { curso: args.saved, coverFailed: true };
  }
}

function focusPercent(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 50;
  return Math.min(100, Math.max(0, value * 100));
}
