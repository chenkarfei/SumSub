module.exports = {
  apps: [
    {
      name: "kychub",
      script: "node_modules/.bin/next",
      args: "start -p 3004",
      env: {
        NODE_ENV: "production",
        // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
        JWT_SECRET: "REPLACE_WITH_STRONG_SECRET",
        SUMSUB_APP_TOKEN: "REPLACE_WITH_TOKEN",
        SUMSUB_SECRET_KEY: "REPLACE_WITH_SECRET",
        SUMSUB_BASE_URL: "https://api.sumsub.com",
        SUMSUB_WEBHOOK_SECRET: "REPLACE_WITH_WEBHOOK_SECRET",
        DATABASE_PATH: "/home/ubuntu/kychub/data/kyc.db",
        NEXT_PUBLIC_APP_URL: "https://kychub.biz",
      },
    },
  ],
};
