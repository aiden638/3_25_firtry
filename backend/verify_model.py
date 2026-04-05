import joblib
import pandas as pd
import numpy as np
import os

def verify():
    model_path = "flatfoot_pipeline.joblib"
    if not os.path.exists(model_path):
        print(f"Error: {model_path} not found.")
        return

    try:
        model = joblib.load(model_path)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    # Feature names from training script
    feature_cols = [
        "left_angle", "right_angle", "mean_angle", "diff_angle",
        "slope_MH", "tibia_slope"
    ]

    # Dummy data (Sample from non-flatfoot logic)
    # let's use some plausible values
    dummy_data = {
        "left_angle": [5.0],
        "right_angle": [5.0],
        "mean_angle": [5.0],
        "diff_angle": [0.0],
        "slope_MH": [10.0],
        "tibia_slope": [-5.0]
    }
    
    df_test = pd.DataFrame(dummy_data)
    
    # Check if model has feature_names_in_
    if hasattr(model, 'feature_names_in_'):
        print(f"Model expects: {model.feature_names_in_}")
    
    try:
        # Predict probability
        probs = model.predict_proba(df_test)
        print(f"Prediction success! Probability of flatfoot: {probs[0][1]*100:.2f}%")
        
        # Predict class
        pred_class = model.predict(df_test)
        print(f"Predicted class: {'Flatfoot' if pred_class[0] == 1 else 'Normal'}")
        
    except Exception as e:
        print(f"Error during prediction: {e}")

if __name__ == "__main__":
    verify()
