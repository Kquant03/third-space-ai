// Shader sources for the WebGL2 living substrate background
// Derived from Ghost Species Lenia Lantern palette

export const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

export const FIELD_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_scroll;
uniform vec2 u_res;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 perm(vec4 x){return mod289(((x*34.0)+1.0)*x);}
float noise(vec3 p){
  vec3 a=floor(p);vec3 d=p-a;d=d*d*(3.0-2.0*d);
  vec4 b=a.xxyy+vec4(0,1,0,1);
  vec4 k1=perm(b.xyxy);vec4 k2=perm(k1.xyxy+b.zzww);
  vec4 c=k2+a.zzzz;vec4 k3=perm(c);vec4 k4=perm(c+1.0);
  vec4 o1=fract(k3*(1.0/41.0));vec4 o2=fract(k4*(1.0/41.0));
  vec4 o3=o2*d.z+o1*(1.0-d.z);
  vec2 o4=o3.yw*d.x+o3.xz*(1.0-d.x);
  return o4.y*d.y+o4.x*(1.0-d.y);
}

float fbm(vec3 p){
  float v=0.0,a=0.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p*=2.1;a*=0.48;}
  return v;
}

vec3 spectrum(float t){
  return clamp(vec3(0.5)+vec3(0.5)*cos(6.28318*(vec3(1.0)*t+vec3(0.0,0.33,0.67))),0.0,1.0);
}

void main(){
  vec2 uv=v_uv;
  vec2 aspect=vec2(u_res.x/u_res.y,1.0);
  vec2 p=uv*aspect;
  float t=u_time*0.12;
  float scroll=u_scroll*0.0003;
  vec2 mp=u_mouse*aspect;
  float mouseDist=length(p-mp);
  float mouseInf=exp(-mouseDist*mouseDist*6.0)*0.35;
  vec3 np=vec3(p*2.8,t+scroll);
  float n1=fbm(np);
  float n2=fbm(np*1.8+vec3(5.2,1.3,t*0.3));
  float n3=fbm(np*3.5+vec3(mouseInf*2.0,-mouseInf,t*0.5));
  float organisms=smoothstep(0.38,0.65,n1)*smoothstep(0.3,0.55,n2);
  organisms+=mouseInf*smoothstep(0.2,0.5,n3)*0.8;
  organisms=clamp(organisms,0.0,1.0);
  float tendrils=smoothstep(0.44,0.48,n1)*smoothstep(0.42,0.46,n2)*0.35;
  float field=organisms+tendrils;
  float voidBreath=0.5+0.5*sin(t*0.8+n1*4.0);
  vec3 col=vec3(0.004+voidBreath*0.008,0.003+voidBreath*0.004,0.022+voidBreath*0.02);
  float density=smoothstep(0.02,0.7,field);
  float dd=density*density;
  vec3 creatureColor=mix(vec3(0.38,0.12,0.68),vec3(1.0,0.74,0.06),dd);
  col+=creatureColor*field*2.2;
  float hotCore=smoothstep(0.55,0.85,field);
  col+=vec3(1.0,0.9,0.55)*hotCore*1.8;
  col+=vec3(1.0,0.95,0.85)*smoothstep(0.8,0.95,field)*0.8;
  float edge=smoothstep(0.03,0.15,field)*smoothstep(0.5,0.15,field);
  float phase=n1*28.0+n2*12.0+t*1.5;
  vec3 irid=spectrum(phase*0.15);
  col+=irid*edge*0.45;
  float growDir=n3-0.45;
  col+=vec3(0.7,0.45,0.05)*max(0.0,growDir)*field*0.5;
  col+=vec3(0.08,0.25,0.6)*max(0.0,-growDir)*field*0.3;
  col+=vec3(0.8,0.55,0.1)*mouseInf*0.4;
  col+=spectrum(t*0.1+mouseDist*2.0)*mouseInf*0.15;
  col=col/(1.0+col*0.35);
  vec2 vc=v_uv-0.5;
  col*=1.0-dot(vc,vc)*1.2;
  col=pow(max(col,0.0),vec3(0.95));
  outColor=vec4(col,1.0);
}`;

export const BLOOM_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_input;
uniform vec2 u_dir;
uniform vec2 u_res;
uniform float u_extract;
void main(){
  vec2 texel=1.0/u_res;
  float w[5]=float[5](0.227027,0.1945946,0.1216216,0.054054,0.016216);
  vec3 result=vec3(0.0);
  for(int i=-4;i<=4;i++){
    vec3 s=texture(u_input,v_uv+u_dir*texel*float(i)*2.0).rgb;
    if(u_extract>0.5){float br=dot(s,vec3(0.2126,0.7152,0.0722));s*=smoothstep(0.06,0.35,br)*2.0;}
    result+=s*w[abs(i)];
  }
  outColor=vec4(result,1.0);
}`;

export const COMPOSITE_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
void main(){
  vec3 col=texture(u_scene,v_uv).rgb;
  vec3 bloom=texture(u_bloom,v_uv).rgb;
  col+=bloom*0.65;
  col=col/(1.0+col*0.3);
  col=pow(max(col,0.0),vec3(0.96));
  outColor=vec4(col,1.0);
}`;
