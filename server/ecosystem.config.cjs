module.exports = {
  apps: [
    {
      name: "pchill-api",
      cwd: __dirname,
      script: "server.js",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

