const isPlainObject = (value) => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitized = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = String(key);

    if (
      normalizedKey === "__proto__" ||
      normalizedKey === "constructor" ||
      normalizedKey === "prototype" ||
      normalizedKey.includes("$") ||
      normalizedKey.includes(".")
    ) {
      continue;
    }

    sanitized[normalizedKey] = sanitizeValue(nestedValue);
  }

  return sanitized;
};

const sanitizeRequest = (req, res, next) => {
  try {
    if (req.body && isPlainObject(req.body)) {
      req.body = sanitizeValue(req.body);
    }

    if (req.query && isPlainObject(req.query)) {
      req.query = sanitizeValue(req.query);
      Object.keys(req.query).forEach((key) => {
        if (key.includes("$") || key.includes(".")) {
          delete req.query[key];
        }
      });
    }

    if (req.params && isPlainObject(req.params)) {
      req.params = sanitizeValue(req.params);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = sanitizeRequest;
