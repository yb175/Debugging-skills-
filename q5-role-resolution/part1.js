'use strict';

function getRolesForUserInAccount(assignments, userId, accountId) {

  // {userId,accountId} -> [Roles]
  const userRole = new Map(); 
  for(let q of assignments){
    const {userId,accountId,role} = q ; 
    const key = `${userId}-${accountId}` ; 
    if(!userRole.has(key)){
      userRole.set(key,new Set()) ; 
    }
    const roles = userRole.get(key) ; 
    roles.add(role) ; 
  }
  const key = `${userId}-${accountId}` ; 
  let result = userRole.get(key) ; 
 
  if(!userRole.has(key)) return [] ; 
  result = [...result] ; 
  return result ; 
}

module.exports = { getRolesForUserInAccount };
