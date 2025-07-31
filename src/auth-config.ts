import { Configuration, LogLevel } from "@azure/msal-node";
import dotenv from 'dotenv';
dotenv.config();

export const config: Configuration = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID!}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
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


