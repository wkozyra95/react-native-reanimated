import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Asset, useAssets } from 'expo-asset';
import { Text, Button, View, StyleSheet } from 'react-native';
import Animated, {
  runOnUI,
  useSharedValue,
  useAnimatedGestureHandler,
  withSpring,
} from 'react-native-reanimated';

function initializeGL(
  gl: ExpoWebGLRenderingContext,
  { asset }: any
) {
  'worklet';
  const vertShader = `
  precision highp float;
  uniform vec2 u_rotation;
  attribute vec2 a_position;
  varying vec2 uv;
  void main () {

    vec2 rotatedPosition = vec2(
      -0.5 + a_position.x * u_rotation.y + a_position.y * u_rotation.x,
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
  // const gl = global.__EXGLContexts[String(contextid)];
  // This sets drawing buffer size to physical pixel size.
  // For example, our GL View size is 150x150 virtual pixels and PixelRatio.get() returns 3.
  // Then, gl.drawingBufferWidth and gl.drawingBufferHeight will equal 450 physical pixels.
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  const vert = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vert, vertShader);
  gl.compileShader(vert);

  const frag = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(frag, fragShader);
  gl.compileShader(frag);

  const program = gl.createProgram();
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
  const result = { rotationLocation, verticesLength: vertices.length };
  console.log(result)
  return result;
}

interface ExpoGlHandlers<RenderContext> {
  onInit(gl: ExpoWebGLRenderingContext): RenderContext;
  onRender(gl: ExpoWebGLRenderingContext, ctx: RenderContext): void;
}

function useGlContext<T>(
  { onInit, onRender }: ExpoGlHandlers<T>,
  shouldRunOnUi = true,
  dependencies: unknown[] = []
) {
  const [gl, setGl] = useState<ExpoWebGLRenderingContext>();
  useEffect(() => {
    if (!gl) {
      return;
    }
    if (shouldRunOnUi) {
      runOnUI((glCtxId: number) => {
        'worklet';
        const workletGl = (global as any).__EXGLContexts[
          String(glCtxId)
        ] as any;
        const viewport = workletGl.getParameter(workletGl.VIEWPORT);
        workletGl.drawingBufferWidth = viewport[2];
        workletGl.drawingBufferHeight = viewport[3];
        const ctx = onInit(workletGl);
        const renderer = () => {
          'worklet'
          onRender(workletGl, ctx);
          requestAnimationFrame(renderer);
        }
        renderer();
      })(gl.exglCtxId as string);
    } else {
      const ctx = onInit(gl);
      const renderer = () => {
        onRender(gl, ctx);
        requestAnimationFrame(renderer);
      }
      renderer();
    }
  }, [gl, ...dependencies]);
  return (gl: ExpoWebGLRenderingContext) => {
    setGl(gl);
  };
}

interface RenderContext {
  rotationLocation: number;
  verticesLength: number;
}

const enableWorklet = true;

export default function HelloExpoGL() {
  const translation = {
    x: useSharedValue(0),
    y: useSharedValue(0),
    counter: useSharedValue(0),
    glcounter: useSharedValue(0),
    startTime: useSharedValue(0),
    endTime: useSharedValue(0)
  };
  const [ counter, setCounter ] = useState({ count: 0, fps: 0, time: 0, glcount: 0, fps2: 0})
  type AnimatedGHContext = {
    startX: number;
    startY: number;
  };
  const [assets] = useAssets([require('./LayoutReanimation/Bulbasaur.png')]);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    AnimatedGHContext
  >({
    onStart: (_, ctx) => {
      ctx.startX = translation.x.value;
      ctx.startY = translation.y.value;
      translation.counter.value = 0;
      translation.glcounter.value = 0;
      translation.startTime.value = Date.now();
    },
    onActive: (event, ctx) => {
      translation.x.value = ctx.startX + event.translationX;
      translation.y.value = ctx.startY + event.translationY;
      translation.counter.value += 1;
    },
    onEnd: (_) => {
      translation.x.value = withSpring(0);
      translation.y.value = withSpring(0);
      translation.endTime.value = Date.now();
    },
  });

  const onContextCreate = useGlContext<RenderContext>(
    {
      onInit: (gl) => {
        'worklet';
        const result = initializeGL(gl, { asset: assets?.[0] });
        return result;
      },
      onRender: (gl, { rotationLocation, verticesLength }) => {
        'worklet';
        if (translation.startTime.value && !translation.endTime.value){
        translation.glcounter.value += 1;
        }
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform2fv(rotationLocation, [
          translation.x.value/100,
          translation.y.value/100
        ]);
        gl.drawArrays(gl.TRIANGLES, 0, verticesLength / 2);
        gl.flush();
        gl.flushEXP();
        gl.endFrameEXP();
      },
    },
    true,
    [assets?.[0]]
  );

  const updateFps = () => {
    const time = translation.endTime.value - translation.startTime.value;
    setCounter({
      count: translation.counter.value,
      glcount: translation.glcounter.value,
      time,
      fps: translation.counter.value * 1000 / time,
      fps2: translation.glcounter.value * 1000 / time
    });
    translation.startTime.value =0
    translation.endTime.value = 0
  }

  return (
    <View style={styles.container}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={styles.container} >
        {assets ? (
          <GLView style={styles.gl} onContextCreate={onContextCreate} />
        ) : (
          <Text>Loading</Text>
        )}
        </Animated.View>
      </PanGestureHandler>
      <Text>fps {counter.fps}, count: {counter.count}, time: {counter.time}</Text>
      <Text>gl fps {counter.fps2}, count: {counter.glcount}, time: {counter.time}</Text>
      <Button onPress={updateFps} title={enableWorklet ? "worklet" : "jsthread"} />
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
