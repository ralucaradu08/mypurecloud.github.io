/**
 * Checks whether the given user is a Supervisor
 * @param {String} userId The user to check
 * @param {} userApiInstance The api instance used to check
 * @returns true if user is a supervisor and false otherwise
 */
export async function isAdmin(userId, userApiInstance) {
    let roles;
    try {
        let data = await userApiInstance.getUserRoles(userId);
        roles = data.roles;
    } catch (error) {
        console.log("There was a failure calling getUserRoles");
        console.error(error);
        return;
    }

    if (typeof roles.find((elem) => elem.name == "Supervisor") !== undefined) {
        return true;
    } else {
        return false;
    }
}