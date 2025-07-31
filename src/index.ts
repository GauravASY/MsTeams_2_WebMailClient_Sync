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

app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
    }
}));

const msalInstance = new ConfidentialClientApplication(config);

app.use("/auth/signin", async (req, res)=>{
    const authCodeUrlParameters = {
        scopes: ["Calendars.ReadWrite", "Calendars.ReadWrite.Shared"],
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

app.use("/auth/callback", async (req, res) => {
     const tokenRequest: AuthorizationCodeRequest = {
        code: req.query.code as string,
        scopes: ["Calendars.ReadWrite", "Calendars.ReadWrite.Shared"],
        redirectUri: process.env.AZURE_REDIRECT_URI!,
    };
    try {
        const response = await msalInstance.acquireTokenByCode(tokenRequest);
        (req.session as any).accessToken = response!.accessToken;
        (req.session as any).account = response!.account;
        res.redirect("/calendar")
    } catch (error) {
        console.error("Error acquiring token by code:", error);
        res.status(500).send("Internal Server Error from /auth/callback");
    }
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