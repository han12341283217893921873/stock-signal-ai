module.exports = {
  apps: [
    {
      name: "stock-signal-ai",
      script: "server/_core/index.ts",
      interpreter: "npx",
      interpreter_args: "tsx --env-file=.env.local",
      cwd: "c:\\Users\\user\\Desktop\\stock_signal_ai (2)",
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
