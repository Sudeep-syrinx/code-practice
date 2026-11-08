import time
from typing import Dict, List, Set, Optional

class BGPMsgType:
    OPEN = 1
    UPDATE = 2
    KEEPALIVE = 3
    NOTIFICATION = 4

class Route:
    def __init__(self, prefix: str, next_hop: str, as_path: List[int], local_pref: int = 100, origin: str = 'IGP'):
        self.prefix = prefix
        self.next_hop = next_hop
        self.as_path = as_path
        self.local_pref = local_pref
        self.origin = origin # 'IGP', 'EGP', or 'INCOMPLETE'
        
    def __repr__(self):
        return f"Route({self.prefix} via {self.next_hop} AS_PATH:{self.as_path} LOC_PREF:{self.local_pref})"

class Router:
    def __init__(self, router_id: str, asn: int):
        self.router_id = router_id
        self.asn = asn
        self.peers: Dict[str, 'Router'] = {} # IP -> Router obj
        
        # RIB (Routing Information Base)
        # RIB-IN: Raw routes received from peers
        self.rib_in: Dict[str, Dict[str, Route]] = {} # Peer_IP -> {Prefix -> Route}
        
        # LOC-RIB: Best routes selected by the BGP decision process
        self.loc_rib: Dict[str, Route] = {} # Prefix -> Route
        
        # Static local routes injected into BGP
        self.local_networks: Set[str] = set()

    def add_network(self, prefix: str):
        self.local_networks.add(prefix)
        # Inject to LOC-RIB
        self.loc_rib[prefix] = Route(prefix, self.router_id, [self.asn], 100, 'IGP')

    def add_peer(self, peer: 'Router'):
        if peer.router_id not in self.peers:
            self.peers[peer.router_id] = peer
            self.rib_in[peer.router_id] = {}
            # Auto bi-directional for simulation
            peer.add_peer(self)

    def receive_update(self, peer_ip: str, withdrawn_routes: List[str], nlri: List[Route]):
        changed = False
        
        # Handle withdrawals
        for prefix in withdrawn_routes:
            if peer_ip in self.rib_in and prefix in self.rib_in[peer_ip]:
                del self.rib_in[peer_ip][prefix]
                changed = True
                
        # Handle new/updated routes (Network Layer Reachability Information)
        for route in nlri:
            # 1. Loop Prevention (AS_PATH check)
            if self.asn in route.as_path:
                print(f"[BGP {self.router_id}] REJECTED {route.prefix} from {peer_ip} - AS_PATH Loop Detected: {route.as_path}")
                continue
                
            # Add to RIB-IN
            self.rib_in[peer_ip][route.prefix] = route
            changed = True
            
        if changed:
            self.run_decision_process()

    def run_decision_process(self):
        """BGP Best Path Selection Algorithm (Simplified)"""
        old_loc_rib = self.loc_rib.copy()
        self.loc_rib.clear()
        
        # Gather all candidates per prefix
        candidates: Dict[str, List[Route]] = {}
        
        # Add local networks
        for net in self.local_networks:
            if net not in candidates: candidates[net] = []
            candidates[net].append(Route(net, self.router_id, [self.asn], 100, 'IGP'))
            
        # Add routes from peers
        for peer_ip, routes in self.rib_in.items():
            for prefix, route in routes.items():
                if prefix not in candidates:
                    candidates[prefix] = []
                candidates[prefix].append(route)
                
        # Select best route
        for prefix, routes in candidates.items():
            best_route = routes[0]
            for r in routes[1:]:
                # 1. Highest Local Preference
                if r.local_pref > best_route.local_pref:
                    best_route = r
                elif r.local_pref == best_route.local_pref:
                    # 2. Shortest AS_PATH
                    if len(r.as_path) < len(best_route.as_path):
                        best_route = r
                    elif len(r.as_path) == len(best_route.as_path):
                        # 3. Lowest Origin Type (IGP < EGP < INCOMPLETE)
                        origin_prio = {'IGP': 1, 'EGP': 2, 'INCOMPLETE': 3}
                        if origin_prio[r.origin] < origin_prio[best_route.origin]:
                            best_route = r
                        elif origin_prio[r.origin] == origin_prio[best_route.origin]:
                            # 4. Lowest Router ID (Tie-breaker)
                            if r.next_hop < best_route.next_hop:
                                best_route = r
            self.loc_rib[prefix] = best_route
            
        # Determine if any routes changed to trigger updates to peers
        # In a real implementation, we'd compare old_loc_rib and self.loc_rib
        self.advertise_routes()

    def advertise_routes(self):
        for peer_ip, peer_router in self.peers.items():
            updates_to_send = []
            is_ebgp = (peer_router.asn != self.asn)
            
            for prefix, route in self.loc_rib.items():
                # Split-horizon (Don't advertise route back to the peer we learned it from)
                if route.next_hop == peer_ip:
                    continue
                    
                new_as_path = list(route.as_path)
                # Prepend local ASN if eBGP
                if is_ebgp and (not new_as_path or new_as_path[-1] != self.asn):
                    new_as_path.append(self.asn)
                    
                new_route = Route(
                    prefix=prefix,
                    next_hop=self.router_id, # NEXT_HOP self
                    as_path=new_as_path,
                    local_pref=100 if is_ebgp else route.local_pref, # Reset local pref on eBGP boundary
                    origin=route.origin
                )
                updates_to_send.append(new_route)
                
            if updates_to_send:
                print(f"[{self.router_id} (AS{self.asn})] Adv to {peer_ip} (AS{peer_router.asn}): {[r.prefix for r in updates_to_send]}")
                peer_router.receive_update(self.router_id, [], updates_to_send)

if __name__ == "__main__":
    print("--- BGP ROUTING SIMULATOR ---")
    
    # Topology: 
    # AS100 (R1) --- AS200 (R2) --- AS300 (R3)
    #   \                            /
    #    \                          /
    #     ------- AS400 (R4) -------
    
    r1 = Router("10.0.0.1", 100)
    r2 = Router("10.0.0.2", 200)
    r3 = Router("10.0.0.3", 300)
    r4 = Router("10.0.0.4", 400)
    
    # Interconnects
    r1.add_peer(r2); r2.add_peer(r3)
    r1.add_peer(r4); r4.add_peer(r3)
    
    print("\n[Phase 1] Injecting Networks & Initial Convergence")
    r1.add_network("192.168.1.0/24")
    r1.run_decision_process() # Triggers advertisements
    
    print("\n[Phase 2] R3 adds a network")
    r3.add_network("172.16.0.0/16")
    r3.run_decision_process()
    
    print("\n--- FINAL ROUTING TABLES ---")
    for r in [r1, r2, r3, r4]:
        print(f"\nRouter {r.router_id} (AS{r.asn}) LOC-RIB:")
        for prefix, route in r.loc_rib.items():
            print(f"  > {route}")
