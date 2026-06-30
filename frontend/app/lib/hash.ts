export async function computeMetadataHash(product: {
  category:       string;
  certifications: any[];
  description:    string;
  materials:      string[];
  name:           string;
  origin_city:    string;
  origin_country: string;
  year:           number | null;
}): Promise<string> {
  // Campos en orden ALFABÉTICO, sin espacios — mismo orden que el contrato espera
  const canonical = JSON.stringify({
    category:       product.category,
    certifications: product.certifications,
    description:    product.description,
    materials:      product.materials,
    name:           product.name,
    origin_city:    product.origin_city,
    origin_country: product.origin_country,
    year:           product.year,
  })
  const bytes = new TextEncoder().encode(canonical)
  const buffer = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
