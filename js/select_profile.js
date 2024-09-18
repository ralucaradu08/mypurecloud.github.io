import { applyProfileToUser } from "./changeProfile.js";
const platformClient = require("platformClient");

let userApiInstance = new platformClient.UsersApi();
let routingApiInstance = new platformClient.RoutingApi();
let architectApiInstance = new platformClient.ArchitectApi();

getUser(); // Rertieve active user info and update page

let userId; // userId of the currently logged in user. Gets set in getUser()

// Attach event listener to each profile picker button
document.querySelectorAll('.profilePick').forEach(button => {
    button.addEventListener('click', pickProfile);
});


// Get the current user info and update the page accordingly
async function getUser() {
    // Rertieves the userId of the currently logged in user
    try {
        let data = await userApiInstance.getUsersMe();
        userId = data.id;
        document.getElementById("userId").innerHTML = `<div class="small">Logged in as:</div><div class="small">${data.name}</div>`;
    } catch (error) {
        console.log("There was a failure calling getAuthorizationSubjectsMe");
        console.error(error);
        return;
    }
    
    let datatableId;
    // Retrieve the datatable id
    try {
        let opts = {
            "name": "A_PROFILES_AGENTS_ALLOCATION" // The name of the databable with the profiles
        };
        let data = await architectApiInstance.getFlowsDatatables(opts);
        datatableId = data.entities[0].id;
    } catch (error) {
        console.log("There was a failure calling getFlowsDatatables");
        console.error(error);
        window.sessionStorage.removeItem("agentActiveProfile"); // clear cache for the Active Profile
        window.sessionStorage.setItem("agentActiveProfile","NA");
        return;
    }

    // Retrieve currently active profile
    try {
        let opts = { 
            'showbrief': false // Boolean | if true returns just the key field for the row
        };
        let data = await architectApiInstance.getFlowsDatatableRow(datatableId, userId, opts);
        document.getElementById("profileDisplay").innerHTML = `Your current profile is: ${data.PROFILE_ACTIVE}`;
        
        window.sessionStorage.removeItem("agentActiveProfile");     // clear cache for the Active Profile
        window.sessionStorage.setItem("agentActiveProfile", data.PROFILE_ACTIVE);

    } catch (error) {
        console.log('There was a failure calling getFlowsDatatableRow');
        console.error(error);
        document.getElementById("profileDisplay").innerHTML = `Your current profile is: NA`;
        
        window.sessionStorage.removeItem("agentActiveProfile"); // clear cache for the Active Profile
        window.sessionStorage.setItem("agentActiveProfile","NA");
        
        $.getScript("js/sweetalert2.all.js",function(){
            Swal.fire({
              title: 'Skills Allocation is NOT Defined for Your User!',
              text: 'Please contact your supervisor about this!',
              icon: 'error',
              toast: '',
              timer: 5000
            });
          });
        return;
    }
}

function pickProfile() {

    let agentActiveProfile = window.sessionStorage.getItem("agentActiveProfile");
    let profile;
    let profileApplied = false;

    if (agentActiveProfile != "NA") {
        profile = this.textContent; // Profile to be assigned depending on the button that was clicked
    } else {
        profile = "NA";
        $.getScript("js/sweetalert2.all.js",function(){
            Swal.fire({
              title: 'Skills Allocation is NOT Defined for Your User!',
              text: 'Please contact your supervisor about this!',
              icon: 'error',
              toast: '',
              timer: 5000
            });
          });
    }
    // Apply the profile in Genesys
    
    if (agentActiveProfile != "NA") {
        applyProfileToUser(profile, userId, architectApiInstance, routingApiInstance, userApiInstance);
        //profile = window.sessionStorage.getItem("agentActiveProfile");
        //alert(profile);
        //updateDropDownHtml(profile);        // Update the page html
    }
    
    //document.getElementById("profileDisplay").innerHTML = `Your current profile is: ${profile.toUpperCase()}`;
}
