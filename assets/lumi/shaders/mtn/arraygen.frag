#include lumi:shaders/pass/header.glsl

uniform sampler2D u_tex_0;
uniform sampler2D u_tex_1;
uniform sampler2D u_tex_2;
uniform sampler2D u_tex_3;
// uniform sampler2D u_tex_4;
// uniform sampler2D u_tex_5;
// uniform sampler2D u_tex_6;
// uniform sampler2D u_tex_7;

layout(location = 0) out vec4 color0;
layout(location = 1) out vec4 color1;
layout(location = 2) out vec4 color2;
layout(location = 3) out vec4 color3;

void main() {
	color0 = texture(u_tex_0, v_texcoord);
	color1 = texture(u_tex_1, v_texcoord);
	color2 = texture(u_tex_2, v_texcoord);
	color3 = texture(u_tex_3, v_texcoord);
}
