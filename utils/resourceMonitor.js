const pidusage = require("pidusage");
const logger = require("../config/logger");

const startResourceMonitor = (intervalMs = 60_000) => {
  const timer = setInterval(async () => {
    try {
      const stats = await pidusage(process.pid);
       logger.info("Resource usage snapshot", {
         cpu_percent: Number(stats.cpu.toFixed(2)),
         memory_mb: Number((stats.memory / 1024 / 1024).toFixed(2)),
         uptime_s: Number((stats.elapsed / 1000).toFixed(0)),
       });
    } catch (err) {
      logger.error(`⚠️ Resource monitor failed: ${err.message}`);
    }
  }, intervalMs);
 timer.unref();
  return timer;
};

module.exports = { startResourceMonitor };
