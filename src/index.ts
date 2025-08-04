import express from 'express'
import dotenv from 'dotenv'
import session from 'express-session';
import { ConfidentialClientApplication, AuthorizationCodeRequest } from '@azure/msal-node';
import {config} from './auth-config.ts';
import { authenticatedGraphClient } from './graph-helper.ts';
import cors from 'cors';
dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL! || "http://localhost:5173",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, 
  }));

const userTokenCacheStore: { [key: string]: string } = {};

app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
    }
}));

const msalInstance = new ConfidentialClientApplication(config);

app.get("/auth/signin", async (req, res)=>{
    const authCodeUrlParameters = {
        scopes: ["Calendars.ReadWrite", "Calendars.ReadWrite.Shared", "offline_access"],
        redirectUri: process.env.AZURE_REDIRECT_URI!,
        prompt: "consent" 
    }
    try {
        const authUrl = await msalInstance.getAuthCodeUrl(authCodeUrlParameters);
        res.redirect(authUrl);
    } catch (error) {
        console.error("Error getting auth code URL:", error);
        res.status(500).send("Internal Server Error from /auth/signin");
    }
})

app.get("/auth/callback", async (req, res) => {
     const tokenRequest: AuthorizationCodeRequest = {
        code: req.query.code as string,
        scopes: ["Calendars.ReadWrite", "Calendars.ReadWrite.Shared"],
        redirectUri: process.env.AZURE_REDIRECT_URI!,
    };
    try {
        const response = await msalInstance.acquireTokenByCode(tokenRequest);
        (req.session as any).accessToken = response!.accessToken;
        (req.session as any).account = response!.account;
        const accountId = response!.account?.homeAccountId || "defaultAccountId";

        userTokenCacheStore[accountId] = msalInstance.getTokenCache().serialize();
        console.log(`Token cache for user ${accountId} has been stored.`);

        res.redirect("/subscribe")
    } catch (error) {
        console.error("Error acquiring token by code:", error);
        res.status(500).send("Internal Server Error from /auth/callback");
    }
})

app.get("/subscribe", async(req, res)=>{
    const accessToken = (req.session as any).accessToken;
    if (!accessToken) {
        return res.redirect('/auth/signin');
    }

    const subscription = {
        changeType: 'created,updated,deleted',
        notificationUrl: ' https://0f1ed5e478e8.ngrok-free.app/webhook-listener', 
        resource: '/me/events', 
        expirationDateTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        clientState: process.env.CLIENT_STATE_SECRET 
    };
     try {
        const graphClient = authenticatedGraphClient(accessToken);
        const result = await graphClient.api('/subscriptions').post(subscription);

        console.log('Successfully created subscription:', result);
        res.send(`<h2>Setup Complete!</h2><p>Your application is now listening for changes to your calendar. You can close this window. Any new events or changes will be logged in the server console.</p>`);
    } catch (error: any) {
        console.error('Error creating subscription:', error);
        res.status(500).send('Error creating subscription. Check your server logs and ngrok URL.');
    }
})

app.get("/webhook-listener", async(req, res)=>{
     const validationToken = req.query.validationToken;
    if (validationToken) {
        console.log("Received validation request from Microsoft Graph. Responding to prove ownership.");
        res.status(200).send(validationToken);
        return;
    }

    const notification = req.body.value[0];
    console.log(`\nReceived a change notification! Resource: ${notification.resource}`);

    // Acknowledge the request immediately. This is a requirement.
    res.status(202).send();
})

app.use("/calendar", async (req, res) => {
    const accessToken = (req.session as any).accessToken;
    if (!accessToken) {
        return res.status(401).send("Unauthorized");
    }
    try {
        const graphClient = authenticatedGraphClient(accessToken);
        const events = await graphClient.api('/me/calendar/events').get();
        res.json(events);
    } catch (error) {
        console.error("Error fetching calendar events:", error);
        res.status(500).send("Internal Server Error");
    }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});