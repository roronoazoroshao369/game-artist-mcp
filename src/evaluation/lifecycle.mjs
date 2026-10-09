const STATES=['DRAFT','PREFLIGHT_PASSED','RELEASED','COLLECTING','LOCKED','REVEALED','DECIDED'];
export function transitionSession({session,currentState,nextState}){
 const index=STATES.indexOf(currentState);
 if(index<0||STATES[index+1]!==nextState||session.state!==currentState)throw new Error('invalid transition');
 return {...session,state:nextState};
}
