// ============================================================================
// authorize-roles.js
//
// Middleware para exigir roles concretos después de requireAuth.
// La idea es separar dos preguntas:
// 1) ¿Quién eres?  -> requireAuth
// 2) ¿Qué puedes hacer? -> authorizeRoles
// ============================================================================

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        error: 'Authentication required.',
      });
    }

    // Aquí no nos importa cómo se autenticó el usuario;
    // solo revisamos si su rol está dentro de los permitidos para la acción.
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 403,
        error: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
}

export { authorizeRoles };
