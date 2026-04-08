import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeArea(value) {
  return String(value || '').trim().toLowerCase();
}

function parseBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

export function optionalAuth(req, _res, next) {
  const token = parseBearerToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    req.user = null;
    return next();
  }
}

export function requireAuth(req, res, next) {
  const token = parseBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing authorization token' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function getUserAreaScope(user) {
  if (!user) return null;

  const role = normalizeRole(user.role);
  if (role === 'district head' || role === 'admin') {
    return { all: true, areas: [] };
  }

  const areaList = Array.isArray(user.assignedAreas)
    ? user.assignedAreas
    : user.area
      ? [user.area]
      : [];

  const normalized = [...new Set(areaList.map(normalizeArea).filter(Boolean))];
  return { all: false, areas: normalized };
}

export function enforceAreaAccess(req, res, next) {
  const scope = getUserAreaScope(req.user);
  if (!scope || scope.all) return next();

  const area = normalizeArea(req.params.area || req.query.area || req.body.area);
  if (!area) {
    return res.status(400).json({ success: false, message: 'Area is required' });
  }

  if (!scope.areas.includes(area)) {
    return res.status(403).json({ success: false, message: 'Area access denied' });
  }

  return next();
}
