// First User Authentication with Login Implicit Grant on Index.html

const platformClient = require("platformClient");

const client = platformClient.ApiClient.instance;

const clientID = "b27b01c2-8ce4-4a9a-a0d6-863e2a1c0207";

// Authenticate via Genesys Cloud
client.setPersistSettings(true, "profileTool");
client.setEnvironment("mypurecloud.ie");

client
  .loginImplicitGrant(clientID, "https://ralucaradu08.github.io/mypurecloud.github.io/index.html")
  .then((data) => {
    const token = data.accessToken;
    client.setAccessToken(token);
    
    //alert(token);
    localStorage.removeItem("token");      // clear previous item in local storage
    localStorage.setItem("token",token);  // should survive New Tab opening
   
  });

