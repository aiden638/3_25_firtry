import sys
sys.path.append('.')
from processor import FlatfootProcessor
import cv2
import numpy as np

proc = FlatfootProcessor('flatfoot_pipeline.joblib')
img_path = '/Users/dubdy/Desktop/졸업논문/자율연구-시도1/flatfoot_webapp/frontend/src/assets/hero.png'
with open(img_path, 'rb') as f:
    img_bytes = f.read()

res, err = proc.process_image(img_bytes)
print("Error:", err)
if res:
    print("Keys:", res.keys())
