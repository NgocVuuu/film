module.exports = {
  apps: [
    {
      name: "pchill-api",
      cwd: __dirname,
      script: "server.js",
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
