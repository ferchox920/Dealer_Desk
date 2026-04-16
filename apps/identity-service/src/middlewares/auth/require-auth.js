import Admin from '../../entities/admin.entity.js';
import { verifyAccessToken } from '../../utils/security/token.util.js';

async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 401,
        error: 'Authentication required.',
      });
    }

    const token = authorization.replace('Bearer ', '').trim();
    const payload = verifyAccessToken(token);
    const admin = await Admin.findByPk(payload.sub);

    if (!admin || !admin.is_active) {
      return res.status(401).json({
        status: 401,
        error: 'Invalid session.',
      });
    }

    req.user = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };

    next();
  } catch (_error) {
    return res.status(401).json({
      status: 401,
      error: 'Invalid or expired token.',
    });
  }
}

export { requireAuth };
