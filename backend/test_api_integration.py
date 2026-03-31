import os
import numpy as np
import cv2
from processor import FlatfootProcessor
import unittest
from unittest.mock import patch, MagicMock

class TestProcessorAPI(unittest.TestCase):
    def setUp(self):
        # Create a dummy model file for initialization
        self.model_path = "/tmp/test_model.joblib"
        import joblib
        # Mocking a simple model
        model = MagicMock()
        joblib.dump(model, self.model_path)
        self.processor = FlatfootProcessor(self.model_path)

    def tearDown(self):
        if os.path.exists(self.model_path):
            os.remove(self.model_path)

    @patch('requests.post')
    def test_remove_bg_via_api_success(self, mock_post):
        # Mock successful response from remove.bg
        mock_response = MagicMock()
        mock_response.status_code = 200
        # Create a dummy 4-channel image (alpha channel will be used as mask)
        dummy_img = np.zeros((100, 100, 4), dtype=np.uint8)
        dummy_img[:, :, 3] = 255 # Full alpha
        _, buffer = cv2.imencode('.png', dummy_img)
        mock_response.content = buffer.tobytes()
        mock_post.return_value = mock_response

        os.environ["REMOVE_BG_API_KEY"] = "test_key"
        
        bgr = np.zeros((100, 100, 3), dtype=np.uint8)
        mask = self.processor._remove_bg_via_api(bgr)
        
        self.assertIsNotNone(mask)
        self.assertEqual(mask.shape, (100, 100))
        self.assertTrue(np.all(mask == 255))

    def test_mask_fallback_logic(self):
        # Test that it falls back properly when API is disabled
        os.environ["USE_EXTERNAL_API"] = "false"
        bgr = np.zeros((100, 100, 3), dtype=np.uint8)
        
        # We can't easily test the full GrabCut or Rembg without real images,
        # but we can check if it goes through the steps.
        # Since HAS_REMBG might be True/False, we just ensure it returns something (mask) or fails gracefully.
        mask = self.processor.mask_from_alpha_or_rembg_or_grabcut(bgr)
        self.assertIsNotNone(mask)
        self.assertEqual(mask.shape, (100, 100))

if __name__ == '__main__':
    unittest.main()
