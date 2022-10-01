import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10";
// Usage: testSupport({client?: string, os?: string}[])
// Client and os are regular expressions.
// See: https://cdn.jsdelivr.net/npm/device-detector-js@2.2.10/README.md for
// legal values for client and os
testSupport([
    { client: 'Chrome' },
]);
function testSupport(supportedDevices) {
    const deviceDetector = new DeviceDetector();
    const detectedDevice = deviceDetector.parse(navigator.userAgent);
    let isSupported = false;
    for (const device of supportedDevices) {
        if (device.client !== undefined) {
            const re = new RegExp(`^${device.client}$`);
            if (!re.test(detectedDevice.client.name)) {
                continue;
            }
        }
        if (device.os !== undefined) {
            const re = new RegExp(`^${device.os}$`);
            if (!re.test(detectedDevice.os.name)) {
                continue;
            }
        }
        isSupported = true;
        break;
    }
    if (!isSupported) {
        alert(`This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
            `is not well supported at this time, continue at your own risk.`);
    }
}
const controls = window;
const mpHolistic = window;
const drawingUtils = window;
let counter = 0;

console.log(window)
const config = { locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@` +
            `${mpHolistic.VERSION}/${file}`;
    } };
// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');
// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new controls.FPS();
// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};
function removeElements(landmarks, elements) {
    for (const element of elements) {
        delete landmarks[element];
    }
}
function removeLandmarks(results) {
    if (results.poseLandmarks) {
        removeElements(results.poseLandmarks, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22]);
    }
}
function connect(ctx, connectors) {
    const canvas = ctx.canvas;
    for (const connector of connectors) {
        const from = connector[0];
        const to = connector[1];
        if (from && to) {
            if (from.visibility && to.visibility &&
                (from.visibility < 0.1 || to.visibility < 0.1)) {
                continue;
            }
            ctx.beginPath();
            ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
            ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
            ctx.stroke();
        }
    }
}
let activeEffect = 'mask';
const COLOR_LEFT = 'rgb(235,105,233)'
const COLOR_RIGHT = 'rgb(235,105,233)'

async function onResults(results) {
  counter++;
  // Hide the spinner.
  document.body.classList.add('loaded');
  // Remove landmarks we don't want to draw.
  removeLandmarks(results);
  // Update the frame rate.
  fpsControl.tick();
  // Draw the overlays.
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.segmentationMask) {
      canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
      // Only overwrite existing pixels.
      if (activeEffect === 'mask' || activeEffect === 'both') {
          canvasCtx.globalCompositeOperation = 'source-in';
          // This can be a color or a texture or whatever...
          canvasCtx.fillStyle = '#00FF007F';
          canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      }
      else {
          canvasCtx.globalCompositeOperation = 'source-out';
          canvasCtx.fillStyle = '#0000FF7F';
          canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      }
      // Only overwrite missing pixels.
      canvasCtx.globalCompositeOperation = 'destination-atop';
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.globalCompositeOperation = 'source-over';
  }
  else {
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  }
  // Connect elbows to hands. Do this first so that the other graphics will draw
  // on top of these marks.
  canvasCtx.lineWidth = 5;
  if (results.poseLandmarks) {
      if (results.rightHandLandmarks) {
          canvasCtx.strokeStyle = 'white';
          connect(canvasCtx, [[
                  results.poseLandmarks[mpHolistic.POSE_LANDMARKS.RIGHT_ELBOW],
                  results.rightHandLandmarks[0]
              ]]);
      }
      if (results.leftHandLandmarks) {
          canvasCtx.strokeStyle = 'white';
          connect(canvasCtx, [[
                  results.poseLandmarks[mpHolistic.POSE_LANDMARKS.LEFT_ELBOW],
                  results.leftHandLandmarks[0]
              ]]);
      }
  }
  // Pose...
  if(results.poseLandmarks) {
    drawingUtils.drawConnectors(canvasCtx, results.poseLandmarks, mpHolistic.POSE_CONNECTIONS, { color: 'white' });
    drawingUtils.drawLandmarks(canvasCtx, Object.values(mpHolistic.POSE_LANDMARKS_LEFT)
        .map(index => results.poseLandmarks[index]), { visibilityMin: 0.65, color: 'white', fillColor: COLOR_LEFT });
    drawingUtils.drawLandmarks(canvasCtx, Object.values(mpHolistic.POSE_LANDMARKS_RIGHT)
        .map(index => results.poseLandmarks[index]), { visibilityMin: 0.65, color: 'white', fillColor: COLOR_RIGHT });
  }
  // Hands...
  if(results.rightHandLandmarks) {
    drawingUtils.drawConnectors(canvasCtx, results.rightHandLandmarks, mpHolistic.HAND_CONNECTIONS, { color: 'white' });
    drawingUtils.drawLandmarks(canvasCtx, results.rightHandLandmarks, {
        color: 'white',
        fillColor: COLOR_RIGHT,
        lineWidth: 2,
        radius: (data) => {
            return drawingUtils.lerp(data.from.z, -0.15, .1, 10, 1);
        }
    });
  }
  if(results.leftHandLandmarks) {
    drawingUtils.drawConnectors(canvasCtx, results.leftHandLandmarks, mpHolistic.HAND_CONNECTIONS, { color: 'white' });
    drawingUtils.drawLandmarks(canvasCtx, results.leftHandLandmarks, {
        color: 'white',
        fillColor: COLOR_LEFT,
        lineWidth: 2,
        radius: (data) => {
            return drawingUtils.lerp(data.from.z, -0.15, .1, 10, 1);
        }
    });
  }
  // Face...
  if(results.faceLandmarks) {
    drawingUtils.drawConnectors(canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
    drawingUtils.drawConnectors(canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_RIGHT_EYE, { color: COLOR_RIGHT });
    drawingUtils.drawConnectors(canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_RIGHT_EYEBROW, { color: COLOR_RIGHT });
    drawingUtils.drawConnectors(canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_LEFT_EYE, { color: COLOR_LEFT });
    drawingUtils.drawConnectors(canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_LEFT_EYEBROW, { color: COLOR_LEFT });
    //drawingUtils.drawConnectors(canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_FACE_OVAL, { color: '#E0E0E0', lineWidth: 5 });
    drawingUtils.drawConnectors(canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_LIPS, { color: COLOR_LEFT, lineWidth: 5 });
  }
  // Draw Hand bounding box 
  let all_coo = []
  if(results.leftHandLandmarks && results.rightHandLandmarks){
    all_coo = results.leftHandLandmarks.concat(results.rightHandLandmarks)
  }else if(results.leftHandLandmarks){
    all_coo = results.leftHandLandmarks
  }else if(results.rightHandLandmarks){
    all_coo = results.rightHandLandmarks
  }
  if(all_coo) {
    let all_x = []
    let all_y = []
    all_coo.forEach(element => {
      all_x.push(element.x)
    });
    all_coo.forEach(element => {
      all_y.push(element.y)
    });

    let tl_x = Math.min(...all_x) - 0.08
    let tl_y = Math.min(...all_y) - 0.08

    let br_x = Math.max(...all_x) + 0.08
    let br_y = Math.max(...all_y) + 0.08

    let height= br_y - tl_y
    let width = br_x - tl_x

    let canvas_tl_x = tl_x * canvasElement.width
    let canvas_tl_y = tl_y * canvasElement.height
    let canvas_width = width * canvasElement.width
    let canvas_height = height * canvasElement.height

    canvasCtx.strokeRect(canvas_tl_x, canvas_tl_y, canvas_width, canvas_height);
    
    if(isFinite(tl_x) && isFinite(tl_y) && isFinite(width) && isFinite(height) && counter % 20 == 0) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas_width;
      canvas.height = canvas_height;
      const ctx = canvas.getContext("2d");
      createImageBitmap(canvasElement, canvas_tl_x, canvas_tl_y, canvas_width, canvas_height).then(bitmap => {
        ctx.drawImage(bitmap, 0, 0);
        const dataURL = canvas.toDataURL("image/jpeg");
        const byteStr = atob(dataURL.split(',')[1])
        let ab = new ArrayBuffer(byteStr.length);
        let ia = new Uint8Array(ab);
        for (let i = 0; i < byteStr.length; i++) {
            ia[i] = byteStr.charCodeAt(i);
        }
        let blob = new Blob([ab], {type: 'image/jpeg'});
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'Prediction-Key': 'bf60722c90364478a30e844f287954c5'
          },
          body: blob,
        };
  
        fetch('https://matthiaswolf-prediction.cognitiveservices.azure.com/customvision/v3.0/Prediction/15d879f9-6c34-463d-845d-728edb192dbb/classify/iterations/Iteration2/image', options)
          .then(response => response.json())
          .then(response => {
            let all_prob = []
            response.predictions.forEach(element => {
              all_prob.push(element.probability)
            });
            const maxVal = Math.max.apply(Math, all_prob.map((i) => i));
            const maxIndex = all_prob.indexOf(maxVal);
            console.log(response.predictions[maxIndex].tagName)
          })
          .catch(err => console.error(err));
        })
      }
    }
  
  canvasCtx.restore();
}

const holistic = new mpHolistic.Holistic(config);

holistic.onResults(onResults);

// Present a control panel through which the user can manipulate the solution
// options.


new controls
    .ControlPanel(controlsElement, {
    selfieMode: true,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    effect: 'background',
})
    .add([
    new controls.StaticText({ title: 'Weekend Warriors' }),
    fpsControl,
    new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new controls.SourcePicker({
        onSourceChanged: () => {
            // Resets because the pose gives better results when reset between
            // source changes.
            holistic.reset();
        },
        onFrame: async (input, size) => {
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
            }
            else {
                width = window.innerWidth;
                height = width * aspect;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            await holistic.send({ image: input });
        },
    }),
    new controls.Slider({
        title: 'Model Complexity',
        field: 'modelComplexity',
        discrete: ['Lite', 'Full', 'Heavy'],
    }),
    new controls.Toggle({ title: 'Smooth Landmarks', field: 'smoothLandmarks' }),
    new controls.Toggle({ title: 'Enable Segmentation', field: 'enableSegmentation' }),
    new controls.Toggle({ title: 'Smooth Segmentation', field: 'smoothSegmentation' }),
    new controls.Slider({
        title: 'Min Detection Confidence',
        field: 'minDetectionConfidence',
        range: [0, 1],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Min Tracking Confidence',
        field: 'minTrackingConfidence',
        range: [0, 1],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Effect',
        field: 'effect',
        discrete: { 'background': 'Background', 'mask': 'Foreground' },
    }),
])
    .on(x => {
    console.log(x)
    const options = x;
    videoElement.classList.toggle('selfie', options.selfieMode);
    activeEffect = x['effect'];
    holistic.setOptions(options);
}); 
