from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.curso_atividade import (
    AtividadeStatus,
    CursoAtividade,
    CursoAtividadeColaborador,
    InscricaoAtividade,
    InscricaoAtividadeStatus,
)
from app.models.inscricao import Inscricao
from app.models.participante import Participante


class CursoAtividadeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_curso(
        self,
        *,
        instituicao_id: UUID,
        curso_id: UUID,
        somente_ativas: bool = False,
    ) -> list[CursoAtividade]:
        stmt = (
            select(CursoAtividade)
            .where(
                CursoAtividade.instituicao_id == instituicao_id,
                CursoAtividade.curso_id == curso_id,
            )
            .order_by(CursoAtividade.data, CursoAtividade.hora_inicio, CursoAtividade.ordem)
        )
        if somente_ativas:
            stmt = stmt.where(CursoAtividade.status == AtividadeStatus.ATIVA)
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def get_by_id(
        self,
        atividade_id: UUID,
        *,
        instituicao_id: UUID,
        curso_id: UUID,
    ) -> CursoAtividade | None:
        stmt = select(CursoAtividade).where(
            CursoAtividade.id == atividade_id,
            CursoAtividade.instituicao_id == instituicao_id,
            CursoAtividade.curso_id == curso_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def lock_many(
        self,
        atividade_ids: list[UUID],
        *,
        instituicao_id: UUID,
        curso_id: UUID,
    ) -> list[CursoAtividade]:
        if not atividade_ids:
            return []
        stmt = (
            select(CursoAtividade)
            .where(
                CursoAtividade.id.in_(atividade_ids),
                CursoAtividade.instituicao_id == instituicao_id,
                CursoAtividade.curso_id == curso_id,
            )
            .order_by(CursoAtividade.id)
            .with_for_update()
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def datas_em_uso(self, *, instituicao_id: UUID, curso_id: UUID) -> set[date]:
        stmt = select(CursoAtividade.data).where(
            CursoAtividade.instituicao_id == instituicao_id,
            CursoAtividade.curso_id == curso_id,
            CursoAtividade.status != AtividadeStatus.CANCELADA,
        )
        result = await self._session.execute(stmt)
        return set(result.scalars().all())

    async def add(self, atividade: CursoAtividade) -> CursoAtividade:
        self._session.add(atividade)
        await self._session.flush()
        await self._session.refresh(atividade)
        return atividade

    async def save(self, atividade: CursoAtividade) -> CursoAtividade:
        await self._session.flush()
        await self._session.refresh(atividade)
        return atividade


class InscricaoAtividadeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def lock_inscricao(self, inscricao_id: UUID) -> Inscricao | None:
        stmt = select(Inscricao).where(Inscricao.id == inscricao_id).with_for_update()
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_ativas_da_inscricao(self, inscricao_id: UUID) -> list[InscricaoAtividade]:
        stmt = (
            select(InscricaoAtividade)
            .where(
                InscricaoAtividade.inscricao_id == inscricao_id,
                InscricaoAtividade.status != InscricaoAtividadeStatus.CANCELADA,
            )
            .order_by(InscricaoAtividade.selecionada_em)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def list_by_inscricao_ids(
        self,
        inscricao_ids: list[UUID],
    ) -> list[InscricaoAtividade]:
        if not inscricao_ids:
            return []
        stmt = select(InscricaoAtividade).where(
            InscricaoAtividade.inscricao_id.in_(inscricao_ids),
            InscricaoAtividade.status != InscricaoAtividadeStatus.CANCELADA,
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def list_by_atividade(
        self,
        *,
        instituicao_id: UUID,
        curso_atividade_id: UUID,
    ) -> list[InscricaoAtividade]:
        stmt = (
            select(InscricaoAtividade)
            .join(Inscricao, Inscricao.id == InscricaoAtividade.inscricao_id)
            .join(Participante, Participante.id == InscricaoAtividade.participante_id)
            .where(
                InscricaoAtividade.instituicao_id == instituicao_id,
                InscricaoAtividade.curso_atividade_id == curso_atividade_id,
                InscricaoAtividade.status != InscricaoAtividadeStatus.CANCELADA,
                Inscricao.cancelada.is_(False),
                Inscricao.reprovada.is_(False),
            )
            .options(selectinload(InscricaoAtividade.atividade))
            .order_by(Participante.nome)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def list_do_participante_no_curso(
        self,
        *,
        instituicao_id: UUID,
        curso_id: UUID,
        participante_id: UUID,
    ) -> list[InscricaoAtividade]:
        stmt = (
            select(InscricaoAtividade)
            .where(
                InscricaoAtividade.instituicao_id == instituicao_id,
                InscricaoAtividade.curso_id == curso_id,
                InscricaoAtividade.participante_id == participante_id,
            )
            .order_by(InscricaoAtividade.selecionada_em)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all())

    async def count_ocupadas(
        self,
        curso_atividade_id: UUID,
        *,
        excluir_inscricao_id: UUID | None = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(InscricaoAtividade)
            .join(Inscricao, Inscricao.id == InscricaoAtividade.inscricao_id)
            .where(
                InscricaoAtividade.curso_atividade_id == curso_atividade_id,
                InscricaoAtividade.status != InscricaoAtividadeStatus.CANCELADA,
                Inscricao.cancelada.is_(False),
                Inscricao.reprovada.is_(False),
            )
        )
        if excluir_inscricao_id is not None:
            stmt = stmt.where(InscricaoAtividade.inscricao_id != excluir_inscricao_id)
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def counts_por_atividade(self, atividade_ids: list[UUID]) -> dict[UUID, int]:
        if not atividade_ids:
            return {}
        stmt = (
            select(InscricaoAtividade.curso_atividade_id, func.count())
            .join(Inscricao, Inscricao.id == InscricaoAtividade.inscricao_id)
            .where(
                InscricaoAtividade.curso_atividade_id.in_(atividade_ids),
                InscricaoAtividade.status != InscricaoAtividadeStatus.CANCELADA,
                Inscricao.cancelada.is_(False),
                Inscricao.reprovada.is_(False),
            )
            .group_by(InscricaoAtividade.curso_atividade_id)
        )
        result = await self._session.execute(stmt)
        return {atividade_id: int(total) for atividade_id, total in result.all()}

    async def cancelar_da_inscricao(self, inscricao_id: UUID) -> None:
        rows = await self.list_ativas_da_inscricao(inscricao_id)
        for row in rows:
            row.status = InscricaoAtividadeStatus.CANCELADA
            row.certificado_habilitado = False
        if rows:
            await self._session.flush()

    async def cancelar_da_atividade(self, curso_atividade_id: UUID) -> None:
        stmt = select(InscricaoAtividade).where(
            InscricaoAtividade.curso_atividade_id == curso_atividade_id,
            InscricaoAtividade.status != InscricaoAtividadeStatus.CANCELADA,
        )
        result = await self._session.execute(stmt)
        rows = list(result.scalars().all())
        for row in rows:
            row.status = InscricaoAtividadeStatus.CANCELADA
            row.certificado_habilitado = False
        if rows:
            await self._session.flush()

    def add(self, row: InscricaoAtividade) -> None:
        self._session.add(row)


def anexar_responsaveis(
    atividade: CursoAtividade,
    colaborador_ids: list[UUID],
) -> None:
    vistos: set[UUID] = set()
    ordem = len(atividade.responsaveis)
    for colaborador_id in colaborador_ids:
        if colaborador_id in vistos:
            continue
        vistos.add(colaborador_id)
        atividade.responsaveis.append(
            CursoAtividadeColaborador(
                instituicao_id=atividade.instituicao_id,
                colaborador_id=colaborador_id,
                ordem=ordem,
            )
        )
        ordem += 1
