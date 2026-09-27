#include<bits/stdc++.h>

using namespace std ;

// Complete the 'compute_account_balances' function below.

class metadata{
    public: 
    string account_id ;
    int timestamp ;
    string currency ; 
    int minor_unit ; 
    metadata() {} ; 
    metadata(string account_id,int timestamp, string currency , int minorunit){
        this->account_id = account_id ; 
        this->timestamp = timestamp; 
        this->currency = currency ;
        this->minor_unit = minorunit ; 
    }
};
// this would be aggregating 
unordered_map<string,int> aggregate ; 
map<string,metadata> transactions ; 
vector<metadata> rejected ; 
void createTransaction(string account_id ,int timestamp , string currency , int minor_unit) {
    int curr = aggregate[account_id] ; 
    if(curr+minor_unit<0){
        rejected.push_back(metadata(account_id,timestamp,currency,minor_unit)) ;
        return ;
    }  
    aggregate[account_id]=curr+minor_unit ; 
    metadata m(account_id,timestamp,currency,minor_unit); 
    transactions[account_id] = m ; 
}
void compute_account_balances() {
    for(auto it : aggregate) {
        if(it.second!=0) {
            cout<<it.first<<" :"<<it.second<<"\n" ; 
        }
    }
}

int main(){
   createTransaction("acct_321", 2, "usd", 100);
    createTransaction("acct_321", 5, "usd", -300);
    createTransaction("acct_321", 9, "usd", -800);
    createTransaction("acct_321", 10, "usd", 1000);

    compute_account_balances();
    for(auto t: rejected){
        cout<<"Time :"<<t.timestamp<<" "<<"Account : "<<t.account_id<<" "<<"currency : "<<t.currency<<" "<<"Balance : "<<t.minor_unit<<"\n" ; 
    }
}