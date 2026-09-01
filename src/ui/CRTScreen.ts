import { element } from './UIFramework';

function compileShader(
	gl: WebGLRenderingContext,
	vertex: string,
	fragment: string
) {
	const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	if (!vertexShader) {
		throw new Error('Failed to create vertex shader');
	}

	gl.shaderSource(vertexShader, vertex);
	gl.compileShader(vertexShader);

	// Check if it compiled
	const success = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
	if (!success) {
		// Something went wrong during compilation; get the error
		throw new Error(gl.getShaderInfoLog(vertexShader) ?? '');
	}

	const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	if (!fragmentShader) {
		throw new Error('Failed to create fragment shader');
	}

	gl.shaderSource(fragmentShader, fragment);
	gl.compileShader(fragmentShader);

	// Check if it compiled
	const success2 = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
	if (!success2) {
		// Something went wrong during compilation; get the error
		throw new Error(gl.getShaderInfoLog(fragmentShader) ?? '');
	}

	const program = gl.createProgram();
	if (!program) {
		throw new Error('Failed to create program');
	}

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	return program;
}

function createTextureFromArrayBuffer(
	gl: WebGLRenderingContext,
	width: number,
	height: number
) {
	const texture = gl.createTexture();
	if (!texture) {
		throw new Error('Failed to create texture');
	}

	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Because we're using a typed array, we can't use texImage2D
	// Instead, we'll use texSubImage2D
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		width,
		height,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		new Uint8Array(width * height * 4)
	);

	// Set the filtering so we don't need mips and it's not filtered
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	// Unbind the texture
	gl.bindTexture(gl.TEXTURE_2D, null);

	return texture;
}

function createFullscreenQuad(gl: WebGLRenderingContext) {
	// create a buffer and put a single triangle in it
	const buffer = gl.createBuffer();
	if (!buffer) {
		throw new Error('Failed to create buffer');
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	const vertices = [-1, -1, 1, -1, 1, 1, 1, 1, -1, 1, -1, -1];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	const positionAttributeLocation = 0;
	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	return buffer;
}

const vertexShaderSource = `
attribute vec4 a_position;

varying vec2 v_texCoord;


const float INSET = 1.0;

void main() {
v_texCoord = (a_position.xy * 0.5 + 0.5);
v_texCoord.y = 1.0 - v_texCoord.y;

gl_Position = vec4(a_position.xy * INSET, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_canvasSize;
uniform vec2 u_texSize;
const float INSET = 1.0;




//
// PUBLIC DOMAIN CRT STYLED SCAN-LINE SHADER
//
//   by Timothy Lottes
//
// This is more along the style of a really good CGA arcade monitor.
// With RGB inputs instead of NTSC.
// The shadow mask example has the mask rotated 90 degrees for less chromatic aberration.
//
// Left it unoptimized to show the theory behind the algorithm.
//
// It is an example what I personally would want as a display option for pixel art games.
// Please take and use, change, or whatever.
//

// Hardness of scanline.
//  -8.0 = soft
// -16.0 = medium
float hardScan=-8.0;

// Hardness of pixels in scanline.
// -2.0 = soft
// -4.0 = hard
float hardPix=-3.0;

// Display warp.
// 0.0 = none
// 1.0/8.0 = extreme
vec2 warp=vec2(1.0/32.0,1.0/24.0); 

// Amount of shadow mask.
float maskDark=1.0;
float maskLight=1.5;

//------------------------------------------------------------------------

// sRGB to Linear.
// Assuing using sRGB typed textures this should not be needed.
float ToLinear1(float c){return(c<=0.04045)?c/12.92:pow((c+0.055)/1.055,2.4);}
vec3 ToLinear(vec3 c){return vec3(ToLinear1(c.r),ToLinear1(c.g),ToLinear1(c.b));}

// Linear to sRGB.
// Assuing using sRGB typed textures this should not be needed.
float ToSrgb1(float c){return(c<0.0031308?c*12.92:1.055*pow(c,0.41666)-0.055);}
vec3 ToSrgb(vec3 c){return vec3(ToSrgb1(c.r),ToSrgb1(c.g),ToSrgb1(c.b));}

// Nearest emulated sample given floating point position and texel offset.
// Also zero's off screen.
vec3 Fetch(vec2 pos,vec2 off){
  //pos=floor(pos*u_texSize+off)/u_texSize;
  pos=(floor(pos * u_texSize + off) + 0.5) / u_texSize;
  if(max(abs(pos.x-0.5),abs(pos.y-0.5))>0.5)return vec3(0.0,0.0,0.0);
  return ToLinear(texture2D(u_texture,pos.xy,-16.0).rgb);
}

// Distance in emulated pixels to nearest texel.
vec2 Dist(vec2 pos){pos=pos*u_texSize;return -((pos-floor(pos))-vec2(0.5));}
    
// 1D Gaussian.
float Gaus(float pos,float scale){return exp2(scale*pos*pos);}

// 3-tap Gaussian filter along horz line.
vec3 Horz3(vec2 pos,float off){
  vec3 b=Fetch(pos,vec2(-1.0,off));
  vec3 c=Fetch(pos,vec2( 0.0,off));
  vec3 d=Fetch(pos,vec2( 1.0,off));
  float dst=Dist(pos).x;
  // Convert distance to weight.
  float scale=hardPix;
  float wb=Gaus(dst-1.0,scale);
  float wc=Gaus(dst+0.0,scale);
  float wd=Gaus(dst+1.0,scale);
  // Return filtered sample.
  return (b*wb+c*wc+d*wd)/(wb+wc+wd);}

// 5-tap Gaussian filter along horz line.
vec3 Horz5(vec2 pos,float off){
  vec3 a=Fetch(pos,vec2(-2.0,off));
  vec3 b=Fetch(pos,vec2(-1.0,off));
  vec3 c=Fetch(pos,vec2( 0.0,off));
  vec3 d=Fetch(pos,vec2( 1.0,off));
  vec3 e=Fetch(pos,vec2( 2.0,off));
  float dst=Dist(pos).x;
  // Convert distance to weight.
  float scale=hardPix;
  float wa=Gaus(dst-2.0,scale);
  float wb=Gaus(dst-1.0,scale);
  float wc=Gaus(dst+0.0,scale);
  float wd=Gaus(dst+1.0,scale);
  float we=Gaus(dst+2.0,scale);
  // Return filtered sample.
  return (a*wa+b*wb+c*wc+d*wd+e*we)/(wa+wb+wc+wd+we);}

// Return scanline weight.
float Scan(vec2 pos,float off){
  float dst=Dist(pos).y;
  return Gaus(dst+off,hardScan);}

// Allow nearest three lines to effect pixel.
vec3 Tri(vec2 pos){
  vec3 a=Horz3(pos,-1.0);
  vec3 b=Horz5(pos, 0.0);
  vec3 c=Horz3(pos, 1.0);
  float wa=Scan(pos,-1.0);
  float wb=Scan(pos, 0.0);
  float wc=Scan(pos, 1.0);
  return a*wa+b*wb+c*wc;
}

// Distortion of scanlines, and end of screen alpha.
vec2 Warp(vec2 pos){
  pos=pos*2.0-1.0;    
  pos*=vec2(1.0+(pos.y*pos.y)*warp.x,1.0+(pos.x*pos.x)*warp.y);
  return pos*0.5+0.5;}

// Shadow mask.
vec3 Mask(vec2 pos){
  pos.x+=pos.y*3.0;
  vec3 mask=vec3(maskDark,maskDark,maskDark);
  pos.x=fract(pos.x/6.0);
  if(pos.x<0.333)mask.r=maskLight;
  else if(pos.x<0.666)mask.g=maskLight;
  else mask.b=maskLight;
  return mask;}    



void main()
{
	vec2 iResolution = u_canvasSize;
	vec2 fragCoord = v_texCoord.xy * iResolution;

	vec2 pos=Warp(v_texCoord.xy);
	gl_FragColor.rgb=Tri(pos)*Mask(fragCoord.xy);

	//gl_FragColor.rgb=Fetch(v_texCoord.xy, vec2(0.0, 0.0));

	gl_FragColor.rgb=ToSrgb(gl_FragColor.rgb);

	//vec2 pxCoord = v_texCoord.xy * (u_canvasSize * INSET);
	//gl_FragColor.rgb = Tri(Warp(pxCoord / (u_canvasSize * INSET)));
	//gl_FragColor.rgb = texture2D(u_texture,v_texCoord.xy).rgb;
	gl_FragColor.a = 1.0;
}
`;

export class CRTScreen {
	public root: HTMLCanvasElement;
	private gl: WebGLRenderingContext;
	private shaderProgram: WebGLProgram;
	private texture: WebGLTexture;
	private quadBuffer: WebGLBuffer;
	private resolutionWidth: number;
	private resolutionHeight: number;

	constructor(resolutionWidth: number, resolutionHeight: number) {
		this.root = element('canvas');
		this.gl = this.root.getContext('webgl')!;

		this.resolutionWidth = resolutionWidth;
		this.resolutionHeight = resolutionHeight;
		this.root.tabIndex = 1000;
		this.root.style.outline = 'none';

		this.shaderProgram = compileShader(
			this.gl,
			vertexShaderSource,
			fragmentShaderSource
		);
		this.quadBuffer = createFullscreenQuad(this.gl);

		this.texture = createTextureFromArrayBuffer(
			this.gl,
			this.resolutionWidth,
			this.resolutionHeight
		);
		this.gl.clearColor(0, 0, 0, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}

	render(buffer: Uint8Array | null) {
		this.gl.clearColor(0, 0, 0, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		if (buffer == null) return;

		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.RGBA,
			this.resolutionWidth,
			this.resolutionHeight,
			0,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			buffer
		);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);

		this.gl.useProgram(this.shaderProgram);
		this.gl.uniform2f(
			this.gl.getUniformLocation(this.shaderProgram, 'u_canvasSize'),
			this.root.width,
			this.root.height
		);
		this.gl.uniform2f(
			this.gl.getUniformLocation(this.shaderProgram, 'u_texSize'),
			this.resolutionWidth,
			this.resolutionHeight
		);

		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
	}
}
