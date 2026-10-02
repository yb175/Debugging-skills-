'use strict';

// {userId,accountId} -> [Roles]
const userRole = new Map(); 
const parantMap = new Map() ; 
const effectMap = new Map(); 
let result=new Set() ; 
let denied = new Set() ; 
function setHirerchy(userId,ch){
    if(!parantMap.has(ch)) return  ; 
    let parent = parantMap.get(ch) ;
     
    const key = `${userId}-${parent}`
    if(!userRole.has(key)) return ;
    const parentRoles = [...userRole.get(key)] ; 
    for(let role of parentRoles){
      const effectKey = `${userId}-${parent}-${role}`;
      const effect = effectMap.get(effectKey);

        if (effect === 'allow') {
            result.add(role);
        } else if (effect === 'deny') {
            denied.add(role);
        }
    }
    setHirerchy(userId,parent) ; 
}
function getRolesForUserInAccount(assignments,parent, userId, accountId) {
    userRole.clear();
    parantMap.clear();
    effectMap.clear() ; 
    result = new Set();
    denied = new Set() ; 
   for(let ch in parent){
    if(parent[ch]==null) continue ; 
    let p = parent[ch] ; 

    // p is the parant of ch 
    parantMap.set(ch,p) ; 

  }
  for(let q of assignments){
    const {userId,accountId,role,effect} = q ; 
    const key = `${userId}-${accountId}` ; 
    const effectKey = `${userId}-${accountId}-${role}` ;
    if(!userRole.has(key)){
      userRole.set(key,new Set()) ; 
    }
    effectMap.set(effectKey,effect) ; 
    const roles = userRole.get(key) ; 
    roles.add(role) ; 
  }
  const key = `${userId}-${accountId}` ; 
  const roles = userRole.get(key);

if (roles) {
    for (let role of roles) {
        const effectKey = `${userId}-${accountId}-${role}`;
        const effect = effectMap.get(effectKey);

        if (effect === 'allow') {
            result.add(role);
        } else if (effect === 'deny') {
            denied.add(role);
        }
    }
}
  
  setHirerchy(userId,accountId)

  for (let role of result){
    if(denied.has(role)) {
      result.delete(role)
    }
  }
  if(result.size==0) return [] 
  return [...result] ; 
}

module.exports = { getRolesForUserInAccount };
