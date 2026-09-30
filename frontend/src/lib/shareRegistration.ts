export function registrationShareMessage(title: string, url: string): string {
  return `${title}\n${url}`;
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function telegramShareUrl(url: string, title: string): string {
  const params = new URLSearchParams({ url, text: title });
  return `https://t.me/share/url?${params.toString()}`;
}
