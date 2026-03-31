module.exports = {
  apps: [
    {
      name: "pchill-api",
<<<<<<< HEAD
      cwd: __dirname,
      script: "server.js",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

=======
      script: "server.js",
      instances: 2, // Dùng 2 instances nếu không dùng Redis adapter cho Socket.io
      exec_mode: "cluster",
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
>>>>>>> main
