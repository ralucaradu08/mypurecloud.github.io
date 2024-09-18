/**
 * FUNCTIONS IN THIS FILE REQUIRE:
 * 1. architectApiInstance
 * 2. routingApiInstance
 * 3. userApiInstance
 */


// Retrieve and apply the giver profile to the given user
// (And all the api instances)
async function applyProfileToUser(profile, userId, architectApiInstance, routingApiInstance, userApiInstance) {
    if (typeof userId == undefined) {
        console.log("UserId not retrieved (is undefined). Cannot set profile");
        return;
    }
    profile = profile.toUpperCase();
    let skills = [];
    let profficiencies = [];

    let datatableId;
    // Retrieve the datatable id
    try {
        let opts = {
            "name": "A_PROFILES_AGENTS_UTILIZATION" // The name of the databable with the profiles
        };
        let data = await architectApiInstance.getFlowsDatatables(opts);
        datatableId = data.entities[0].id;
    } catch (error) {
        console.log("There was a failure calling getFlowsDatatables. Could not retrieve datatableId.");
        console.error(error);
        alert("Error while retrieving GCloud Datatable A_PROFILES_AGENTS_ALLOCATION!");
        return;
    }

    let agentRow;
    //Retrieve skills and proficiencies for the agent
    //IMPORTANT: Sets profficiencies to a string array of 'numbers', so they still need to be converted upon use
    try {
        let opts = { 
            'showbrief': false // Boolean | if true returns just the key field for the row
        };
        await architectApiInstance.getFlowsDatatableRow(datatableId, userId, opts)
        .then((data) => {
            agentRow = data
            console.log(`getFlowsDatatableRows success! data: ${JSON.stringify(data, null, 2)}`);
          })
    } catch (error) {
        console.log('There was a failure calling getFlowsDatatableRow. Could not retrieve datatable row.');
        console.error(error);
        return;
    }

    
    // Parse skills from the datatable row for the given profile
    switch (profile) {
        case "PRIMARY":
            skills = agentRow.PRIMARY_MEDIA.split("|");
            profficiencies = agentRow.PRIMARY_VALUES.split("|");
            break;
        case "BACKUP":
            skills = agentRow.BACKUP_MEDIA.split("|");
            profficiencies = agentRow.BACKUP_VALUES.split("|");
            break;
        case "DEFAULT":
            skills = agentRow.DEFAULT_MEDIA.split("|");
            profficiencies = agentRow.DEFAULT_VALUES.split("|");
            break;
        case "EMERGENCY":
            skills = agentRow.EMERGENCY_MEDIA.split("|");
            profficiencies = agentRow.EMERGENCY_VALUES.split("|");
            break;
        default:
            console.log("Unknown profile");
            return;
            //break;
    }
    agentRow.PROFILE_ACTIVE = profile; // Apply the current profile in memory

    // Update the active profile in Genesys
    try {
        let newRow = {
            'body': agentRow
        };
        await architectApiInstance.putFlowsDatatableRow(datatableId, userId, newRow);
    } catch (error) {
        console.log("There was a failure calling putFlowsDatatableRow. Could not update active profile.");
        console.error(error);
    }

    
    await changeSkills(skills, profficiencies, userId, userApiInstance);
     
     // done, limitted to 50 skills

}

// Changes the skills of the the given userId with given skills and corresponding profficiencies
// Assumes that skills and corresponding profficiencies match indecies in their respective arrays
// Assumes that skills have a UNIQUE name
async function changeSkills(listOfSkills, listOfProfficiencies, userId, userApiInstance) {
    
    let skillObjects = []; // List of skill Objects to be applied to the user in Genesys
    // Get skillId for each skill and add it to the list of skills
   
    let call_capacity =1;
    let email_capacity = 1;
    let chat_capacity = 4;
    let workitem_capacity = 1;
    let callback_capacity = 1;
    let message_capacity=1;

    
    for (let index = 0; index < listOfSkills.length; index++) {
       
        if ( (listOfSkills[index]=== undefined) || (listOfSkills[index].toString().trim() == "") ){
            continue;
        }
        else{
            if (listOfSkills[index].toString().trim().toUpperCase() == "MESSAGE"){
                message_capacity = listOfProfficiencies[index];
            }
            if (listOfSkills[index].toString().trim().toUpperCase() == "VOICE"){
                call_capacity = listOfProfficiencies[index];
            }
            if (listOfSkills[index].toString().trim().toUpperCase() == "EMAIL"){
                email_capacity = listOfProfficiencies[index];
            }
            if (listOfSkills[index].toString().trim().toUpperCase() == "CHAT"){
                chat_capacity = listOfProfficiencies[index];
            }
            if (listOfSkills[index].toString().trim().toUpperCase() == "WORKITEM"){
                workitem_capacity = listOfProfficiencies[index];
            }
            if (listOfSkills[index].toString().trim().toUpperCase() == "CALLBACK"){
                callback_capacity = listOfProfficiencies[index];
            }
        }
    }

    let body = `{
            "utilization": {
              "message": {
                "maximumCapacity": ${message_capacity},
                "interruptableMediaTypes": [
                  "call"
                ],
                "includeNonAcd": false
              },
              "workitem": {
                "maximumCapacity": ${workitem_capacity},
                "interruptableMediaTypes": [
                  "call",
                  "callback",
                  "chat",
                  "email",
                  "message"
                ],
                "includeNonAcd": true
              },
              "callback": {
                "maximumCapacity": ${callback_capacity},
                "interruptableMediaTypes": [],
                "includeNonAcd": false
              },
              "email": {
                "maximumCapacity": ${email_capacity},
                "interruptableMediaTypes": [
                  "call",
                  "callback",
                  "chat"
                ],
                "includeNonAcd": false
              },
              "chat": {
                "maximumCapacity": ${chat_capacity},
                "interruptableMediaTypes": [],
                "includeNonAcd": false
              },
              "call": {
                "maximumCapacity": ${call_capacity},
                "interruptableMediaTypes": [],
                "includeNonAcd": false
              }
            },
            "level": "Agent"
          }`

    // Replace the routing skills associated with the given user with the new list of skills
   
    try {
        await userApiInstance.putRoutingUserUtilization(userId, body);
    } catch (error) {
        console.log("There was a failure calling putRoutingUserUtilization. Could not update profile.");
        console.error(error);
        // alert on error
        $.getScript("js/sweetalert2.all.js",function(){
            Swal.fire({
              title: 'Failure!',
              text: 'There was a failure calling putRoutingUserUtilization. Could not update profile.',
              icon: 'error',
              toast: '',
              timer: 3000
            });
          });
    }
}

/**
 * Updates a profile (Primari, Backup, Default, Emergency) of a user (agent) in the Genesys datatable A_PROFILES_AGENTS_ALLOCATION
 * @param {string} profile Profile to be update
 * @param {string} userId The userId of which the profile should be update
 * @param {string} skillsString The new skills
 * @param {string} profficienciesString The new profficiencies
 * @param {} architectApiInstance The architect API instance through which the update should be peformed
 * @returns 
 */
async function updateProfileInDatatable(profile, userId, skillsString, profficienciesString, architectApiInstance) {
    profile = profile.toUpperCase();
    let datatableId;
    // Retrieve the datatable id
    try {
        let opts = {
            "name": "A_PROFILES_AGENTS_UTILIZATION" // The name of the databable with the profiles
        };
        let datatable = await architectApiInstance.getFlowsDatatables(opts);
        datatableId = datatable.entities[0].id;
    } catch (error) {
        console.log("There was a failure calling getFlowsDatatables");
        console.error(error);
        return;
    }
    let agentRow = {
        'key': userId,
        'PROFILE_ACTIVE': profile
    };
    let userFound = false;
    // Retrieve the original row from the datatable for the given user
    try {
        let opts = { 
            'showbrief': false // Boolean | if true returns just the key field for the row
        };
        agentRow = await architectApiInstance.getFlowsDatatableRow(datatableId, userId, opts);
        userFound = true;
    } catch (error) {
        console.log('There was a failure calling getFlowsDatatableRow. Row might now exist for given user. Applying default row');
        console.error(error);
    }
    // Adjust the row depending on the updated skills and proficiencies
    switch (profile) {
        case "PRIMARY":
            agentRow.PRIMARY_MEDIA = skillsString;
            agentRow.PRIMARY_VALUES = profficienciesString;
            break;
        case "BACKUP":
            agentRow.BACKUP_MEDIA = skillsString;
            agentRow.BACKUP_VALUES = profficienciesString;
            break;
        case "DEFAULT":
            agentRow.DEFAULT_MEDIA = skillsString;
            agentRow.DEFAULT_VALUES = profficienciesString;
            break;
        case "EMERGENCY":
            agentRow.EMERGENCY_MEDIA = skillsString;
            agentRow.EMERGENCY_VALUES = profficienciesString;
            break;
        default:
            break;
    }
    // Update/create the row in the datatable in Genesys
    try {
        if (userFound) { // If user already has a datatable row
            let newRow = {
                'body': agentRow
            };
            // Update the active profile in Genesys
            await architectApiInstance.putFlowsDatatableRow(datatableId, userId, newRow);
        } else { // Create a new (mostly empty) row for the given user
            await architectApiInstance.postFlowsDatatableRows(datatableId, agentRow);
        }
    } catch (error) {
        console.log(`There was a failure updating/creating the row in the datatable for this user: ${userId}`);
        console.error(error);
        return;
    }
}

/**
 * Retrieves the skill profiles from the source user and saves them to the destination user.
 * The (new) currently active profile is then also applied
 * @param {String} sourceUserId The user to use as source for skills
 * @param {String} destUserId The user to whom the skills are applied
 * @param {} userApiInstance 
 * @param {} architectApiInstance 
 * @param {} routingApiInstance 
 * @returns 
 */
async function applyFromAgent(sourceUserId, destUserId, userApiInstance, architectApiInstance, routingApiInstance) {
    let datatableId;
    // Retrieve the datatable id
    try {
        let opts = {
            "name": "A_PROFILES_AGENTS_UTILIZATION" // The name of the databable with the profiles
        };
        let data = await architectApiInstance.getFlowsDatatables(opts);
        datatableId = data.entities[0].id;
    } catch (error) {
        console.log("There was a failure calling getFlowsDatatables. Could not retrieve datatableId.");
        console.error(error);
        return;
    }
    let agentRow;
    // Retrieve the row from the datatable for the given source user
    try {
        let opts = { 
            'showbrief': false // Boolean | if true returns just the key field for the row
        };
        agentRow = await architectApiInstance.getFlowsDatatableRow(datatableId, sourceUserId, opts);
    } catch (error) {
        console.log('There was a failure calling getFlowsDatatableRow. Row might now exist for given source user.');
        console.error(error);
        alert("The agent you are trying to copy from does not have a profile.");
        return;
    }

    agentRow.key = destUserId; //  Change the key for the destination user

    // Update/create the row in the datatable for destination user
    try { //  Try to update if destination user already has a row
        // Update the active profile in Genesys
        let newRow = {
            'body': agentRow
        };
        await architectApiInstance.putFlowsDatatableRow(datatableId, destUserId, newRow);
    } catch (error) {
        console.log(`There was a failure calling putFlowsDatatableRow. Row might not exist for given destination user : ${destUserId}. A row will be created.`);
        console.error(error);

        try { // Create a row for the user, since user likely not in datatable
            await architectApiInstance.postFlowsDatatableRows(datatableId, agentRow);
        } catch (error) {
            console.log(`There was a failure calling postFlowsDatatableRows. Could not create row for this user: ${destUserId}.`);
            console.error(error);
        }
    }

    // Apply the currently active profile
    await applyProfileToUser(agentRow.PROFILE_ACTIVE, destUserId, architectApiInstance, routingApiInstance, userApiInstance);
}