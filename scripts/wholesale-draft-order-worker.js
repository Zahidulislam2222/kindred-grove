/**
 * Retired wholesale proxy.
 *
 * This handler no longer reads request data or environment bindings and performs
 * no network requests. If an old deployment is manually updated to this source,
 * it fails closed while a replacement is designed and reviewed.
 */
export default {
  async fetch() {
    return new Response('This endpoint is retired.', {
      status: 410,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  },
};
