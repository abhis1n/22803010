const { Log } = require('../utils/logger');

function loggingMiddleware(req, res, next) {
  const startTime = Date.now();

  Log(
    "backend",
    "info",
    "middleware",
    `Incoming ${req.method} request to ${req.originalUrl}`
  );

  res.on("finish", () => {
    const status = res.statusCode;

    if (status >= 500) {
      Log("backend", "error", "middleware", `${req.method} ${req.originalUrl} failed with status ${status}.`);
    } else if (status >= 400) {
      Log("backend", "warn", "middleware", `${req.method} ${req.originalUrl} rejected with status ${status}.`);
    } else {
      Log("backend", "debug", "middleware", `${req.method} ${req.originalUrl} completed successfully.`);
    }
  });

  next();
}

module.exports = loggingMiddleware;