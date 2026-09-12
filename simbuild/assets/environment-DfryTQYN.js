import{B as e,D as t,Ft as n,G as r,I as i,It as a,J as o,N as s,Nt as c,Pt as l,Q as u,R as d,St as f,T as p,U as m,W as h,_t as g,at as _,b as v,c as ee,f as y,jt as b,l as x,lt as S,nt as C,p as te,pt as w,q as T,s as E,st as ne,u as D,vt as O,y as k,z as A}from"./index-DAXEVkoa.js";function re(e,t=256){let n=new Uint8Array(t*t*4),r=[4,8,16,32];for(let i=0;i<4;i++){let a=r[i],o=new Float32Array(a*a),s=new Float32Array(a*a);for(let t=0;t<a*a;t++){let n=e.float()*Math.PI*2;o[t]=Math.cos(n),s[t]=Math.sin(n)}let c=1/0,l=-1/0,u=new Float32Array(t*t);for(let e=0;e<t;e++){let n=e/t*a,r=Math.floor(n),i=n-r,d=i*i*i*(i*(i*6-15)+10);for(let n=0;n<t;n++){let f=n/t*a,p=Math.floor(f),m=f-p,h=m*m*m*(m*(m*6-15)+10),g=(e,t)=>(t%a+a)%a*a+(e%a+a)%a,_=(e,t,n,r)=>{let i=g(e,t);return o[i]*n+s[i]*r},v=_(p,r,m,i),ee=_(p+1,r,m-1,i),y=_(p,r+1,m,i-1),b=_(p+1,r+1,m-1,i-1),x=v+(ee-v)*h,S=x+(y+(b-y)*h-x)*d;u[e*t+n]=S,S<c&&(c=S),S>l&&(l=S)}}let d=1/(l-c);for(let e=0;e<t*t;e++)n[e*4+i]=Math.round((u[e]-c)*d*255)}let i=new p(n,t,t,S,b);return i.wrapS=i.wrapT=w,i.minFilter=h,i.magFilter=m,i.generateMipmaps=!0,i.colorSpace=``,i.anisotropy=4,i.needsUpdate=!0,i}var j=5.6,M=[1,.985,.955],N=.1,P=[.55,.7,1],ie=`
#define ATM_PI 3.141592653589793
const float atmRe = 6360000.0;
const float atmRa = 6440000.0;
const vec3  atmBetaR = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const float atmBetaM = 21.0e-6;
const vec3  atmBetaO = vec3(0.65e-6, 1.881e-6, 0.085e-6);
const float atmHR = 8000.0;
const float atmHM = 1200.0;

vec2 atmSphere(vec3 ro, vec3 rd, float R) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - R * R;
  float d = b * b - c;
  if (d < 0.0) return vec2(1e12, -1e12);
  d = sqrt(d);
  return vec2(-b - d, -b + d);
}
vec3 atmDens(float h) {
  return vec3(exp(-h / atmHR), exp(-h / atmHM), max(0.0, 1.0 - abs(h - 25000.0) / 15000.0));
}
vec3 atmExtinct(vec3 od) {
  return exp(-(atmBetaR * od.x + atmBetaM * 1.1 * od.y + atmBetaO * od.z));
}
vec3 atmOpticalDepth(vec3 p, vec3 dir) {
  vec2 e = atmSphere(p, dir, atmRe);
  if (e.x > 0.0) return vec3(1e9);
  float tA = atmSphere(p, dir, atmRa).y;
  vec3 od = vec3(0.0);
  float t0 = 0.0;
  for (int i = 1; i <= 5; i++) {
    float u = float(i) / 5.0;
    float t1 = tA * u * u;
    vec3 q = p + dir * (0.5 * (t0 + t1));
    od += atmDens(length(q) - atmRe) * (t1 - t0);
    t0 = t1;
  }
  return od;
}
float atmPhaseR(float mu) { return 3.0 / (16.0 * ATM_PI) * (1.0 + mu * mu); }
float atmPhaseM(float mu, float g) {
  float g2 = g * g;
  return 3.0 / (8.0 * ATM_PI) * ((1.0 - g2) * (1.0 + mu * mu)) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * mu, 1.5));
}
// single scattering of light (direction L, irradiance LI) along the view ray; msBoost fakes multiple
// scattering; g is the Mie anisotropy (0.76 for the visible sky, 0 for the sun-masked ambient LUT)
vec3 atmScatterG(vec3 ro, vec3 rd, float tMax, vec3 L, vec3 LI, float msBoost, float g) {
  vec3 odV = vec3(0.0);
  vec3 sumR = vec3(0.0), sumM = vec3(0.0);
  float t0 = 0.0;
  for (int i = 1; i <= 16; i++) {
    float u = float(i) / 16.0;
    float t1 = tMax * u * u;
    float ds = t1 - t0;
    vec3 q = ro + rd * (0.5 * (t0 + t1));
    float h = length(q) - atmRe;
    vec3 d = atmDens(h) * ds;
    odV += d * 0.5;
    vec3 odL = atmOpticalDepth(q, L);
    vec3 T = atmExtinct(odV + odL);
    odV += d * 0.5;
    sumR += T * d.x;
    sumM += T * d.y;
    t0 = t1;
  }
  float mu = dot(rd, L);
  return LI * (sumR * atmBetaR * 1.25 * (atmPhaseR(mu) + msBoost / (4.0 * ATM_PI)) + sumM * atmBetaM * atmPhaseM(mu, g));
}
vec3 atmScatter(vec3 ro, vec3 rd, float tMax, vec3 L, vec3 LI, float msBoost) {
  return atmScatterG(ro, rd, tMax, L, LI, msBoost, 0.76);
}
`,F=636e4,ae=644e4,oe=8e3,se=1200,I=[58e-7,135e-7,331e-7],L=21e-6,ce=[65e-8,1881e-9,85e-9],le=new l,ue=new l;function de(e,t,n){let r=e.dot(t),i=e.dot(e)-n*n,a=r*r-i;return a<0?[0xe8d4a51000,-0xe8d4a51000]:(a=Math.sqrt(a),[-r-a,-r+a])}function fe(e,t){return t[0]=Math.exp(-e/oe),t[1]=Math.exp(-e/se),t[2]=Math.max(0,1-Math.abs(e-25e3)/15e3),t}var R=[0,0,0],pe=[0,0,0];function me(e,t,n,r){let i=de(e,t,F);if(r[0]=r[1]=r[2]=0,i[0]>0)return r[0]=r[1]=r[2]=1e9,r;let a=de(e,t,ae)[1],o=0;for(let i=1;i<=n;i++){let s=i/n,c=a*s*s,l=c-o;ue.copy(e).addScaledVector(t,.5*(o+c)),fe(ue.length()-F,pe),r[0]+=pe[0]*l,r[1]+=pe[1]*l,r[2]+=pe[2]*l,o=c}return r}function he(e,t){for(let n=0;n<3;n++)t[n]=Math.exp(-(I[n]*e[0]+L*1.1*e[1]+ce[n]*e[2]));return t}var z=[0,0,0],B=[0,0,0],V=[0,0,0],H=[0,0,0],U=new l;function ge(e,t,n=[0,0,0],r=12){return U.set(0,F+t,0),me(U,e,r,z),he(z,n)}function _e(e,t,n,r,i=[0,0,0]){U.set(0,6360150,0);let a=de(U,e,ae)[1],o=0;z[0]=z[1]=z[2]=0;let s=0,c=0,l=0,u=0,d=0,f=0;for(let n=1;n<=12;n++){let r=n/12,i=a*r*r,p=i-o;le.copy(U).addScaledVector(e,.5*(o+i)),fe(le.length()-F,R),z[0]+=R[0]*p*.5,z[1]+=R[1]*p*.5,z[2]+=R[2]*p*.5,me(le,t,5,B),V[0]=z[0]+B[0],V[1]=z[1]+B[1],V[2]=z[2]+B[2],z[0]+=R[0]*p*.5,z[1]+=R[1]*p*.5,z[2]+=R[2]*p*.5,he(V,H),s+=H[0]*R[0]*p,c+=H[1]*R[0]*p,l+=H[2]*R[0]*p,u+=H[0]*R[1]*p,d+=H[1]*R[1]*p,f+=H[2]*R[1]*p,o=i}let p=e.dot(t),m=3/(16*Math.PI)*(1+p*p)+r/(4*Math.PI),h=3/(8*Math.PI)*(.4224*(1+p*p))/(2.5776*(1.5776-1.52*p)**1.5);return i[0]=n[0]*(s*I[0]*1.25*m+u*L*h),i[1]=n[1]*(c*I[1]*1.25*m+d*L*h),i[2]=n[2]*(l*I[2]*1.25*m+f*L*h),i}var ve={lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

vec3 geometryClearcoatNormal = vec3( 0.0 );

#ifdef USE_CLEARCOAT

	geometryClearcoatNormal = clearcoatNormal;

#endif

#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		// Iridescence F0 approximation
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif

IncidentLight directLight;

#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )

	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

		pointLight = pointLights[ i ];

		getPointLightInfo( pointLight, geometryPosition, directLight );

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;

		#endif

		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

	}
	#pragma unroll_loop_end

#endif

#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )

	SpotLight spotLight;
 	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;

	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

		spotLight = spotLights[ i ];

		getSpotLightInfo( spotLight, geometryPosition, directLight );

  		// spot lights are ordered [shadows with maps, shadows without maps, maps without shadows, none]
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;

		#endif

		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

	}
	#pragma unroll_loop_end

#endif

#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && defined( USE_CSM ) && defined( CSM_CASCADES )

	DirectionalLight directionalLight;
	float linearDepth = (vViewPosition.z) / (shadowFar - cameraNear);
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif

	#if defined( USE_SHADOWMAP ) && defined( CSM_FADE )
		vec2 cascade;
		float cascadeCenter;
		float closestEdge;
		float margin;
		float csmx;
		float csmy;

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

			directionalLight = directionalLights[ i ];
			getDirectionalLightInfo( directionalLight, directLight );

			#if ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
				// NOTE: Depth gets larger away from the camera.
				// cascade.x is closer, cascade.y is further
				cascade = CSM_cascades[ i ];
				cascadeCenter = ( cascade.x + cascade.y ) / 2.0;
				closestEdge = linearDepth < cascadeCenter ? cascade.x : cascade.y;
				margin = 0.25 * pow( closestEdge, 2.0 );
				csmx = cascade.x - margin / 2.0;
				csmy = cascade.y + margin / 2.0;
				if( linearDepth >= csmx && ( linearDepth < csmy || UNROLLED_LOOP_INDEX == CSM_CASCADES - 1 ) ) {

					float dist = min( linearDepth - csmx, csmy - linearDepth );
					float ratio = clamp( dist / margin, 0.0, 1.0 );

					vec3 prevColor = directLight.color;
					directionalLightShadow = directionalLightShadows[ i ];
					directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;

					bool shouldFadeLastCascade = UNROLLED_LOOP_INDEX == CSM_CASCADES - 1 && linearDepth > cascadeCenter;
					directLight.color = mix( prevColor, directLight.color, shouldFadeLastCascade ? ratio : 1.0 );

					ReflectedLight prevLight = reflectedLight;
					RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

					bool shouldBlend = UNROLLED_LOOP_INDEX != CSM_CASCADES - 1 || UNROLLED_LOOP_INDEX == CSM_CASCADES - 1 && linearDepth < cascadeCenter;
					float blendRatio = shouldBlend ? ratio : 1.0;

					reflectedLight.directDiffuse = mix( prevLight.directDiffuse, reflectedLight.directDiffuse, blendRatio );
					reflectedLight.directSpecular = mix( prevLight.directSpecular, reflectedLight.directSpecular, blendRatio );
					reflectedLight.indirectDiffuse = mix( prevLight.indirectDiffuse, reflectedLight.indirectDiffuse, blendRatio );
					reflectedLight.indirectSpecular = mix( prevLight.indirectSpecular, reflectedLight.indirectSpecular, blendRatio );

				}
			#endif

		}
		#pragma unroll_loop_end
	#elif defined (USE_SHADOWMAP)

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

			directionalLight = directionalLights[ i ];
			getDirectionalLightInfo( directionalLight, directLight );

			#if ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )

				directionalLightShadow = directionalLightShadows[ i ];
				if(linearDepth >= CSM_cascades[UNROLLED_LOOP_INDEX].x && linearDepth < CSM_cascades[UNROLLED_LOOP_INDEX].y) directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;

				if(linearDepth >= CSM_cascades[UNROLLED_LOOP_INDEX].x && (linearDepth < CSM_cascades[UNROLLED_LOOP_INDEX].y || UNROLLED_LOOP_INDEX == CSM_CASCADES - 1)) RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

			#endif

		}
		#pragma unroll_loop_end

	#elif ( NUM_DIR_LIGHT_SHADOWS > 0 )
		// note: no loop here - all CSM lights are in fact one light only
		getDirectionalLightInfo( directionalLights[0], directLight );
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

	#endif

	#if ( NUM_DIR_LIGHTS > NUM_DIR_LIGHT_SHADOWS)
		// compute the lights not casting shadows (if any)

		#pragma unroll_loop_start
		for ( int i = NUM_DIR_LIGHT_SHADOWS; i < NUM_DIR_LIGHTS; i ++ ) {

			directionalLight = directionalLights[ i ];

			getDirectionalLightInfo( directionalLight, directLight );

			RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

		}
		#pragma unroll_loop_end

	#endif

#endif


#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && !defined( USE_CSM ) && !defined( CSM_CASCADES )

	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

		directionalLight = directionalLights[ i ];

		getDirectionalLightInfo( directionalLight, directLight );

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif

		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

	}
	#pragma unroll_loop_end

#endif

#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )

	RectAreaLight rectAreaLight;

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {

		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

	}
	#pragma unroll_loop_end

#endif

#if defined( RE_IndirectDiffuse )

	vec3 iblIrradiance = vec3( 0.0 );

	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );

	#if defined( USE_LIGHT_PROBES )

		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );

	#endif

	#if ( NUM_HEMI_LIGHTS > 0 )

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );

		}
		#pragma unroll_loop_end

	#endif

#endif

#if defined( RE_IndirectSpecular )

	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );

#endif
`,lights_pars_begin:`
#if defined( USE_CSM ) && defined( CSM_CASCADES )
uniform vec2 CSM_cascades[CSM_CASCADES];
uniform float cameraNear;
uniform float shadowFar;
#endif
	`+D.lights_pars_begin},W={noise:{value:null},cloudA:{value:new n(0,0,1/9e3,.6)},cloudB:{value:new n(0,0,1500,0)},fogA:{value:new n(1/260,0,.9,1)},fogSun:{value:new l(0,1,0)},fogSunCol:{value:new v(0,0,0)},night:{value:0},sky:{value:null},cloudMap:{value:null},cloudC:{value:new n(0,0,1/6e3,0)}},ye=`
uniform sampler2D uEnvNoise;
uniform vec4 uEnvCloudA;
uniform vec4 uEnvCloudB;
float envCloudDensity(vec2 wp) {
  vec2 uv = (wp + uEnvCloudA.xy) * uEnvCloudA.z;
  float macro = texture2D(uEnvNoise, uv * 0.45 + vec2(0.37, 0.61)).r;
  vec4 n1 = texture2D(uEnvNoise, uv);
  vec4 n2 = texture2D(uEnvNoise, uv * 3.1 + vec2(0.29, 0.73));
  const vec4 w = vec4(0.5333, 0.2667, 0.1333, 0.0667);
  float shape = dot(n1, w) * 0.72 + dot(n2, w) * 0.28;
  float th = uEnvCloudA.w + (macro - 0.5) * 0.30;
  float d = smoothstep(th, th + 0.26, shape - (n2.a - 0.5) * 0.12);
  return d;
}
`,be=`
uniform sampler2D uEnvCloudMap;
uniform vec4 uEnvCloudB;
uniform vec4 uEnvCloudC;
float envCloudShadow(vec3 wpos) {
  if (uEnvCloudB.w <= 0.0) return 1.0;
  vec2 p = wpos.xz + uEnvCloudB.xy * (uEnvCloudB.z - wpos.y);
  vec2 uv = (p - uEnvCloudC.xy) * uEnvCloudC.z + 0.5;
  vec2 b = abs(uv - 0.5);
  float inMap = 1.0 - smoothstep(0.42, 0.5, max(b.x, b.y));
  return 1.0 - uEnvCloudB.w * texture2D(uEnvCloudMap, uv).r * inMap;
}
`,xe=!1;function Se(){if(xe)return;xe=!0;let e=D;e.fog_pars_vertex=`
varying vec3 vEnvWorldPos;
#ifdef USE_FOG
  varying float vFogDepth;
#endif
`,e.fog_vertex=`
vEnvWorldPos = cameraPosition + mvPosition.xyz * mat3(viewMatrix);
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
#endif
`,e.fog_pars_fragment=`
varying vec3 vEnvWorldPos;
#define ENV_WORLDPOS 1
uniform vec4 uEnvFogA;
uniform vec3 uEnvFogSun;
uniform vec3 uEnvFogSunCol;
uniform float uEnvNight;
uniform sampler2D uEnvSky;
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif
`,e.fog_fragment=`
#ifdef USE_FOG
  #ifdef FOG_EXP2
    vec3 envFogRay = vEnvWorldPos - cameraPosition;
    float envFogDist = length(envFogRay);
    vec3 envFogDir = envFogRay / max(envFogDist, 1e-4);
    float envK = uEnvFogA.x;
    float envDy = envFogRay.y;
    float envHI = (abs(envDy * envK) > 1e-4) ? (1.0 - exp(-envDy * envK)) / (envDy * envK) : 1.0;
    float envAmt = fogDensity * exp(-max(cameraPosition.y - uEnvFogA.y, 0.0) * envK) * envHI * envFogDist;
    float fogFactor = 1.0 - exp(-envAmt);
    float envSunMu = max(dot(envFogDir, uEnvFogSun), 0.0);
    vec3 envFd = envFogDir;
    envFd.y = max(envFd.y, 0.004);
    envFd = normalize(envFd);
    vec2 envSkyUv = vec2(atan(envFd.z, envFd.x) * 0.15915494309 + 0.5, asin(clamp(envFd.y, -1.0, 1.0)) * 0.31830988618 + 0.5);
    // The LUT stays physically bright for PMREM. Match the visible dome's display transform only on
    // camera-facing fog so distant geometry converges to the same low-sun and night exposure.
    float envLowSunDisplay = (1.0 - smoothstep(0.12, 0.32, uEnvFogSun.y)) * smoothstep(-0.02, 0.05, uEnvFogSun.y);
    float envSunwardDisplay = smoothstep(0.0, 0.80, max(dot(envFogDir, uEnvFogSun), 0.0));
    float envSkyDisplay = (1.0 - 0.96 * envLowSunDisplay * envSunwardDisplay) * mix(1.0, 0.25, uEnvNight);
    vec3 envSkyCol = texture2D(uEnvSky, envSkyUv).rgb * envSkyDisplay;
    vec3 envFogLin = mix(fogColor, envSkyCol, uEnvFogA.w) + uEnvFogSunCol * (pow(envSunMu, 8.0) * uEnvFogA.z + envSunMu * envSunMu * 0.08);
    #ifdef TONE_MAPPING
      envFogLin = toneMapping(envFogLin);
    #endif
    vec3 envFogOut = linearToOutputTexel(vec4(envFogLin, 1.0)).rgb;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, envFogOut, fogFactor);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
  #endif
#endif
`,e.lights_pars_begin=ve.lights_pars_begin+`
#if defined( USE_CSM ) && defined( CSM_CASCADES )
${be}
#endif
`;let t=ve.lights_fragment_begin,n=`#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && defined( USE_CSM ) && defined( CSM_CASCADES )`;if(!t.includes(n))throw Error(`environment: CSM shader layout changed`);t=t.replace(n,`#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && defined( USE_CSM ) && defined( CSM_CASCADES )
	#ifdef ENV_WORLDPOS
	float envCS = envCloudShadow( vEnvWorldPos );
	#else
	float envCS = 1.0;
	#endif
`);let r=t.indexOf(n),i=t.indexOf(`#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && !defined( USE_CSM )`),a=t.slice(r,i).replaceAll(`getDirectionalLightInfo( directionalLight, directLight );`,`getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= envCS;`).replaceAll(`getDirectionalLightInfo( directionalLights[0], directLight );`,`getDirectionalLightInfo( directionalLights[0], directLight ); directLight.color *= envCS;`);e.lights_fragment_begin=t.slice(0,r)+a+t.slice(i)}function Ce(e){e.uniforms.uEnvNoise=W.noise,e.uniforms.uEnvCloudA=W.cloudA,e.uniforms.uEnvCloudB=W.cloudB,e.uniforms.uEnvFogA=W.fogA,e.uniforms.uEnvFogSun=W.fogSun,e.uniforms.uEnvFogSunCol=W.fogSunCol,e.uniforms.uEnvNight=W.night,e.uniforms.uEnvSky=W.sky,e.uniforms.uEnvCloudMap=W.cloudMap,e.uniforms.uEnvCloudC=W.cloudC}var we=512,Te=256,Ee=128,De=64,Oe=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,ke=`
precision highp float;
varying vec2 vUv;
uniform vec3 uSunDir, uMoonDir;
uniform vec3 uSunI, uMoonI;
uniform float uCloud;
uniform float uNight;
uniform float uAmbient;   // 1 = ambient pass: isotropic Mie (no aureole), used for PMREM only
${ie}
void main() {
  float phi = (vUv.x - 0.5) * 2.0 * ATM_PI;
  float lat = (vUv.y - 0.5) * ATM_PI;
  vec3 dir = vec3(cos(phi) * cos(lat), sin(lat), sin(phi) * cos(lat));
  vec3 sdir = dir;
  sdir.y = max(sdir.y, 0.003);
  sdir = normalize(sdir);
  vec3 ro = vec3(0.0, atmRe + 150.0, 0.0);
  float tMax = atmSphere(ro, sdir, atmRa).y;
  float g = mix(0.76, 0.0, uAmbient);
  vec3 L = atmScatterG(ro, sdir, tMax, uSunDir, uSunI, 0.5, g);
  L += atmScatterG(ro, sdir, tMax, uMoonDir, uMoonI, 0.5, g);
  // higher-order scattering: single scattering loses the blue zenith at low sun; real twilight skies keep a
  // blue vault until civil dusk. Elevation-driven floor, strongest at the zenith, gone by night.
  float twilight = smoothstep(-0.09, 0.10, uSunDir.y) * (1.0 - 0.6 * smoothstep(0.15, 0.5, uSunDir.y));
  L += twilight * vec3(0.024, 0.044, 0.10) * (0.35 + 0.65 * sdir.y);
  // night floor: airglow + light-pollution horizon glow (keeps the night sky deep blue, never black)
  L += uNight * (vec3(0.0060, 0.0092, 0.0210) * (0.75 + 0.25 * (1.0 - sdir.y)) + vec3(0.024, 0.016, 0.009) * exp(-sdir.y * 7.0));
  // overcast: desaturate and flatten toward a bright-zenith grey
  float lum = dot(L, vec3(0.2126, 0.7152, 0.0722));
  vec3 over = vec3(lum) * (0.85 + 0.55 * sdir.y) * vec3(0.97, 0.985, 1.0);
  L = mix(L, over, uCloud * uCloud * uCloud * 0.9);
  if (dir.y < 0.0) {
    // below the horizon: ground bounce (darker, slightly warm) for PMREM's lower hemisphere
    float k = smoothstep(0.0, 0.6, -dir.y);
    L *= mix(1.0, 0.30, k) * mix(vec3(1.0), vec3(0.95, 0.93, 0.9), k);
  }
  gl_FragColor = vec4(L, 1.0);
}
`,Ae=`
varying vec3 vDir;
void main() {
  vDir = position;
  // Ignore translation so reflections and secondary cameras see the same infinite sky.
  vec4 p = projectionMatrix * mat4(mat3(modelViewMatrix)) * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`,je=`
precision highp float;
varying vec3 vDir;
uniform sampler2D tSky;
uniform vec3 uSunDir, uMoonDir, uLightDir;
uniform vec3 uSunDisc;      // sun disc radiance (transmitted)
uniform vec3 uMoonCol;
uniform float uNight;       // 0 day .. 1 night
uniform float uTime;
uniform float uCloudiness;
uniform vec3 uCloudSun;     // sun radiance reaching the clouds (irradiance/pi * albedo)
uniform vec3 uCloudAmb;     // sky ambient at the clouds
uniform float uCirrus;
uniform vec2 uCirrusOff;
uniform vec2 uWindDir;
uniform float uPlanet;
uniform float uStarBright;
uniform float uFogDensity;
uniform vec4 uEnvFogA;
uniform vec3 uEnvFogSun;
uniform vec3 uEnvFogSunCol;
${ie}
${ye}

vec2 equirectUv(vec3 d) {
  return vec2(atan(d.z, d.x) * 0.15915494309 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830988618 + 0.5);
}
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
float hgPhase(float mu, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * mu, 1.5); }

// Height-fog transmittance along a sky ray (same model as the ground fog chunk: exp height falloff).
// dist <= 0 means "to infinity" (the integral converges because of the height falloff).
float domeFogAmount(vec3 dir, float dist) {
  float k = uEnvFogA.x;
  float dy = max(dir.y, 0.002);
  float base = uFogDensity * exp(-max(cameraPosition.y - uEnvFogA.y, 0.0) * k);
  float integ = (dist > 0.0) ? (1.0 - exp(-k * dy * dist)) / (k * dy) : 1.0 / (k * dy);
  return 1.0 - exp(-base * integ);
}
vec3 fogInScatter(vec3 dir) {
  float mu = max(dot(dir, uEnvFogSun), 0.0);
  return uEnvFogSunCol * (pow(mu, 8.0) * uEnvFogA.z + mu * mu * 0.08);
}

vec3 stars(vec3 d) {
  // 3D cell hashing of the direction: sub-pixel points whose size and brightness follow a magnitude
  // distribution (many faint, few bright), slow twinkle, colour temperature variety
  vec3 col = vec3(0.0);
  for (int layer = 0; layer < 2; layer++) {
    float s = layer == 0 ? 150.0 : 95.0;
    vec3 p = d * s + vec3(float(layer) * 17.3);
    vec3 c = floor(p);
    vec3 h = hash3(c);
    float thr = layer == 0 ? 0.16 : 0.07;
    if (h.x < thr) {
      vec3 sp = c + 0.5 + (h - 0.5) * 0.7;
      float dist = length(p - sp);
      float mag = pow(h.y, 3.0);                      // 0..1, heavily skewed to faint
      float r = (layer == 0 ? 0.085 : 0.06) + 0.06 * mag;   // ~1.3 px at 1080p, brighter stars a little larger
      float b = smoothstep(r, r * 0.2, dist);
      float tw = 0.8 + 0.2 * sin(uTime * (1.5 + h.z * 3.0) + h.z * 40.0);
      vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.68), h.z);
      col += tint * b * (0.35 + 3.0 * mag) * tw * (layer == 0 ? 1.0 : 1.6);
    }
  }
  return col;
}

// Raymarched cumulus slab [H0, H0 + TH] with a rounded vertical profile, detail erosion, single light
// sample toward the sun (Beer-Powder), height-graded ambient and aerial perspective.
vec4 cumulus(vec3 dir, vec3 sky, vec3 camPos) {
  float H0 = uEnvCloudB.z;
  const float TH = 560.0;
  vec3 ro = vec3(0.0, uPlanet, 0.0);
  float t0 = atmSphere(ro, dir, uPlanet + H0).y;
  float t1 = atmSphere(ro, dir, uPlanet + H0 + TH).y;
  if (t0 <= 0.0 || t1 <= t0) return vec4(0.0);
  t1 = min(t1, t0 + 6000.0);
  // coverage at slab entry and exit (grazing rays cross several km of cloud field), shadowing column at mid
  vec2 p0 = camPos.xz + dir.xz * t0;
  vec2 p1 = camPos.xz + dir.xz * t1;
  vec2 pm = 0.5 * (p0 + p1);
  float c0 = envCloudDensity(p0);
  float c1 = envCloudDensity(p1);
  if (max(c0, c1) <= 0.004) return vec4(0.0);
  vec3 L = uLightDir;
  // coverage of the column above along the light (self-shadowing)
  float sc = envCloudDensity(pm + L.xz / max(L.y, 0.15) * (TH * 0.5));
  float mu = dot(dir, L);
  float phase = 0.55 * hgPhase(mu, 0.55) + 0.45 * hgPhase(mu, -0.15);
  const int N = 5;
  float dt = (t1 - t0) / float(N);
  float T = 1.0;
  vec3 acc = vec3(0.0);
  float sigma = 0.012 * dt;
  for (int i = 0; i < N; i++) {
    float hn = (float(i) + 0.5) / float(N);              // height fraction within the slab
    float c = mix(c0, c1, hn);
    float top = 0.30 + 0.70 * c;                          // denser cells build taller towers
    float prof = smoothstep(0.0, 0.10, hn) * (1.0 - smoothstep(top - 0.30, top, hn));
    vec2 wp = camPos.xz + dir.xz * (t0 + (hn) * (t1 - t0));
    vec2 wuv = wp * uEnvCloudA.z + uEnvCloudA.xy * uEnvCloudA.z * 0.3;
    float det = texture2D(uEnvNoise, wuv * 7.0 + vec2(hn * 0.31, -hn * 0.17)).b * 0.7
              + texture2D(uEnvNoise, wuv * 23.0 + vec2(-hn * 0.5, hn * 0.23)).a * 0.3;   // cauliflower erosion
    float dens = clamp((c * 1.5 - 0.10 - det * 0.40 * (1.0 - hn * 0.5)) * prof, 0.0, 1.0);
    if (dens <= 0.001) continue;
    // light: optical depth of the column above toward the sun grows toward the base
    // (a low sun lights the undersides: the shadowing column flips from "above" to "below")
    float lowL = 1.0 - smoothstep(0.05, 0.3, L.y);
    float odL = (sc * 0.85 + c * 0.35) * mix(1.0 - hn, 0.25 + 0.6 * hn, lowL) * 2.6 + dens * 0.7;
    float direct = exp(-odL) * (1.0 - 0.5 * exp(-odL * 2.5));                 // Beer-Powder, sharp rims
    float ms = 0.3 * exp(-odL * 0.25) + 0.2 * exp(-odL * 0.06);                 // multiple scattering glow
    vec3 amb = uCloudAmb * mix(0.32, 1.0, hn) * (0.8 + 0.2 * (1.0 - dens));
    vec3 col = uCloudSun * (phase * 0.7 * direct + 0.36 * ms) + amb;
    float a = 1.0 - exp(-dens * sigma);
    acc += T * a * col;
    T *= 1.0 - a;
    if (T < 0.02) break;
  }
  float alpha = 1.0 - T;
  if (alpha <= 0.002) return vec4(0.0);
  vec3 col = acc / max(alpha, 1e-3);
  col *= mix(1.0, 0.72, uCloudiness * uCloudiness);
  // aerial perspective: distant clouds dissolve into the sky + height fog
  float haze = 1.0 - exp(-t0 * 0.000022);
  col = mix(col, sky, haze);
  alpha *= 1.0 - haze * 0.5;
  return vec4(col, alpha);
}

vec4 cirrus(vec3 dir, vec3 sky, vec3 camPos) {
  if (uCirrus <= 0.001) return vec4(0.0);
  float H = 6500.0;
  vec3 ro = vec3(0.0, uPlanet, 0.0);
  float t = atmSphere(ro, dir, uPlanet + H).y;
  vec2 wp = camPos.xz + dir.xz * t + uCirrusOff;
  vec2 w = uWindDir;
  vec2 uvr = vec2(dot(wp, w), dot(wp, vec2(-w.y, w.x)));
  vec2 uv = uvr * vec2(1.0 / 26000.0, 1.0 / 9000.0);
  vec4 n = texture2D(uEnvNoise, uv);
  vec4 n2 = texture2D(uEnvNoise, uv * 2.9 + vec2(0.41, 0.17));
  float s = n.r * 0.4 + n.g * 0.3 + n2.b * 0.2 + n2.a * 0.1;
  float d = smoothstep(0.50, 0.78, s) * uCirrus;
  if (d <= 0.002) return vec4(0.0);
  float mu = dot(dir, uLightDir);
  float hg = hgPhase(mu, 0.5);
  vec3 col = uCloudSun * (0.75 + 0.03 * hg) + uCloudAmb * 0.55;
  float haze = 1.0 - exp(-t * 0.00002);
  col = mix(col, sky, haze);
  return vec4(col, d * 0.5 * (1.0 - haze * 0.5));
}

void main() {
  vec3 dir = normalize(vDir);
  vec3 sky = texture2D(tSky, equirectUv(dir)).rgb;
  vec3 col = sky;
  float up = smoothstep(-0.02, 0.12, dir.y);

  // stars + milky way (fade with daylight and near the horizon)
  if (uNight > 0.001 && dir.y > -0.05) {
    vec3 mwAxis = normalize(vec3(0.32, 0.5, 0.81));
    float b = dot(dir, mwAxis);
    float band = exp(-b * b * 18.0);
    vec2 mwUv = vec2(atan(dir.z, dir.x) * 0.5, dir.y * 0.9) * 0.55;
    vec4 mwN = texture2D(uEnvNoise, mwUv);
    vec4 mwN2 = texture2D(uEnvNoise, mwUv * 3.7 + 0.3);
    float mw = band * (0.2 + 0.8 * smoothstep(0.3, 0.8, mwN.r * 0.5 + mwN.g * 0.3 + mwN2.b * 0.2)) * (0.6 + 0.4 * mwN2.a);
    col += vec3(0.72, 0.76, 1.0) * mw * 0.03 * uNight * up;
    col += stars(dir) * uStarBright * uNight * up;
  }

  // moon with phase (lit by the real sun direction) and maria from noise
  {
    float mm = dot(dir, uMoonDir);
    float cosR = cos(0.0122);
    if (mm > cosR - 0.002) {
      vec3 t = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
      vec3 bb = cross(uMoonDir, t);
      vec3 o = dir - uMoonDir * mm;
      float sinR = sin(0.0122);
      float x = dot(o, t) / sinR, y = dot(o, bb) / sinR;
      float r2 = x * x + y * y;
      float disc = 1.0 - smoothstep(0.9, 1.02, sqrt(r2));
      float z = sqrt(max(0.0, 1.0 - min(r2, 1.0)));
      vec3 n = t * x + bb * y - uMoonDir * z;
      float lit = max(dot(n, uSunDir), 0.0);
      vec4 mn = texture2D(uEnvNoise, vec2(x, y) * 0.5 + 0.5);
      float albedo = 0.55 + 0.45 * smoothstep(0.35, 0.7, mn.g * 0.6 + mn.b * 0.4);
      vec3 moon = uMoonCol * (lit * albedo * 1.4 + 0.02);
      col = mix(col, moon, disc * smoothstep(-0.03, 0.05, dir.y));
    }
    // soft halo in haze
    col += uMoonCol * pow(max(mm, 0.0), 900.0) * 0.06 * up;
  }

  // sun disc + aureole
  {
    float mu = dot(dir, uSunDir);
    float disc = smoothstep(cos(0.0055), cos(0.0043), mu);
    col += uSunDisc * (disc * 12.0 + pow(max(mu, 0.0), 1800.0) * 0.8 + pow(max(mu, 0.0), 300.0) * 0.14 + pow(max(mu, 0.0), 80.0) * 0.035) * smoothstep(-0.06, 0.0, dir.y);
  }

  // clouds (only above the horizon; tiny lift avoids the seam), each faded by the height fog along its ray
  if (dir.y > 0.004) {
    vec3 camPos = cameraPosition;
    vec4 ci = cirrus(dir, sky, camPos);
    col = mix(col, ci.rgb, ci.a);
    vec4 cu = cumulus(dir, sky, camPos);
    vec3 ro = vec3(0.0, uPlanet, 0.0);
    float tc = atmSphere(ro, dir, uPlanet + uEnvCloudB.z).y;
    float fc = domeFogAmount(dir, tc);
    col = mix(col, mix(cu.rgb, sky, fc), cu.a * (1.0 - fc * 0.85));
  }
  // in-scattered sun glow of the haze layer (the same term the ground fog adds)
  float fa = domeFogAmount(dir, -1.0);
  col += fogInScatter(dir) * fa;
  // below the horizon (beyond the terrain's far plane): the same fogged-ground colour the ground fog chunk
  // converges to (LUT at the horizon), by the fog amount over ~7 km, so the far edge never shows a seam
  if (dir.y < 0.004) {
    vec3 hd = normalize(vec3(dir.x, 0.004, dir.z));
    vec3 hz = texture2D(tSky, equirectUv(hd)).rgb + fogInScatter(hd);
    col = mix(col, hz, domeFogAmount(hd, 7000.0));
    // The far-plane fallback represents progressively more ground haze below the geometric horizon.
    // Retain a gentle vertical gradient instead of extending one horizon sample as a flat colour field.
    col *= mix(0.78, 1.0, smoothstep(-0.10, 0.004, dir.y));
  }
  // Compress only the visible sunward dome when the sun is low. The PMREM LUT and direct scene light
  // keep their physical values; this prevents the sky/horizon composition from consuming the city's
  // tonal range without darkening the city-facing side of the frame.
  float lowSunDisplay = (1.0 - smoothstep(0.12, 0.32, uSunDir.y)) * smoothstep(-0.02, 0.05, uSunDir.y);
  float sunwardDisplay = smoothstep(0.0, 0.80, max(dot(dir, uSunDir), 0.0));
  col *= 1.0 - 0.96 * lowSunDisplay * sunwardDisplay;
  // Preserve the LUT's night floor for PMREM scene lighting, but expose the complete visible dome
  // like a night sky. Applying this after clouds and horizon fog keeps ground/facade separation
  // while preventing those layers from lifting the skyline into a blue-grey daytime value.
  col *= mix(1.0, 0.25, uNight);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,Me=`
precision highp float;
varying vec2 vUv;
uniform vec4 uEnvCloudC;
${ye}
void main() {
  vec2 p = uEnvCloudC.xy + (vUv - 0.5) / uEnvCloudC.z;
  float d = envCloudDensity(p);
  gl_FragColor = vec4(smoothstep(0.2, 0.75, d), d, 0.0, 1.0);   // r: shadow mask (cloud-shaped, not a blur)
}
`,Ne=class{constructor(e,t=256,n=6e3){this.renderer=e.renderer,this.rt=new a(t,t,{type:b,format:S,minFilter:m,magFilter:m,wrapS:k,wrapT:k,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),this.rt.texture.name=`env-cloud-map`,W.cloudC.value.set(0,0,1/n,0),W.cloudMap.value=this.rt.texture,this.mat=new O({vertexShader:Oe,fragmentShader:Me,depthTest:!1,depthWrite:!1,uniforms:{uEnvNoise:W.noise,uEnvCloudA:W.cloudA,uEnvCloudC:W.cloudC}}),this.mat.userData.envSkip=!0,this.scene=new g;let r=new o(new _(2,2),this.mat);r.frustumCulled=!1,this.scene.add(r),this.cam=new C(-1,1,1,-1,0,1)}render(){let e=this.renderer,t=e.getRenderTarget(),n=e.toneMapping;e.toneMapping=0,e.setRenderTarget(this.rt),e.render(this.scene,this.cam),e.setRenderTarget(t),e.toneMapping=n}dispose(){this.rt.dispose(),this.mat.dispose()}};function Pe(e,t){let n=new a(e,t,{type:i,format:S,minFilter:m,magFilter:m,wrapS:w,wrapT:k,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1});return n.texture.mapping=303,n}var Fe=class{constructor(e,t){this.ctx=e,this.renderer=e.renderer,this.lut=Pe(we,Te),this.lut.texture.name=`env-sky-lut`,this.lutAmb=Pe(Ee,De),this.lutAmb.texture.name=`env-sky-ambient`,this.lutMat=new O({vertexShader:Oe,fragmentShader:ke,depthTest:!1,depthWrite:!1,uniforms:{uSunDir:{value:new l(0,1,0)},uMoonDir:{value:new l(0,-1,0)},uSunI:{value:new l(5,5,5)},uMoonI:{value:new l(0,0,0)},uCloud:{value:0},uNight:{value:0},uAmbient:{value:0}}}),this.lutMat.userData.envSkip=!0,this.lutScene=new g;let n=new o(new _(2,2),this.lutMat);n.frustumCulled=!1,this.lutScene.add(n),this.lutCam=new C(-1,1,1,-1,0,1),this.mat=new O({vertexShader:Ae,fragmentShader:je,side:1,depthWrite:!1,depthTest:!0,depthFunc:3,fog:!1,uniforms:{tSky:{value:this.lut.texture},uSunDir:{value:new l(0,1,0)},uMoonDir:{value:new l(0,-1,0)},uLightDir:{value:new l(0,1,0)},uSunDisc:{value:new v(1,1,1)},uMoonCol:{value:new v(1,.97,.9)},uNight:{value:0},uTime:{value:0},uCloudiness:{value:.3},uCloudSun:{value:new v(1,1,1)},uCloudAmb:{value:new v(.2,.25,.35)},uCirrus:{value:.3},uCirrusOff:{value:new c},uWindDir:{value:new c(1,0)},uPlanet:{value:32e4},uStarBright:{value:.9},uFogDensity:{value:1e-4},uEnvNoise:W.noise,uEnvCloudA:W.cloudA,uEnvCloudB:W.cloudB,uEnvFogA:W.fogA,uEnvFogSun:W.fogSun,uEnvFogSunCol:W.fogSunCol}}),this.mat.userData.envSkip=!0,this.mesh=new o(new f(10,32,20),this.mat),this.mesh.name=`sky-dome`,this.mesh.renderOrder=900,this.mesh.frustumCulled=!1,this.mesh.castShadow=!1,this.mesh.receiveShadow=!1,this.mesh.matrixAutoUpdate=!0,e.group.add(this.mesh),W.noise.value=t,W.sky.value=this.lut.texture}renderLut(e,t,n,r,i,a){let o=this.lutMat.uniforms;o.uSunDir.value.copy(e),o.uMoonDir.value.copy(t),o.uSunI.value.fromArray(n),o.uMoonI.value.fromArray(r),o.uCloud.value=i,o.uNight.value=a;let s=this.renderer,c=s.getRenderTarget(),l=s.toneMapping,u=s.autoClear;s.toneMapping=0,s.autoClear=!0,o.uAmbient.value=0,s.setRenderTarget(this.lut),s.render(this.lutScene,this.lutCam),o.uAmbient.value=1,s.setRenderTarget(this.lutAmb),s.render(this.lutScene,this.lutCam),o.uAmbient.value=0,s.setRenderTarget(c),s.toneMapping=l,s.autoClear=u}update(e){this.mesh.position.copy(e)}dispose(){this.ctx.group.remove(this.mesh),this.mesh.geometry.dispose(),this.mat.dispose(),this.lutMat.dispose(),this.lut.dispose(),this.lutAmb.dispose()}},Ie=new T,Le=class e{constructor(e){e||={},this.zNear=e.webGL===!0?-1:0,this.zFar=1,this.vertices={near:[new l,new l,new l,new l],far:[new l,new l,new l,new l]},e.projectionMatrix!==void 0&&this.setFromProjectionMatrix(e.projectionMatrix,e.maxFar||1e4),e.reversedDepth===!0&&(this.zNear=1,this.zFar=0)}setFromProjectionMatrix(e,t){let n=this.zNear,r=this.zFar,i=e.elements[11]===0;return Ie.copy(e).invert(),this.vertices.near[0].set(1,1,n),this.vertices.near[1].set(1,-1,n),this.vertices.near[2].set(-1,-1,n),this.vertices.near[3].set(-1,1,n),this.vertices.near.forEach(function(e){e.applyMatrix4(Ie)}),this.vertices.far[0].set(1,1,r),this.vertices.far[1].set(1,-1,r),this.vertices.far[2].set(-1,-1,r),this.vertices.far[3].set(-1,1,r),this.vertices.far.forEach(function(e){e.applyMatrix4(Ie);let n=Math.abs(e.z);i?e.z*=Math.min(t/n,1):e.multiplyScalar(Math.min(t/n,1))}),this.vertices}split(t,n){for(;t.length>n.length;)n.push(new e);n.length=t.length;let r=this.vertices.near[0].z,i=this.vertices.far[0].z;for(let e=0;e<t.length;e++){let a=n[e];if(e===0)for(let e=0;e<4;e++)a.vertices.near[e].copy(this.vertices.near[e]);else{let n=(t[e-1]*i-r)/(i-r);for(let e=0;e<4;e++)a.vertices.near[e].lerpVectors(this.vertices.near[e],this.vertices.far[e],n)}if(e===t.length-1)for(let e=0;e<4;e++)a.vertices.far[e].copy(this.vertices.far[e]);else{let n=(t[e]*i-r)/(i-r);for(let e=0;e<4;e++)a.vertices.far[e].lerpVectors(this.vertices.near[e],this.vertices.far[e],n)}}}toSpace(e,t){for(let n=0;n<4;n++)t.vertices.near[n].copy(this.vertices.near[n]).applyMatrix4(e),t.vertices.far[n].copy(this.vertices.far[n]).applyMatrix4(e)}},Re=new T,ze=new Le({webGL:!0}),G=new l,Be=new l,K=new y,Ve=[],He=[],Ue=new T,We=new T,Ge=new l(0,1,0),Ke=class{constructor(e){this.camera=e.camera,this.parent=e.parent,this.cascades=e.cascades||3,this.maxFar=e.maxFar||1e5,this.mode=e.mode||`practical`,this.shadowMapSize=e.shadowMapSize||2048,this.shadowBias=e.shadowBias||1e-6,this.lightDirection=e.lightDirection||new l(1,-1,1).normalize(),this.lightIntensity=e.lightIntensity||3,this.lightNear=e.lightNear||1,this.lightFar=e.lightFar||2e3,this.lightMargin=e.lightMargin||200,this.customSplitsCallback=e.customSplitsCallback,this.fade=!1,this.mainFrustum=new Le({webGL:!0}),this.frustums=[],this.breaks=[],this.lights=[],this.shaders=new Map,this._createLights(),this.updateFrustums(),this._injectInclude()}_createLights(){for(let e=0;e<this.cascades;e++){let e=new t(16777215,this.lightIntensity);e.castShadow=!0,e.shadow.mapSize.width=this.shadowMapSize,e.shadow.mapSize.height=this.shadowMapSize,e.shadow.camera.near=this.lightNear,e.shadow.camera.far=this.lightFar,e.shadow.bias=this.shadowBias,this.parent.add(e),this.parent.add(e.target),this.lights.push(e)}}_initCascades(){let e=this.camera;e.updateProjectionMatrix(),this.mainFrustum.setFromProjectionMatrix(e.projectionMatrix,this.maxFar),this.mainFrustum.split(this.breaks,this.frustums)}_updateShadowBounds(){let e=this.frustums;for(let t=0;t<e.length;t++){let e=this.lights[t].shadow.camera,n=this.frustums[t],r=n.vertices.near,i=n.vertices.far,a=i[0],o;o=a.distanceTo(i[2])>a.distanceTo(r[2])?i[2]:r[2];let s=a.distanceTo(o);if(this.fade){let e=this.camera,t=Math.max(e.far,this.maxFar),r=.25*(n.vertices.far[0].z/(t-e.near))**2*(t-e.near);s+=r}e.left=-s/2,e.right=s/2,e.top=s/2,e.bottom=-s/2,e.updateProjectionMatrix()}}_getBreaks(){let e=this.camera,t=Math.min(e.far,this.maxFar);switch(this.breaks.length=0,this.mode){case`uniform`:n(this.cascades,e.near,t,this.breaks);break;case`logarithmic`:i(this.cascades,e.near,t,this.breaks);break;case`practical`:a(this.cascades,e.near,t,.5,this.breaks);break;case`custom`:this.customSplitsCallback===void 0&&console.error(`CSM: Custom split scheme callback not defined.`),this.customSplitsCallback(this.cascades,e.near,t,this.breaks)}function n(e,t,n,r){for(let i=1;i<e;i++)r.push((t+(n-t)*i/e)/n);r.push(1)}function i(e,t,n,r){for(let i=1;i<e;i++)r.push(t*(n/t)**(i/e)/n);r.push(1)}function a(e,t,a,o,s){Ve.length=0,He.length=0,i(e,t,a,He),n(e,t,a,Ve);for(let t=1;t<e;t++)s.push(r.lerp(Ve[t-1],He[t-1],o));s.push(1)}}update(){let e=this.camera,t=this.frustums;Ue.lookAt(Be,this.lightDirection,Ge),We.copy(Ue).invert();for(let n=0;n<t.length;n++){let r=this.lights[n],i=r.shadow.camera,a=(i.right-i.left)/this.shadowMapSize,o=(i.top-i.bottom)/this.shadowMapSize;Re.multiplyMatrices(We,e.matrixWorld),t[n].toSpace(Re,ze);let s=ze.vertices.near,c=ze.vertices.far;K.makeEmpty();for(let e=0;e<4;e++)K.expandByPoint(s[e]),K.expandByPoint(c[e]);K.getCenter(G),G.z=K.max.z+this.lightMargin,G.x=Math.floor(G.x/a)*a,G.y=Math.floor(G.y/o)*o,G.applyMatrix4(Ue),r.position.copy(G),r.target.position.copy(G),r.target.position.x+=this.lightDirection.x,r.target.position.y+=this.lightDirection.y,r.target.position.z+=this.lightDirection.z}}_injectInclude(){D.lights_fragment_begin=ve.lights_fragment_begin,D.lights_pars_begin=ve.lights_pars_begin}setupMaterial(e){e.defines=e.defines||{},e.defines.USE_CSM=1,e.defines.CSM_CASCADES=this.cascades,this.fade&&(e.defines.CSM_FADE=``);let t=[],n=this,r=this.shaders;e.onBeforeCompile=function(i){let a=Math.min(n.camera.far,n.maxFar);n._getExtendedBreaks(t),i.uniforms.CSM_cascades={value:t},i.uniforms.cameraNear={value:n.camera.near},i.uniforms.shadowFar={value:a},r.set(e,i)},r.set(e,null)}_updateUniforms(){let e=Math.min(this.camera.far,this.maxFar);this.shaders.forEach(function(t,n){if(t!==null){let n=t.uniforms;this._getExtendedBreaks(n.CSM_cascades.value),n.cameraNear.value=this.camera.near,n.shadowFar.value=e}!this.fade&&`CSM_FADE`in n.defines?(delete n.defines.CSM_FADE,n.needsUpdate=!0):this.fade&&!(`CSM_FADE`in n.defines)&&(n.defines.CSM_FADE=``,n.needsUpdate=!0)},this)}_getExtendedBreaks(e){for(;e.length<this.breaks.length;)e.push(new c);e.length=this.breaks.length;for(let t=0;t<this.cascades;t++){let n=this.breaks[t],r=this.breaks[t-1]||0;e[t].x=r,e[t].y=n}}updateFrustums(){this._getBreaks(),this._initCascades(),this._updateShadowBounds(),this._updateUniforms()}remove(){for(let e=0;e<this.lights.length;e++)this.parent.remove(this.lights[e].target),this.parent.remove(this.lights[e])}dispose(){let e=this.shaders;e.forEach(function(e,t){delete t.onBeforeCompile,delete t.defines.USE_CSM,delete t.defines.CSM_CASCADES,delete t.defines.CSM_FADE,e!==null&&(delete e.uniforms.CSM_cascades,delete e.uniforms.cameraNear,delete e.uniforms.shadowFar),t.needsUpdate=!0}),e.clear()}},qe=e=>!!(e.isMeshStandardMaterial||e.isMeshPhysicalMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial||e.isMeshToonMaterial),Je=class{constructor(e){this.ctx=e;let t=E[e.quality]||E.high;this.cascades=Math.max(2,Math.min(4,t.cascades||3)),this.mapSize=t.shadowMap||2048,this.maxFar=1400,this.camera=e.camera.camera,this.csm=new Ke({camera:this.camera,parent:e.group,cascades:this.cascades,maxFar:this.maxFar,mode:`practical`,shadowMapSize:this.mapSize,shadowBias:-12e-5,lightDirection:new l(.3,-.8,.5).normalize(),lightIntensity:3,lightNear:1,lightFar:4e3,lightMargin:400}),this.csm.fade=!0;for(let e of this.csm.lights)e.shadow.normalBias=.35,e.shadow.radius=1.6,e.name=`sun-cascade`;Se(),this._camKey=``,this._seen=new WeakSet,this.envRT=null,this.pmrem=new x(e.renderer),this.pmrem.compileEquirectangularShader(),this._sweepPending=!0,this._shape=-1,this._settleFrames=0;let n=e.events,r=`environment`;n.on(`module:ready`,()=>{this._sweepPending=!0},r),n.on(`app:ready`,()=>{this._sweepPending=!0,this._settleFrames=30},r),n.on(`*`,(e,t)=>{t.endsWith(`:changed`)&&(this._sweepPending=!0)},r),this._offRender=e.engine.onBeforeRender(()=>this.syncMaterials())}setLight(e,t,n){this.csm.lightDirection.copy(e).negate();for(let e of this.csm.lights)e.color.copy(t),e.intensity=n}update(e){let t=this.camera,n=r.clamp(e*3.2,900,3200),i=`${t.near.toFixed(3)}|${t.far}|${t.aspect.toFixed(4)}|${t.fov}`;(i!==this._camKey||Math.abs(n-this.maxFar)>this.maxFar*.12)&&(this._camKey=i,this.maxFar=n,this.csm.maxFar=n,this.csm.updateFrustums()),this.csm.update()}syncMaterials(){let e=this.ctx.scene,t=e.children.length;for(let n=0;n<e.children.length;n++)t+=e.children[n].children.length*131;t!==this._shape&&(this._shape=t,this._sweepPending=!0),this._settleFrames>0&&(this._settleFrames--,this._sweepPending=!0),this._sweepPending&&(this._sweepPending=!1,this.sweep())}sweep(){this.ctx.scene.traverse(e=>{let t=e.material;if(t){if(Array.isArray(t))for(let e of t)this.setupMaterial(e);else this.setupMaterial(t)}})}setupMaterial(e){if(!e||this._seen.has(e)||e.userData?.envSkip)return;if(this._seen.add(e),e.isShaderMaterial||e.isRawShaderMaterial){if(!e.uniforms)return;if(Ce({uniforms:e.uniforms}),e.lights){e.defines=e.defines||{},e.defines.USE_CSM=1,e.defines.CSM_CASCADES=this.cascades,this.csm.fade&&(e.defines.CSM_FADE=``);let t=[];this.csm._getExtendedBreaks(t),e.uniforms.CSM_cascades={value:t},e.uniforms.cameraNear={value:this.camera.near},e.uniforms.shadowFar={value:Math.min(this.camera.far,this.csm.maxFar)},this.csm.shaders.set(e,{uniforms:e.uniforms}),e.needsUpdate=!0}return}let t=qe(e),n=e.onBeforeCompile,r=Object.prototype.hasOwnProperty.call(e,`customProgramCacheKey`)?e.customProgramCacheKey.bind(e):null,i=null;t&&(this.csm.setupMaterial(e),i=e.onBeforeCompile),e.onBeforeCompile=(t,r)=>{n&&n.call(e,t,r),i&&i.call(e,t,r),Ce(t)},e.customProgramCacheKey=()=>(r?r():n?n.toString():``)+`|env2`,e.needsUpdate=!0}updateEnvironment(e){if(!this.pmrem)return;let t=this.pmrem.fromEquirectangular(e),n=this.ctx.scene,r=this.envRT;n.environment=t.texture,this.envRT=t,r&&r.dispose()}dispose(){this._offRender?.(),this.csm.remove(),this.csm.dispose(),this.envRT&&(this.envRT.dispose(),this.ctx.scene.environment=null),this.pmrem&&this.pmrem.dispose()}},Ye=`
attribute vec3 aSeed;     // xyz in [0,1)
attribute float aSpeed;   // 0.7..1.3
uniform float uTime;
uniform vec3 uOrigin;     // box centre (camera)
uniform vec3 uBox;        // box size
uniform vec3 uFall;       // fall direction (unit, wind-tilted)
uniform float uLen;
uniform float uIntensity;
varying float vA;
varying float vY;
void main() {
  float t = uTime * aSpeed * 24.0;
  vec3 p = aSeed;
  // r -> r^2 radial remap: more drops near the camera, tapering with distance
  vec2 rad = (p.xz - 0.5) * 2.0;
  rad *= length(rad);
  p.xz = rad * 0.5 + 0.5;
  p.y = fract(p.y - t / uBox.y);
  p.x = fract(p.x + uFall.x * t / uBox.x * 0.5);
  p.z = fract(p.z + uFall.z * t / uBox.z * 0.5);
  vec3 base = uOrigin + (p - 0.5) * uBox;
  // billboard: quad spans along the fall direction, faces the camera
  vec3 toCam = cameraPosition - base;
  float dist = length(toCam);
  vec3 side = normalize(cross(uFall, toCam / max(dist, 1e-3)));
  float w = 0.03 + dist * 0.0022;
  float len = uLen * aSpeed * (0.7 + dist * 0.012);
  vec3 wp = base + side * position.x * w + uFall * position.y * len;
  float fadeNear = smoothstep(0.5, 3.0, dist);
  float fadeFar = 1.0 - smoothstep(uBox.x * 0.32, uBox.x * 0.5, length(base.xz - uOrigin.xz));
  vA = uIntensity * fadeNear * fadeFar * (0.45 + 0.55 * aSeed.z);
  vY = position.y + 0.5;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,Xe=`
precision highp float;
uniform vec3 uColor;
varying float vA;
varying float vY;
void main() {
  float tip = sin(vY * 3.14159);   // soft ends
  gl_FragColor = vec4(uColor, vA * 0.75 * tip);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,Ze=class{constructor(e,t=9e3){let n=e.rng.fork(`rain`),r=new A,i=new _(1,1);r.index=i.index,r.attributes.position=i.attributes.position,r.attributes.uv=i.attributes.uv;let a=new Float32Array(t*3),s=new Float32Array(t);for(let e=0;e<t;e++)a[e*3]=n.float(),a[e*3+1]=n.float(),a[e*3+2]=n.float(),s[e]=.7+n.float()*.6;r.setAttribute(`aSeed`,new d(a,3)),r.setAttribute(`aSpeed`,new d(s,1)),r.instanceCount=t,this.mat=new O({vertexShader:Ye,fragmentShader:Xe,transparent:!0,depthWrite:!1,fog:!1,blending:1,uniforms:{uTime:{value:0},uOrigin:{value:new l},uBox:{value:new l(110,80,110)},uFall:{value:new l(0,-1,0)},uLen:{value:1.1},uIntensity:{value:0},uColor:{value:new v(.7,.75,.85)}}}),this.mat.userData.envSkip=!0,this.mesh=new o(r,this.mat),this.mesh.frustumCulled=!1,this.mesh.castShadow=!1,this.mesh.receiveShadow=!1,this.mesh.renderOrder=150,this.mesh.visible=!1,this.mesh.name=`rain`,e.group.add(this.mesh),this.time=0,this._fall=new l}update(e,t,n,r,i){let a=n.rain;if(this.mesh.visible=a>.01,!this.mesh.visible)return;this.time+=e;let o=this.mat.uniforms;o.uTime.value=this.time,o.uIntensity.value=Math.min(1,a);let s=n.wind;this._fall.set(s.x*s.speed*.06,-1,s.z*s.speed*.06).normalize(),o.uFall.value.copy(this._fall),o.uOrigin.value.copy(t.position);let c=2.4/Math.max(i||1,.5);o.uColor.value.setRGB(r[0]*c+.02,r[1]*c+.02,r[2]*c+.025)}dispose(e){e.group.remove(this.mesh),this.mesh.geometry.dispose(),this.mat.dispose()}},q={wet:{value:0},winNight:{value:0},night:{value:0}},Qe=`
vec2 envHash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
struct EnvHex { vec2 uv1, uv2, uv3; vec3 w; mat2 r1, r2, r3; };
EnvHex envHexSetup(vec2 uv, float cellScale) {
  const mat2 skew = mat2(1.0, 0.0, -0.57735027, 1.15470054);
  vec2 st = skew * (uv * cellScale);
  vec2 base = floor(st);
  vec3 tmp = vec3(fract(st), 0.0);
  tmp.z = 1.0 - tmp.x - tmp.y;
  vec2 v1, v2, v3; vec3 w;
  if (tmp.z > 0.0) { w = vec3(tmp.z, tmp.y, tmp.x); v1 = base; v2 = base + vec2(0.0, 1.0); v3 = base + vec2(1.0, 0.0); }
  else { w = vec3(-tmp.z, 1.0 - tmp.y, 1.0 - tmp.x); v1 = base + vec2(1.0, 1.0); v2 = base + vec2(1.0, 0.0); v3 = base + vec2(0.0, 1.0); }
  w = pow(w, vec3(5.0)); w /= (w.x + w.y + w.z);   // sharp blend zones keep the photo's contrast
  vec2 h1 = envHash2(v1), h2 = envHash2(v2), h3 = envHash2(v3);
  float a1 = h1.x * 6.2831853, a2 = h2.x * 6.2831853, a3 = h3.x * 6.2831853;
  EnvHex H;
  H.r1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1));
  H.r2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2));
  H.r3 = mat2(cos(a3), sin(a3), -sin(a3), cos(a3));
  H.uv1 = H.r1 * uv + h1.y * 7.31;
  H.uv2 = H.r2 * uv + h2.y * 3.17;
  H.uv3 = H.r3 * uv + h3.y * 5.53;
  H.w = w;
  return H;
}
vec4 envHexSample(sampler2D t, EnvHex H) {
  return texture2D(t, H.uv1) * H.w.x + texture2D(t, H.uv2) * H.w.y + texture2D(t, H.uv3) * H.w.z;
}
// tangent-space normal: rotate each tap's xy back by the cell rotation before blending
vec3 envHexNormal(sampler2D t, EnvHex H) {
  vec3 n1 = texture2D(t, H.uv1).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D(t, H.uv2).xyz * 2.0 - 1.0;
  vec3 n3 = texture2D(t, H.uv3).xyz * 2.0 - 1.0;
  n1.xy = n1.xy * H.r1; n2.xy = n2.xy * H.r2; n3.xy = n3.xy * H.r3;
  return normalize(n1 * H.w.x + n2 * H.w.y + n3 * H.w.z);
}
`;async function $e(t){let n=t.rng.fork(`showcase`),r=t.group,{assets:i}=t,[a,s]=await Promise.all([i.pbr(`aerial_grass_rock`,{repeat:[8e3/13,8e3/13]}),i.pbr(`brown_mud_leaves_01`,{repeat:[8e3/7,8e3/7]})]),c=new u({color:16777215,roughness:1,metalness:0});i.applyPbr(c,a,{normalScale:.7,aoIntensity:.7});let p=s.map;c.onBeforeCompile=e=>{e.uniforms.uWet=q.wet,e.uniforms.uNight=q.night,e.uniforms.uDirtMap={value:p},e.fragmentShader=e.fragmentShader.replace(`#include <map_pars_fragment>`,`#include <map_pars_fragment>
        uniform sampler2D uEnvNoise; uniform float uWet; uniform float uNight;
        uniform sampler2D uDirtMap;
        ${Qe}`).replace(`#include <map_fragment>`,`
        // --- macro variation (world space): 40 m / 90 m / 250 m colour noise, dirt-patch mask, worn tracks
        vec2 envWp = vEnvWorldPos.xz;
        vec4 envN1 = texture2D(uEnvNoise, envWp * (1.0 / 250.0) + vec2(0.13, 0.71));
        vec4 envN2 = texture2D(uEnvNoise, envWp * (1.0 / 62.0) + vec2(0.41, 0.19));
        float envMacro = envN1.r * 0.5 + envN1.g * 0.3 + envN2.b * 0.2;            // 0..1 broad
        float envMid = envN2.r * 0.6 + envN2.g * 0.4;                                 // 0..1 mid
        vec4 envN3 = texture2D(uEnvNoise, envWp * (1.0 / 22.0) + vec2(0.77, 0.33));
        // dirt: small worn patches (10-30 m) where the mid-scale noise peaks, plus rare larger bare areas
        float envDirtMask = smoothstep(0.66, 0.78, envN2.a * 0.5 + envN3.g * 0.35 + envN1.g * 0.15) * 0.9
                          + smoothstep(0.74, 0.86, envN1.a * 0.7 + envN2.r * 0.3) * 0.8;
        envDirtMask = min(envDirtMask, 1.0);
        // --- hex-tiled detail (grass) and dirt
        EnvHex envHG = envHexSetup(vMapUv, 0.62);
        vec4 envGrass = envHexSample(map, envHG);
        EnvHex envHD = envHexSetup(vMapUv * (13.0 / 7.0), 0.5);
        vec4 envDirt = envHexSample(uDirtMap, envHD);
        vec3 envGroundN = envHexNormal(normalMap, envHG);
        vec4 envArm = envHexSample(roughnessMap, envHG);
        // grass tint: lush / mid / dry patches, albedo kept <= ~0.3 linear
        // the moss/gravel photo is yellow-olive: keep its luminance detail, take the hue from the macro tint
        float envGL = dot(envGrass.rgb, vec3(0.3, 0.59, 0.11));
        vec3 envGrassDet = mix(envGrass.rgb, vec3(envGL), 0.6);
        vec3 envLush = vec3(0.15, 0.50, 0.08), envMidC = vec3(0.28, 0.54, 0.13), envDry = vec3(0.58, 0.50, 0.21);
        vec3 envTint = mix(mix(envLush, envMidC, smoothstep(0.38, 0.66, envMacro)), envDry, smoothstep(0.62, 0.9, envMid * 0.6 + envMacro * 0.4));
        vec3 envGrassCol = envGrassDet * envTint * mix(0.82, 1.12, envN2.b) * mix(0.9, 1.1, envN1.b);
        vec3 envDirtCol = envDirt.rgb * vec3(0.95, 0.88, 0.78) * mix(0.8, 1.05, envN2.r);
        float envDirtK = envDirtMask * (0.6 + 0.4 * smoothstep(0.3, 0.7, envGrass.r));   // dirt shows through where the grass tap is bright/thin
        diffuseColor.rgb *= mix(envGrassCol, envDirtCol, envDirtK);
        envGroundN = normalize(mix(envGroundN, vec3(0.0, 0.0, 1.0), envDirtK * 0.6));
        float envDirtF = envDirtK;
        // night: CS2's moonlit ground is desaturated blue-grey, not olive
        float envLum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(envLum) * vec3(0.92, 0.97, 1.08), uNight * 0.55);
        diffuseColor.rgb *= 1.0 - uWet * 0.4;`).replace(`#include <normal_fragment_maps>`,`
        // hex-tiled normal (replaces the stock tap); keep the map's strength modest so dry grass never sheens
        normal = normalize(tbn * (envGroundN * vec3(normalScale, 1.0)));`).replace(`#include <roughnessmap_fragment>`,`
        float roughnessFactor = roughness;
        // dry grass is matte: floor at 0.86 (the ARM's low values only matter when wet); dirt slightly smoother when wet
        roughnessFactor = mix(max(envArm.g, 0.86), mix(0.4, 0.28, envDirtF), uWet * 0.85);`).replace(`#include <aomap_fragment>`,`
        #ifdef USE_AOMAP
          float ambientOcclusion = (envArm.r - 1.0) * aoMapIntensity + 1.0;
          reflectedLight.indirectDiffuse *= ambientOcclusion;
        #endif`)};let m=new o(new _(8e3,8e3,1,1),c);m.rotation.x=-Math.PI/2,m.receiveShadow=!0,m.castShadow=!1,m.renderOrder=ee.TERRAIN,m.name=`showcase-ground`,r.add(m);let h=new f(3.2,32,18),g=[{r:.04,m:0,c:15921906},{r:.25,m:0,c:15921906},{r:.5,m:0,c:15921906},{r:.75,m:0,c:15921906},{r:1,m:0,c:15921906},{r:.12,m:1,c:14211806},{r:.35,m:1,c:13929050},{r:.55,m:0,c:3891112},{r:.9,m:0,c:9117471}],y=new Float32Array(g.length*2);g.forEach((e,t)=>{y[t*2]=e.r,y[t*2+1]=e.m}),h.setAttribute(`aRM`,new d(y,2));let b=new u({color:16777215,roughness:.5,metalness:0});b.onBeforeCompile=e=>{e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
attribute vec2 aRM; varying vec2 vRM;`).replace(`#include <uv_vertex>`,`#include <uv_vertex>
vRM = aRM;`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
varying vec2 vRM;`).replace(`#include <roughnessmap_fragment>`,`#include <roughnessmap_fragment>
roughnessFactor = vRM.x;`).replace(`#include <metalnessmap_fragment>`,`#include <metalnessmap_fragment>
metalnessFactor = vRM.y;`)};let x=new e(h,b,g.length),S=new T;g.forEach((e,t)=>{let n=26+t%5*8.5,r=30+Math.floor(t/5)*9;S.makeTranslation(n,3.2,r),x.setMatrixAt(t,S),x.setColorAt(t,new v(e.c))}),x.castShadow=!0,x.receiveShadow=!0,x.frustumCulled=!1,x.name=`showcase-spheres`,r.add(x);let C=await i.pbr(`concrete_wall_008`,{}),w=new u({color:14276304,roughness:.85,metalness:0});i.applyPbr(w,C,{normalScale:.7,aoIntensity:.7}),w.onBeforeCompile=e=>{e.uniforms.uWinNight=q.winNight,e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
        attribute vec3 aBox; attribute float aWin;
        varying vec2 vFaceM; varying float vWin; varying float vTop; varying float vInst;`).replace(`#include <uv_vertex>`,`#include <uv_vertex>
        vec2 envFace = abs(normal.x) > 0.5 ? vec2(aBox.z, aBox.y) : (abs(normal.y) > 0.5 ? vec2(aBox.x, aBox.z) : vec2(aBox.x, aBox.y));
        vec2 envS = envFace / 3.0;
        #ifdef USE_MAP
          vMapUv *= envS;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv *= envS;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv *= envS;
        #endif
        #ifdef USE_METALNESSMAP
          vMetalnessMapUv *= envS;
        #endif
        #ifdef USE_AOMAP
          vAoMapUv *= envS;
        #endif
        vFaceM = uv * envFace; vWin = aWin; vTop = abs(normal.y); vInst = float(gl_InstanceID);`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
        uniform float uWinNight; varying vec2 vFaceM; varying float vWin; varying float vTop; varying float vInst;
        float envHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
        if (vWin > 0.5 && vTop < 0.5) {
          vec2 g = vec2(vFaceM.x / 3.0, (vFaceM.y - 0.9) / 3.6);
          vec2 cell = floor(g); vec2 f = fract(g);
          // anti-aliased window edges; far away (grid below ~3 px) the pattern fades to its average so towers don't shimmer
          vec2 fw = fwidth(g);
          float aa = max(fw.x, fw.y);
          float far = smoothstep(0.18, 0.6, aa);
          float ex = clamp(fw.x * 0.5, 0.005, 0.2), ey = clamp(fw.y * 0.5, 0.005, 0.2);
          float inX = smoothstep(0.10 - ex, 0.10 + ex, f.x) * (1.0 - smoothstep(0.90 - ex, 0.90 + ex, f.x));
          float inY = smoothstep(0.26 - ey, 0.26 + ey, f.y) * (1.0 - smoothstep(0.82 - ey, 0.82 + ey, f.y));
          float isWin = inX * inY * step(0.0, g.y);
          float frame = (smoothstep(0.06 - ex, 0.06 + ex, f.x) * (1.0 - smoothstep(0.94 - ex, 0.94 + ex, f.x)) * smoothstep(0.2 - ey, 0.2 + ey, f.y) * (1.0 - smoothstep(0.88 - ey, 0.88 + ey, f.y))) - isWin;
          isWin = mix(isWin, 0.45, far); frame = mix(frame, 0.12, far);
          float hT = envHash(vec2(vInst, 3.0));
          diffuseColor.rgb *= mix(vec3(0.72, 0.70, 0.66), vec3(1.0, 1.0, 1.04), hT);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.5, clamp(frame, 0.0, 1.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.028, 0.035), isWin);
          roughnessFactor = mix(roughnessFactor, 0.12, isWin);
          float h1 = envHash(cell + vInst * 7.31);
          float h2 = envHash(cell * 1.7 + vInst * 3.17 + 11.0);
          float on = mix(step(0.52, h1), 0.48, far);
          vec3 tint = mix(vec3(1.0, 0.70, 0.40), vec3(0.72, 0.84, 1.0), step(0.7, h2));
          totalEmissiveRadiance += isWin * on * uWinNight * tint * (0.55 + 0.45 * h2);
        }`)};let E=[];for(let e of[[-70,0,-60,22,70,22],[-110,0,-20,18,44,26],[-40,0,-120,30,96,24],[10,0,-95,20,58,20],[60,0,-130,26,82,26],[-140,0,60,24,36,24],[110,0,-50,18,50,18],[130,0,20,22,30,34],[-90,0,120,20,64,20],[40,0,150,26,48,26],[-190,0,-150,34,120,34],[180,0,-190,30,104,30]])E.push({x:e[0],z:e[2],w:e[3],h:e[4],d:e[5],win:1,rot:n.range(-.08,.08)});E.push({x:24,z:62,w:44,h:1.2,d:3,win:0,rot:0}),E.push({x:70,z:44,w:3,h:4,d:30,win:0,rot:0}),E.push({x:4,z:16,w:6,h:6,d:6,win:0,rot:.4}),E.push({x:90,z:100,w:10,h:3,d:10,win:0,rot:.2});for(let e=0;e<14;e++){let e=n.range(0,Math.PI*2),t=n.range(260,900);E.push({x:Math.cos(e)*t,z:Math.sin(e)*t,w:n.range(14,40),h:n.range(10,60),d:n.range(14,40),win:1,rot:n.range(0,3.14)})}let D=new te(1,1,1),O=new Float32Array(E.length*3),k=new Float32Array(E.length);E.forEach((e,t)=>{O[t*3]=e.w,O[t*3+1]=e.h,O[t*3+2]=e.d,k[t]=e.win}),D.setAttribute(`aBox`,new d(O,3)),D.setAttribute(`aWin`,new d(k,1));let A=new e(D,w,E.length),re=new ne,j=new l,M=new l;E.forEach((e,t)=>{re.setFromAxisAngle(new l(0,1,0),e.rot),j.set(e.w,e.h,e.d),M.set(e.x,e.h/2,e.z),S.compose(M,re,j),A.setMatrixAt(t,S)}),A.castShadow=!0,A.receiveShadow=!0,A.frustumCulled=!1,A.name=`showcase-blocks`,r.add(A)}function et(e,t){q.wet.value=e.wetness||0,q.winNight.value=t*.28,q.night.value=t}var J={clear:{cloudiness:.1,rain:0,fogDensity:8e-5,wind:2},partly:{cloudiness:.4,rain:0,fogDensity:11e-5,wind:3.2},cloudy:{cloudiness:.74,rain:0,fogDensity:3e-4,wind:4.5},rain:{cloudiness:.96,rain:.85,fogDensity:65e-5,wind:7},fog:{cloudiness:.7,rain:0,fogDensity:.006,wind:1}},tt=1500,nt=9e3,rt=Math.cos(r.degToRad(.6)),Y=29.53,it=[.024,.044,.1],X={ctx:null,sky:null,lighting:null,rain:null,noise:null,cloudMap:null,staged:!1,cloudMapOff:new c(1e9,1e9),cloudMapTh:-1,sunDir:new l(0,1,0),moonDir:new l(0,-1,0),lightDir:new l(0,1,0),lutSun:new l(0,0,0),lutDirty:!0,pmremDirty:!0,pmremTimer:99,lutTimer:99,weatherDirty:!0,windOff:new c,cirrusOff:new c,time:0,sunT:[0,0,0],moonT:[0,0,0],cloudSunT:[0,0,0],cloudMoonT:[0,0,0],zenith:[0,0,0],horizon:[0,0,0],mid:[0,0,0],fogCol:new v,skyLight:new v,viewDir:new l,sunColor:new v(1,1,1),lightColor:new v(1,1,1),lightIntensity:0,exposure:1,night:0,sunIntensity:0,moonIntensity:0,preset:`partly`,moonPhase:0,drift:0},Z=new l,at=[0,0,0],ot=[0,0,0],st=[0,0,0],ct=new v,Q=new c;function lt(e,t,n){let r=t.sunElevation(e),i=(e-6)/12*Math.PI,a=Math.cos(r);return n.set(Math.cos(i)*a,Math.sin(r),Math.sin(i)*a)}function ut(e,t){let n=J[t]||J.partly;e.cloudiness=n.cloudiness,e.rain=n.rain,e.fogDensity=n.fogDensity,e.wind.speed=n.wind,X.preset=J[t]?t:`partly`}function $(e,t,n){let i=r.clamp((n-e)/(t-e),0,1);return i*i*(3-2*i)}var dt=e=>Math.max(e[0],e[1],e[2]);function ft(e){let t=[j*M[0],j*M[1],j*M[2]],n=[j*N*P[0],j*N*P[1],j*N*P[2]],r=e=>[.006*(.75+.25*(1-e))+.024*Math.exp(-e*7),.0092*(.75+.25*(1-e))+.016*Math.exp(-e*7),.021*(.75+.25*(1-e))+.009*Math.exp(-e*7)],i=(i,a)=>{_e(i,X.sunDir,t,.5,ot),_e(i,X.moonDir,n,.5,st);let o=r(i.y),s=$(-.09,.1,X.sunDir.y)*(1-.6*$(.15,.5,X.sunDir.y))*(.35+.65*i.y);for(let e=0;e<3;e++)a[e]=ot[e]+st[e]+X.night*o[e]+s*it[e];let c=a[0]*.2126+a[1]*.7152+a[2]*.0722,l=e.cloudiness*e.cloudiness*e.cloudiness*.9,u=c*(.85+.55*i.y);return a[0]=a[0]*(1-l)+u*.97*l,a[1]=a[1]*(1-l)+u*.985*l,a[2]=a[2]*(1-l)+u*l,a};i(Z.set(0,1,0),X.zenith);let a=(e,t)=>{t[0]=t[1]=t[2]=0;for(let n=0;n<8;n++){let r=n/8*Math.PI*2;i(Z.set(Math.cos(r)*Math.cos(e),Math.sin(e),Math.sin(r)*Math.cos(e)),at),t[0]+=at[0]/8,t[1]+=at[1]/8,t[2]+=at[2]/8}};a(.05,X.horizon),a(.45,X.mid),X.fogCol.setRGB(X.horizon[0],X.horizon[1],X.horizon[2]),X.skyLight.setRGB((X.zenith[0]+2*X.mid[0])/3,(X.zenith[1]+2*X.mid[1])/3,(X.zenith[2]+2*X.mid[2])/3)}var pt={name:`environment`,dependencies:[],budget:{drawCalls:15,triangles:6e4},async init(e){X.ctx=e;let t=e.world.weather;t.wetness===void 0&&(t.wetness=0),t.moonDir=new l(0,-1,0),t.lightDir=new l(0,1,0),t.sunColor=new v(1,1,1),t.lightIntensity=0,t.exposure=1,t.night=0,t.preset=`partly`,t.moonPhase=0;let n=e.world.flags.weather;ut(t,n&&J[n]?n:`partly`),t.preset=X.preset,n&&!J[n]&&e.log.warn(`unknown weather preset "${n}", using partly`),e.renderer.shadowMap.enabled=!0,e.renderer.shadowMap.type=1,e.renderer.toneMapping=6,e.renderer.toneMappingExposure=1,X.noise=re(e.rng.fork(`noise`),256),X.lighting=new Je(e),X.sky=new Fe(e,X.noise),X.cloudMap=new Ne(e,256,6e3),X.rain=new Ze(e,9e3),e.scene.fog=new s(12570854,1e-4),e.scene.environmentIntensity=.5,X.lutDirty=!0,X.pmremDirty=!0,X.pmremTimer=99,X.lutTimer=99,this.update(0,e)},update(e,t){let n=t.world.weather,i=t.clock,a=t.camera.camera;X.time+=e;let o=X.daylightHour??i.hour;n.displayHour=o,lt(o,i,X.sunDir);let s=((i.day-1)%Y+Y)%Y/Y;X.moonPhase=s,lt(o+12.35+s*24,i,X.moonDir),X.moonDir.y=X.moonDir.y*.92+.05,X.moonDir.normalize();let c=$(-.015,.03,X.sunDir.y),l=$(-.02,.05,X.moonDir.y);X.night=1-$(-.13,.02,X.sunDir.y),W.night.value=X.night;let u=$(-.1,.12,X.sunDir.y),d=.5-.5*X.moonDir.dot(X.sunDir);Z.copy(X.sunDir),Z.y=Math.max(Z.y,.008),Z.normalize(),ge(Z,150,X.sunT),ge(Z,tt,X.cloudSunT),Z.copy(X.moonDir),Z.y=Math.max(Z.y,.004),Z.normalize(),ge(Z,150,X.moonT),ge(Z,tt,X.cloudMoonT);let f=$(.45,.97,n.cloudiness),p=(1-.9*f)*Math.exp(-Math.max(n.fogDensity-.001,0)*350),m=dt(X.sunT);X.sunIntensity=Math.max(m*j,2.2*$(-.02,.02,X.sunDir.y))*c*p,X.sunColor.setRGB(X.sunT[0]*M[0],X.sunT[1]*M[1],X.sunT[2]*M[2]),m>1e-6&&X.sunColor.multiplyScalar(1/m);let h=dt(X.moonT)*j*N*(.15+.85*d);X.moonIntensity=h*l*p;let g=X.sunIntensity>=X.moonIntensity;g?(X.lightDir.copy(X.sunDir),X.lightColor.copy(X.sunColor),X.lightIntensity=X.sunIntensity):(X.lightDir.copy(X.moonDir),X.lightColor.setRGB(X.moonT[0]*P[0],X.moonT[1]*P[1],X.moonT[2]*P[2]),h>1e-6&&X.lightColor.multiplyScalar(1/dt(X.moonT)),X.lightIntensity=X.moonIntensity),X.lightDir.y<.06&&(X.lightDir.y=.06,X.lightDir.normalize()),X.lighting.setLight(X.lightDir,X.lightColor,X.lightIntensity);let _=$(.18,.45,X.sunDir.y),v=1-$(.02,.3,X.sunDir.y),ee=r.lerp(1.45,1.15,_)+v*.25,y=r.lerp(3.35,ee,u)+u*f*.22+u*$(.001,.004,n.fogDensity)*.15;a.getWorldDirection(X.viewDir),X.exposure=y*(1-$(.2,.72,Math.max(0,X.viewDir.dot(X.sunDir)))*v*u*.22),t.renderer.toneMappingExposure=X.exposure,t.scene.environmentIntensity=r.lerp(2.05,.5+.25*(1-_)+.5*v,u)+f*.3*u;let b=1+.45*(1-$(.02,.3,X.sunDir.y))*$(-.02,.05,X.sunDir.y);X.sunIntensity*=b,g&&(X.lightIntensity=X.sunIntensity,X.lighting.setLight(X.lightDir,X.lightColor,X.lightIntensity)),n.wetness+=(n.rain-n.wetness)*Math.min(1,e*(n.rain>n.wetness?.25:.03)),Q.set(n.wind.x,n.wind.z),Q.lengthSq()<1e-6&&Q.set(1,0),Q.normalize();let x=+(!i.paused&&i.speed>0);X.drift+=e*x*Math.min(1,n.wind.speed*.14);let S=(o+i.day*24)*60+X.drift*7;X.windOff.copy(Q).multiplyScalar(-S*3.2),X.cirrusOff.copy(Q).multiplyScalar(-S*5);let C=.62-n.cloudiness*.5;W.cloudA.value.set(X.windOff.x,X.windOff.y,1/nt,C),(X.cloudMapOff.distanceToSquared(X.windOff)>400||X.cloudMapTh!==C)&&(X.cloudMapOff.copy(X.windOff),X.cloudMapTh=C,X.cloudMap.render());let te=Math.max(X.lightDir.y,.2);W.cloudB.value.set(-X.lightDir.x/te,-X.lightDir.z/te,tt,.6*(1-f)*$(0,.12,X.lightDir.y)*$(.04,.3,n.cloudiness));let w=r.lerp(1/320,1/90,$(8e-4,.004,n.fogDensity));if(W.fogA.value.set(w,0,.3*(1-n.cloudiness*.7),1),W.fogSun.value.copy(X.sunDir),W.fogSunCol.value.copy(X.sunColor).multiplyScalar(.32*X.sunIntensity/j),X.lutTimer+=e,X.pmremTimer+=e,(X.weatherDirty||X.sunDir.dot(X.lutSun)<rt)&&(X.lutDirty=!0),X.lutDirty&&(X.lutTimer>.5||X.weatherDirty)){X.lutDirty=!1,X.weatherDirty=!1,X.lutTimer=0,X.lutSun.copy(X.sunDir);let e=[j*M[0],j*M[1],j*M[2]],t=N*(.15+.85*d),r=[j*t*P[0],j*t*P[1],j*t*P[2]];X.sky.renderLut(X.sunDir,X.moonDir,e,r,n.cloudiness,X.night),ft(n),X.pmremDirty=!0}X.pmremDirty&&X.pmremTimer>2.5&&(X.pmremDirty=!1,X.pmremTimer=0,X.lighting.updateEnvironment(X.sky.lutAmb.texture));let T=t.scene.fog;T.color.copy(X.fogCol),T.density=n.fogDensity;let E=X.sky.mat.uniforms;E.uSunDir.value.copy(X.sunDir),E.uMoonDir.value.copy(X.moonDir),E.uLightDir.value.copy(X.lightDir);let ne=dt(X.sunT);E.uSunDisc.value.setRGB(X.sunT[0]*M[0],X.sunT[1]*M[1],X.sunT[2]*M[2]).multiplyScalar(c*(ne>1e-5?ne**.6/ne:0)),E.uNight.value=X.night,E.uTime.value=X.time,E.uCloudiness.value=n.cloudiness;let D=E.uCloudSun.value;D.setRGB(X.cloudSunT[0]*M[0],X.cloudSunT[1]*M[1],X.cloudSunT[2]*M[2]).multiplyScalar(j/Math.PI*.92*c),ct.setRGB(X.cloudMoonT[0]*P[0],X.cloudMoonT[1]*P[1],X.cloudMoonT[2]*P[2]).multiplyScalar(j*N*(.15+.85*d)/Math.PI*.92*l),D.add(ct),E.uCloudAmb.value.setRGB(X.zenith[0]*.6+X.mid[0]*.4,X.zenith[1]*.6+X.mid[1]*.4,X.zenith[2]*.6+X.mid[2]*.4).multiplyScalar(1.2).add(ct.setRGB(.0015,.002,.004).multiplyScalar(X.night)),E.uCirrus.value=r.clamp(n.cloudiness*1.6,0,.85)*(1-$(.6,.95,n.cloudiness)*.8),E.uCirrusOff.value.copy(X.cirrusOff),E.uWindDir.value.copy(Q),E.uStarBright.value=.9*(1-n.cloudiness*.5),E.uFogDensity.value=n.fogDensity,X.sky.update(a.position),X.lighting.update(t.camera.distance),X.rain.update(e,a,n,X.zenith,X.exposure),n.sunDir.copy(X.sunDir),n.sunIntensity=X.sunIntensity,n.skyLight.copy(X.skyLight),n.moonDir.copy(X.moonDir),n.moonPhase=X.moonPhase,n.lightDir.copy(X.lightDir),n.lightIntensity=X.lightIntensity,n.sunColor.copy(X.sunColor),n.exposure=X.exposure,n.night=X.night,X.staged&&et(n,X.night)},dispose(e){e.scene.fog=null,X.rain?.dispose(e),X.sky?.dispose(),X.cloudMap?.dispose(),X.lighting?.dispose(),X.noise?.dispose(),X.rain=X.sky=X.lighting=X.noise=null},api:{setWeather(e){let t=X.ctx.world.weather;typeof e==`string`?ut(t,e):e&&typeof e==`object`&&(e.cloudiness!==void 0&&(t.cloudiness=r.clamp(e.cloudiness,0,1)),e.rain!==void 0&&(t.rain=r.clamp(e.rain,0,1)),e.fogDensity!==void 0&&(t.fogDensity=Math.max(0,e.fogDensity)),e.wind&&(e.wind.x!==void 0&&(t.wind.x=e.wind.x),e.wind.z!==void 0&&(t.wind.z=e.wind.z),e.wind.speed!==void 0&&(t.wind.speed=e.wind.speed)),X.preset=`custom`),t.preset=X.preset,X.weatherDirty=!0,X.ctx.events.emit(`weather:changed`,{cloudiness:t.cloudiness,rain:t.rain,fogDensity:t.fogDensity,preset:X.preset})},getWeather(){return X.preset},getSunDirection(){return X.sunDir.clone()},getMoonDirection(){return X.moonDir.clone()},getLightDirection(){return X.lightDir.clone()},getExposure(){return X.exposure},getNight(){return X.night},setDaylightLock(e){return X.daylightHour=e?12:null,X.ctx.world.weather.displayHour=X.daylightHour??X.ctx.clock.hour,X.daylightHour!==null},daylightLocked(){return X.daylightHour!==null},setupMaterial(e){X.lighting?.setupMaterial(e)},hookScene(){X.lighting?.sweep()},refreshEnvironment(){X.lutDirty=!0,X.weatherDirty=!0,X.pmremTimer=99},presets:Object.keys(J),_debug(){return{S:X,U:W}}},showcase:{description:`Physically based sky, sun/moon/stars, volumetric clouds with sun-lit edges, CSM shadows on a PBR test scene`,cameras:{sunset:{yaw:Math.PI/2,pitch:.1,distance:260,target:[0,18,0]},sky:{yaw:Math.PI,pitch:.12,distance:120,target:[0,90,-260]},sunrise:{yaw:-Math.PI/2,pitch:.1,distance:260,target:[0,18,0]},moonrise:{yaw:-1.92,pitch:.09,distance:200,target:[0,30,0]}},async setup(e){await $e(e),X.staged=!0}}};export{pt as default};