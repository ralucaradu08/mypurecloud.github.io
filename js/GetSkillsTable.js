const ALLSkillsTable = $('#DTAllSkillsProfile_DOM').DataTable( {
  "lengthMenu": [ [15, 25, 50, 100,-1], [15, 25, 50, 100, "All"] ],
  "autoWidth": true,
  "pageLength":25,
  "columns": [{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""}]} );

const BUSkillsTable = $('#DTBulkSkillsProfile_DOM').DataTable( {
  "lengthMenu": [ [15, 25, 50, 100,-1], [15, 25, 50, 100, "All"] ],
  "pageLength":25,
  "autoWidth": true,
  "columns": [{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""}]} );

const ConfigSkillsTable = $('#DTConfigAgentSkills').DataTable( {
    "lengthMenu": [ [15, 25, 50, 100,-1], [15, 25, 50, 100, "All"] ],
    "autoWidth": true,
    "pageLength": 15,
    "columns": [{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""}]} );

const CompareSkillsTable = $('#DTCompareAgentSkills').DataTable( {
      "lengthMenu": [ [15, 25, 50, 100,-1], [15, 25, 50, 100, "All"] ],
      "autoWidth": true,
      "pageLength": 15,
      "columns": [{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""},{"defaultContent": ""}]} );
  

const buttonSaveProfile   = document.getElementById("BTNSaveProfile");
const buttonApplyProfile  = document.getElementById("BTNApplyProfile");
const MakeTheSame         = document.getElementById("BTNMakeTheSame");
const cardAlert           = document.getElementById("cardApplyAlert");


let routingApi = new platformClient.RoutingApi();
let architectApiInstance = new platformClient.ArchitectApi(); // for later on when I update the datatable
let agentApi = new platformClient.UsersApi(); // for Skills Update

// get current selection in the session storage
var currentAgentId = window.sessionStorage.getItem("currentAgentId");
var currentAgentName = window.sessionStorage.getItem("currentAgentName");
var currentProfileSelected = window.sessionStorage.getItem("currentProfile");
var bBulkUpdate = window.sessionStorage.getItem("bulkUpdate");
var compareToAgentId = window.sessionStorage.getItem("compareToAgentId");
var compareToAgentName = window.sessionStorage.getItem("compareAgentName");
var isEmptyProfile = false; // FOR APPLYING 


// for the bulk update page initialize the Agents Id Collection

const agentsSelectedArr=[]; // ADDITION: Made a const to prevent reassigning, otherwise "apply" doesn't work
 

// Add Event Handler for the Save Button - MIHAIL to check, if necessary
if ( buttonSaveProfile != null){
  buttonSaveProfile.addEventListener("click", async function() {
    
    // expand datatables to All for having all elements visible/instantiated
    if ((document.getElementById('DTAllSkillsProfile_DOM') != undefined) && (document.getElementById('DTAllSkillsProfile_DOM') != null)){
      ALLSkillsTable.page.len(-1).draw();
    }
    if ((document.getElementById('DTBulkSkillsProfile_DOM') != undefined) && (document.getElementById('DTBulkSkillsProfile_DOM') != null)){
      BUSkillsTable.page.len(-1).draw();
      BUUsersTable.page.len(-1).draw();
    }
    // ADDITION
    await onClickSave(currentProfileSelected,currentAgentId,bBulkUpdate,agentsSelectedArr);
    // Refresh current page after the profile is saved
    if (bBulkUpdate != "true"){
        location.reload(true);
    }
});
}

// Add Event Handler for the Apply Button - MIHAIL to check, if necessary
if ( buttonApplyProfile != null){
  buttonApplyProfile.addEventListener("click", async function() {

    // expand datatables to All for having all elements visible/instantiated
    if ((document.getElementById('DTAllSkillsProfile_DOM') != undefined) && (document.getElementById('DTAllSkillsProfile_DOM') != null)){
      ALLSkillsTable.page.len(-1).draw();
    }
    if ((document.getElementById('DTBulkSkillsProfile_DOM') != undefined) && (document.getElementById('DTBulkSkillsProfile_DOM') != null)){
      BUSkillsTable.page.len(-1).draw();
      BUUsersTable.page.len(-1).draw();
    }
    // ADDITION
    await onClickSave(currentProfileSelected,currentAgentId,bBulkUpdate,agentsSelectedArr);
    await onClickApply(currentProfileSelected,currentAgentId,bBulkUpdate,agentsSelectedArr);
    
    // Refresh current page after the profile is saved
    if (bBulkUpdate == "false"){
      location.reload(true);
    }
    
});
}

// Add Event Handler for the MakeTheSame Button - MIHAIL to MODIFY
if ( MakeTheSame != null){
    MakeTheSame.addEventListener("click", async function() {
    await copyAgentToCurrent(compareToAgentId,currentAgentId);
    // Refresh current page after the profile is saved
    if (bBulkUpdate != "true"){
        location.reload(true);
    }
    
});
}

if ((currentAgentId !="") && (currentAgentId != undefined)){
  bBulkUpdate = "false"; // Agent Context, not Bulk Update
}

async function CheckAndApply(skillbox){

  var skill_selected = false;
  var proficiency_selected;
  var skill_selected_name ="";
  var skill_selected_id = "";

  if (skillbox.checked){
    skillbox.disabled = true;
  }

  let indexSkill = skillbox.value;

  if (Number(indexSkill) >= 1){

      skill_selected      = document.getElementById("star-s-"+indexSkill.toString()).checked; //if Skill is Selected
      skill_selected_id   = document.getElementById("skill_id-"+indexSkill.toString()).value;
      skill_selected_name = document.getElementById("skillname-"+indexSkill.toString()).value;

      if ((document.querySelector('input[name=rate_'+indexSkill+']:checked') !=undefined) && (document.querySelector('input[name=rate_'+indexSkill+']:checked') != null)){
          proficiency_selected = document.querySelector('input[name=rate_'+indexSkill+']:checked').value;
      }
} else {
    skill_selected = false;
    proficiency_selected = 0;
}
  if ((skill_selected == true) && (proficiency_selected == undefined)){
    proficiency_selected = 0;
  }

  if ((skill_selected == true)||( (proficiency_selected != undefined) && (proficiency_selected > 0) )){
    // alert("Updating Skill for Agent: " + currentAgentId +" with Value: "+ skill_selected_id + ":"+proficiency_selected);
    console.log("Updating Utilization for Agent: " + currentAgentId +" with Value: "+ skill_selected_name + ":"+proficiency_selected);
    await UpdateSkill(currentAgentId,skill_selected_id,proficiency_selected,agentApi);
  }
  
}

// To be Corrected for Apply Now

async function CheckAndApplyBulk(skillbox){

  var skill_selected = false;
  var proficiency_selected;
  var skill_selected_name ="";
  var skill_selected_id = "";
  
  // get selected agents in the table
  var i_NoAgents = 0;

  // get UsersList from the Session Storage JSON-string
  var myUsersJSON = window.sessionStorage.getItem("UsersList");
  var myUsersList = new Array();

  // get Number of Agents in the Users List
  if ((myUsersJSON != undefined) && (myUsersJSON != null) && (myUsersJSON != "")){
    myUsersList = JSON.parse(myUsersJSON);
    i_NoAgents = myUsersList.length;
  } else{
        i_NoAgents = 0;
    }  


  ArrayAgentsSelected = new Array();

  
  //expand Selected Agents Table for Bulk Update

  if ((document.getElementById('DTBulkSkillsProfile_DOM') != undefined) && (document.getElementById('DTBulkSkillsProfile_DOM') != null)){
    BUSkillsTable.page.len(-1).draw();
    BUUsersTable.page.len(-1).draw();
  }

  // when Apply is checked, it can't be unchecked
  if (skillbox.checked){
    skillbox.disabled = true;
  }

  let indexSkill = skillbox.value;
  //alert(skillbox.value);

  if (Number(indexSkill) >= 1){

      skill_selected      = document.getElementById("star-s-"+indexSkill.toString()).checked; //if Skill is Selected
      skill_selected_id   = document.getElementById("skill_id-"+indexSkill.toString()).value;
      skill_selected_name = document.getElementById("skillname-"+indexSkill.toString()).value;

      if ((document.querySelector('input[name=rate_'+indexSkill+']:checked') !=undefined) && (document.querySelector('input[name=rate_'+indexSkill+']:checked') != null)){
          proficiency_selected = document.querySelector('input[name=rate_'+indexSkill+']:checked').value;
      }
} else {
    skill_selected = false;
    proficiency_selected = 0;
}
  if ((skill_selected == true) && (proficiency_selected == undefined)){
    proficiency_selected = 0;
  }

  // get the Array of Agents from the Bulk Agents Selector

  if ( bBulkUpdate == "true"){
    if (i_NoAgents > 0){

      var agentid_value = "";
      var element_agent_checkbox = "";

      for(let k=0; k<i_NoAgents; k++){

        agentid_value = myUsersList[k];

        element_agent_checkbox = document.getElementById('checkbox-'+agentid_value);
        element_agentid_input = document.getElementById('agentid-'+k);

        if ((element_agent_checkbox != undefined) && ( element_agent_checkbox.checked == true) && ( agentid_value != "")){
            ArrayAgentsSelected.push(agentid_value);  
        }

      }
    }
  }   // Got the Agents for Bulk Update


 
  if ((skill_selected == true)||( (proficiency_selected != undefined) && (proficiency_selected > 0) )){
    //alert("Updating Bulk Skill for Agents: " + currentAgentId +" with Value: "+ skill_selected_id + ":"+proficiency_selected);
    console.log("Updating Utilization for Agent: " + currentAgentId +" with Value: "+ skill_selected_name + ":"+proficiency_selected);

    let i = 0;
    while ( i < ArrayAgentsSelected.length){
     
      await UpdateSkill(ArrayAgentsSelected[i],skill_selected_id,proficiency_selected,agentApi);
      i++;
    }
  
   /*  $.getScript("js/sweetalert2.all.js",function(){
      Swal.fire({
        title: 'Bulk Updated Skill for Agents!',
        text: skill_selected_name +':'+proficiency_selected,
        icon: 'success',
        toast: '',
        timer: 5000
      });
    }); */

  }
  
}

function HandleChange(firstStar){
  //alert(firstStar.val());
  if (firstStar.value == '1'){
    firstStar.value = "";
  }
}

function CheckDeselect(myIndex){
  
  if ((myIndex != undefined) && (Number(myIndex)!=undefined) && (Number(myIndex)>=0))
    var get_selected_star= document.getElementById("star-s-"+myIndex);
    if (get_selected_star.checked == false){
      $('input[name=rate_'+Number(myIndex) + ']').prop('checked',false);
    }
}
// First if AgentId is not null, it is Agent-Context
// Retrieve Datatable Configuration from the cloud, wait for it
// Then draw the Skills Table, with actual values depicted
// If there is also a CompareTo Agent Context, retrieve configuration from the cloud and wait for it
// Then draw the second Skills Table, the compareTo Table
// The second Skills table doesn't need to be stored in the Session, it is display-only, no logic behind it.

const onLoadPage = async () => {

  var compare = "false"; // retrieve agent configuration mainly

  if (( bBulkUpdate == "false" ) && (currentAgentId !=undefined) && ( currentAgentId != "" ) && (currentAgentId != "undefined")){
    compare = "false";
    await selectUserConfiguration("A_PROFILES_AGENTS_ALLOCATION",currentAgentId,architectApiInstance,compare);
  }
  if (( bBulkUpdate == "false" ) && (typeof compareToAgentId !== "undefined") && (compareToAgentId != "") && (compareToAgentId != "undefined")){
    compare = "true"; // compare to another agent context
    await selectUserConfiguration("A_PROFILES_AGENTS_ALLOCATION",compareToAgentId,architectApiInstance,compare);
  }
  // after waiting for the result of the first 2 async calls, do something else here
  await getAllSkills(currentProfileSelected, routingApi);
}

onLoadPage();
// End of Async Call, OnLoadPage

  function toggle_star(source) {
    let checkboxes = document.querySelectorAll("input[name='starss']");
    for (var i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i] != source)
    checkboxes[i].checked = source.checked;
    }
    }


async function getAllSkills(currentProfileSelected,routingApi) {

  let SkillsPages = 0;
  let SkillsCollection = [];
  let iTotalSkills = 0;
  let sSkill = "";
  let array_Skills = new Array();

  let opts = {
    'pageSize': 100,
    'pageNumber': 1
  };

  sSkill = "call:Voice";
  array_Skills.push(sSkill);

  sSkill = "message:Message";
  array_Skills.push(sSkill);

  sSkill = "callback:Callback";
  array_Skills.push(sSkill);

  sSkill = "email:Email";
  array_Skills.push(sSkill);

  sSkill = "workitem:Workitem";
  array_Skills.push(sSkill);

  sSkill = "chat:Chat";
  array_Skills.push(sSkill);

  if ((currentProfileSelected == "") || (currentProfileSelected == undefined)){
    currentProfileSelected = "primary";
  }
  if ((bBulkUpdate == "") || (bBulkUpdate == undefined)){
    bBulkUpdate = "false";
  }
  DrawDTSkillsGeneric(array_Skills,currentProfileSelected,bBulkUpdate);


}

function DrawDTSkillsGeneric(array_Skills,s_profile, bulk_update){

  let nTotalSkills = 0;
  let sSkillIdName = "";
  let skill_id ="";
  let skill_name = "";
  let star_class = getStyle(s_profile);
  let skill_value = "";
  let star_selection ="";
  let profi_selection = "";
  let skillname_selection = "";
  let applyNow_button = "";

  if (array_Skills != undefined) {
    nTotalSkills = array_Skills.length;
  } else{
    nTotalSkills = 0;
  }

  // Store the Total Number of Skills in the Session Storage;
  window.sessionStorage.setItem("TOTAL_SKILLS",nTotalSkills);
  //alert(nTotalSkills);

  if (nTotalSkills > 0){
    for (let i=1; i<=nTotalSkills; i++){

      let j = i-1;
      sSkillIdName = array_Skills[j];
      skill_id = sSkillIdName.split(":")[0];
      skill_name = sSkillIdName.split(":")[1].toUpperCase();
      
      skillname_selection = `<input type="hidden" id="skillname-${i}" name="skillname-${i}" value="${skill_name}"><input type="hidden" id="skill_id-${i}" name="skill_id-${i}" value="${skill_id}">${skill_name}`;
      
      // If we are on the Bulk Update Page, empty Skills Table displayed.
      if (bulk_update.toLowerCase() == "true"){

        // empty selection star and empty values on proficiency
        
        applyNow_button = `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" name="sk_apply" value="${i}" id="flexSwitchCheckDefault_${i}" onclick="CheckAndApplyBulk(this);"> <label class="form-check-label" for="flexSwitchCheckDefault_${i}">Apply now</label></div>`;

        star_selection = `<div class="star-s"><input type="checkbox" id="star-s-${i}" name="starss" value="1" checked onChange="CheckDeselect(${i});"/><label for="star-s-${i}">1</label></div>`;
        if ((skill_name == 'MESSAGE') || (skill_name == 'CHAT')){
          profi_selection = `<div class="${star_class}"><input type="radio" id="star5_${i}" name="rate_${i}" value="5"/><label for="star5_${i}">5</label><input type="radio" id="star4_${i}" name="rate_${i}" value="4"  checked /><label for="star4_${i}">4</label><input type="radio" id="star3_${i}" name="rate_${i}" value="3" /><label for="star3_${i}">3</label><input type="radio" id="star2_${i}" name="rate_${i}" value="2" /><label for="star2_${i}">2</label><input type="radio" id="star1_${i}" name="rate_${i}" value="1" /><label for="star1_${i}">1</label></div>`;
        }
        else{
          profi_selection = `<div class="${star_class}"><input type="radio" id="star5_${i}" name="rate_${i}" value="5"/><label for="star5_${i}">5</label><input type="radio" id="star4_${i}" name="rate_${i}" value="4" /><label for="star4_${i}">4</label><input type="radio" id="star3_${i}" name="rate_${i}" value="3" /><label for="star3_${i}">3</label><input type="radio" id="star2_${i}" name="rate_${i}" value="2" /><label for="star2_${i}">2</label><input type="radio" id="star1_${i}" name="rate_${i}" value="1" checked /><label for="star1_${i}">1</label></div>`;
        }
        
        BUSkillsTable.row.add([skillname_selection,star_selection,profi_selection,applyNow_button]).draw(false);

      
      }
      
    }
  }
}

function getStyle(s_profile){

  if ((s_profile != "") && (s_profile != undefined)){
    
      s_profile = s_profile.toUpperCase();
            
            switch (s_profile){
                case "PRIMARY":
                    star_class ="rate";
                    break;
                case "BACKUP":
                    star_class ="rate_b";
                    break;
                case "DEFAULT":
                    star_class="rate_d";
                    break;
                case "EMERGENCY":
                    star_class="rate_e";
                    break;
                default:
                    star_class ="rate";
                    break;  
            }
 
  } else{
    star_class ="rate";
  }
  return star_class
}


async function selectUserConfiguration(tableName,v_currentAgentId,architectApiInstance,compare){

  //local arrays for data retrieved
  let all_skills=[];
  let primary_skills = [];
  let primary_values = [];
  let backup_skills = [];
  let backup_values =[];
  let default_skills = [];
  let default_values = [];
  let emergency_skills = [];
  let emergency_values = [];

  // local variables as retrieved from the Cloud
  let sProfileActive  ="";
  let sPrimarySkills  ="";
  let sPrimaryValues  ="";
  let sBackupSkills   ="";
  let sBackupValues   ="";
  let sDefaultSkills  ="";
  let sDefaultValues  ="";
  let sEmergencySkills  ="";
  let sEmergencyValues ="";
  let datatableId = "";
  let found = "false";
  let sTitle = "";
  let i = 0;
  let j = 0;

  if (compare == "false")
  {
    sTitle = document.getElementById("OverallAlocTitle");
  } else if (compare == "true")
  {
    sTitle = document.getElementById("OverallAlocCompareTitle");
  } else {
    sTitle = document.getElementById("OverallAlocTitle");
  }

  if ((v_currentAgentId == "") || (v_currentAgentId == undefined)){
      console.log("UserId not retrieved (is undefined). Cannot get profile");
      return;
  }

  if ((tableName == "") || (tableName == undefined)){
    console.log("Table Name not sent (is undefined). Cannot get profile");
    return;
  }

  let opts = {
    "name": (tableName) // The name of the databable with the profiles
  };

  // Retrieve the datatable id
  await architectApiInstance.getFlowsDatatables(opts)
  .then((data) => {
      datatableId = data.entities[0].id;
  })
  .catch((err) => {
      console.log("There was a failure calling getFlowsDatatables");
      console.error(err);
  });

  opts = {
      "showbrief": false // Boolean | if true returns just the key field for the row
  };

  await architectApiInstance
  .getFlowsDatatableRow(datatableId, v_currentAgentId, opts)
  .then((data) => {
    
    sProfileActive = data.PROFILE_ACTIVE.toUpperCase();
    sPrimarySkills = data.PRIMARY_MEDIA;
    primary_skills = sPrimarySkills.split("|");
    sPrimaryValues = data.PRIMARY_VALUES;
    primary_values = sPrimaryValues.split("|");
    sBackupSkills = data.BACKUP_MEDIA;
    backup_skills = sBackupSkills.split("|");
    sBackupValues = data.BACKUP_VALUES;
    backup_values = sBackupValues.split("|");
    sDefaultSkills = data.DEFAULT_MEDIA;
    default_skills = sDefaultSkills.split("|");
    sDefaultValues = data.DEFAULT_VALUES;
    default_values = sDefaultValues.split("|");
    sEmergencySkills = data.EMERGENCY_MEDIA;
    emergency_skills = sEmergencySkills.split("|");
    sEmergencyValues = data.EMERGENCY_VALUES;
    emergency_values = sEmergencyValues.split("|");
    all_skills=[];



    if ((sProfileActive != undefined) && (sProfileActive!="")){
      if (compare == "false"){
          sTitle.innerHTML += `<i class="fas fa-table me-1"></i>Overall Allocation - Active Profile: ${sProfileActive}`;
      } else {
          sTitle.innerHTML += ` - Active Profile: ${sProfileActive}`;
      }
    } else{
      if (compare == "false"){
        sTitle.innerHTML += `<i class="fas fa-table me-1"></i>Overall Allocation`;
      } 
    }

    // agent configuration set to Session Storage, but not for the Compare-To Context
    if (compare == "false"){
        window.sessionStorage.setItem("WS_PRIMARY_MEDIA",sPrimarySkills);
        window.sessionStorage.setItem("WS_PRIMARY_VALUES",sPrimaryValues);
        window.sessionStorage.setItem("WS_BACKUP_MEDIA",sBackupSkills);
        window.sessionStorage.setItem("WS_BACKUP_VALUES",sBackupValues);
        window.sessionStorage.setItem("WS_DEFAULT_MEDIA",sDefaultSkills);
        window.sessionStorage.setItem("WS_DEFAULT_VALUES",sDefaultValues);
        window.sessionStorage.setItem("WS_EMERGENCY_MEDIA",sEmergencySkills);
        window.sessionStorage.setItem("WS_EMERGENCY_VALUES",sEmergencyValues);
    }
    // agent configuration saved to Session Storage

    // Merge Primary Skills into All Skills, exclude duplicates
    for(i=0; i < primary_skills.length; i++){
      found = "false";
      if((primary_skills[i]!=undefined) && (primary_skills[i] !="")){
          if (all_skills.length === 0){
              all_skills.push(primary_skills[i]);
          } else{
            loop1:
              for (j=0; j < all_skills.length; j++){
                if (primary_skills[i].toUpperCase() == all_skills[j].toUpperCase()){
                  found = "true";
                  break loop1;
                }
            }
            if (found == "false"){
              all_skills.push(primary_skills[i].toUpperCase());
            }
          }
      }
    }

    // Merge Backup Skills into All Skills,exclude duplicates
    for(i=0; i < backup_skills.length; i++){
      if((backup_skills[i]!=undefined) && (backup_skills[i] !="")){
          found = "false";
          if (all_skills.length === 0){
              all_skills.push(backup_skills[i]);
          } else{
            loop2:
              for (j=0; j < all_skills.length; j++){
                if (backup_skills[i].toUpperCase() == all_skills[j].toUpperCase()){
                  found = "true";
                  break loop2;
                }
            }
            if (found == "false"){
              all_skills.push(backup_skills[i]);
            }
          }
        }
    }

    // Merge Default Skills into All Skills, exclude duplicates
    for(i=0; i < default_skills.length; i++){
      if((default_skills[i]!=undefined) && (default_skills[i] !="")){
          found = "false";
          if (all_skills.length === 0){
              all_skills.push(default_skills[i]);
          } else{
            loop3:
              for (j=0; j < all_skills.length; j++){
                if (default_skills[i].toUpperCase() == all_skills[j].toUpperCase()){
                  found = "true";
                  break loop3;
                }
            }
            if (found == "false"){
              all_skills.push(default_skills[i]);
            }
          }
    }
  }

    // Merge Emergency Skills into All Skills
    for(i=0; i < emergency_skills.length; i++){
      if((emergency_skills[i]!=undefined) && (emergency_skills[i] !="")){
          found = "false";
          if (all_skills.length === 0){
              all_skills.push(emergency_skills[i]);
          } else{
            loop4:
              for (j=0; j < all_skills.length; j++){
                if (emergency_skills[i].toUpperCase() == all_skills[j].toUpperCase()){
                  found = "true";
                  break loop4;
                }
            }
            if (found == "false"){
              all_skills.push(emergency_skills[i]);
            }
          }
    }
  }

    let skill_name ="";
    let skill_element_span ="";
    let skill_value_primary = "0";
    let skill_value_backup = "0";
    let skill_value_default = "0";
    let skill_value_emergency = "0";

    for(i=0; i<all_skills.length; i++){

        skill_name = all_skills[i].toUpperCase();

        found = "false";
        loop5:
        for(j=0;j<primary_skills.length;j++){
          if((primary_skills[j]!=undefined) && (primary_skills[j] !="") && (primary_skills[j].toUpperCase() == skill_name)){
            skill_value_primary = primary_values[j];
            found = "true";
            break loop5;
          }
        };

        if (found == "false"){skill_value_primary="NA"};

        found = "false";
        loop6:
        for(j=0;j<backup_skills.length;j++){
          if ((backup_skills[j]!=undefined) && (backup_skills[j] !="") && (backup_skills[j].toUpperCase() == skill_name)){
            skill_value_backup = backup_values[j];
            found = "true";
            break loop6;
          }
        };

        if (found == "false"){skill_value_backup="NA"};

        found = "false";
        loop7:
        for(j=0;j<default_skills.length;j++){
          if ((default_skills[j]!=undefined) && (default_skills[j] !="") && (default_skills[j].toUpperCase() == skill_name)){
            skill_value_default = default_values[j];
            found = "true";
            break loop7;
          }
        };

        if (found == "false"){skill_value_default="NA"};

        found = "false";
        loop8:
        for(j=0;j<emergency_skills.length;j++){
          if ((emergency_skills[j]!=undefined) && (emergency_skills[j] !="") && (emergency_skills[j].toUpperCase() == skill_name)){
            skill_value_emergency = emergency_values[j];
            found = "true";
            break loop8;
          }
        };

        if (found == "false"){skill_value_emergency="NA"};

        if (compare == "false"){
          ConfigSkillsTable.row.add([all_skills[i],skill_value_primary,skill_value_backup,skill_value_default,skill_value_emergency]).draw(false);
        } else {
          if ((getSkillValueProfile('PRIMARY',skill_name)=="NA") && (getSkillValueProfile('BACKUP',skill_name)=="NA") && (getSkillValueProfile('DEFAULT',skill_name)=="NA") && (getSkillValueProfile('EMERGENCY',skill_name)=="NA")){
            // the skill is particular to this agent, does not exist in the current Agent Scope
            // we color it to show it is EXTRA!
            skill_element_span =`${skill_name}&nbsp;&nbsp;<span class="badge rounded-pill bg-primary">+</span>`;
          } else {
            skill_element_span =`${skill_name}`;
          };
          CompareSkillsTable.row.add([skill_element_span,skill_value_primary,skill_value_backup,skill_value_default,skill_value_emergency]).draw(false);
        }
     
    }
   

  })
  .catch((err) => {
    
    if (compare == "false"){
      sTitle.innerHTML += `<i class="fas fa-table me-1"></i>Overall Allocation`;
    } 

    // Agent configuration saved to Session Storage to null values, nothing in the datatable
    if (compare == "false"){
        window.sessionStorage.setItem("WS_PRIMARY_MEDIA","");
        window.sessionStorage.setItem("WS_PRIMARY_VALUES","");
        window.sessionStorage.setItem("WS_BACKUP_MEDIA","");
        window.sessionStorage.setItem("WS_BACKUP_VALUES","");
        window.sessionStorage.setItem("WS_DEFAULT_MEDIA","");
        window.sessionStorage.setItem("WS_DEFAULT_VALUES","");
        window.sessionStorage.setItem("WS_EMERGENCY_MEDIA","");
        window.sessionStorage.setItem("WS_EMERGENCY_VALUES","");
    }
    // Agent configuration saved to Session Storage to null values, nothing in the datatable

    console.log('There was a failure calling getFlowsDatatableRow');
    console.error(err);
});


}

function getSkillValueProfile(s_profile,s_skill_name){

  let aPrimarySkills    = window.sessionStorage.getItem("WS_PRIMARY_MEDIA");
  let aBackupSkills     = window.sessionStorage.getItem("WS_BACKUP_MEDIA");
  let aDefaultSkills    = window.sessionStorage.getItem("WS_DEFAULT_MEDIA");
  let aEmergencySkills  = window.sessionStorage.getItem("WS_EMERGENCY_MEDIA");

  let aPrimaryValues    = window.sessionStorage.getItem("WS_PRIMARY_VALUES");
  let aBackupValues     = window.sessionStorage.getItem("WS_BACKUP_VALUES");
  let aDefaultValues    = window.sessionStorage.getItem("WS_DEFAULT_VALUES");
  let aEmergencyValues  = window.sessionStorage.getItem("WS_EMERGENCY_VALUES");

  let array_skills  = [];
  let array_values  = [];
  let var_return_value = "";
  

  if (s_profile != ""){
      let var_profile   = s_profile.toUpperCase();
      switch (var_profile){
        case "PRIMARY":
          array_skills = aPrimarySkills.split("|");
          array_values = aPrimaryValues.split("|");
          break;
        case "BACKUP":
          array_skills = aBackupSkills.split("|");
          array_values = aBackupValues.split("|");
          break;
        case "DEFAULT":
          array_skills = aDefaultSkills.split("|");
          array_values = aDefaultValues.split("|");
          break;
        case "EMERGENCY":
          array_skills = aEmergencySkills.split("|");
          array_values = aEmergencyValues.split("|");
          break;
        default:
          array_skills = aPrimarySkills.split("|");
          array_values = aPrimaryValues.split("|");
          break;
      }
  }

        let var_skillname = s_skill_name.toUpperCase();
        let found = "false";

        if ((array_skills != undefined) && (array_skills != null)){
          loop1:
            for(let i=0; i<array_skills.length; i++){
              if (array_skills[i].toUpperCase() == var_skillname){
                found = "true";
                var_return_value = array_values[i];
                break loop1;
              }
            }
          if (found == "false"){
            var_return_value = "NA";
          }
        }

        return var_return_value;
}

async function onClickSave(currentProfileSelected,currentAgentId,bBulkUpdate,agentsSelectedArr){

  let numberSkills = window.sessionStorage.getItem("TOTAL_SKILLS");
  let i_numberSkills = 0;
  let wo_skills ="";
  let wo_values = "";
  let numberAgents = 0;
  let i_numberAgents = 0;
  let saveProfile = true;
  let confirmOnce = false;

  agentsSelectedArr.length = 0; // ADDITION: changed due to reassignment issue

  if (UsersList != undefined) {
    numberAgents = UsersList.length;
    i_numberAgents = Number(numberAgents);
  }

  
  if ((numberSkills != undefined) && (numberSkills != null)){
    i_numberSkills = Number(numberSkills);
  }

  
  if (i_numberSkills > 0 ){
    
    for(j=1;j<=i_numberSkills;j++){

        var element_star_value = 0;
        var element_selection_star;
        var element_skill_name = "";
      
        if ((document.getElementById('star-s-'+j) != undefined) && (document.getElementById('star-s-'+j) != null)){
            element_selection_star = document.getElementById('star-s-'+j);
        }
        if ((document.getElementById('skillname-'+j) != undefined) && (document.getElementById('skillname-'+j)!= null)){
          element_skill_name = document.getElementById('skillname-'+j).value;
        }
        if ((document.querySelector('input[name=rate_'+j+']:checked') !=undefined) && (document.querySelector('input[name=rate_'+j+']:checked') != null)){
          element_star_value = document.querySelector('input[name=rate_'+j+']:checked').value;
        }

       if ( ((element_selection_star.checked != undefined) && (element_selection_star.checked == true))|| (element_star_value > 0) ){
          if (wo_skills == ""){
            wo_skills = element_skill_name;
          } else {
            wo_skills = wo_skills + "|"+ element_skill_name;
          }
          if (wo_values == ""){
            wo_values = element_star_value.toString();
          } else {
            wo_values = wo_values + "|"+ element_star_value.toString();
          }
       }
// end for loop
      }

      // MIHAIL IVANOV, PLACEHOLDER FOR SAVE TO DATATABLE;
      // FOR BULK UPDATE, We Retrieve the Selected Agents in the J-Query Datatable

      if ( bBulkUpdate == "true"){

        var myUsersList = new Array();
        var JSUsersList = window.sessionStorage.getItem("UsersList"); // get Users for Bulk Update
        var myUserId ="";

        if ((JSUsersList != undefined) && (JSUsersList != null)){
          myUsersList = JSON.parse(JSUsersList);
          i_numberAgents = myUsersList.length;
        }
       
        if (i_numberAgents > 0){

          var element_agent_checkbox = "";
          var element_agentid_input = "";

          for( let k=0; k<i_numberAgents; k++){
           
            myUserId = myUsersList[k];

            if ( myUserId!="" ){

                element_agent_checkbox = document.getElementById('checkbox-'+myUserId);
                element_agentid_input = document.getElementById('agentid-'+myUserId);
            
                if ((element_agent_checkbox != undefined) && ( element_agent_checkbox.checked == true)){
                    agentsSelectedArr.push(myUserId);  // MIHAIL, In principle each Agent appears only once, so it does not contain duplicates

            }
          }

          } // end for, loop through Agents see if checked
          
        } // if I do have some agents to manage

        // RRA, if Skill selection is empty confirm Save, otherwise, saveProfile = true
        if (((wo_skills == undefined) || (wo_skills == null) || (wo_skills.length == 0)) || ((wo_skills.length == 1) && (wo_skills[0].trim()=="")))
        {
          if (confirmOnce == false) {
            saveProfile=window.confirm('Your skills selection is empty! You are saving an empty Profile!');
            confirmOnce = true;
              if (saveProfile) {
                isEmptyProfile = true;
              }
          }
        } else {
          saveProfile = true;
          isEmptyProfile = false;
        }

        for (let index = 0; index < agentsSelectedArr.length; index++) { // Loop through agent array
          // Save the profile for the current agent
         if (saveProfile){
          await updateProfileInDatatable(currentProfileSelected, agentsSelectedArr[index], wo_skills, wo_values, architectApiInstance);
         }
        }
        // END BULK UPDATE SECTION

      } else { 
        // AGENT SCOPE SAVE PROFILE
        // RRA, if Skill selection is empty confirm, otherwise, save = true
        if (((wo_skills == undefined) || (wo_skills == null) || (wo_skills.length == 0)) || ((wo_skills.length == 1) && (wo_skills[0].trim()=="")))
        {
          if (confirmOnce == false) {
            saveProfile=window.confirm('Your skills selection is empty! You are saving an empty Profile!');
            confirmOnce = true;
              if (saveProfile) {
                isEmptyProfile = true;
              }
          }
        } else{
          saveProfile = true;
          isEmptyProfile = false;
        }
        // Save the profile for the current agent
        if (saveProfile){
          await updateProfileInDatatable(currentProfileSelected, currentAgentId, wo_skills, wo_values, architectApiInstance);
        }
      }
    }
  }

// ADDITION: Almost entirely
async function onClickApply(currentProfileSelected,currentAgentId,bBulkUpdate,agentsSelectedArr){
  // TODO: CHECK IF the Skills and Skills Values are Empty, should we delete all skills from the agent when applying?
  let userApiInstance = new platformClient.UsersApi(); // UserApiInstance to update the skills of agents
  let applyProfile = true;
  

  if (isEmptyProfile){
    applyProfile = window.confirm('Your are applying an Empty Profile! All Skills will be deleted!');
  } 
  else {
    applyProfile = true;
  }

  if (bBulkUpdate == "true") {
   
    
    for (let index = 0; index < agentsSelectedArr.length; index++) { // Loop through the array of agents
      // // Apply the profile to the current agent from the array
      
      if (applyProfile){
        await applyProfileToUser(currentProfileSelected, agentsSelectedArr[index], architectApiInstance, routingApi, userApiInstance);
      }
    };
    
    $.getScript("js/sweetalert2.all.js",function(){
      Swal.fire({
        title: 'Profile Applied!',
        text: (currentProfileSelected),
        icon: 'success',
        toast: '',
        timer: 3000
      });
    });
   

  } else {
    if (applyProfile){
      await applyProfileToUser(currentProfileSelected, currentAgentId, architectApiInstance, routingApi, userApiInstance); // Apply the profile to the agent
      //alert('Profile ' + currentProfileSelected.toUpperCase() + ' Applied!');
    }
  }
}

async function UpdateSkill(AgentId,SkillId,SkillLevel,userApiInstance){
 
  var userId = AgentId;
  let body = "";

  //alert(SkillId);
  if (SkillLevel == undefined){
    SkillLevel = 0;
  }

  if ((userId != undefined) && (SkillId != undefined) && (SkillId!="") && (SkillLevel!=undefined)){

    //callback
    if (SkillId == 'callback'){
      body=`{
        "utilization": {
            "callback": {
                "maximumCapacity": ${SkillLevel},
                "interruptableMediaTypes": [],
                "includeNonAcd": false
    }},
           "level": "Agent"
      }`
    }

    //email
    if (SkillId == 'email'){
      body=`{
        "utilization": {
          "email": {
              "maximumCapacity": ${SkillLevel},
              "interruptableMediaTypes": [
                "call",
                "callback",
                "chat"
              ],
              "includeNonAcd": false
    }},
          "level": "Agent"
      }`
    }

    //chat
    if (SkillId == 'chat'){
      body=`{
        "utilization": {
        "chat": {
            "maximumCapacity": ${SkillLevel},
            "interruptableMediaTypes": [],
            "includeNonAcd": false
    }},
          "level": "Agent"
    }`  
    }

    //message
    if (SkillId == 'message'){
      body = `
      {
            "utilization": {
              "message": {
                "maximumCapacity": ${SkillLevel},
                "interruptableMediaTypes": [
                  "call"
                ],
                "includeNonAcd": false
    }},
              "level": "Agent"
          }`
    }

    //workitem
    if (SkillId == 'workitem'){
      body = `
      {
        "utilization": {
        "workitem": {
            "maximumCapacity": ${SkillLevel},
            "interruptableMediaTypes": [
              "call",
              "callback",
              "chat",
              "email",
              "message"
            ],
            "includeNonAcd": true
    }},
          "level": "Agent"
      }`
    }

    //call
    if (SkillId == 'call'){
      body = `{
        "utilization": {
        "call": {
            "maximumCapacity": 1,
            "interruptableMediaTypes": [],
            "includeNonAcd": false
          }
    }},
          "level": "Agent"
}`
    }
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

  } else{
    return;
  }

}

async function copyAgentToCurrent(sourceAgentId, destinationAgentId){
  // MIHAIL here the code to copy the configuration
  await applyFromAgent(sourceAgentId, destinationAgentId, agentApi, architectApiInstance, routingApi);
}

