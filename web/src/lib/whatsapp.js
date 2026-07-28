export const WHATSAPP_NUMBER = '5511947192909';

export const WHATSAPP_DEFAULT_MESSAGE =
  'Olá! Vim pelo site da Symbius e quero saber como aumentar a captação de clientes.';

export function whatsappUrl(message = WHATSAPP_DEFAULT_MESSAGE) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
