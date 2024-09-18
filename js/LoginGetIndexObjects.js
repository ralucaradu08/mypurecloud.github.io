const UsersTable = $('#DTAllUsers_DOM').DataTable( {
  "lengthMenu": [ [10, 25, 50, 100,-1], [10, 25, 50, 100, "All"] ],
  "autoWidth": true,
  "pageLength": 25,
  "columns": [{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""}]} );

const BUUsersTable = $('#DTAllAgentsBulk').DataTable( {
  "lengthMenu": [ [15, 25, 50, 100,-1],[15, 25, 50, 100, "All"] ],
  "autoWidth": true,
  "pageLength": 25,
  "columns": [{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""}]} );
  
$(function(){
  if (document.getElementById("compareToAgent") != null){
    $("#compareToAgent").select2({dropdownAutoWidth : true});
    document.getElementById("compareToAgent").innerHTML += `<option value="">Compare To Agent</option>`;
  }
});

$(function(){
  if (document.getElementById("switchToAgent") != null){
    $("#switchToAgent").select2({dropdownAutoWidth : true});
    document.getElementById("switchToAgent").innerHTML += ` <option value="">Switch To Agent</option>`;
  }
});

let authorizationApi = new platformClient.AuthorizationApi();
let architectApi = new platformClient.ArchitectApi();
let usersApi = new platformClient.UsersApi();
let groupsApi = new platformClient.GroupsApi();

var divisions = [];       // All the division from the org of the user that is signed in

const UsersList = [];     // All Users the Supervisor can manage
const UsersBulk = [];     // All Users the Supervisor can manage

const DivisionsList = []; // All Divisions the Supervisor has access to
const GroupsList=[] // All Groups the Supervisor has access to

var UserId = "";          // Currently LoggedIn User
var IsSupervisor = false; // Current User is Supervisor
var BlkAgIdx = 0;         // Index in the Bulk Update Users table

// Get current selection in the storage
var isBulkUpdate = window.sessionStorage.getItem("bulkUpdate");
var IsAgentScope = window.sessionStorage.getItem("agentScope");


function GetURLParameter(sParam)
{
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) 
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) 
        {
            return sParameterName[1];
        }
    }
}

// JS Function with Promise to delay for number of miliseconds
// To be used if client.credentials.token.rate.per.minute is not increased

function delay(milliseconds){
  return new Promise(resolve => {
  setTimeout(resolve, milliseconds);
});
}


afterLogin();


async function afterLogin() {
  await getMeName();
  await getMeRoles(UserId,usersApi); //changes IsSupervisor
  
  window.sessionStorage.removeItem("DivisionsList"); // clear divisions from the cache, if role has changed.
  await getDivisionsMe(usersApi); // get list with allowed Divisions for current User
  //alert(IsSupervisor);
  
  if (IsSupervisor == false){
    // Agent Profile
    window.close();
  } else { 
    //  get divisions and users for the first time
    //  draw the table on the index page
    //await getDivisions();
    await getGroupsList(); 
    groupId = GetURLParameter("group_id");

    if (groupId != ''){
      // clean cached data

      window.sessionStorage.removeItem("UsersList"); 
      window.sessionStorage.removeItem("UsersBulk"); 

      while(UsersList.length > 0) {
        UsersList.pop();
      }
      while(UsersBulk.length > 0) {
        UsersBulk.pop();
      }
      await getAllUsersGroups(groupId);
      getAllUsersCached(groupId, UsersBulk);
    }
    
    
   
   // if ((isBulkUpdate != "") && (isBulkUpdate != undefined) && (isBulkUpdate.toLowerCase() == "true")){
   //     getAllUsersCached('','false',isBulkUpdate);
   // }
   // if (IsAgentScope == "true"){
   //     drawSelectBoxes();  // only for Agent Scope draw the select anther and compare boxes;
   // }
  }
}

async function getGroupsList(){

  let groups =[];
  let group_id="";
  let dropdownList = document.getElementById("divisionsList");

  let opts = { 
    "pageSize": 100, // Number | Page size
    "pageNumber": 1, // Number | Page number
    "sortOrder": "ASC" // String | Ascending or descending sort order
  };

  // Get a group list
await groupsApi.getGroups()
.then((data) => {
    groups = data.entities;
    groups.forEach((element) => {
      group_id = element.id;
      //getUsersInGroup(group_id);
      dropdownList.innerHTML += `<a class="nav-link" href="index.html?group_id=${element.id}&group_name=${element.name}">${element.name} (${element.memberCount})</a>`;
    })
    //console.log(`getGroups success! data: ${JSON.stringify(data, null, 2)}`);
})
.catch((err) => {
  
  console.log("There was a failure calling getGroups");
  console.error(err);
});

}

function toggle_chk(source) {
  var checkboxes = document.querySelectorAll("input[name='agent_bulk'].form-check-input");
  for (var i = 0; i < checkboxes.length; i++) {
  if (checkboxes[i] != source)
  checkboxes[i].checked = source.checked;
  }
  }

// Get All Authorized Divisions with List of Users

async function getDivisions() {
  let dropdownList = document.getElementById("divisionsList");
  let divisions = [];
  let urlDivisionId =  "";
  let divisionId = "";
  let divisionUserNo = 0;
  let divisionsPageNumber = 0;
  let divisionsTotal = 0;
  let divisionFilter = false;

  urlDivisionId = GetURLParameter("group_id"); // if it is a division selection

  // Retrieve a list of all divisions defined for the organization

  let opts = { 
    "pageSize": 100, // Number | The total page size requested
    "pageNumber": 1, // Number | The page number requested
    "objectCount": true, // Boolean | Include the count of objects contained in the division
  };

  await authorizationApi
    .getAuthorizationDivisions(opts)
    .then((data) => {
      divisions = data.entities; 
      divisionsTotal= 0;
      divisionsPageNumber = data.pageCount;

        if (divisions != undefined){
          divisionsTotal= divisions.length;
        } else{
          divisionsTotal= 0;
        }

        if (divisionsTotal > 0){    
              divisions.forEach((element) => {

                if ((element.objectCounts.USER != undefined) && (element.objectCounts.USER != null)){
                  divisionUserNo = element.objectCounts.USER;
                } else {
                  divisionUserNo = 0;
                }

                divisionId = element.id

                if (isDivisionAllowed(divisionId)){
                      //dropdownList.innerHTML += `<a class="nav-link" href="index.html?division_id=${element.id}&division_name=${element.name}">${element.name} (${divisionUserNo})</a>`;
                }
                
                if (((urlDivisionId == "") || (urlDivisionId == undefined) || (urlDivisionId === undefined)) && (divisionUserNo > 0) && (IsAgentScope == "false") && (isDivisionAllowed(divisionId))){
                    
                  if ((isBulkUpdate != "") && (isBulkUpdate != undefined) && (isBulkUpdate.toLowerCase() == "true")){
                      console.log('Bulk Update, Users extracted from Cache'); // and do nothing here
                  } else {
                    // Index Page for All Users
                      getAllUsers(divisionId);                
                    }
                } else {
                    // Division Page from Index, filter users by Division
                    if ((divisionId == urlDivisionId) && (divisionUserNo > 0) && (IsAgentScope == "false") && (isDivisionAllowed(divisionId))){
                      divisionFilter = true;
                      getAllUsersCached(divisionId, divisionFilter, 'false'); 
                    }
                }
              
              })
        } // end if we have divisions selected in the current result

        if ((divisionsPageNumber != undefined) && (divisionsPageNumber != null) && (divisionsPageNumber > 1)){ // multiple pages with divisions
            for (let i=2; i<=divisionsPageNumber; i++){
                opts = `{"pageSize":100,"pageNumber":${i},"objectCount":true}`;
                authorizationApi
                .getAuthorizationDivisions(opts)
                    .then((data) => {
                      divisions = data.entities; 
                      divisionsTotal= 0;
                      divisionsPageNumber = data.pageCount;

                        if (divisions != undefined){
                          divisionsTotal= divisions.length;
                        } else{
                          divisionsTotal= 0;
                        }

                        if (divisionsTotal > 0){    
                            divisions.forEach((element) => {

                              if ((element.objectCounts.USER != undefined) && (element.objectCounts.USER != null)){
                                divisionUserNo = element.objectCounts.USER;
                              } else {
                                divisionUserNo = 0;
                              }

                              divisionId = element.id;

                              if (isDivisionAllowed(divisionId)){                          
                                  //dropdownList.innerHTML += `<a class="nav-link" href="index.html?division_id=${element.id}&division_name=${element.name}">${element.name} (${divisionUserNo})</a>`;
                              }

                              if (((urlDivisionId == "") || (urlDivisionId == undefined) || (urlDivisionId === undefined)) && (divisionUserNo > 0) && (IsAgentScope == "false") && (isDivisionAllowed(divisionId))) {
                                
                                if ((isBulkUpdate != "") && (isBulkUpdate != undefined) && (isBulkUpdate.toLowerCase() == "true")){
                                  console.log('Bulk Update, Users extracted from Cache'); // do nothing
                                } else {
                                // Index Page for All Users
                                  getAllUsers(divisionId);
                                }
                                
                              } else {
                                if ((divisionId == urlDivisionId) && (divisionUserNo > 0) && (IsAgentScope == "false") && (isDivisionAllowed(divisionId))){
                                   // Division Page from Index
                                  divisionFilter = true;
                                  getAllUsersDivision(divisionId, divisionFilter,'false'); 
                                }
                              }
                            
                            })
                          } // end if we have divisions selected
                      })
                      .catch((err) => {
                        console.log("There was a failure calling getAuthorizationDivisions");
                        console.error(err);
                      })
                    } // end for pages loop
                    } // end if multiple pages, more than 100 divisions
        })
    .catch((err) => {
      console.log("There was a failure calling getAuthorizationDivisions");
      console.error(err);
    });
   
}

// Get All Authorized Divisions for this User with regards to routing:schedule:edit Permissions and List of Users

async function getDivisionsMe(usersApi) {
  
  let divisionsMe = new Array();
  let divisionsTotal = 0;
  let divisionsPageNumber = 0;


  // Retrieve a list of all divisions defined for the current User in Supervisor Scope

  
  //let permission = "directory:user:view";
  let permission = "routing:schedule:edit";

  let opts = { 
    "pageSize": 100, // Number | The total page size requested
    "pageNumber": 1, // Number | The page number requested
  };

  await usersApi
    .getAuthorizationDivisionspermittedPagedMe(permission, opts)
    .then((data) => {
      divisionsMe = data.entities; 
      divisionsTotal= data.total;
      divisionsPageNumber = data.pageCount;


        if (divisionsTotal > 0){    
              divisionsMe.forEach((element) => {
                if ((element.name != "0_OBJ_PROFILES") && (element.name != "Home")){
                    DivisionsList.push(element.id);
                }
              })
        } // end if we have divisions selected in the current result

        if ((divisionsPageNumber != undefined) && (divisionsPageNumber != null) && (divisionsPageNumber > 1)){ // multiple pages with divisions
            for (let i=2; i<=divisionsPageNumber; i++){
                
                permission = "routing:schedule:edit";
                opts = `{"pageSize":100,"pageNumber":${i}}`;
                usersApi
                .getAuthorizationDivisionspermittedPagedMe(permission, opts)
                    .then((data) => {
                      divisionsMe = data.entities; 
                      divisionsTotal= data.total;
                      divisionsPageNumber = data.pageCount;

                        if (divisionsTotal > 0){    
                            divisionsMe.forEach((element) => {
                              if ((element.name != "0_OBJ_PROFILES") && (element.name != "Home")){
                                  DivisionsList.push(element.id);
                              }
                            })
                          } // end if we have divisions selected
                      })
                      .catch((err) => {
                        console.log("There was a failure calling getAuthorizationDivisionspermittedPagedMe");
                        console.error(err);
                      })
                    } // end for pages loop
                    } // end if multiple pages, more than 100 divisions
                    
                    window.sessionStorage.setItem("DivisionsList",JSON.stringify(DivisionsList));
        })
    .catch((err) => {
      console.log("There was a failure calling getAuthorizationDivisionspermittedPagedMe");
      console.error(err);
    });
   
}

async function getAllUsersDivision(divisionId, divisionFilter) {

  let usersPageCount = 0;
  let usersCollection = [];
  let body_paged = "";
  let agentLink ="";
  let body;
  let element_table = document.getElementById("DTAllUsers_DOM");
  let element_bulk_data = "";
      
    body = {
        query: [{
          type: 'CONTAINS',
          fields: ['divisionId'],
          value: (divisionId)
        }],
        pageSize:'100',
        pageNumber: '1',
        sortOrder: 'ASC'
       };

        // Retrieve a list of users for the org (in the given division)


  await usersApi
  .postUsersSearch(body)
  .then((data) => {
    usersCollection =data.results;
    let usersTotal= 0;
        if (usersCollection != undefined){
          usersTotal= usersCollection.length;
        } else{
          usersTotal= 0;
        }
    usersPageCount = data.pageCount;
    if (usersTotal > 0){
      usersCollection.forEach((element) => {
      if (divisionFilter != true){
          UsersList.push(element.id);
          // User Details for the Bulk Update Table: UserId|UserName|UserState|UserEmail|DivisionId|DivisionName
          element_bulk_data = element.id + "|" + element.name + "|" + element.state + "|" + element.username + "|" + element.division.id + "|" + element.division.name;
          UsersBulk.push(element_bulk_data);
      }
    
    if ((element_table != undefined) && (element_table != null)){
      agentLink=`<a class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" href="agent_profiles.html?agent_id=${element.id}&agent_name=${element.name}&profile=primary">${element.name}</a>`;
      UsersTable.row.add([agentLink,element.state,element.username,element.division.name]).draw(false);
    }
    
    })
  } // if users were detected in the selection

  // for the next pages
  if ( usersPageCount > 1){
    for (let i=2; i<=usersPageCount; i++){
      body_paged = `{"query": [{"type": "CONTAINS","fields": ["divisionId"],"value":"${divisionId}"}],"pageSize":100,"pageNumber":${i},"sortOrder": "ASC"}`;
   

   usersApi
     .postUsersSearch(body_paged)
     .then((data_paged) => {
       usersCollection =data_paged.results;
       let usersTotal= 0;
        if (usersCollection != undefined){
          usersTotal= usersCollection.length;
        } else{
          usersTotal= 0;
        }
       if (usersTotal > 0){
          usersCollection.forEach((element) => {
            if (divisionFilter != true){
              UsersList.push(element.id);
              // User Details for the Bulk Update Table: UserId|UserName|UserState|UserEmail|DivisionId|DivisionName
              element_bulk_data = element.id + "|" + element.name + "|"+ element.state + "|" + element.username + "|" + element.division.id + "|" + element.division.name;
              UsersBulk.push(element_bulk_data);
            }
          
        if ((element_table != undefined) && (element_table != null)){
            agentLink=`<a class="link-primary link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" href="agent_profiles.html?agent_id=${element.id}&agent_name=${element.name}&profile=primary">${element.name}</a>`;
            UsersTable.row.add([agentLink,element.state,element.username,element.division.name]).draw(false);
        }    
        
          })
        }
        }) // end if users were detected in the selection for the next pages  
        .catch((err) => {
          console.log("There was a failure calling postUsersSearch");
          console.error(err);
        })
    }} // end for, end if

    

  })
  .catch((err) => {
    console.log("There was a failure calling postUsersSearch");
    console.error(err);
  });

  if (divisionFilter != true){
    window.sessionStorage.setItem("UsersList", JSON.stringify(UsersList));
    window.sessionStorage.setItem("UsersBulk", JSON.stringify(UsersBulk));
  }  
  
  return [UsersList,UsersBulk];
    
}

async function getAllUsersGroups(groupId) {

  let usersPageCount = 0;
  let usersCollection = [];
  let body_paged = "";
 
  let body;

  let element_bulk_data = "";

      
    body = {
        pageSize:'100',
        pageNumber: '1',
        sortOrder: 'ASC'
       };

        // Retrieve a list of users for the org (in the given division)


  await groupsApi
  .getGroupMembers(groupId,body)
  .then((data) => {
    usersCollection =data.entities;
    let usersTotal= 0;
        if (usersCollection != undefined){
          usersTotal= usersCollection.length;
        } else{
          usersTotal= 0;
        }
    usersPageCount = data.pageCount;
    if (usersTotal > 0){
      usersCollection.forEach((element) => {
      
          UsersList.push(element.id);
          // User Details for the Bulk Update Table: UserId|UserName|UserState|UserEmail|DivisionId|DivisionName
          element_bulk_data = element.id + "|" + element.name + "|" + element.state + "|" + element.username + "|" + element.division.id + "|" + element.division.name;
          UsersBulk.push(element_bulk_data);
      
    
    
    })
  } // if users were detected in the selection

  // for the next pages
  if ( usersPageCount > 1){
    for (let i=2; i<=usersPageCount; i++){
      body_paged = `{"pageSize":100,"pageNumber":${i},"sortOrder": "ASC"}`;
   

   groupsApi
   .getGroupMembers(groupId,body)
     .then((data_paged) => {
       usersCollection =data_paged.entities;
       let usersTotal= 0;
        if (usersCollection != undefined){
          usersTotal= usersCollection.length;
        } else{
          usersTotal= 0;
        }
       if (usersTotal > 0){
          usersCollection.forEach((element) => {
          
              UsersList.push(element.id);
              // User Details for the Bulk Update Table: UserId|UserName|UserState|UserEmail|DivisionId|DivisionName
              element_bulk_data = element.id + "|" + element.name + "|"+ element.state + "|" + element.username + "|" + element.division.id + "|" + element.division.name;
              UsersBulk.push(element_bulk_data);
            
        
          })
        }
        }) // end if users were detected in the selection for the next pages  
        .catch((err) => {
          console.log("There was a failure calling postUsersSearch");
          console.error(err);
        })
    }} // end for, end if

    

  })
  .catch((err) => {
    console.log("There was a failure calling postUsersSearch");
    console.error(err);
  });

  
  window.sessionStorage.setItem("UsersList", JSON.stringify(UsersList));
  window.sessionStorage.setItem("UsersBulk", JSON.stringify(UsersBulk));
   
  return [UsersList,UsersBulk];
  
    
}

// Get the Name of the currently LoggedIn User
async function getMeName() {

      let opts = `{"expand":["presence"],"integrationPresenceSource":""}`;
      let loggedInAsDiv = document.getElementById("LoggedInAs");

      // Get current user details.
      await usersApi
        .getUsersMe(opts)
        .then((data) => {
          meName = data.name;
          //alert(meName);
          UserId = data.id;
          if ((meName !== null) && (meName != undefined) && (meName != "undefined")){
            loggedInAsDiv.innerHTML += `<p>${meName}</p>`;
          }
          })
      .catch((err) => {
        console.log("There was a failure calling getUsersMe");
        console.error(err);
      });

}

// get My Roles to check if I am Supervisor or Not
async function getMeRoles(user_id, usersApi) {
  let roles = new Array();
  var elem;
  IsSupervisor = false;
  IsMedexAgent = false;

  try {
      let data = await usersApi.getUserRoles(user_id);
      roles = data.roles;
      //alert(JSON.stringify(data));
  } catch (error) {
      console.log("There was a failure calling getUserRoles");
      console.error(error);
      return;
  }

  if (roles.length > 0){
      loop1001:
      for (let i=0; i<roles.length; i++){
        elem = roles[i];
        if (elem.name.toLowerCase().includes("supervisor")){
          IsSupervisor = true;
          break loop1001;
        }
        if ((elem.name.toLowerCase().includes("mdx - agent"))||(elem.name.toLowerCase().includes("cma - agent"))){
          IsMedexAgent = true;
          break loop1001;
        }
      }
    }
  if ((IsMedexAgent == false) && (IsSupervisor==false)){
    window.close();
  }
}

// After 11th Jan 2024, Switch to Agent Function for Select Change

function switchAgentPage(sValue){
  let array_elements_url =[];
  let sAgentId = "";
  let sAgentName = "";
  let redirectUrl = "";

  var sProfileSelected = window.sessionStorage.getItem("currentProfile");

  if ((sValue !=undefined) && (sValue != "")){

    array_elements_url = sValue.split("|");
    try{
    sAgentId = array_elements_url[0];
    sAgentName = array_elements_url[1];
    }
    catch (error){
      sAgentId = sValue;
      sAgentId = "";
    };

    redirectUrl = `agent_profiles.html?agent_id=${sAgentId}&agent_name=${sAgentName}&profile=${sProfileSelected}`;
    location.replace(redirectUrl);


  }
}

function CompareToAgent(sValue){

  let sAgentId = "";
  let redirectUrl = "";
  let array_elements_url =[];
  let sAgentName = "";

  // Get current User Context from Session Storage

  var sProfileSelected = window.sessionStorage.getItem("currentProfile");
  var sCrtAgentId = window.sessionStorage.getItem("currentAgentId");
  var sCrtAgentName = window.sessionStorage.getItem("currentAgentName");

  if ((sValue !=undefined) && (sValue != "")){

      array_elements_url = sValue.split("|");
      try{
      sAgentId = array_elements_url[0];
      sAgentName = array_elements_url[1];
      }
      catch (error){
        sAgentId = sValue;
        sAgentId = "";
      };
  
      // set compareTo Agent Details to the Session Storage
      // alert(sAgentId);
      // alert(sAgentName);

      window.sessionStorage.setItem("compareAgentId",sAgentId);
      window.sessionStorage.setItem("compareAgentName",sAgentName.replace("%20", " "));

      redirectUrl = `agent_profiles.html?agent_id=${sCrtAgentId}&agent_name=${sCrtAgentName}&profile=${sProfileSelected}&compareTo=${sAgentId}`;
      location.replace(redirectUrl);
    
  }

}

function drawSelectBoxes(){

  let Compare2DropDown = document.getElementById("compareToAgent");
  let Switch2DropDown = document.getElementById("switchToAgent");
  let noAgents = 0;
  let sagentId = "";
  let sagentName = "";

  var myUsersList = new Array();
  var myUserData = "";

  var JSUsersList = window.sessionStorage.getItem("UsersBulk");

  ///alert(sessStorageSpace());

  if ((JSUsersList != undefined) && (JSUsersList != null)){
    myUsersList = JSON.parse(JSUsersList);
  }

  if ((myUsersList != undefined) && (myUsersList != null)){
    
    noAgents = myUsersList.length;
    
    for(let j=0; j< noAgents; j++){

      myUserData = myUsersList[j];
      sagentId = "";
      sagentName = "";

      if ((myUserData != undefined) && (myUserData != "") && (myUserData.includes("|"))){
          sagentId = myUsersList[j].split("|")[0];
          sagentName = myUsersList[j].split("|")[1];
      }

      if (Compare2DropDown != null){
        Compare2DropDown.innerHTML += `<option value="${sagentId}|${sagentName}">${sagentName}</option>`;
      }
      if (Switch2DropDown != null){
        Switch2DropDown.innerHTML += `<option value="${sagentId}|${sagentName}">${sagentName}</option>`;
      }
    }
  }
}

function isDivisionAllowed(divisionId){

  
  let jsonDivList = window.sessionStorage.getItem("DivisionsList");
  if ((jsonDivList != undefined) && (jsonDivList!=null) && (jsonDivList.includes(divisionId))){
    return true;
  }
  else {
    return false;
  }

}

function getAllUsersCached(groupId, UsersBulk){

  var myUsersCachedList = new Array();
  //var JSCachedUsersList = window.sessionStorage.getItem("UsersBulk");
  var nbUsers = 0;
  var suserLine = "";
  var user_id ="";
  var user_name = "";
  var user_state = "";
  var user_email = "";
  var user_divisionId = "";
  var user_divisionName = "";
  
  var user_details = new Array();

  let agentLink ="";
  let checkboxHTML = "";
  let element_name_id = "";
  let element_bulk_table = document.getElementById("DTAllAgentsBulk");
  

  /* if (( JSCachedUsersList != undefined ) && ( JSCachedUsersList != null )){
    myUsersCachedList = JSON.parse(JSCachedUsersList);
  } */
  myUsersCachedList = UsersBulk;

  if ((myUsersCachedList != undefined) && (myUsersCachedList != null)){

    nbUsers = myUsersCachedList.length;
    //alert(nbUsers);

    for(let j=0; j< nbUsers; j++){

      suserLine = myUsersCachedList[j]; // Format: // UserId|UserName|UserState|UserEmail|DivisionId|DivisionName
      if ((suserLine != undefined) && (suserLine != "") && (suserLine.includes("|"))){
        user_details = [];
        user_details = suserLine.split("|");
        user_id = user_details[0];
        user_name = user_details[1];
        user_state = user_details[2];
        user_email = user_details[3];
        user_divisionId = user_details[4];
        user_divisionName = user_details[5];

       
          element_name_id =`<input type="hidden" id="agentid-${user_id}" value="${user_id}">${user_name}`;
          checkboxHTML = `<div class="widget-todo-title-area d-flex align-items-center"><i data-feather="list" class='cursor-move'></i><div class="checkbox rows"><input type="checkbox" name="agent_bulk" class="form-check-input" id="checkbox-${user_id}"><label for="checkbox-${user_id}"></label></div></div>`;
          BUUsersTable.row.add([element_name_id,user_email,checkboxHTML,user_divisionName]).draw(false);
     
      }


    } // end for

  } // end if there is smth in Cache

}

// Get Session Storage Space in KB, limit is 5 MB

const sessStorageSpace = () => {
  let allStrings = '';
  for (const key of Object.keys(window.sessionStorage)) {
    allStrings += window.sessionStorage[key];
  }
  return allStrings ? 3 + ((allStrings.length * 16) / (8 * 1024)) + ' KB' : 'Empty (0 KB)';
};