#include <bits/stdc++.h>
using namespace std;

class user
{
public:
    // This map is storing roles for users in acount
    map<pair<string, string>, set<string>> roles;

    // This map would be mantaining relationship for parant
    map<string, string> parantAccount;

    // Polciy map  : stroring {userId, account,role} -> action
    map<tuple<string, string, string>, string> policyMap;

    // Assigning the roles
    void assignRole(string user, string account_id, string role, string action)
    {
        pair<string, string> key = {user, account_id};
        roles[key].insert(role);
        setPolicy(user, account_id, role, action);
    }
    void makeParant(string account, string parant)
    {
        parantAccount[account] = parant;
    }
    void setPolicy(string user, string account, string role, string action)
    {
        policyMap[{user, account, role}] = action;
    }
    void mergeParantRoles(string userId, string accountId, set<string> &result, set<string> &denied)
    {

        // Base condtion
        if (!parantAccount.count(accountId))
            return;
        string parant = parantAccount[accountId];

        for (auto role : roles[{userId, parant}])
        {
            if (policyMap[{userId, parant, role}] == "deny")
            {
                denied.insert(role);
            }
            else
                result.insert(role);
        }

        mergeParantRoles(userId, parant, result, denied);
    }

    // filter the denied roles

    void filter(set<string> &result, set<string> &denied)
    {
        for (auto it = result.begin(); it != result.end();)
        {
            if (denied.count(*it))
            {
                it = result.erase(it);
            }
            else
            {
                ++it;
            }
        }
    }

    void getRolesForUserInAccount(string userId, string accountId)
    {
        set<string> result;
        set<string> denied;
        for (auto role : roles[{userId, accountId}])
        {
            if (policyMap[{userId, accountId, role}] == "deny")
            {
                denied.insert(role);
            }
            else
                result.insert(role);
        }
        mergeParantRoles(userId, accountId, result, denied);
        filter(result, denied);
        cout << "[ ";
        for (auto role : result)
        {
            cout << role << " ";
        }
        cout << "]\n";
    }
};

int main()
{
    user u;

    // ---------------- Hierarchy ----------------

    u.makeParant("wksp_1", "org_1");
    u.makeParant("sbx_1", "wksp_1");

    // ---------------- User Role Assignments ----------------

    u.assignRole("usr_1", "org_1", "admin", "allow");
    u.assignRole("usr_1", "org_1", "developer", "allow");

    u.assignRole("usr_1", "wksp_1", "analyst", "allow");
    u.assignRole("usr_1", "wksp_1", "developer", "deny");

    u.assignRole("usr_1", "sbx_1", "tester", "allow");

    // ---------------- Tests ----------------

    u.getRolesForUserInAccount("usr_1", "org_1");
    // [ admin developer ]

    u.getRolesForUserInAccount("usr_1", "wksp_1");
    // [ admin analyst ]

    u.getRolesForUserInAccount("usr_1", "sbx_1");
    // [ admin analyst tester ]
}