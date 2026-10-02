'use strict';

// {userId,accountId} -> [Roles]
const userRole = new Map(); 
const parantMap = new Map() ; 
let result=new Set() ; 
function setHirerchy(userId,ch){
    if(!parantMap.has(ch)) return  ; 
    let parent = parantMap.get(ch) ;
     
    const key = `${userId}-${parent}`
    if(!userRole.has(key)) return ;
    const parentRoles = [...userRole.get(key)] ; 
    for(let role of parentRoles){
      result.add(role) ; 
    }
    setHirerchy(userId,parent) ; 
}
function getRolesForUserInAccount(assignments,parent, userId, accountId) {
  userRole.clear();
    parantMap.clear();
    result = new Set();
   for(let ch in parent){
    if(parent[ch]==null) continue ; 
    let p = parent[ch] ; 

    // p is the parant of ch 
    parantMap.set(ch,p) ; 

  }
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
  result = userRole.has(key) ? new Set(userRole.get(key)) : result ; 
  setHirerchy(userId,accountId)

  if(result.size==0) return [] 
  return [...result] ; 
}

module.exports = { getRolesForUserInAccount };
