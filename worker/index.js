export default {
  async fetch(request, env) {
    if (request.method !== 'GET') {
      return new Response(null, { status: 405, headers: { Allow: 'GET' } });
    }

    const path = new URL(request.url).pathname;
    if (path !== '/api/public/products') return new Response(null, { status: 404 });

    try {
      const { results } = await env.DB.prepare(
        'SELECT * FROM products WHERE isVisible = 1 ORDER BY code'
      ).all();
      return Response.json(results.map((row) => ({
        ...row,
        categories: JSON.parse(row.categories),
        images: JSON.parse(row.images),
        isVisible: true,
      })), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error(error);
      return Response.json({ error: 'Không tải được danh mục hoa.' }, { status: 500 });
    }
  },
};
