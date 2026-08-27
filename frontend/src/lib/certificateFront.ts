export function frentePreset(templateId?: string | null): { titulo: string; atestacao: string } {
  if (templateId === 'excelencia') {
    return {
      titulo: 'Certificado de Excelência',
      atestacao: 'Concluiu com sucesso',
    };
  }
  return {
    titulo: 'Certificado de conclusão',
    atestacao: 'concluiu com êxito o curso',
  };
}
