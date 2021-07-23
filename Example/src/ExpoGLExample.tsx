import React, { useCallback, useRef, useState } from 'react';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Asset } from 'expo-asset';
import { Text, Button, View, StyleSheet } from 'react-native';
import { runOnUI } from 'react-native-reanimated';

async function setup(contextid, asset) {
  'worklet';

  const vertShader = `
  precision highp float;
  uniform vec2 u_rotation;
  attribute vec2 a_position;
  varying vec2 uv;
  void main () {

    vec2 rotatedPosition = vec2(
      a_position.x * u_rotation.y + a_position.y * u_rotation.x,
      a_position.y * u_rotation.y - a_position.x * u_rotation.x
    );

    uv = a_position;
    gl_Position = vec4(rotatedPosition, 0, 1);
  }
`;

  const fragShader = `
  precision highp float;
  uniform sampler2D u_texture;
  varying vec2 uv;
  void main () {
    gl_FragColor = texture2D(u_texture, vec2(uv.y, uv.x));
  }
`;
  const vertices = new Float32Array([
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    1.0,
    0.0,
    1.0,
    1.0,
    0.0,
    1.0,
    1.0,
  ]);
  const gl = global.__EXGLContexts[String(contextid)];
  const viewport = gl.getParameter(gl.VIEWPORT);
  gl.drawingBufferWidth = viewport[2];
  gl.drawingBufferHeight = viewport[3];

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  const vert = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
  gl.shaderSource(vert, vertShader);
  gl.compileShader(vert);

  const frag = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
  gl.shaderSource(frag, fragShader);
  gl.compileShader(frag);

  const program = gl.createProgram() as WebGLProgram;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.flushEXP();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const positionAttrib = gl.getAttribLocation();
  gl.enableVertexAttribArray(positionAttrib);
  gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  // @ts-ignore werfwe
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset);

  const textureLocation = gl.getUniformLocation(program, 'u_texture');
  const rotationLocation = gl.getUniformLocation(program, 'u_rotation');

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniform1i(textureLocation, 0);
  gl.uniform2fv(rotationLocation, [Math.cos(0), Math.sin(0)]);

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
  gl.flush();
  gl.endFrameEXP();

  let rotation = 0;
  const render = () => {
    'worklet';
    rotation += Math.PI / 600; // 180 degrees in 10 seconds
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform2fv(rotationLocation, [Math.cos(rotation), Math.sin(rotation)]);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
    gl.flush();
    gl.flushEXP();
    gl.endFrameEXP();
    requestAnimationFrame(() => {
      'worklet';
      render();
    });
  };

  render();
}

async function onContextCreate(gl) {
  const asset = Asset.fromModule(require('./LayoutReanimation/Bulbasaur.png'));
  await asset.downloadAsync();
  console.log('exglCtxId', gl.exglCtxId);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.flushEXP();
  runOnUI(setup)(gl.exglCtxId, asset);
  // setup(gl,  asset);
}

export default function HelloExpoGL() {
  const [animating, setAnimating] = useState(false);

  const handleToggleAnimation = useCallback(() => {
    setAnimating(!animating);
    if (!animating) {
      // frameHandle.current = requestAnimationFrame(frameTicker)
    } else {
      // cancelAnimationFrame(frameHandle.current as number)
    }
  }, [animating]);

  return (
    <View style={styles.container}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
      <Button
        title={animating ? 'Stop' : `Animate ${global._WORKLET_RUNTIME}`}
        onPress={handleToggleAnimation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  gl: {
    width: 300,
    height: 300,
  },
});
