export function requireAdmin(req, res, next) {
  const token = req.header('X-Admin-Token');
  const expected = process.env.ADMIN_TOKEN || 'symbius-admin';
  if (!token || token !== expected) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  return next();
}
