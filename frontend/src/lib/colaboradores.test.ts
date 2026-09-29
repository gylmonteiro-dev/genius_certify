import { describe, expect, it } from 'vitest';
import {
  collaboratorsFromApi,
  collaboratorsOnCertificateBack,
  moveCollaborator,
  validateCollaborators,
} from './colaboradores';

const t = (path: string) => path;

describe('colaboradores do evento', () => {
  it('mantém o texto legado inteiro quando a API ainda não tem a coleção', () => {
    const texto = 'Eloiza Lima, palestrante, Cuide-se professor';
    const people = collaboratorsFromApi(undefined, texto);
    expect(people).toHaveLength(1);
    expect(people[0].nome).toBe(texto);
  });

  it('reordena sem duplicar a pessoa', () => {
    const people = [
      { nome: 'A', funcao: 'instrutor' as const, funcaoPersonalizada: '', temaAtividade: '', ordem: 0, datasEvento: [] },
      { nome: 'B', funcao: 'palestrante' as const, funcaoPersonalizada: '', temaAtividade: '', ordem: 1, datasEvento: ['2026-02-24'] },
    ];
    const moved = moveCollaborator(people, 1, -1);
    expect(moved.map((item) => item.nome)).toEqual(['B', 'A']);
    expect(moved.map((item) => item.ordem)).toEqual([0, 1]);
    expect(moved[0].datasEvento).toEqual(['2026-02-24']);
  });

  it('valida nome e função personalizada individualmente', () => {
    const errors = validateCollaborators(
      [
        { nome: ' ', funcao: 'instrutor', funcaoPersonalizada: '', temaAtividade: '', ordem: 0, datasEvento: [] },
        { nome: 'Lia', funcao: 'outra', funcaoPersonalizada: ' ', temaAtividade: '', ordem: 1, datasEvento: [] },
      ],
      [],
      t,
    );
    expect(errors[0]?.nome).toBe('collaborators.nameRequired');
    expect(errors[1]?.funcaoPersonalizada).toBe('collaborators.roleCustomRequired');
  });

  it('aplica a regra automática de frente e verso', () => {
    const uma = [
      { nome: 'Eloiza Lima', funcao: 'palestrante' as const, funcaoPersonalizada: '', temaAtividade: '', ordem: 0, datasEvento: [] },
    ];
    const duas = [
      ...uma,
      { nome: 'Mistênio', funcao: 'instrutor' as const, funcaoPersonalizada: '', temaAtividade: '', ordem: 1, datasEvento: [] },
    ];
    expect(collaboratorsOnCertificateBack([], 'automatico')).toBe(false);
    expect(collaboratorsOnCertificateBack(uma, 'automatico')).toBe(false);
    expect(collaboratorsOnCertificateBack(duas, 'automatico')).toBe(true);
    expect(collaboratorsOnCertificateBack(uma, 'somente_verso')).toBe(true);
    expect(collaboratorsOnCertificateBack(duas, 'nao_exibir')).toBe(false);
  });
});
