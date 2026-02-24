import nodemailer from 'nodemailer';
import { logger } from './logger.js';

const isTest = process.env.NODE_ENV === 'test';

function createTransport() {
  // En desarrollo/test, usar Ethereal (email falso, no envía nada real)
  if (!process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      ignoreTLS: true,
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const transporter = createTransport();

export async function sendPasswordResetEmail({ to, fullName, resetUrl }) {
  if (isTest) return; // No enviar emails en tests

  const from = process.env.SMTP_FROM || 'noreply@acci.com';

  try {
    await transporter.sendMail({
      from: `"ACCI Platform" <${from}>`,
      to,
      subject: 'Recuperación de contraseña — ACCI',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Recuperación de contraseña</h2>
          <p>Hola <strong>${fullName}</strong>,</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;
                    text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">
            Restablecer contraseña
          </a>
          <p style="color:#64748b;font-size:13px;">
            Este enlace expirará en <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este mensaje.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
          <p style="color:#94a3b8;font-size:12px;">Academia de Crecimiento Cristiano Integral (ACCI)</p>
        </div>
      `,
      text: `Hola ${fullName},\n\nRestablece tu contraseña en: ${resetUrl}\n\nEste enlace expira en 1 hora.\n\nACCI Platform`,
    });
    logger.info({ to }, 'Password reset email sent');
  } catch (err) {
    logger.error({ err, to }, 'Failed to send password reset email');
    throw err;
  }
}
