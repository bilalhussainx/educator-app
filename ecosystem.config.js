// ecosystem.config.js
// pm2 configuration for running both server and worker in one service

module.exports = {
  apps : [
    {
      name   : "educator-api",
      script : "./server.js", // Path to your main server (copied to /usr/src/app/)
      env_production: {
        NODE_ENV: "production",
        PORT: 10000
      }
    },
    {
      name   : "educator-worker",
      script : "./dockerWorker.js", // Path to your worker script (copied to /usr/src/app/)
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
}