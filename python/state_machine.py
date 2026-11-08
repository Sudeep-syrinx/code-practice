class State:
    def __init__(self, name):
        self.name = name
        self.transitions = {}

    def add_transition(self, event, target_state):
        self.transitions[event] = target_state

class StateMachine:
    def __init__(self, initial_state):
        self.current_state = initial_state

    def trigger(self, event):
        if event in self.current_state.transitions:
            self.current_state = self.current_state.transitions[event]
            print(f"Transitioned to: {self.current_state.name}")
        else:
            print(f"Invalid event '{event}' for state '{self.current_state.name}'")

if __name__ == "__main__":
    traffic_light = State("Red")
    green = State("Green")
    yellow = State("Yellow")
    
    traffic_light.add_transition("timer", green)
    green.add_transition("timer", yellow)
    yellow.add_transition("timer", traffic_light)
    
    fsm = StateMachine(traffic_light)
    print(f"Initial state: {fsm.current_state.name}")
    
    fsm.trigger("timer")
    fsm.trigger("timer")
    fsm.trigger("timer")
    fsm.trigger("invalid_event")
    
    print("FSM test complete:", fsm.current_state.name == "Red")
