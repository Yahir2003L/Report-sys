export async function getReportsBySector(
  sector: string,
  origin: string,
  cookie?: string
) {
  const res = await fetch(`${origin}/api/reports?sector=${sector}`, {
    headers: {
      cookie: cookie ?? ''
    }
  });

  if (!res.ok) {
    throw new Error('Error al obtener reportes');
  }

  return res.json();
}
