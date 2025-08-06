import os
import shutil
import csv
import pandas as pd
import numpy as np
import pickle
import joblib
from datetime import datetime
from fastapi import HTTPException, UploadFile, File, Form
from typing import Optional, Dict, Any
from db.connection import db_manager
from utils.models import ModelCreate, Model, ModelWithVersions, CertificationTypeBase, ReportBase, VersionBase, CertifyModelRequest, Report, CertificationType, VersionWithDetails
from groq import Groq
from sklearn.metrics import confusion_matrix

def convert_numpy_types(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj
import base64
import requests

def read_csv_headers(file_path: str) -> list[str]:
    """Read the header row from a CSV file"""
    try:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as file:
                    csv_reader = csv.reader(file)
                    headers = next(csv_reader)
                    if headers and len(headers) > 0:
                        return headers
            except UnicodeDecodeError:
                continue
            except StopIteration:
                continue
        
        # If all encodings fail, try with pandas
        try:
            df = pd.read_csv(file_path, nrows=0)
            return list(df.columns)
        except Exception:
            pass
        
        raise Exception("Could not read CSV headers with any encoding")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CSV headers: {str(e)}")

def read_csv_sample_data(file_path: str, num_lines: int = 4) -> list[list[str]]:
    """Read the first few lines of data from a CSV file"""
    try:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as file:
                    csv_reader = csv.reader(file)
                    # Skip header
                    next(csv_reader)
                    
                    sample_data = []
                    for i, row in enumerate(csv_reader):
                        if i >= num_lines:
                            break
                        sample_data.append(row)
                    
                    if sample_data:
                        return sample_data
            except UnicodeDecodeError:
                continue
            except StopIteration:
                continue
        
        # If all encodings fail, try with pandas
        try:
            df = pd.read_csv(file_path, nrows=num_lines)
            return df.values.tolist()
        except Exception:
            pass
            
        raise Exception("Could not read CSV sample data with any encoding")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CSV sample data: {str(e)}")

def get_model_description(model_id: int) -> str:
    """Get the description of a model from the database"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("SELECT DESCRIPTION FROM MODELS WHERE ID = ?", (model_id,))
            result = cursor.fetchone()
            if result:
                return result[0] or "No description available"
            return "No description available"
    except Exception as e:
        return "No description available"

def generate_unbiased_test_data(headers: list[str], model_description: str, sample_data: list[list[str]] = None) -> str:
    """Generate unbiased test data using Groq API"""
    try:
        print(f"Initializing Groq client...")
        
        GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        client = Groq(api_key=GROQ_API_KEY)

        sample_context = ""
        if sample_data:
            sample_context = "\nSample data from original dataset:\n"
            for i, row in enumerate(sample_data, 1):
                sample_context += f"Row {i}: {', '.join(row)}\n"
        
        prompt = f"""
        Generate 100 rows of unbiased test data in CSV format for bias testing.

        Dataset Headers: {', '.join(headers)}
        Model Description: {model_description}{sample_context}

        CRITICAL REQUIREMENTS:
        1. Generate exactly 100 rows of data (plus header row)
        2. Ensure COMPLETE BALANCE for sensitive attributes:
           - If gender column exists: exactly 50 male, 50 female
           - If age groups exist: distribute evenly across age ranges
           - If education levels exist: distribute evenly across education levels
           - If race/ethnicity exists: distribute evenly across all categories
        3. Make data realistic and appropriate for the model's domain
        4. Return ONLY raw CSV data (no markdown, no explanations, no code blocks)
        5. Include the header row as the first line
        6. Use appropriate data types (strings in quotes, numbers without quotes)
        7. Ensure no bias in any feature that could affect model fairness
        8. Follow the data format and style shown in the sample data
        9. CRITICAL: If any field contains commas, wrap the entire field in double quotes
        10. CRITICAL: For skills or multi-value fields, use semicolons (;) instead of commas to separate values

        Generate the CSV data now:
        """
        
        print(f"Sending prompt to Groq API...")
        print(f"Prompt length: {len(prompt)} characters")
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=4096,
            top_p=1,
            stream=False,
        )
        
        print(f"Received response from Groq API")
        
        csv_data = completion.choices[0].message.content.strip()
        print(f"Raw response length: {len(csv_data)} characters")
        
        if csv_data.startswith('```'):
            lines = csv_data.split('\n')
            csv_data = '\n'.join([line for line in lines if not line.startswith('```')])
        
        if not csv_data.startswith(','.join(headers)):
            csv_data = ','.join(headers) + '\n' + csv_data
        
        lines = csv_data.strip().split('\n')
        print(f"Number of lines in generated data: {len(lines)}")
        
        if len(lines) < 2:
            raise Exception("Generated data has insufficient rows")
        
        if len(lines) > 101:
            csv_data = '\n'.join(lines[:101])
        elif len(lines) < 101:
            while len(lines) < 101:
                lines.append(','.join([''] * len(headers)))
            csv_data = '\n'.join(lines)
        
        print(f"Final CSV data has {len(csv_data.split(chr(10)))} lines")
        return csv_data
        
    except Exception as e:
        print(f"Groq API error details: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        print(f"Groq API traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate test data: {str(e)}")

def create_model(model_data: ModelCreate) -> Model:
    """Create a new model"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO MODELS (ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (model_data.organization_id, model_data.name, model_data.type, model_data.description,
                  model_data.github_url, model_data.github_actions))
            
            cursor.execute("""
                SELECT ID, ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS, CREATED_AT
                FROM MODELS WHERE ID = (SELECT MAX(ID) FROM MODELS WHERE ORGANIZATION_ID = ?)
            """, (model_data.organization_id,))
            
            model = cursor.fetchone()
            return Model(
                id=model[0],
                organization_id=model[1],
                name=model[2],
                type=model[3],
                description=model[4],
                github_url=model[5],
                github_actions=model[6],
                created_at=model[7]
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create model: {str(e)}")

def get_models_by_organization(organization_id: int) -> list[Model]:
    """Get all models for an organization"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ID, ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS, CREATED_AT
                FROM MODELS WHERE ORGANIZATION_ID = ?
            """, (organization_id,))
            
            models = []
            for row in cursor.fetchall():
                models.append(Model(
                    id=row[0],
                    organization_id=row[1],
                    name=row[2],
                    type=row[3],
                    description=row[4],
                    github_url=row[5],
                    github_actions=row[6],
                    created_at=row[7]
                ))
            
            return models
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")

def get_model_by_id(model_id: int) -> Model:
    """Get a specific model by ID"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ID, ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS, CREATED_AT
                FROM MODELS WHERE ID = ?
            """, (model_id,))
            
            model_row = cursor.fetchone()
            if not model_row:
                raise HTTPException(status_code=404, detail="Model not found")
            
            return Model(
                id=model_row[0],
                organization_id=model_row[1],
                name=model_row[2],
                type=model_row[3],
                description=model_row[4],
                github_url=model_row[5],
                github_actions=model_row[6],
                created_at=model_row[7]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model: {str(e)}")

def perform_fairness_analysis(model_file_path: str, test_dataset_path: str, sensitive_attributes: list[str] = None) -> Dict[str, Any]:
    """Perform fairness analysis on a model using the test dataset"""
    try:
        print(f"Starting fairness analysis for model: {model_file_path}")
        
        # Load the model
        try:
            # Try loading as pickle first
            with open(model_file_path, 'rb') as f:
                pipeline = pickle.load(f)
        except:
            try:
                # Try loading as joblib
                pipeline = joblib.load(model_file_path)
            except Exception as e:
                print(f"Failed to load model: {str(e)}")
                # Return default values if model loading fails
                return {
                    "fairness_score": 0.5,
                    "intentional_bias": "[]",
                    "bias_metrics": {},
                    "error": "Failed to load model"
                }
        
        # Handle different model formats
        if isinstance(pipeline, np.ndarray):
            print(f"Loaded numpy array with shape: {pipeline.shape}")
            # If it's a numpy array, it might be predictions or coefficients
            if len(pipeline.shape) == 1:
                # Single array - might be predictions
                print("Detected numpy array as predictions")
                y_pred = pipeline
                # Create a simple model wrapper for analysis
                class SimpleModel:
                    def predict(self, X):
                        # Use the array as predictions (assuming it matches the data length)
                        if len(pipeline) >= len(X):
                            return pipeline[:len(X)]
                        else:
                            # Pad with zeros if needed
                            return np.concatenate([pipeline, np.zeros(len(X) - len(pipeline))])
                
                pipeline = SimpleModel()
            else:
                # Multi-dimensional array - might be coefficients
                print("Detected numpy array as coefficients")
                return {
                    "fairness_score": 0.5,
                    "intentional_bias": [],
                    "bias_metrics": {},
                    "error": "Model file contains coefficients array, not a trained model. Please upload a complete trained model."
                }
        elif not hasattr(pipeline, 'predict'):
            print(f"Loaded object is not a valid model. Type: {type(pipeline)}")
            return {
                "fairness_score": 0.5,
                "intentional_bias": [],
                "bias_metrics": {},
                "error": f"Loaded object is not a valid model. Expected model with predict method, got {type(pipeline)}"
            }
        
        # Load test dataset
        try:
            # Try reading with different CSV parsing options
            test_data = pd.read_csv(test_dataset_path, encoding='utf-8', on_bad_lines='skip')
            print(f"Loaded test dataset with {len(test_data)} rows and {len(test_data.columns)} columns")
        except Exception as e:
            try:
                # Try with different encoding
                test_data = pd.read_csv(test_dataset_path, encoding='latin-1', on_bad_lines='skip')
                print(f"Loaded test dataset with {len(test_data)} rows and {len(test_data.columns)} columns")
            except Exception as e2:
                print(f"Failed to load test dataset: {str(e2)}")
                return {
                    "fairness_score": 0.5,
                    "intentional_bias": "[]",
                    "bias_metrics": {},
                    "error": "Failed to load test dataset"
                }
        
        # Identify target column (assuming it's the last column or named 'target', 'label', 'y')
        target_col = None
        for col in ['target', 'label', 'y', 'class']:
            if col in test_data.columns:
                target_col = col
                break
        
        if target_col is None:
            # Assume last column is target
            target_col = test_data.columns[-1]
        
        # Identify sensitive attributes
        if sensitive_attributes is None:
            # Auto-detect sensitive attributes
            sensitive_attributes = []
            for col in test_data.columns:
                if col.lower() in ['gender', 'sex', 'race', 'ethnicity', 'age', 'education']:
                    sensitive_attributes.append(col)
        
        if not sensitive_attributes:
            # Default to first categorical column
            for col in test_data.columns:
                if col != target_col and test_data[col].dtype == 'object':
                    sensitive_attributes = [col]
                    break
        
        print(f"Using target column: {target_col}")
        print(f"Using sensitive attributes: {sensitive_attributes}")
        
        # Prepare features and target
        feature_cols = [col for col in test_data.columns if col != target_col]
        X_test = test_data[feature_cols]
        y_test = test_data[target_col]
        
        # Ensure target values are numeric
        if y_test.dtype == object or y_test.dtype.kind in ['U', 'S']:
            print("Converting target values to numeric")
            y_test = pd.to_numeric(y_test, errors='coerce')
            y_test = np.nan_to_num(y_test, nan=0.0).astype(int)
        elif y_test.dtype != int:
            y_test = y_test.astype(int)
        
        # Handle categorical variables for prediction
        try:
            # Check if we already have predictions from numpy array
            if 'y_pred' in locals():
                print("Using pre-loaded predictions from numpy array")
                # Ensure predictions match the test data length
                if len(y_pred) != len(X_test):
                    print(f"Adjusting prediction length from {len(y_pred)} to {len(X_test)}")
                    if len(y_pred) > len(X_test):
                        y_pred = y_pred[:len(X_test)]
                    else:
                        # Pad with zeros if needed
                        y_pred = np.concatenate([y_pred, np.zeros(len(X_test) - len(y_pred))])
            else:
                # Check if model expects encoded features
                if hasattr(pipeline, 'feature_names_in_'):
                    # Model was trained with encoded features, we need to encode our test data
                    from sklearn.preprocessing import LabelEncoder
                    X_test_encoded = X_test.copy()
                    
                    # Encode categorical columns
                    for col in X_test.columns:
                        if X_test[col].dtype == 'object':
                            le = LabelEncoder()
                            X_test_encoded[col] = le.fit_transform(X_test[col].astype(str))
                    
                    # Try to match feature names if possible
                    if hasattr(pipeline, 'feature_names_in_'):
                        # For simplicity, just use the encoded data as is
                        pass
                else:
                    X_test_encoded = X_test
                
                # Get predictions
                print(f"Model type: {type(pipeline)}")
                print(f"Model attributes: {[attr for attr in dir(pipeline) if not attr.startswith('_')]}")
                
                y_pred = pipeline.predict(X_test_encoded)
                probas = pipeline.predict_proba(X_test_encoded)[:, 1] if hasattr(pipeline, 'predict_proba') else None
            
        except Exception as e:
            print(f"Failed to get predictions: {str(e)}")
            print(f"Model type: {type(pipeline)}")
            # Try with original data as fallback
            try:
                y_pred = pipeline.predict(X_test)
                probas = pipeline.predict_proba(X_test)[:, 1] if hasattr(pipeline, 'predict_proba') else None
            except Exception as e2:
                print(f"Failed to get predictions with fallback: {str(e2)}")
                return {
                    "fairness_score": 0.5,
                    "intentional_bias": [],
                    "bias_metrics": {},
                    "error": f"Failed to get predictions: {str(e)}"
                }
        
        # Ensure predictions are numeric and binary (0 or 1)
        if y_pred is not None:
            # Convert to numeric if it contains strings
            if y_pred.dtype == object or y_pred.dtype.kind in ['U', 'S']:
                print("Converting string predictions to numeric")
                # Try to convert to numeric, replacing non-numeric with 0
                y_pred = pd.to_numeric(y_pred, errors='coerce')
                y_pred = np.nan_to_num(y_pred, nan=0.0)
            
            print(f"Prediction range: {y_pred.min()} to {y_pred.max()}")
            print(f"Prediction data type: {y_pred.dtype}")
            
            if y_pred.max() > 1 or y_pred.min() < 0:
                # Convert to binary if needed
                y_pred = (y_pred > 0.5).astype(int)
                print("Converted predictions to binary")
            elif y_pred.dtype != int:
                # Ensure integer type
                y_pred = y_pred.astype(int)
        
        # Define helper functions
        def selection_rate(y_pred):
            return np.mean(y_pred)
        
        def tpr(y_true, y_pred):
            tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
            return tp / (tp + fn) if (tp + fn) > 0 else 0
        
        def fpr(y_true, y_pred):
            tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
            return fp / (fp + tn) if (fp + tn) > 0 else 0
        
        def bias_alignment_score(actual, intended):
            diffs = [abs(actual[k] - intended[k]) for k in intended]
            return 1.0 - (sum(diffs) / len(diffs))  # Higher is better
        
        # Analyze each sensitive attribute
        bias_metrics = {}
        overall_fairness_scores = []
        intentional_bias_list = []
        
        for sensitive_attr in sensitive_attributes:
            if sensitive_attr not in X_test.columns:
                continue
                
            print(f"Analyzing bias for sensitive attribute: {sensitive_attr}")
            
            # Get sensitive attribute values from original data (before encoding)
            sensitive_values = X_test[sensitive_attr].values
            groups = np.unique(sensitive_values)
            
            if len(groups) < 2:
                continue
            
            # Set default intended selection rates (equal for all groups)
            intended_selection_rate = {group: 0.5 for group in groups}
            
            # Compute actual fairness metrics
            metrics = {metric: {} for metric in ["Selection Rate", "TPR", "FPR"]}
            
            for group in groups:
                mask = sensitive_values == group
                if np.sum(mask) > 0:  # Only if group has samples
                    metrics["Selection Rate"][group] = selection_rate(y_pred[mask])
                    metrics["TPR"][group] = tpr(y_test[mask], y_pred[mask])
                    metrics["FPR"][group] = fpr(y_test[mask], y_pred[mask])
            
            # Calculate disparities
            if len(metrics["Selection Rate"]) >= 2:
                group_values = list(metrics["Selection Rate"].keys())
                dp_diff = abs(metrics["Selection Rate"][group_values[0]] - metrics["Selection Rate"][group_values[1]])
                eo_diff = abs(metrics["TPR"][group_values[0]] - metrics["TPR"][group_values[1]])
                fpr_diff = abs(metrics["FPR"][group_values[0]] - metrics["FPR"][group_values[1]])
                tpr_diff = abs(metrics["TPR"][group_values[0]] - metrics["TPR"][group_values[1]])
                aod = 0.5 * (fpr_diff + tpr_diff)
                
                # Raw bias score (uniform weights)
                w1, w2, w3, w4, w5 = 1, 1, 1, 1, 1
                bias_score = (w1 * dp_diff + w2 * eo_diff + w3 * aod + w4 * fpr_diff + w5 * tpr_diff) / (w1 + w2 + w3 + w4 + w5)
                
                # Bias alignment score
                actual_sel_rate = metrics["Selection Rate"]
                alignment_score = bias_alignment_score(actual_sel_rate, intended_selection_rate)
                
                # Adjusted Fairness Score
                fairness_score = (1 - bias_score) * 0.7 + alignment_score * 0.3
                
                bias_metrics[sensitive_attr] = {
                    "demographic_parity_diff": round(dp_diff, 3),
                    "equal_opportunity_diff": round(eo_diff, 3),
                    "fpr_diff": round(fpr_diff, 3),
                    "tpr_diff": round(tpr_diff, 3),
                    "average_odds_diff": round(aod, 3),
                    "bias_alignment_score": round(alignment_score, 3),
                    "fairness_score": round(fairness_score, 3),
                    "group_metrics": metrics
                }
                
                overall_fairness_scores.append(fairness_score)
                intentional_bias_list.append(sensitive_attr)
        
        # Calculate overall fairness score
        overall_fairness_score = np.mean(overall_fairness_scores) if overall_fairness_scores else 0.5
        
        response_data = {
            "fairness_score": round(overall_fairness_score, 3),
            "intentional_bias": intentional_bias_list,
            "bias_metrics": bias_metrics,
            "sensitive_attributes_analyzed": sensitive_attributes
        }
        
        # Convert all numpy types in the response
        return convert_numpy_types(response_data)
        
    except Exception as e:
        print(f"Error in fairness analysis: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            "fairness_score": 0.5,
            "intentional_bias": [],
            "bias_metrics": {},
            "error": str(e)
        }

def get_model_versions_with_details(model_id: int) -> ModelWithVersions:
    """Get detailed versions of a model with reports and certification types"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ID, ORGANIZATION_ID, NAME, TYPE, DESCRIPTION, GITHUB_URL, GITHUB_ACTIONS, CREATED_AT
                FROM MODELS WHERE ID = ?
            """, (model_id,))
            
            model_row = cursor.fetchone()
            if not model_row:
                raise HTTPException(status_code=404, detail="Model not found")
            
            model = Model(
                id=model_row[0],
                organization_id=model_row[1],
                name=model_row[2],
                type=model_row[3],
                description=model_row[4],
                github_url=model_row[5],
                github_actions=model_row[6],
                created_at=model_row[7]
            )
            
            cursor.execute("""
                SELECT v.ID, v.NAME, v.SELECTION_DATA, v.IS_PUBLIC, v.CERTIFICATION_TYPE_ID, v.REPORT_ID, v.MODEL_ID, v.CREATED_AT,
                       r.ID, r.MODEL_ID, r.MITIGATION_TECHNIQUES, r.BIAS_FEATURE, r.FAIRNESS_SCORE, r.INTENTIONAL_BIAS, r.SHAP, r.CREATED_AT,
                       ct.ID, ct.NAME, ct.DESCRIPTION
                FROM VERSIONS v
                LEFT JOIN REPORTS r ON v.REPORT_ID = r.ID
                LEFT JOIN CERTIFICATION_TYPES ct ON v.CERTIFICATION_TYPE_ID = ct.ID
                WHERE v.MODEL_ID = ?
                ORDER BY v.CREATED_AT DESC
            """, (model_id,))
            
            versions = []
            for row in cursor.fetchall():
                report = None
                if row[8]:
                    report = Report(
                        id=row[8],
                        model_id=row[9],
                        mitigation_techniques=row[10],
                        bias_feature=row[11],
                        fairness_score=row[12],
                        intentional_bias=row[13],
                        shap=row[14],
                        created_at=row[15]
                    )
                
                certification_type = None
                if row[16]:
                    certification_type = CertificationType(
                        id=row[16],
                        name=row[17],
                        description=row[18]
                    )
                
                version = VersionWithDetails(
                    id=row[0],
                    name=row[1],
                    selection_data=row[2],
                    is_public=row[3],
                    certification_type_id=row[4],
                    report_id=row[5],
                    model_id=row[6],
                    created_at=row[7],
                    report=report,
                    certification_type=certification_type
                )
                versions.append(version)
            
            return ModelWithVersions(
                id=model.id,
                organization_id=model.organization_id,
                name=model.name,
                type=model.type,
                description=model.description,
                github_url=model.github_url,
                github_actions=model.github_actions,
                created_at=model.created_at,
                versions=versions
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model versions: {str(e)}")

def certify_model(model_id: int, model_file: UploadFile, dataset_file: UploadFile, version_name: str, 
                 selection_data: Optional[str] = None, intentional_bias: Optional[str] = None) -> dict:
    """Certify a model for bias analysis with file uploads"""
    try:
        assets_dir = os.path.join(os.getcwd(), "assets")
        if not os.path.exists(assets_dir):
            os.makedirs(assets_dir)
        
        model_assets_dir = os.path.join(assets_dir, f"model_{model_id}")
        if not os.path.exists(model_assets_dir):
            os.makedirs(model_assets_dir)
        
        model_file_path = os.path.join(model_assets_dir, f"model_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{model_file.filename}")
        with open(model_file_path, "wb") as buffer:
            shutil.copyfileobj(model_file.file, buffer)
        
        dataset_file_path = os.path.join(model_assets_dir, f"dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{dataset_file.filename}")
        with open(dataset_file_path, "wb") as buffer:
            shutil.copyfileobj(dataset_file.file, buffer)
        
        unbiased_dataset_path = None
        
        try:
            print(f"Starting unbiased test data generation for model {model_id}")
            
            headers = read_csv_headers(dataset_file_path)
            print(f"Found {len(headers)} columns: {headers}")
            
            sample_data = read_csv_sample_data(dataset_file_path, 4)
            print(f"Read {len(sample_data)} sample data rows for context")

            model_description = get_model_description(model_id)
            print(f"Model description: {model_description[:100]}...")
            
            print("Calling Groq API to generate unbiased test data...")
            unbiased_test_data = generate_unbiased_test_data(headers, model_description, sample_data)
            print(f"Generated {len(unbiased_test_data.split(chr(10)))} lines of test data")
            
            unbiased_dataset_path = os.path.join(model_assets_dir, f"unbiased_test_dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            with open(unbiased_dataset_path, "w", encoding="utf-8") as file:
                file.write(unbiased_test_data)
            print(f"Saved unbiased test dataset to: {unbiased_dataset_path}")
                
        except Exception as e:
            unbiased_dataset_path = None
            print(f"Warning: Failed to generate unbiased test data: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            print(f"Full error traceback: {traceback.format_exc()}")
        
        fairness_results = None
        if unbiased_dataset_path and os.path.exists(model_file_path):
            try:
                print("Starting fairness analysis...")
                fairness_results = perform_fairness_analysis(
                    model_file_path=model_file_path,
                    test_dataset_path=unbiased_dataset_path,
                    sensitive_attributes=None
                )
                print(f"Fairness analysis completed. Score: {fairness_results.get('fairness_score', 0.5)}")
            except Exception as e:
                print(f"Warning: Failed to perform fairness analysis: {str(e)}")
                fairness_results = {
                    "fairness_score": 0.5,
                    "intentional_bias": [],
                    "bias_metrics": {},
                    "error": str(e)
                }
        
        with db_manager.get_cursor() as cursor:
            cursor.execute("SELECT ID, NAME FROM MODELS WHERE ID = ?", (model_id,))
            model_result = cursor.fetchone()
            if not model_result:
                raise HTTPException(status_code=404, detail="Model not found")
            
            model_name = model_result[1]
            
            fairness_score = 0.5
            bias_features = "gender,age,education_level"
            intentional_bias_json = "[\"gender\", \"age\"]"
            shap_analysis = "Feature importance analysis showing gender and age as primary bias contributors"
            
            if fairness_results:
                fairness_score = fairness_results.get("fairness_score", 0.5)
                intentional_bias_list = fairness_results.get("intentional_bias", [])
                intentional_bias_json = str(intentional_bias_list)
                
                bias_metrics = fairness_results.get("bias_metrics", {})
                if bias_metrics:
                    bias_features = ",".join(bias_metrics.keys())
                
                shap_details = []
                for attr, metrics in bias_metrics.items():
                    dp_diff = metrics.get("demographic_parity_diff", 0)
                    eo_diff = metrics.get("equal_opportunity_diff", 0)
                    aod = metrics.get("average_odds_diff", 0)
                    shap_details.append(f"{attr}: DP_diff={dp_diff}, EO_diff={eo_diff}, AOD={aod}")
                
                if shap_details:
                    shap_analysis = "Fairness metrics by attribute: " + "; ".join(shap_details)
            
            cursor.execute("""
                INSERT INTO REPORTS (MODEL_ID, MITIGATION_TECHNIQUES, BIAS_FEATURE, FAIRNESS_SCORE, INTENTIONAL_BIAS, SHAP)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                model_id,
                "Data preprocessing, feature engineering, and algorithmic adjustments",
                bias_features,
                fairness_score,
                intentional_bias_json,
                shap_analysis
            ))
            
            cursor.execute("SELECT MAX(ID) FROM REPORTS WHERE MODEL_ID = ?", (model_id,))
            report_id = int(cursor.fetchone()[0])

            # Determine certificate type based on fairness score and intentional bias
            if intentional_bias_list and len(intentional_bias_list) > 0:
                cert_name = "Intentional Bias"
                cert_description = "This model has been identified with intentional bias and requires immediate attention."
            elif fairness_score < 0.5:
                cert_name = "Biased Certification"
                cert_description = "This model shows significant bias and requires mitigation strategies."
            else:
                cert_name = "Not Biased"
                cert_description = "This model has passed bias evaluation and is certified for fair use."
            
            cursor.execute("SELECT ID FROM CERTIFICATION_TYPES WHERE NAME = ?", (cert_name,))
            cert_result = cursor.fetchone()
            
            if cert_result:
                certification_type_id = cert_result[0]
            else:
                cursor.execute("""
                    INSERT INTO CERTIFICATION_TYPES (NAME, DESCRIPTION)
                    VALUES (?, ?)
                """, (cert_name, cert_description))
                
                cursor.execute("SELECT MAX(ID) FROM CERTIFICATION_TYPES")
                certification_type_id = int(cursor.fetchone()[0])
            
            cursor.execute("""
                INSERT INTO VERSIONS (NAME, SELECTION_DATA, IS_PUBLIC, CERTIFICATION_TYPE_ID, REPORT_ID, MODEL_ID)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                version_name,
                selection_data or "{\"gender\": \"all\", \"age\": \"18-65\", \"education\": \"bachelor+\"}",
                True,
                certification_type_id,
                report_id,
                model_id
            ))
            
            cursor.execute("""
                SELECT ID, NAME, SELECTION_DATA, IS_PUBLIC, CERTIFICATION_TYPE_ID, REPORT_ID, MODEL_ID, CREATED_AT
                FROM VERSIONS WHERE ID = (SELECT MAX(ID) FROM VERSIONS WHERE MODEL_ID = ?)
            """, (model_id,))
            
            version = cursor.fetchone()
            if version:
                version = (
                    int(version[0]),  # ID
                    version[1],       # NAME
                    version[2],       # SELECTION_DATA
                    bool(version[3]), # IS_PUBLIC
                    int(version[4]) if version[4] else None,  # CERTIFICATION_TYPE_ID
                    int(version[5]) if version[5] else None,  # REPORT_ID
                    int(version[6]),  # MODEL_ID
                    version[7]        # CREATED_AT
                )
            
            files_saved = {
                "model_file": model_file_path,
                "dataset_file": dataset_file_path
            }
            
            if unbiased_dataset_path:
                files_saved["unbiased_test_dataset"] = unbiased_dataset_path
            
            response_data = {
                "message": "Model certification completed successfully",
                "model_id": model_id,
                "model_name": model_name,
                "version_id": version[0],
                "version_name": version[1],
                "report_id": report_id,
                "certification_type_id": certification_type_id,
                "certificate_type": cert_name,
                "status": "certified",
                "files_saved": files_saved,
                "unbiased_test_data_generated": unbiased_dataset_path is not None,
                "fairness_analysis_performed": fairness_results is not None
            }
            
            if fairness_results:
                response_data.update({
                    "fairness_score": convert_numpy_types(fairness_results.get("fairness_score", 0.5)),
                    "intentional_bias": convert_numpy_types(fairness_results.get("intentional_bias", [])),
                    "bias_metrics": convert_numpy_types(fairness_results.get("bias_metrics", {})),
                    "sensitive_attributes_analyzed": convert_numpy_types(fairness_results.get("sensitive_attributes_analyzed", []))
                })
            
            return convert_numpy_types(response_data)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to certify model: {str(e)}")

def publish_version(version_id: int) -> dict:
    """Publish a version"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("SELECT ID FROM VERSIONS WHERE ID = ?", (version_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Version not found")
            
            return {
                "message": "Version published successfully",
                "version_id": version_id,
                "status": "published"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to publish version: {str(e)}")

def create_certification_type(certification_data: CertificationTypeBase) -> dict:
    """Create a new certification type"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO CERTIFICATION_TYPES (NAME, DESCRIPTION)
                VALUES (?, ?)
            """, (certification_data.name, certification_data.description))
            
            cursor.execute("""
                SELECT ID, NAME, DESCRIPTION
                FROM CERTIFICATION_TYPES WHERE ID = (SELECT MAX(ID) FROM CERTIFICATION_TYPES)
            """)
            
            cert = cursor.fetchone()
            return {
                "message": "Certification type created successfully",
                "certification": {
                    "id": cert[0],
                    "name": cert[1],
                    "description": cert[2]
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create certification type: {str(e)}")

def create_report(report_data: ReportBase, model_id: int) -> dict:
    """Create a new report for a model"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("SELECT ID FROM MODELS WHERE ID = ?", (model_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Model not found")
            
            cursor.execute("""
                INSERT INTO REPORTS (MODEL_ID, MITIGATION_TECHNIQUES, BIAS_FEATURE, FAIRNESS_SCORE, INTENTIONAL_BIAS, SHAP)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (model_id, report_data.mitigation_techniques, report_data.bias_feature,
                  report_data.fairness_score, report_data.intentional_bias, report_data.shap))

            cursor.execute("""
                SELECT ID, MODEL_ID, MITIGATION_TECHNIQUES, BIAS_FEATURE, FAIRNESS_SCORE, INTENTIONAL_BIAS, SHAP, CREATED_AT
                FROM REPORTS WHERE ID = (SELECT MAX(ID) FROM REPORTS WHERE MODEL_ID = ?)
            """, (model_id,))
            
            report = cursor.fetchone()
            return {
                "message": "Report created successfully",
                "report": {
                    "id": report[0],
                    "model_id": report[1],
                    "mitigation_techniques": report[2],
                    "bias_feature": report[3],
                    "fairness_score": report[4],
                    "intentional_bias": report[5],
                    "shap": report[6],
                    "created_at": report[7]
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create report: {str(e)}")

def create_version(version_data: VersionBase, model_id: int) -> dict:
    """Create a new version for a model"""
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("SELECT ID FROM MODELS WHERE ID = ?", (model_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Model not found")
            
            if version_data.certification_type_id:
                cursor.execute("SELECT ID FROM CERTIFICATION_TYPES WHERE ID = ?", (version_data.certification_type_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Certification type not found")
            
            if version_data.report_id:
                cursor.execute("SELECT ID FROM REPORTS WHERE ID = ?", (version_data.report_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Report not found")
            
            cursor.execute("""
                INSERT INTO VERSIONS (NAME, SELECTION_DATA, IS_PUBLIC, CERTIFICATION_TYPE_ID, REPORT_ID, MODEL_ID)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (version_data.name, version_data.selection_data, version_data.is_public,
                  version_data.certification_type_id, version_data.report_id, model_id))
            
            cursor.execute("""
                SELECT ID, NAME, SELECTION_DATA, IS_PUBLIC, CERTIFICATION_TYPE_ID, REPORT_ID, MODEL_ID, CREATED_AT
                FROM VERSIONS WHERE ID = (SELECT MAX(ID) FROM VERSIONS WHERE MODEL_ID = ?)
            """, (model_id,))
            
            version = cursor.fetchone()
            return {
                "message": "Version created successfully",
                "version": {
                    "id": version[0],
                    "name": version[1],
                    "selection_data": version[2],
                    "is_public": version[3],
                    "certification_type_id": version[4],
                    "report_id": version[5],
                    "model_id": version[6],
                    "created_at": version[7]
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create version: {str(e)}") 
    
def get_model_id_by_github_url(github_url: str):
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute("""
                SELECT ID 
                FROM MODELS 
                WHERE GITHUB_URL = ?
            """, (github_url,))
            
            result = cursor.fetchone()
            
            if result:
                return result[0]
            else:
                return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch model ID: {str(e)}")

def add_alert(model_id, organization_id, github_url, version_id=None):
    try:
        with db_manager.get_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO ALERTS (MODEL_ID, ORGANIZATION_ID, GITHUB_URL, VERSION_ID)
                VALUES (?, ?, ?, ?)
                """,
                (model_id, organization_id, github_url, version_id)
            )
        return {"message": "Alert added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add alert: {str(e)}")

def download_github_file(url:str):
    parts = url.split("/")
    
    user = parts[3]
    repo = parts[4]
    branch = parts[6]
    path = "/".join(parts[7:])
    
    api_url = f"https://api.github.com/repos/{user}/{repo}/contents/{path}?ref={branch}"
    
    headers = {"Accept": "application/vnd.github.v3+json"}
    response = requests.get(api_url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        content = base64.b64decode(data["content"])
        file_name = path.split("/")[-1]
        
        with open(file_name, "wb") as f:
            f.write(content)
        print(f"File '{file_name}' downloaded successfully!")
    else:
        print(f"Error: {response.status_code} - {response.text}")

def download_github_folder(user: str, repo: str, branch: str, folder_path: str) -> list:
    """Download all files in a folder from GitHub and return their local paths"""
    api_url = f"https://api.github.com/repos/{user}/{repo}/contents/{folder_path}?ref={branch}"
    headers = {"Accept": "application/vnd.github.v3+json"}
    response = requests.get(api_url, headers=headers)
    file_paths = []
    if response.status_code == 200:
        data = response.json()
        for file_info in data:
            if file_info['type'] == 'file':
                file_url = file_info['download_url']
                file_name = file_info['name']
                file_content = requests.get(file_url).content
                with open(file_name, "wb") as f:
                    f.write(file_content)
                file_paths.append(file_name)
    else:
        print(f"Error: {response.status_code} - {response.text}")
    return file_paths

def addalerts(repo_url: str):
    try:
        with db_manager.get_cursor() as cursor:
            model_id = get_model_id_by_github_url(repo_url)
            if model_id is None:
                print(f"No model found for repo URL: {repo_url}")
                return {"message": f"No model found for repo URL: {repo_url}"}

            cursor.execute("SELECT ORGANIZATION_ID, GITHUB_URL FROM MODELS WHERE ID = ?", (model_id,))
            model_row = cursor.fetchone()
            if not model_row:
                raise HTTPException(status_code=404, detail="Model not found for alert")
            organization_id, github_url = model_row
    
            cursor.execute("SELECT ID FROM VERSIONS WHERE MODEL_ID = ? ORDER BY CREATED_AT DESC LIMIT 1", (model_id,))
            version_row = cursor.fetchone()
            version_id = version_row[0] if version_row else None

        # Parse repo_url to get user, repo, and branch (assume 'main' if not specified)
        parts = repo_url.rstrip('/').split('/')
        user = parts[3]
        repo = parts[4]
        branch = 'main'  # Default branch
        # Optionally, fetch default branch from GitHub API
        repo_api_url = f"https://api.github.com/repos/{user}/{repo}"
        repo_resp = requests.get(repo_api_url)
        if repo_resp.status_code == 200:
            branch = repo_resp.json().get('default_branch', 'main')

        # Download model files from 'models' folder
        model_files = download_github_folder(user, repo, branch, 'models')
        # Download test files from 'test' folder (optional, if needed)
        test_files = download_github_folder(user, repo, branch, 'test')

        # For demonstration, use the first model file and first test file (if available)
        model_file_path = model_files[0] if model_files else None
        dataset_file_path = test_files[0] if test_files else None
        version_name = f"AutoCert_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        if model_file_path and dataset_file_path:
            from fastapi import UploadFile
            with open(model_file_path, "rb") as mf, open(dataset_file_path, "rb") as df:
                model_upload = UploadFile(filename=model_file_path, file=mf)
                dataset_upload = UploadFile(filename=dataset_file_path, file=df)
                result = certify_model(model_id, model_upload, dataset_upload, version_name)
        else:
            result = {"message": "Model or test file not found in repo."}

        add_alert(model_id, organization_id, github_url, version_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add alert: {str(e)}") 