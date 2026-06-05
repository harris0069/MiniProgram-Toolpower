from flask import Flask, request, Response
import cv2
import numpy as np

app = Flask(__name__)


@app.route('/inpaint', methods=['POST'])
def inpaint():
    f_img = request.files.get('image')
    f_mask = request.files.get('mask')
    if not f_img or not f_mask:
        return Response('missing image or mask', status=400)

    img_bytes = f_img.read()
    mask_bytes = f_mask.read()

    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    mask = cv2.imdecode(np.frombuffer(mask_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)

    if img is None or mask is None:
        return Response('invalid image or mask', status=400)

    # Resize if too large (max 1600px on longest side)
    h, w = img.shape[:2]
    max_side = max(h, w)
    if max_side > 1600:
        scale = 1600 / max_side
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        mask = cv2.resize(mask, (new_w, new_h), interpolation=cv2.INTER_NEAREST)

    result = cv2.inpaint(img, mask, 3, cv2.INPAINT_TELEA)

    _, buf = cv2.imencode('.png', result)
    return Response(buf.tobytes(), mimetype='image/png')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
