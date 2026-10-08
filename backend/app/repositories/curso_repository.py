from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import case, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppError
from app.models.certificado import Certificado
from app.models.curso import Curso, CursoStatus
from app.models.curso_atividade import CursoAtividade, CursoAtividadeColaborador
from app.models.curso_colaborador import (
    ColaboradorFuncao,
    CursoColaborador,
    curso_colaborador_datas,
)
from app.models.curso_data import CursoData
from app.models.instituicao import Instituicao, InstituicaoStatus
from app.services.colaboradores_evento import ColaboradorSpec, derivar_instrutor


def _chave_colaborador(nome: str, funcao: object, personalizada: str | None) -> tuple[str, str, str]:
    valor = funcao.value if hasattr(funcao, "value") else str(funcao)
    return (nome.strip(), valor, (personalizada or "").strip())


class CursoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(
        self,
        curso_id: UUID,
        *,
        instituicao_id: UUID | None = None,
    ) -> Curso | None:
        stmt = select(Curso).where(Curso.id == curso_id)
        if instituicao_id is not None:
            stmt = stmt.where(Curso.instituicao_id == instituicao_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_for_update(
        self,
        curso_id: UUID,
        *,
        instituicao_id: UUID | None = None,
    ) -> Curso | None:
        stmt = select(Curso).where(Curso.id == curso_id).with_for_update()
        if instituicao_id is not None:
            stmt = stmt.where(Curso.instituicao_id == instituicao_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        instituicao_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Curso]:
        stmt = select(Curso).order_by(Curso.titulo.asc())
        if instituicao_id is not None:
            stmt = stmt.where(Curso.instituicao_id == instituicao_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_publico(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Curso]:
        stmt = (
            select(Curso)
            .join(Instituicao)
            .where(
                Curso.status != CursoStatus.DRAFT,
                Curso.status != CursoStatus.CANCELLED,
                Instituicao.status == InstituicaoStatus.ACTIVE,
            )
            .options(selectinload(Curso.instituicao))
            .order_by(
                case((Curso.status == CursoStatus.UPCOMING, 0), else_=1),
                case(
                    (Curso.status == CursoStatus.UPCOMING, Curso.data_evento),
                    else_=None,
                )
                .asc()
                .nulls_last(),
                case(
                    (Curso.status != CursoStatus.UPCOMING, Curso.data_evento),
                    else_=None,
                )
                .desc()
                .nulls_last(),
                Curso.titulo.asc(),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def get_publico(self, curso_id: UUID) -> Curso | None:
        stmt = (
            select(Curso)
            .join(Instituicao)
            .where(
                Curso.id == curso_id,
                Curso.status != CursoStatus.DRAFT,
                Curso.status != CursoStatus.CANCELLED,
                Instituicao.status == InstituicaoStatus.ACTIVE,
            )
            .options(selectinload(Curso.instituicao))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_by_status(
        self,
        *,
        instituicao_id: UUID | None = None,
    ) -> dict[str, int]:
        stmt = select(Curso.status, func.count()).group_by(Curso.status)
        if instituicao_id is not None:
            stmt = stmt.where(Curso.instituicao_id == instituicao_id)
        result = await self._session.execute(stmt)
        counts: dict[str, int] = {}
        for status, n in result.all():
            key = status.value if isinstance(status, CursoStatus) else str(status)
            counts[key] = int(n)
        return counts

    async def create(self, **fields: object) -> Curso:
        curso = Curso(**fields)
        self._session.add(curso)
        await self._session.flush()
        await self._session.refresh(curso)
        return curso

    async def replace_datas(self, curso: Curso, datas: list[date]) -> None:
        """Substitui a coleção inteira na transação corrente."""
        await self._session.refresh(curso, attribute_names=["datas", "colaboradores"])
        data_ids = [item.id for item in curso.datas]
        if data_ids:
            await self._session.execute(
                delete(curso_colaborador_datas).where(
                    curso_colaborador_datas.c.curso_data_id.in_(data_ids)
                )
            )
        for colaborador in list(curso.colaboradores):
            self._session.expire(colaborador, ["datas"])
        for item in list(curso.datas):
            await self._session.delete(item)
        curso.datas.clear()
        await self._session.flush()
        for value in datas:
            curso.datas.append(CursoData(curso_id=curso.id, data=value))
        curso.data_evento = datas[0] if datas else None
        await self._session.flush()

    async def replace_colaboradores(
        self,
        curso: Curso,
        pessoas: list[ColaboradorSpec],
    ) -> None:
        """Substitui os profissionais e recalcula o texto legado ``instrutor``.

        Quem já é responsável por uma atividade permanece com o mesmo id.
        Remover essa pessoa é recusado até desvinculá-la da atividade.
        """
        await self._session.refresh(curso, attribute_names=["colaboradores", "datas"])
        linked_ids = await self._colaboradores_vinculados(curso.id)
        if not linked_ids:
            await self._substituir_colaboradores(curso, pessoas)
            return
        await self._substituir_preservando_vinculos(curso, pessoas, linked_ids)

    async def _colaboradores_vinculados(self, curso_id: UUID) -> set[UUID]:
        stmt = (
            select(CursoAtividadeColaborador.colaborador_id)
            .join(
                CursoAtividade,
                CursoAtividade.id == CursoAtividadeColaborador.curso_atividade_id,
            )
            .where(CursoAtividade.curso_id == curso_id)
        )
        result = await self._session.execute(stmt)
        return set(result.scalars().all())

    async def _substituir_colaboradores(
        self,
        curso: Curso,
        pessoas: list[ColaboradorSpec],
    ) -> None:
        for item in list(curso.colaboradores):
            await self._session.delete(item)
        curso.colaboradores.clear()
        await self._session.flush()
        await self._anexar_colaboradores(curso, pessoas, pular=set())
        curso.instrutor = derivar_instrutor(pessoas)
        await self._session.flush()

    async def _substituir_preservando_vinculos(
        self,
        curso: Curso,
        pessoas: list[ColaboradorSpec],
        linked_ids: set[UUID],
    ) -> None:
        usados: set[int] = set()
        preservar: dict[UUID, ColaboradorSpec] = {}
        for colaborador in curso.colaboradores:
            if colaborador.id not in linked_ids:
                continue
            chave_atual = _chave_colaborador(
                colaborador.nome,
                colaborador.funcao,
                colaborador.funcao_personalizada,
            )
            escolhido: int | None = None
            for indice, pessoa in enumerate(pessoas):
                if indice in usados:
                    continue
                if _chave_colaborador(
                    pessoa.nome,
                    pessoa.funcao,
                    pessoa.funcao_personalizada,
                ) == chave_atual:
                    escolhido = indice
                    break
            if escolhido is None:
                raise AppError(
                    f"Não é possível remover {colaborador.nome}: "
                    "a pessoa é responsável por uma atividade do evento."
                )
            usados.add(escolhido)
            preservar[colaborador.id] = pessoas[escolhido]

        por_dia = {item.data: item for item in curso.datas}
        for colaborador in list(curso.colaboradores):
            spec = preservar.get(colaborador.id)
            if spec is None:
                curso.colaboradores.remove(colaborador)
                await self._session.delete(colaborador)
                continue
            colaborador.nome = spec.nome.strip()
            colaborador.funcao = ColaboradorFuncao(spec.funcao)
            colaborador.funcao_personalizada = spec.funcao_personalizada
            colaborador.tema_atividade = spec.tema_atividade
            colaborador.ordem = spec.ordem
            colaborador.datas.clear()
            self._vincular_datas(colaborador, spec, por_dia)
        await self._session.flush()
        await self._anexar_colaboradores(curso, pessoas, pular=usados)
        curso.instrutor = derivar_instrutor(pessoas)
        await self._session.flush()

    async def _anexar_colaboradores(
        self,
        curso: Curso,
        pessoas: list[ColaboradorSpec],
        *,
        pular: set[int],
    ) -> None:
        por_dia = {item.data: item for item in curso.datas}
        for indice, pessoa in enumerate(pessoas):
            if indice in pular:
                continue
            registro = CursoColaborador(
                curso_id=curso.id,
                nome=pessoa.nome,
                funcao=ColaboradorFuncao(pessoa.funcao),
                funcao_personalizada=pessoa.funcao_personalizada,
                tema_atividade=pessoa.tema_atividade,
                ordem=pessoa.ordem,
            )
            self._vincular_datas(registro, pessoa, por_dia)
            curso.colaboradores.append(registro)

    @staticmethod
    def _vincular_datas(
        registro: CursoColaborador,
        pessoa: ColaboradorSpec,
        por_dia: dict[date, CursoData],
    ) -> None:
        for dia in pessoa.datas_evento:
            curso_data = por_dia.get(dia)
            if curso_data is None:
                raise AppError(
                    f"A data {dia.strftime('%d/%m/%Y')} de {pessoa.nome} "
                    "não faz parte do evento."
                )
            registro.datas.append(curso_data)

    async def realocar_datas_dos_colaboradores(
        self,
        curso: Curso,
        vinculos: dict[UUID, list[date]],
    ) -> None:
        """Reaponta os dias que continuam no evento e solta os que foram removidos."""
        await self._session.refresh(curso, attribute_names=["colaboradores", "datas"])
        por_dia = {item.data: item for item in curso.datas}
        for colaborador in curso.colaboradores:
            await self._session.refresh(colaborador, attribute_names=["datas"])
            colaborador.datas.clear()
            for dia in vinculos.get(colaborador.id, []):
                alvo = por_dia.get(dia)
                if alvo is not None:
                    colaborador.datas.append(alvo)
        await self._session.flush()

    async def save(self, curso: Curso) -> Curso:
        await self._session.flush()
        await self._session.refresh(curso, attribute_names=["updated_at"])
        return curso

    async def delete(self, curso: Curso) -> None:
        await self._session.delete(curso)
        await self._session.flush()

    async def count_certificados(self, curso_id: UUID) -> int:
        stmt = select(func.count()).select_from(Certificado).where(
            Certificado.curso_id == curso_id
        )
        result = await self._session.execute(stmt)
        return int(result.scalar_one())
