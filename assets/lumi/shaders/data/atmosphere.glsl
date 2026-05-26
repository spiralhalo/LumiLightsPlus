#include lumi:shaders/data/data_header.glsl

/*******************************************************
 *  lumi:shaders/data/atmosphere.glsl
 *******************************************************
 *  Copyright (c) 2020-2026 spiralhalo
 *  Released WITHOUT WARRANTY under the terms of the
 *  GNU Lesser General Public License version 3 as
 *  published by the Free Software Foundation, Inc.
 *******************************************************/

#define ATMOS_SEA_LEVEL		62.0
#define ATMOS_STRATOSPHERE	512.0 // directly proportional to render distance. this setup is best for 32 rd

#ifdef POST_SHADER
#define calcHorizon(worldVec) pow(l2_clampScale(1.0, -l2_clampScale(ATMOS_SEA_LEVEL, ATMOS_STRATOSPHERE, frx_cameraPos.y), worldVec.y), 0.25)
#define waterHorizon(isUnderwater, skyHorizon) float(isUnderwater) * l2_clampScale(0.9, 1.0, skyHorizon) // kinda hacky
#endif

#ifndef VERTEX_SHADER

vec3 atmosv_CelestialRadiance = get_atmosv_CelestialRadiance();
vec3 atmosv_SkyAmbientRadiance = get_atmosv_SkyAmbientRadiance();
float atmosv_eyeAdaptation = get_atmosv_eyeAdaptation();

float atmosv_CaveFog = get_atmosv_CaveFog();
vec3 atmosv_FogRadiance = get_atmosv_FogRadiance();
vec3 atmosv_WaterFogRadiance = get_atmosv_WaterFogRadiance();
vec3 atmosv_SkyRadiance = get_atmosv_SkyRadiance();
float atmosv_OWTwilightFactor = get_atmosv_OWTwilightFactor();

#endif
