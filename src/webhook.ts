import {userDataCacheStore} from './index.ts';
import { ConfidentialClientApplication } from '@azure/msal-node';
import {config} from './auth-config.ts';
import { authenticatedGraphClient } from './graph-helper.ts';

export async function renewSubscription(userAccountId: string): Promise<void> {
    console.log(`Attempting to renew subscription for user ${userAccountId}`)

    const tokenCache = userDataCacheStore[userAccountId].tokenCache;
    const subscriptionId = userDataCacheStore[userAccountId].subscriptionId;
    if(!tokenCache || !subscriptionId) {
        console.error(`No token cache found for user ${userAccountId}. Cannot renew subscription.`);
        return;
    }

    const tempMsalInstance = new ConfidentialClientApplication(config);
    tempMsalInstance.getTokenCache().deserialize(tokenCache);

    try {
        const account = (await tempMsalInstance.getTokenCache().getAllAccounts())
            .find(a => a.homeAccountId === userAccountId);
        
        if (!account) throw new Error("Could not find account in the deserialized cache.");
        const tokenResponse = await tempMsalInstance.acquireTokenSilent({
            scopes: ["Calendars.ReadWrite", "Calendars.ReadWrite.Shared"],
            account: account
        });

        const graphClient = authenticatedGraphClient(tokenResponse!.accessToken);
        const newExpiration = {
            expirationDateTime: new Date(Date.now() + 86400000).toISOString() // Renew for another 24 hours
        };
        await graphClient.api(`/subscriptions/${subscriptionId}`).update(newExpiration);
        console.log(`Successfully renewed subscription ${subscriptionId} for another 24 hours.`);

    } catch (error) {
        console.error("Failed to renew subscription:", error);
    }
}