from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    async def send_password_reset(self, *, to: str, nome: str, link: str) -> None:
        subject = "Redefinir senha — Genius Certify"
        text = (
            f"Olá, {nome}.\n\n"
            "Recebemos um pedido para redefinir a senha da sua conta no Genius Certify.\n"
            f"Abra o link abaixo em até 1 hora:\n\n{link}\n\n"
            "Se você não pediu essa alteração, ignore este e-mail."
        )
        html = (
            f"<p>Olá, {nome}.</p>"
            "<p>Recebemos um pedido para redefinir a senha da sua conta no "
            "<strong>Genius Certify</strong>.</p>"
            f'<p><a href="{link}">Redefinir senha</a> — o link vale por 1 hora.</p>'
            "<p>Se você não pediu essa alteração, ignore este e-mail.</p>"
        )
        await self._deliver(to=to, subject=subject, text=text, html=html, fallback_log=link)

    async def _deliver(
        self,
        *,
        to: str,
        subject: str,
        text: str,
        html: str,
        fallback_log: str,
    ) -> None:
        settings = self._settings
        if not settings.smtp_configured:
            if settings.is_production:
                logger.error("SMTP não configurado; e-mail de recuperação não enviado")
            else:
                logger.info("SMTP ausente (dev). Link de recuperação para %s: %s", to, fallback_log)
            return

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.smtp_from
        message["To"] = to
        message.set_content(text)
        message.add_alternative(html, subtype="html")

        try:
            await asyncio.to_thread(self._send_smtp, message)
        except Exception:
            logger.exception("Falha ao enviar e-mail de recuperação para %s", to)
            if not settings.is_production:
                logger.info("Link de recuperação (fallback dev) para %s: %s", to, fallback_log)

    def _send_smtp(self, message: EmailMessage) -> None:
        settings = self._settings
        host = settings.smtp_host
        if host is None:
            raise RuntimeError("SMTP_HOST ausente")

        with smtplib.SMTP(host, settings.smtp_port, timeout=20) as client:
            if settings.smtp_starttls:
                client.starttls()
            if settings.smtp_user and settings.smtp_password:
                client.login(settings.smtp_user, settings.smtp_password)
            client.send_message(message)
