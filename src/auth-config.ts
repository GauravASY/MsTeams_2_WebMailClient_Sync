import { Configuration, LogLevel } from "@azure/msal-node";

export const config: Configuration = {
  auth: {
    clientId: process.env.CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID!}`,
    clientSecret: process.env.CLIENT_SECRET!,
  },
  system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: LogLevel.Info,
        },
    },
};


