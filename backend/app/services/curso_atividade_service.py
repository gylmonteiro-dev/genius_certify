from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.models.conta_participante import ContaParticipante
from app.models.curso import Curso, CursoStatus
from app.models.curso_atividade import (
    AtividadeStatus,
    AtividadeTipo,
    CursoAtividade,
    InscricaoAtividade,
    InscricaoAtividadeStatus,
)
from app.models.curso_colaborador import CursoColaborador
from app.models.inscricao import Inscricao
from app.models.participante import Participante
from app.models.usuario import Usuario, UsuarioRole
from app.repositories.curso_atividade_repository import (
    CursoAtividadeRepository,
    InscricaoAtividadeRepository,
    anexar_responsaveis,
)
from app.repositories.curso_repository import CursoRepository
from app.repositories.inscricao_repository import InscricaoRepository
from app.repositories.participante_repository import ParticipanteRepository
from app.schemas.curso_atividade import (
    AtividadeCreate,
    AtividadeInscritoResponse,
    AtividadeParticipanteItem,
    AtividadePublicResponse,
    AtividadeResponse,
    AtividadeResponsavelResponse,
    AtividadeUpdate,
    AtividadesParticipanteResponse,
    InscritoAtividadeResumo,
)
from app.services.atividades_certificado import (
    carga_horaria_entre,
    elegivel_para_certificado,
    snapshot_de_atividade,
)
from app.services.evento_datas import datas_do_curso
from app.services.vagas import vagas_disponiveis

VAGAS_ATIVIDADE = "Vagas esgotadas para esta atividade"
PRAZO_ENCERRADO = "O prazo para escolher atividade neste evento já encerrou"


class CursoAtividadeService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._cursos = CursoRepository(session)
        self._inscricoes = InscricaoRepository(session)
        self._participantes = ParticipanteRepository(session)
        self._atividades = CursoAtividadeRepository(session)
        self._vinculos = InscricaoAtividadeRepository(session)

    async def instituicao_do_curso(self, curso_id: UUID, actor: Usuario) -> UUID:
        if actor.role == UsuarioRole.SUPER_ADMIN:
            curso = await self._cursos.get_by_id(curso_id)
        else:
            if actor.instituicao_id is None:
                raise ForbiddenError("Acesso negado")
            curso = await self._cursos.get_by_id(
                curso_id,
                instituicao_id=actor.instituicao_id,
            )
        if curso is None:
            raise NotFoundError("Curso não encontrado")
        return curso.instituicao_id

    async def list_admin(
        self,
        curso_id: UUID,
        *,
        instituicao_id: UUID,
    ) -> list[AtividadeResponse]:
        curso = await self._curso_ou_404(curso_id, instituicao_id)
        return await self._respostas(curso, somente_ativas=False)

    async def create(
        self,
        curso_id: UUID,
        data: AtividadeCreate,
        *,
        instituicao_id: UUID,
    ) -> AtividadeResponse:
        curso = await self._curso_ou_404(curso_id, instituicao_id)
        self._validar_campos(
            titulo=data.titulo,
            tipo=data.tipo,
            tipo_personalizado=data.tipo_personalizado,
            data=data.data,
            hora_inicio=data.hora_inicio,
            hora_fim=data.hora_fim,
            datas_validas=set(datas_do_curso(curso)),
        )
        await self._assert_colaboradores(curso, data.colaborador_ids)
        atividade = CursoAtividade(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
            titulo=data.titulo.strip(),
            descricao=(data.descricao or "").strip(),
            tipo=data.tipo,
            tipo_personalizado=self._personalizado(data.tipo, data.tipo_personalizado),
            data=data.data,
            hora_inicio=data.hora_inicio,
            hora_fim=data.hora_fim,
            carga_horaria=(
                data.carga_horaria
                if data.carga_horaria is not None
                else carga_horaria_entre(data.hora_inicio, data.hora_fim)
            ),
            local=data.local,
            limite_participantes=data.limite_participantes,
            status=data.status,
            ordem=data.ordem,
        )
        anexar_responsaveis(atividade, data.colaborador_ids)
        await self._atividades.add(atividade)
        return (await self._respostas_de([atividade], curso.instituicao_id))[0]

    async def update(
        self,
        curso_id: UUID,
        atividade_id: UUID,
        data: AtividadeUpdate,
        *,
        instituicao_id: UUID,
    ) -> AtividadeResponse:
        curso = await self._curso_ou_404(curso_id, instituicao_id)
        atividade = await self._atividade_ou_404(
            atividade_id,
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        payload = data.model_dump(exclude_unset=True)
        colaborador_ids = payload.pop("colaborador_ids", None)
        tipo = payload.get("tipo", atividade.tipo)
        personalizado = payload.get("tipo_personalizado", atividade.tipo_personalizado)
        dia = payload.get("data", atividade.data)
        inicio = payload.get("hora_inicio", atividade.hora_inicio)
        fim = payload.get("hora_fim", atividade.hora_fim)
        titulo = payload.get("titulo", atividade.titulo)
        self._validar_campos(
            titulo=titulo,
            tipo=tipo,
            tipo_personalizado=personalizado,
            data=dia,
            hora_inicio=inicio,
            hora_fim=fim,
            datas_validas=set(datas_do_curso(curso)),
        )
        if payload.get("carga_horaria") is None and (
            "carga_horaria" in payload or "hora_inicio" in payload or "hora_fim" in payload
        ):
            calculada = carga_horaria_entre(inicio, fim)
            if calculada is not None:
                payload["carga_horaria"] = calculada
        if "limite_participantes" in payload:
            await self._assert_limite(atividade, payload["limite_participantes"])
        if "titulo" in payload and payload["titulo"] is not None:
            payload["titulo"] = payload["titulo"].strip()
        if "descricao" in payload and payload["descricao"] is not None:
            payload["descricao"] = payload["descricao"].strip()
        if "tipo" in payload or "tipo_personalizado" in payload:
            payload["tipo_personalizado"] = self._personalizado(tipo, personalizado)
        for field, value in payload.items():
            setattr(atividade, field, value)
        if colaborador_ids is not None:
            await self._assert_colaboradores(curso, colaborador_ids)
            atividade.responsaveis.clear()
            await self._session.flush()
            anexar_responsaveis(atividade, colaborador_ids)
        await self._atividades.save(atividade)
        return (await self._respostas_de([atividade], curso.instituicao_id))[0]

    async def inativar(
        self,
        curso_id: UUID,
        atividade_id: UUID,
        *,
        instituicao_id: UUID,
    ) -> AtividadeResponse:
        return await self._mudar_status(
            curso_id,
            atividade_id,
            instituicao_id=instituicao_id,
            status=AtividadeStatus.INATIVA,
            cancelar_selecoes=False,
        )

    async def cancelar(
        self,
        curso_id: UUID,
        atividade_id: UUID,
        *,
        instituicao_id: UUID,
    ) -> AtividadeResponse:
        return await self._mudar_status(
            curso_id,
            atividade_id,
            instituicao_id=instituicao_id,
            status=AtividadeStatus.CANCELADA,
            cancelar_selecoes=True,
        )

    async def list_inscritos(
        self,
        curso_id: UUID,
        atividade_id: UUID,
        *,
        instituicao_id: UUID,
    ) -> list[AtividadeInscritoResponse]:
        curso = await self._curso_ou_404(curso_id, instituicao_id)
        atividade = await self._atividade_ou_404(
            atividade_id,
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        rows = await self._vinculos.list_by_atividade(
            instituicao_id=curso.instituicao_id,
            curso_atividade_id=atividade.id,
        )
        participantes = await self._participantes_por_id(
            [row.participante_id for row in rows],
            instituicao_id=curso.instituicao_id,
        )
        items: list[AtividadeInscritoResponse] = []
        for row in rows:
            pessoa = participantes.get(row.participante_id)
            if pessoa is None:
                continue
            items.append(
                AtividadeInscritoResponse(
                    participante_id=pessoa.id,
                    nome=pessoa.nome,
                    email=pessoa.email,
                    documento=pessoa.documento,
                    status=row.status,
                    selecionada_em=row.selecionada_em,
                    certificado_habilitado=row.certificado_habilitado,
                )
            )
        items.sort(key=lambda item: item.nome.casefold())
        return items

    async def atribuir(
        self,
        curso_id: UUID,
        participante_id: UUID,
        atividade_ids: list[UUID],
        *,
        instituicao_id: UUID,
    ) -> list[InscritoAtividadeResumo]:
        curso = await self._curso_ou_404(curso_id, instituicao_id)
        if curso.status == CursoStatus.CANCELLED:
            raise ConflictError("Evento cancelado não aceita alteração de atividade")
        inscricao = await self._inscricoes.get_by_participante_curso(
            instituicao_id=curso.instituicao_id,
            participante_id=participante_id,
            curso_id=curso.id,
        )
        if inscricao is None:
            raise NotFoundError("Inscrição não encontrada")
        await self.aplicar_selecao(inscricao, atividade_ids, como_admin=True)
        return await self.resumos_da_inscricao(inscricao.id)

    async def registrar_presenca(
        self,
        curso_id: UUID,
        atividade_id: UUID,
        *,
        instituicao_id: UUID,
        participante_id: UUID,
        status: InscricaoAtividadeStatus,
    ) -> AtividadeInscritoResponse:
        curso = await self._curso_ou_404(curso_id, instituicao_id)
        await self._atividade_ou_404(
            atividade_id,
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        rows = await self._vinculos.list_do_participante_no_curso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
            participante_id=participante_id,
        )
        row = next(
            (
                item
                for item in rows
                if item.curso_atividade_id == atividade_id
                and item.status != InscricaoAtividadeStatus.CANCELADA
            ),
            None,
        )
        if row is None:
            raise NotFoundError("Participante não está inscrito nesta atividade")
        row.status = status
        row.presenca_em = datetime.now(timezone.utc)
        row.certificado_habilitado = status == InscricaoAtividadeStatus.PRESENTE
        await self._session.flush()
        pessoa = await self._participantes.get_by_id(
            participante_id,
            instituicao_id=curso.instituicao_id,
        )
        if pessoa is None:
            raise NotFoundError("Participante não encontrado")
        return AtividadeInscritoResponse(
            participante_id=pessoa.id,
            nome=pessoa.nome,
            email=pessoa.email,
            documento=pessoa.documento,
            status=row.status,
            selecionada_em=row.selecionada_em,
            certificado_habilitado=row.certificado_habilitado,
        )

    async def list_publicas(self, curso: Curso) -> list[AtividadePublicResponse]:
        atividades = await self._atividades.list_by_curso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
            somente_ativas=True,
        )
        return [
            AtividadePublicResponse.model_validate(item.model_dump())
            for item in await self._respostas_de(atividades, curso.instituicao_id)
        ]

    async def list_para_participante(
        self,
        conta: ContaParticipante,
        curso_id: UUID,
    ) -> AtividadesParticipanteResponse:
        curso, inscricao = await self._inscricao_da_conta(conta, curso_id)
        respostas = await self._respostas(curso, somente_ativas=False)
        selecionadas = await self._vinculos.list_ativas_da_inscricao(inscricao.id)
        por_atividade = {item.curso_atividade_id: item for item in selecionadas}
        visiveis = [
            item
            for item in respostas
            if item.status == AtividadeStatus.ATIVA or item.id in por_atividade
        ]
        atividades_participante: list[AtividadeParticipanteItem] = []
        for item in visiveis:
            publico = AtividadePublicResponse.model_validate(item.model_dump())
            atividades_participante.append(
                AtividadeParticipanteItem(
                    **publico.model_dump(),
                    selecionada=item.id in por_atividade,
                    status_participacao=(
                        por_atividade[item.id].status if item.id in por_atividade else None
                    ),
                )
            )
        return AtividadesParticipanteResponse(
            permite_varias_atividades=curso.permite_varias_atividades,
            atividade_obrigatoria=curso.atividade_obrigatoria,
            permitir_selecao_participante=curso.permitir_selecao_participante,
            selecao_atividades_ate=curso.selecao_atividades_ate,
            pode_alterar=self.janela_aberta(curso, datetime.now(timezone.utc))
            and not inscricao.cancelada
            and not inscricao.reprovada,
            atividades=atividades_participante,
        )

    async def selecionar_para_participante(
        self,
        conta: ContaParticipante,
        curso_id: UUID,
        atividade_ids: list[UUID],
    ) -> AtividadesParticipanteResponse:
        _curso, inscricao = await self._inscricao_da_conta(conta, curso_id)
        await self.aplicar_selecao(inscricao, atividade_ids, como_admin=False)
        return await self.list_para_participante(conta, curso_id)

    async def aplicar_na_inscricao_publica(
        self,
        inscricao: Inscricao,
        atividade_ids: list[UUID] | None,
    ) -> None:
        curso = await self._cursos.get_by_id(
            inscricao.curso_id,
            instituicao_id=inscricao.instituicao_id,
        )
        if curso is None:
            raise NotFoundError("Curso não encontrado")
        ids = list(dict.fromkeys(atividade_ids or []))
        if not ids:
            self.assert_pode_adiar(curso)
            return
        await self.aplicar_selecao(inscricao, ids, como_admin=False)

    async def aplicar_selecao(
        self,
        inscricao: Inscricao,
        atividade_ids: list[UUID],
        *,
        como_admin: bool,
    ) -> None:
        agora = datetime.now(timezone.utc)
        curso = await self._cursos.get_by_id(
            inscricao.curso_id,
            instituicao_id=inscricao.instituicao_id,
        )
        if curso is None:
            raise NotFoundError("Curso não encontrado")
        if inscricao.cancelada:
            raise ConflictError("Inscrição cancelada neste evento")
        if inscricao.reprovada:
            raise ConflictError("Inscrição reprovada neste evento")

        ids = list(dict.fromkeys(atividade_ids))
        if not curso.permite_varias_atividades and len(ids) > 1:
            raise AppError("Este evento permite apenas uma atividade por participante")
        if not como_admin and not self.janela_aberta(curso, agora):
            raise ConflictError(PRAZO_ENCERRADO)
        if not como_admin and curso.atividade_obrigatoria and not ids:
            raise AppError("Este evento exige a escolha de uma atividade")
        if como_admin and curso.status == CursoStatus.CANCELLED:
            raise ConflictError("Evento cancelado não aceita alteração de atividade")

        locked = await self._vinculos.lock_inscricao(inscricao.id)
        if locked is None:
            raise NotFoundError("Inscrição não encontrada")

        atuais = await self._vinculos.list_ativas_da_inscricao(locked.id)
        atuais_ids = {row.curso_atividade_id for row in atuais}
        desejados = set(ids)
        remover = [row for row in atuais if row.curso_atividade_id not in desejados]
        adicionar = [atividade_id for atividade_id in ids if atividade_id not in atuais_ids]
        bloquear = sorted(atuais_ids | set(adicionar))
        atividades = await self._atividades.lock_many(
            bloquear,
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        por_id = {item.id: item for item in atividades}
        if len(por_id) != len(bloquear):
            raise NotFoundError("Atividade não encontrada")

        for atividade_id in adicionar:
            atividade = por_id[atividade_id]
            if atividade.status != AtividadeStatus.ATIVA:
                raise ConflictError("Esta atividade não está disponível para inscrição")
            ocupadas = await self._vinculos.count_ocupadas(
                atividade.id,
                excluir_inscricao_id=locked.id,
            )
            if (
                atividade.limite_participantes is not None
                and ocupadas >= atividade.limite_participantes
            ):
                raise ConflictError(VAGAS_ATIVIDADE)

        for row in remover:
            row.status = InscricaoAtividadeStatus.CANCELADA
            row.certificado_habilitado = False
        for atividade_id in adicionar:
            self._vinculos.add(
                InscricaoAtividade(
                    instituicao_id=curso.instituicao_id,
                    curso_id=curso.id,
                    curso_atividade_id=atividade_id,
                    inscricao_id=locked.id,
                    participante_id=locked.participante_id,
                    status=InscricaoAtividadeStatus.SELECIONADA,
                    selecionada_em=agora,
                    certificado_habilitado=True,
                )
            )
        await self._session.flush()

    async def cancelar_da_inscricao(self, inscricao_id: UUID) -> None:
        await self._vinculos.cancelar_da_inscricao(inscricao_id)

    async def assert_datas_cobertas(self, curso: Curso, datas: list) -> None:
        em_uso = await self._atividades.datas_em_uso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        faltando = sorted(em_uso - set(datas))
        if not faltando:
            return
        texto = ", ".join(dia.strftime("%d/%m/%Y") for dia in faltando)
        raise AppError(
            "Não é possível remover datas que ainda têm atividade: " + texto
        )

    async def resumos_por_inscricoes(
        self,
        inscricao_ids: list[UUID],
    ) -> dict[UUID, list[InscritoAtividadeResumo]]:
        rows = await self._vinculos.list_by_inscricao_ids(inscricao_ids)
        agrupado: dict[UUID, list[InscritoAtividadeResumo]] = {}
        for row in rows:
            agrupado.setdefault(row.inscricao_id, []).append(
                InscritoAtividadeResumo(
                    atividade_id=row.curso_atividade_id,
                    titulo=row.atividade.titulo,
                    status=row.status,
                )
            )
        return agrupado

    async def resumos_da_inscricao(self, inscricao_id: UUID) -> list[InscritoAtividadeResumo]:
        agrupado = await self.resumos_por_inscricoes([inscricao_id])
        return agrupado.get(inscricao_id, [])

    async def snapshot_do_participante(
        self,
        curso: Curso,
        participante_id: UUID,
    ) -> list[dict] | None:
        rows = await self._vinculos.list_do_participante_no_curso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
            participante_id=participante_id,
        )
        itens: list[tuple[CursoAtividade, InscricaoAtividade]] = []
        for row in rows:
            atividade = row.atividade
            if not elegivel_para_certificado(
                status=row.status,
                certificado_habilitado=row.certificado_habilitado,
                atividade_status=atividade.status,
                exige_presenca=curso.certificado_exige_presenca_atividade,
            ):
                continue
            itens.append((atividade, row))
        itens.sort(key=lambda par: (par[0].data, par[0].hora_inicio or datetime.min.time(), par[0].ordem, par[0].titulo))
        if not itens:
            return None
        return [
            snapshot_de_atividade(
                titulo=atividade.titulo,
                tipo=atividade.tipo,
                tipo_personalizado=atividade.tipo_personalizado,
                data=atividade.data,
                hora_inicio=atividade.hora_inicio,
                hora_fim=atividade.hora_fim,
                carga_horaria=atividade.carga_horaria,
                local=atividade.local,
                responsaveis=[
                    {
                        "nome": vinculo.colaborador.nome,
                        "funcao": vinculo.colaborador.funcao.value,
                        "funcao_personalizada": vinculo.colaborador.funcao_personalizada,
                    }
                    for vinculo in atividade.responsaveis
                ],
                status=row.status,
            )
            for atividade, row in itens
        ]

    def assert_pode_adiar(self, curso: Curso) -> None:
        if curso.atividade_obrigatoria and not self.janela_aberta(
            curso,
            datetime.now(timezone.utc),
        ):
            raise AppError("Este evento exige a escolha de uma atividade")

    @staticmethod
    def janela_aberta(curso: Curso, agora: datetime) -> bool:
        if not curso.permitir_selecao_participante:
            return False
        if curso.status != CursoStatus.UPCOMING:
            return False
        if curso.selecao_atividades_ate is not None and agora > curso.selecao_atividades_ate:
            return False
        return True

    async def _mudar_status(
        self,
        curso_id: UUID,
        atividade_id: UUID,
        *,
        instituicao_id: UUID,
        status: AtividadeStatus,
        cancelar_selecoes: bool,
    ) -> AtividadeResponse:
        curso = await self._curso_ou_404(curso_id, instituicao_id)
        atividade = await self._atividade_ou_404(
            atividade_id,
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
        )
        atividade.status = status
        if cancelar_selecoes:
            await self._vinculos.cancelar_da_atividade(atividade.id)
        await self._atividades.save(atividade)
        return (await self._respostas_de([atividade], curso.instituicao_id))[0]

    async def _curso_ou_404(self, curso_id: UUID, instituicao_id: UUID) -> Curso:
        curso = await self._cursos.get_by_id(curso_id, instituicao_id=instituicao_id)
        if curso is None:
            raise NotFoundError("Curso não encontrado")
        return curso

    async def _atividade_ou_404(
        self,
        atividade_id: UUID,
        *,
        instituicao_id: UUID,
        curso_id: UUID,
    ) -> CursoAtividade:
        atividade = await self._atividades.get_by_id(
            atividade_id,
            instituicao_id=instituicao_id,
            curso_id=curso_id,
        )
        if atividade is None:
            raise NotFoundError("Atividade não encontrada")
        return atividade

    async def _inscricao_da_conta(
        self,
        conta: ContaParticipante,
        curso_id: UUID,
    ) -> tuple[Curso, Inscricao]:
        curso = await self._cursos.get_by_id(curso_id)
        if curso is None:
            raise NotFoundError("Curso não encontrado")
        participante = await self._participantes.get_by_documento(
            instituicao_id=curso.instituicao_id,
            documento=conta.documento,
        )
        if participante is None:
            raise NotFoundError("Inscrição não encontrada")
        inscricao = await self._inscricoes.get_by_participante_curso(
            instituicao_id=curso.instituicao_id,
            participante_id=participante.id,
            curso_id=curso.id,
        )
        if inscricao is None or inscricao.cancelada:
            raise NotFoundError("Inscrição não encontrada")
        return curso, inscricao

    async def _assert_colaboradores(self, curso: Curso, colaborador_ids: list[UUID]) -> None:
        if not colaborador_ids:
            return
        ids = set(colaborador_ids)
        stmt = select(CursoColaborador.id).where(
            CursoColaborador.curso_id == curso.id,
            CursoColaborador.id.in_(ids),
        )
        result = await self._session.execute(stmt)
        encontrados = set(result.scalars().all())
        if encontrados != ids:
            raise AppError("O responsável precisa ser um profissional deste evento")

    async def _assert_limite(
        self,
        atividade: CursoAtividade,
        limite: int | None,
    ) -> None:
        if limite is None:
            return
        ocupadas = await self._vinculos.count_ocupadas(atividade.id)
        if limite < ocupadas:
            raise AppError(
                "O limite de vagas não pode ser menor que as inscrições já feitas"
            )

    async def _participantes_por_id(
        self,
        participante_ids: list[UUID],
        *,
        instituicao_id: UUID,
    ) -> dict[UUID, Participante]:
        if not participante_ids:
            return {}
        stmt = select(Participante).where(
            Participante.instituicao_id == instituicao_id,
            Participante.id.in_(participante_ids),
        )
        result = await self._session.execute(stmt)
        return {item.id: item for item in result.scalars().all()}

    async def _respostas(
        self,
        curso: Curso,
        *,
        somente_ativas: bool,
    ) -> list[AtividadeResponse]:
        atividades = await self._atividades.list_by_curso(
            instituicao_id=curso.instituicao_id,
            curso_id=curso.id,
            somente_ativas=somente_ativas,
        )
        return await self._respostas_de(atividades, curso.instituicao_id)

    async def _respostas_de(
        self,
        atividades: list[CursoAtividade],
        instituicao_id: UUID,
    ) -> list[AtividadeResponse]:
        del instituicao_id
        counts = await self._vinculos.counts_por_atividade([item.id for item in atividades])
        respostas: list[AtividadeResponse] = []
        for atividade in atividades:
            ocupadas = counts.get(atividade.id, 0)
            disponiveis = vagas_disponiveis(atividade.limite_participantes, ocupadas)
            respostas.append(
                AtividadeResponse(
                    id=atividade.id,
                    instituicao_id=atividade.instituicao_id,
                    curso_id=atividade.curso_id,
                    titulo=atividade.titulo,
                    descricao=atividade.descricao,
                    tipo=atividade.tipo,
                    tipo_personalizado=atividade.tipo_personalizado,
                    data=atividade.data,
                    hora_inicio=atividade.hora_inicio,
                    hora_fim=atividade.hora_fim,
                    carga_horaria=atividade.carga_horaria,
                    local=atividade.local,
                    limite_participantes=atividade.limite_participantes,
                    status=atividade.status,
                    ordem=atividade.ordem,
                    vagas_ocupadas=ocupadas,
                    vagas_disponiveis=disponiveis,
                    lotada=disponiveis == 0,
                    responsaveis=[
                        AtividadeResponsavelResponse(
                            colaborador_id=item.colaborador_id,
                            nome=item.colaborador.nome,
                            funcao=item.colaborador.funcao,
                            funcao_personalizada=item.colaborador.funcao_personalizada,
                            ordem=item.ordem,
                        )
                        for item in atividade.responsaveis
                    ],
                    created_at=atividade.created_at,
                    updated_at=atividade.updated_at,
                )
            )
        return respostas

    @staticmethod
    def _personalizado(tipo: AtividadeTipo, valor: str | None) -> str | None:
        if tipo != AtividadeTipo.OUTRO:
            return None
        return (valor or "").strip() or None

    @staticmethod
    def _validar_campos(
        *,
        titulo: str | None,
        tipo: AtividadeTipo,
        tipo_personalizado: str | None,
        data,
        hora_inicio,
        hora_fim,
        datas_validas: set,
    ) -> None:
        if titulo is None or not titulo.strip():
            raise AppError("Informe o nome da atividade")
        if tipo == AtividadeTipo.OUTRO and not (tipo_personalizado or "").strip():
            raise AppError("Informe o tipo personalizado da atividade")
        if hora_inicio is not None and hora_fim is not None and hora_fim <= hora_inicio:
            raise AppError("O horário de término precisa ser depois do início")
        if data not in datas_validas:
            raise AppError("A data da atividade precisa ser uma data do evento")
