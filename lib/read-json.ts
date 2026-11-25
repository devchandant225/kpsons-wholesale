/**
 * Reads a fetch response as JSON. If the server sent something else (e.g. an
 * nginx 502/504 HTML error page), returns a readable error instead of throwing
 * "Unexpected token '<'".
 */
export async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const hint =
      res.status === 502
        ? ' The app is not responding (check pm2 logs).'
        : res.status === 504
        ? ' The request timed out.'
        : res.status === 413
        ? ' The request was too large.'
        : '';
    return { ok: false, error: `Server error ${res.status}${res.statusText ? ` ${res.statusText}` : ''}.${hint}` };
  }
}
