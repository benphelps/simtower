//Source return paths are different from ordinary browser window repaint.
//A modal close must not automatically retry clouds or sample room poses.
export function nativeDialogReturnRedraw(template) {
  //1FD89→1FF1A restores scroll viaE927 thenF296, without explicit9CE0.
  if(Number.isInteger(template)&&template>=748&&template<=760)
    return {rebind:false,backgroundRefresh:true};
  //1C842/1C992: both Find forms EndDialog then9CE0→F296. Active tracking
  //takes1D7AF→E850, which likewise rebinds and invokesF296 after centering.
  if(template===510||template===520)return {rebind:true,backgroundRefresh:true};
  //FinanceCD23, transport20B13/20E67, people1FA10, About4CFE and
  //ordinary alertD73B return without either native redraw call.
  return null;
}

export function nativeEmergencyActivationRedraw(mode) {
  //17FE0 drains/resets gameplay first. Only nonzeroARG0 reaches18040.
  return mode?{rebind:true,redraw:true}:null;
}

export function nativeFacilityInspectorAvailable(type) {
  //1FD89 switch cases0/45 branch1FE4A returns0 without any DialogBox.
  return type!==0&&type!==45;
}
