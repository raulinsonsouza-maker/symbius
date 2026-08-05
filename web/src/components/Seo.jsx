import { useEffect } from 'react';
import {
  applySeo,
  clearPageJsonLd,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
} from '../lib/seo';

/**
 * Define SEO da rota atual. Em unmount, restaura defaults da home
 * (exceto se a próxima página aplicar o seu próprio Seo).
 */
export default function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image,
  noindex = false,
  type = 'website',
  jsonLd = null,
}) {
  useEffect(() => {
    applySeo({ title, description, path, image, noindex, type, jsonLd });
    return () => {
      clearPageJsonLd();
    };
  }, [title, description, path, image, noindex, type, jsonLd]);

  return null;
}
