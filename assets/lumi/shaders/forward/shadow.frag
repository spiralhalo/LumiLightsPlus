#include frex:shaders/api/material.glsl
#include frex:shaders/api/player.glsl
#include frex:shaders/api/world.glsl
#include frex:shaders/lib/color.glsl
#include frex:shaders/lib/math.glsl
#include lumi:shaders/common/userconfig.glsl

/******************************************************
  lumi:shaders/forward/shadow.frag
******************************************************/

void frx_pipelineFragment() {
	gl_FragDepth = gl_FragCoord.z;
}
