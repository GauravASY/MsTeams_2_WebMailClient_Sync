import { Client } from "@microsoft/microsoft-graph-client";


export function authenticatedGraphClient(accessToken: string){
    const client = Client.init({
        authProvider: async (done) => {
            done(null, accessToken);
        }
    })
    return client;
}