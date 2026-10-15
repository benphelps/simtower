//DD65 supplies MoveWindow's outer dimensions directly from DTMP/bitmap.
//Captionless templates have no USER border; their artwork/client drawing
//contains the frame already. RT400 then explicitly adds thin USER chrome.
export function nativeDialogFrameLayout(template,bitmap,{id=0,borderX=1,borderY=1,captionHeight=18}={}) {
  const caption=Boolean(template.style&0x00c00000);
  let [outerWidth,outerHeight]=bitmap?[bitmap.width,bitmap.height]:template.size;
  //1256D..125AD: 2*SM_CXBORDER, SM_CYCAPTION + SM_CYBORDER.
  if(Number(id)===400){outerWidth+=2*borderX;outerHeight+=captionHeight+borderY;}
  if(!caption){borderX=borderY=captionHeight=0;}
  const width=outerWidth-2*borderX,height=outerHeight-captionHeight-2*borderY;
  return {width,height,outerWidth,outerHeight,borderX,borderY,captionHeight,caption,paintBevel:!bitmap};
}

//DCAB ->3788E: four groups of three one-pixel GDI lines, then FillRect.
//LineTo includes the starting pixel and excludes its endpoint. All five
//requested high-byte grays exist exactly in the original logical palette.
export function nativeDialogFrameCommands(width,height) {
  const commands=[];
  const line=(x,y,nextX,nextY,color)=>{
    commands.push({color,rect:x===nextX?[x,Math.min(y,nextY)+(y>nextY?1:0),1,Math.abs(nextY-y)]:[Math.min(x,nextX)+(x>nextX?1:0),y,Math.abs(nextX-x),1]});
  };
  for(let i=0;i<3;i++) {
    line(width-2-i,i,i,i,'#b3b3b3');line(i,i,i,height-2-i,'#b3b3b3');
  }
  for(let i=0;i<3;i++) {
    line(i,height-1-i,width-1-i,height-1-i,'#8c8c8c');line(width-1-i,height-1-i,width-1-i,i,'#8c8c8c');
  }
  for(let i=0;i<3;i++) {
    line(width-4-i,3+i,3+i,3+i,'#666666');line(3+i,3+i,3+i,height-4-i,'#666666');
  }
  for(let i=0;i<3;i++) {
    line(4+i,height-4-i,width-4-i,height-4-i,'#e6e6e6');line(width-4-i,height-4-i,width-4-i,4+i,'#e6e6e6');
  }
  commands.push({color:'#cccccc',rect:[6,6,width-12,height-12]});
  return commands;
}

export function drawNativeDialogFrame(context,width,height) {
  for(const command of nativeDialogFrameCommands(width,height)) {
    context.fillStyle=command.color;context.fillRect(...command.rect);
  }
}
