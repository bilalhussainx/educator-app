// ecosystem.config.js
// pm2 configuration for running both server and worker in one service

module.exports = {
  apps : [
    {
      name   : "educator-api",
      script : "./educators-edge-backend/server.js", // Path to your main server
      env_production: {
        NODE_ENV: "production",
        PORT: 10000
      }
    },
    {
      name   : "educator-worker",
      script : "./educators-edge-backend/dockerWorker.js", // Path to your worker script
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
}