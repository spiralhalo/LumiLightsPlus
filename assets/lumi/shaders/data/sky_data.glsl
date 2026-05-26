#include lumi:shaders/data/data_header.glsl

#ifndef VERTEX_SHADER

mat4 v_star_rotator = get_v_star_rotator();
float v_not_in_void = get_v_not_in_void();
float v_near_void_core = get_v_near_void_core();
float v_cameraAt = get_v_cameraAt();

#endif