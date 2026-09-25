#include <bits/stdc++.h>
using namespace std;

/*
    Stripe OA style - Load Balancer / State Machine template
    Parts usually unlock progressively.
*/

class LoadBalancer {
private:
    int numTargets;
    vector<int> connections;                    // connections[i] = current load of server i+1
    unordered_map<string, int> connToServer;    // connectionId -> serverIndex (1-based)
    unordered_map<string, int> objectToServer;  // objectId -> serverIndex (sticky)

    // number of connections , index 
    set<pair<int,int>> connectionSet ; 
public:

    LoadBalancer(int n) : numTargets(n) {
        connections.assign(n + 1, 0);           // 1-based indexing

        // Initially all the servers are free !
        for(int i = 1 ; i<=n; i++){
            connectionSet.insert({0,i}) ; 
        }
    }

    // Part 1: Basic least-connections load balancing
    // Returns the chosen server index (1-based), or -1 if failed
    int connect(const string& connectionId, const string& userId, const string& objectId) {

        // number of connections associated with the servers 
        int cons ;
        int serverIdx  ;

        if(objectToServer.count(objectId)) {
            serverIdx = objectToServer[objectId];
            cons=connections[serverIdx] ;
        }
        else {
            cons = connectionSet.begin()->first ; 
            serverIdx = connectionSet.begin()->second ; 
            objectToServer[objectId] = serverIdx;
        }
        // delete stale value 
        connectionSet.erase({cons,serverIdx}) ;

        connToServer[connectionId] = serverIdx; 
        objectToServer[objectId] = serverIdx ; 
        
        connections[serverIdx] = cons+1 ; 
        // update number of connections 
        connectionSet.insert({cons+1,serverIdx}) ; 
        return serverIdx ;
    }

    // Part 2: Disconnect
    void disconnect(const string& connectionId) {
        if(!connToServer.count(connectionId)) return ;

        int serverIdx = connToServer[connectionId] ; 
        int count = connections[serverIdx] ; 
        
        // erase from the server 
        connToServer.erase(connectionId) ; 

        connectionSet.erase({count,serverIdx}) ;

        connectionSet.insert({count-1,serverIdx}) ; 
    }

    // Optional later parts
    // void shutdown(int serverId) { ... }
};

vector<string> processRequests(int numTargets, const vector<string>& requests) {
    LoadBalancer lb(numTargets);
    vector<string> logs;

    for (const string& req : requests) {
        // Simple parsing (adjust according to exact input format)
        stringstream ss(req);
        string type;
        ss >> type;

        if (type == "CONNECT") {
            string connId, userId, objId;
            ss >> connId >> userId >> objId;

            int server = lb.connect(connId, userId, objId);
            if (server != -1) {
                // Exact format Stripe usually wants
                logs.push_back(connId + "," + userId + "," + to_string(server));
            }
        }
        else if (type == "DISCONNECT") {
            string connId;
            ss >> connId;
            lb.disconnect(connId);
        }
        // Add SHUTDOWN / other types later
    }

    return logs;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Example usage / testing
    int numTargets = 3;
    vector<string> requests = {
        "CONNECT c1 u1 objA",
        "CONNECT c2 u2 objB",
        "CONNECT c3 u3 objA",      // should be sticky to same server as objA
        "DISCONNECT c1",
        "CONNECT c4 u4 objC"
    };

    vector<string> result = processRequests(numTargets, requests);

    for (const string& line : result) {
        cout << line << "\n";
    }

    return 0;
}