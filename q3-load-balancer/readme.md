You are implementing a load balancer for Jupyter servers.

The system receives CONNECT, DISCONNECT, and SHUTDOWN requests.

For CONNECT requests, route each connection to a target server using these rules:
- Prefer the target with the fewest active connections.
- If multiple targets have the same load, choose the smaller target index.
- If the requested object ID already has an active connection, the new connection must be routed to the same target as that object.
- A target cannot exceed maxConnectionsPerTarget active connections.
- If all eligible targets are full, reject the connection and do not add it to the log.

For DISCONNECT requests:
- Remove the specified connection from its target.
- No new log entry is created.
- You may assume every DISCONNECT corresponds to an active connection.

For SHUTDOWN,targetIndex:
- All active connections on that target are evicted.
- Re-route the evicted connections in connection ID order.
- Apply the same load-balancing and object-ID rules when re-routing.
- Log every new connection created by the re-routing.
- The target immediately becomes available again after shutdown.

Each accepted connection should be logged as:
connectionId,userId,targetIndex

Constraints:
- numTargets >= 1
- maxConnectionsPerTarget >= 1
- Target indices are 1-based.
- Connection IDs are unique for active connections.
- A DISCONNECT is only received for an active connection.
- Object IDs may be shared by multiple active connections.
- Rejected connections must not appear in the output.
- All requests must be processed in the order given.