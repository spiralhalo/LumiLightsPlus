#include frex:shaders/api/material.glsl
#include frex:shaders/api/view.glsl
#include lumi:shaders/lib/util.glsl

/******************************************************
	lumi:shaders/forward/shadow.vert
******************************************************/
 
uniform int frxu_cascade;

void frx_pipelineVertex() {
	// move to camera origin
	vec4 shadowVertex = frx_vertex + frx_modelToCamera;

	gl_Position = frx_shadowViewProjectionMatrix(frxu_cascade) * shadowVertex;
}
