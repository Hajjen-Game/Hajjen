// Single-thumb controls, mouse-friendly testing, and optional keyboard fallback.
import {normalizedInput} from './rules.js';
export function createMovementControls(){
  const pad=document.getElementById('joystick'),thumb=document.getElementById('joystickThumb');
  const keys=new Set();
  const touch={x:0,z:0};
  let pointer=null;
  const handles=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
  const onKeyDown=e=>{
    if(handles.includes(e.code)){e.preventDefault();keys.add(e.code);}
  };
  const onKeyUp=e=>keys.delete(e.code);
  window.addEventListener('keydown',onKeyDown);
  window.addEventListener('keyup',onKeyUp);
  const move=e=>{
    const bounds=pad.getBoundingClientRect();
    const midX=bounds.left+bounds.width/2,midY=bounds.top+bounds.height/2;
    const max=pad.clientWidth*.31;
    const dx=e.clientX-midX,dy=e.clientY-midY;
    const r=Math.max(1,Math.hypot(dx,dy));
    const k=Math.min(max,r)/r;
    touch.x=dx*k/max;touch.z=dy*k/max;
    thumb.style.transform='translate('+Math.round(touch.x*max)+'px,'+
      Math.round(touch.z*max)+'px)';
  };
  const release=e=>{
    if(pointer===null||(e&&e.pointerId!==pointer))return;
    pointer=null;touch.x=0;touch.z=0;thumb.style.transform='';
  };
  pad.addEventListener('pointerdown',e=>{
    if(pointer!==null)return;
    pointer=e.pointerId;pad.setPointerCapture(e.pointerId);move(e);
    e.preventDefault();
  });
  pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer)move(e);});
  pad.addEventListener('pointerup',release);
  pad.addEventListener('pointercancel',release);
  window.addEventListener('blur',()=>{keys.clear();release();});
  return {
    sample(){
      const x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-
        (keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
      const z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-
        (keys.has('KeyW')||keys.has('ArrowUp')?1:0);
      return normalizedInput(x||touch.x,z||touch.z);
    },
    reset(){keys.clear();release()},
    dispose(){keys.clear();release();window.removeEventListener('keydown',onKeyDown);
      window.removeEventListener('keyup',onKeyUp);}
  };
}
