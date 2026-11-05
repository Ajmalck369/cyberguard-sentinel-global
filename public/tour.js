const preview=document.getElementById('vr-canvas');
const enter=document.getElementById('enter-vr');
const exit=document.getElementById('exit-vr');
const state=document.getElementById('vr-state');

const context=preview.getContext('2d');
if(context){
  context.fillStyle='#183a53';context.fillRect(0,0,640,360);
  context.fillStyle='#43856e';context.fillRect(95,45,450,270);
  context.strokeStyle='#d6e9f4';context.lineWidth=12;context.strokeRect(95,45,450,270);
  context.fillStyle='#83c9ef';context.fillRect(265,39,110,12);
  context.fillStyle='#aa7f57';context.fillRect(245,185,150,65);
  context.fillStyle='#edf6ff';context.font='18px system-ui';
  context.fillText('Fictional room · top view',20,28);
  context.fillText('Window',282,90);context.fillText('Couch',288,222);
}

let session=null;
const vertices=[];
function face(a,b,c,d,color){
  for(const point of [a,b,c,a,c,d]) vertices.push(...point,...color);
}
function box(x1,y1,z1,x2,y2,z2,color){
  const p=(x,y,z)=>[x,y,z];
  face(p(x1,y1,z1),p(x2,y1,z1),p(x2,y2,z1),p(x1,y2,z1),color);
  face(p(x2,y1,z2),p(x1,y1,z2),p(x1,y2,z2),p(x2,y2,z2),color);
  face(p(x1,y1,z2),p(x1,y1,z1),p(x1,y2,z1),p(x1,y2,z2),color);
  face(p(x2,y1,z1),p(x2,y1,z2),p(x2,y2,z2),p(x2,y2,z1),color);
  face(p(x1,y2,z1),p(x2,y2,z1),p(x2,y2,z2),p(x1,y2,z2),color);
  face(p(x1,y1,z2),p(x2,y1,z2),p(x2,y1,z1),p(x1,y1,z1),color);
}
box(-2,0,-3,2,0.02,2,[0.16,0.47,0.35]);
box(-2,2.8,-3,2,2.82,2,[0.33,0.44,0.54]);
box(-2,0,-3,-1.98,2.8,2,[0.17,0.38,0.55]);
box(1.98,0,-3,2,2.8,2,[0.17,0.38,0.55]);
box(-2,0,-3,2,2.8,-2.98,[0.14,0.34,0.52]);
box(-0.8,1.1,-2.94,0.8,2.2,-2.90,[0.44,0.76,0.91]);
box(-0.9,0,-1.8,0.9,0.55,-0.75,[0.58,0.39,0.25]);
box(-0.9,0.5,-1.8,0.9,1.1,-1.55,[0.58,0.39,0.25]);

function shader(gl,type,source){
  const value=gl.createShader(type);gl.shaderSource(value,source);gl.compileShader(value);
  if(!gl.getShaderParameter(value,gl.COMPILE_STATUS)) throw new Error('VR shader unavailable');
  return value;
}

async function startVr(){
  try {
    const xrSession=await navigator.xr.requestSession('immersive-vr');
    session=xrSession;
    const canvas=document.createElement('canvas');
    const gl=canvas.getContext('webgl',{xrCompatible:true,alpha:false});
    if(!gl) throw new Error('WebGL unavailable');
    await gl.makeXRCompatible();
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,'attribute vec3 position; attribute vec3 color; uniform mat4 projection; uniform mat4 view; varying vec3 shade; void main(){shade=color;gl_Position=projection*view*vec4(position,1.0);}'));
    gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,'precision mediump float; varying vec3 shade; void main(){gl_FragColor=vec4(shade,1.0);}'));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('VR scene unavailable');
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    for(const [name,offset] of [['position',0],['color',12]]){
      const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,24,offset);
    }
    const projection=gl.getUniformLocation(program,'projection');
    const viewMatrix=gl.getUniformLocation(program,'view');
    xrSession.updateRenderState({baseLayer:new XRWebGLLayer(xrSession,gl)});
    const reference=await xrSession.requestReferenceSpace('local-floor');
    enter.hidden=true;exit.hidden=false;state.textContent='VR room active. Remain seated or stationary; use Exit VR to leave.';
    xrSession.addEventListener('end',()=>{session=null;enter.hidden=false;exit.hidden=true;state.textContent='VR room closed.';},{once:true});
    const frame=(_time,xrFrame)=>{
      if(xrSession!==session) return;
      xrSession.requestAnimationFrame(frame);
      const pose=xrFrame.getViewerPose(reference);
      if(!pose) return;
      const layer=xrSession.renderState.baseLayer;
      gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0.04,0.08,0.12,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      for(const view of pose.views){
        const viewport=layer.getViewport(view);
        gl.viewport(viewport.x,viewport.y,viewport.width,viewport.height);
        gl.uniformMatrix4fv(projection,false,view.projectionMatrix);
        gl.uniformMatrix4fv(viewMatrix,false,view.transform.inverse.matrix);
        gl.drawArrays(gl.TRIANGLES,0,vertices.length/6);
      }
    };
    xrSession.requestAnimationFrame(frame);
  }catch(error){
    if(session) await session.end().catch(()=>{});
    session=null;enter.hidden=false;exit.hidden=true;
    state.textContent='VR room could not open on this device. The text description and top view remain available.';
  }
}

if(navigator.xr?.isSessionSupported){
  navigator.xr.isSessionSupported('immersive-vr').then(supported=>{
    enter.disabled=!supported;
    enter.textContent=supported?'Enter VR room':'VR headset unavailable';
    state.textContent=supported?'VR is available on this device.':'Use the room description and top view on this device.';
  }).catch(()=>{enter.textContent='VR headset unavailable';state.textContent='VR support could not be checked.';});
} else {enter.textContent='VR headset unavailable';state.textContent='Use the room description and top view on this device.';}

enter.addEventListener('click',startVr);
exit.addEventListener('click',()=>session?.end());
