#include lumi:shaders/data/data_header.glsl

#ifndef VERTEX_SHADER

float pbrv_coneInner = get_pbrv_coneInner();
float pbrv_coneOuter = get_pbrv_coneOuter();
vec3 pbrv_flashLightView = get_pbrv_flashLightView();

#endif