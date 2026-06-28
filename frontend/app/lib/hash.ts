import { createHash } from 'crypto';

export function computeMetadataHash(product: {
  category:       string;
  certifications: any[];
  description:    string;
  materials:      string[];
  name:           string;
  origin_city:    string;
  origin_country: string;
  year:           number | null;
}): string {
  // CRÍTICO: los campos deben estar en orden ALFABÉTICO
  // y el JSON no debe tener espacios
  const canonical = JSON.stringify({
    category:       product.category,
    certifications: product.certifications,
    description:    product.description,
    materials:      product.materials,
    name:           product.name,
    origin_city:    product.origin_city,
    origin_country: product.origin_country,
    year:           product.year,
  });
  return createHash('sha256').update(canonical).digest('hex');
  // Retorna string de 64 chars hex — listo para emit_passport
}
