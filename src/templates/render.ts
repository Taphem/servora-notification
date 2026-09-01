import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES_DIR = dirname(fileURLToPath(import.meta.url));

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function interpolate(template: string, variables: Record<string, string>, escape: boolean): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key] ?? '';
    return escape ? escapeHtml(value) : value;
  });
}

export function renderEmailVerification(variables: { verificationUrl: string }): { html: string; text: string } {
  const html = readFileSync(join(TEMPLATES_DIR, 'email-verification.html'), 'utf-8');
  const text = readFileSync(join(TEMPLATES_DIR, 'email-verification.txt'), 'utf-8');
  return {
    html: interpolate(html, variables, true),
    text: interpolate(text, variables, false),
  };
}

export function renderPasswordReset(variables: { resetUrl: string }): { html: string; text: string } {
  const html = readFileSync(join(TEMPLATES_DIR, 'password-reset.html'), 'utf-8');
  const text = readFileSync(join(TEMPLATES_DIR, 'password-reset.txt'), 'utf-8');
  return {
    html: interpolate(html, variables, true),
    text: interpolate(text, variables, false),
  };
}

export function renderPhoneOtpMessage(variables: { otp: string; expiresInWords: string }): string {
  return `Your Servora verification code is ${variables.otp}. It expires in ${variables.expiresInWords}.`;
}
