#include<bits/stdc++.h>

using namespace std ;


// Heirarchy support system 
class user{
    public : 
    map<pair<string,string>,set<string>> roles ;
    map<string,string> accountParant; 
    map<tuple<string,string,string>,string> policyMap ;  
    void makeParant(string account , string parant) {
        accountParant[account] = parant ; 
    }
    void assignWithPolicy(string userId , string accountId , string role,string policy){
        roles[{userId,accountId}].insert(role) ; 
        policyMap[{userId,accountId,role}] = policy ;
    }
    void mergeParantRoles(string userId , string accountId,set<string> &result,set<string>& denied) {
        auto key = {userId,accountId} ; 
        // No parant 
        if(!accountParant.count(accountId)) {
            return ; 
        }         
        auto parant = accountParant[accountId] ; 
        for(auto role : roles[{userId,parant}]){

            if(policyMap[{userId,accountId,role}]=="deny") {
                denied.insert(role) ; 
            }
            else result.insert(role) ;
        } 
        mergeParantRoles(userId,parant,result,denied) ;
    }
    void getRolesForUserInAccount(string userId, string accountId){
        cout<<"[ " ; 
        set<string> result;
        set<string> denied ; 

        for(auto role : roles[{userId,accountId}]){

            if(policyMap[{userId,accountId,role}]=="deny") {
                denied.insert(role) ; 
            }
            else result.insert(role) ; 
        }

        mergeParantRoles(userId,accountId,result,denied) ; 
        for(auto role : result){
            cout<<role<<" ";
        }
        cout<<"]" ; 

        cout<<"\n" ; 
    }
} ; 
int main() {
    // user p;

    // Assignments
    // p.assignWithPolicy("usr_1", "org_1", "admin","allow");
    // p.assignWithPolicy("usr_1", "wksp_1", "developer","allow");
    // p.assignWithPolicy("usr_1", "wksp_1", "analyst");
    // p.assignWithPolicy("usr_1", "sbx_1", "analyst");

    // p.assignWithPolicy("usr_2", "org_1", "developer");

    // p.assignWithPolicy("usr_3", "wksp_1", "analyst");
    // p.assignWithPolicy("usr_3", "wksp_1", "admin");

    // p.assignWithPolicy("usr_4", "wksp_2", "admin");
    // p.assignWithPolicy("usr_1", "org_1", "admin","allow");
    // p.assignWithPolicy("usr_1", "org_1", "admin","allow");

    // // Hierarchy
    // p.makeParant("wksp_1", "org_1");
    // p.makeParant("sbx_1", "wksp_1");
    // p.makeParant("sbx_2", "org_1");

    // // Tests
    // p.getRolesForUserInAccount("usr_1", "wksp_1");
    // p.getRolesForUserInAccount("usr_1", "sbx_1");
    user p;

    p.assignWithPolicy("usr_1", "org_1", "admin", "allow");
    p.assignWithPolicy("usr_1", "org_1", "developer", "allow");

    p.assignWithPolicy("usr_1", "wksp_1", "analyst", "allow");
    p.assignWithPolicy("usr_1", "wksp_1", "developer", "deny");

    p.assignWithPolicy("usr_1", "sbx_1", "tester", "allow");

    p.makeParant("wksp_1", "org_1");
    p.makeParant("sbx_1", "wksp_1");

    // Tests
    p.getRolesForUserInAccount("usr_1", "org_1");
    p.getRolesForUserInAccount("usr_1", "wksp_1");
    p.getRolesForUserInAccount("usr_1", "sbx_1");
}