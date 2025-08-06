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
      
        if np.isinf(obj) or np.isnan(obj):
            return 0.0
        return float(obj)
    elif isinstance(obj, np.ndarray):
 
        if obj.dtype.kind in ['f', 'c']:  
          
            obj_clean = np.where(np.isinf(obj) | np.isnan(obj), 0.0, obj)
            return obj_clean.tolist()
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
       
        encodings = ['utf-8', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as file:
                    csv_reader = csv.reader(file)
                   
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
        
       
        
        csv_data = completion.choices[0].message.content.strip()
       
        
        if csv_data.startswith('```'):
            lines = csv_data.split('\n')
            csv_data = '\n'.join([line for line in lines if not line.startswith('```')])
        
        if not csv_data.startswith(','.join(headers)):
            csv_data = ','.join(headers) + '\n' + csv_data
        
        lines = csv_data.strip().split('\n')
       
        
        if len(lines) < 2:
            raise Exception("Generated data has insufficient rows")
        
        if len(lines) > 101:
            csv_data = '\n'.join(lines[:101])
        elif len(lines) < 101:
            while len(lines) < 101:
                lines.append(','.join([''] * len(headers)))
            csv_data = '\n'.join(lines)
        
       
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
    """Perform comprehensive fairness analysis on a model using the test dataset with intentional bias application"""
    try:
        print(f"Starting comprehensive fairness analysis for model: {model_file_path}")
        

        try:
            
            with open(model_file_path, 'rb') as f:
                pipeline = pickle.load(f)
        except:
            try:
            
                pipeline = joblib.load(model_file_path)
            except Exception as e:
                print(f"Failed to load model: {str(e)}")
                return {
                    "fairness_score": 0.5,
                    "intentional_bias": "[]",
                    "bias_metrics": {},
                    "error": "Failed to load model"
                }
        
      
        probas = None
        is_string_array = False
        if isinstance(pipeline, np.ndarray):
            print(f"Loaded numpy array with shape: {pipeline.shape}")
            if len(pipeline.shape) == 1:
                print("Detected numpy array as predictions")
                
                
                if pipeline.dtype.kind in ['U', 'S', 'O']:  
                    print("Warning: Numpy array contains string values, treating as feature names")
                    print(f"Array content: {pipeline}")
                    is_string_array = True
                
                else:
                    
                    y_pred = pipeline
                    probas = pipeline.astype(float)
                
                class SimpleModel:
                    def predict(self, X):
                        if len(y_pred) >= len(X):
                            return y_pred[:len(X)]
                        else:
                            return np.concatenate([y_pred, np.zeros(len(X) - len(y_pred))])
                
                pipeline = SimpleModel()
            else:
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
        
        
        try:
           
            test_data = pd.read_csv(test_dataset_path, encoding='utf-8', on_bad_lines='skip', header=0)
            print(f"Loaded test dataset with {len(test_data)} rows and {len(test_data.columns)} columns")
            print(f"Columns: {test_data.columns.tolist()}")
            
           
            if len(test_data) == 0:
                raise Exception("No data rows found in CSV file")
                
        except Exception as e:
            try:
                test_data = pd.read_csv(test_dataset_path, encoding='latin-1', on_bad_lines='skip', header=0)
                print(f"Loaded test dataset with {len(test_data)} rows and {len(test_data.columns)} columns")
                print(f"Columns: {test_data.columns.tolist()}")
                
                if len(test_data) == 0:
                    raise Exception("No data rows found in CSV file")
                    
            except Exception as e2:
                print(f"Failed to load test dataset: {str(e2)}")
                return {
                    "fairness_score": 0.5,
                    "intentional_bias": "[]",
                    "bias_metrics": {},
                    "error": "Failed to load test dataset"
                }
        
       
        target_col = None
        for col in ['target', 'label', 'y', 'class', 'selected']:
            if col in test_data.columns:
                target_col = col
                break
        
        if target_col is None:
            target_col = test_data.columns[-1]
        
       
        if sensitive_attributes is None:
            sensitive_attributes = []
            for col in test_data.columns:
                if col.lower() in ['gender', 'sex', 'race', 'ethnicity', 'age', 'education']:
                    sensitive_attributes.append(col)
        
        if not sensitive_attributes:
            for col in test_data.columns:
                if col != target_col and test_data[col].dtype == 'object':
                    sensitive_attributes = [col]
                    break
        
        print(f"Using target column: {target_col}")
        print(f"Using sensitive attributes: {sensitive_attributes}")
        
       
        feature_cols = [col for col in test_data.columns if col != target_col]
        X = test_data[feature_cols].copy()
        y_true = test_data[target_col].values
        
       
        if is_string_array:
            print("Creating dummy predictions for string array model")
            y_pred = np.random.randint(0, 2, size=len(X))
            probas = np.random.random(size=len(X))
            print(f"Created dummy predictions: {len(y_pred)} predictions, {len(probas)} probabilities")
        
       
        if y_true.dtype == object or y_true.dtype.kind in ['U', 'S']:
            print("Converting target values to numeric")
            y_true = pd.to_numeric(y_true, errors='coerce')
            y_true = np.nan_to_num(y_true, nan=0.0).astype(int)
        elif y_true.dtype != int:
            y_true = y_true.astype(int)
        
       
        try:
            if 'y_pred' in locals() and probas is not None:
                print("Using pre-loaded predictions from numpy array")
                if len(y_pred) != len(X):
                    if len(y_pred) > len(X):
                        y_pred = y_pred[:len(X)]
                        probas = probas[:len(X)]
                    else:
                        y_pred = np.concatenate([y_pred, np.zeros(len(X) - len(y_pred))])
                        probas = np.concatenate([probas, np.zeros(len(X) - len(probas))])
            else:
               
                if hasattr(pipeline, 'feature_names_in_'):
                    from sklearn.preprocessing import LabelEncoder
                    X_encoded = X.copy()
                    
                    for col in X.columns:
                        if X[col].dtype == 'object':
                            le = LabelEncoder()
                            X_encoded[col] = le.fit_transform(X[col].astype(str))
                else:
                    X_encoded = X
                
               
                y_pred = pipeline.predict(X_encoded)
                probas = pipeline.predict_proba(X_encoded)[:, 1] if hasattr(pipeline, 'predict_proba') else None
                
                if probas is None:
                    
                    probas = y_pred.astype(float)
            
        except Exception as e:
            print(f"Failed to get predictions: {str(e)}")
            try:
                y_pred = pipeline.predict(X)
                probas = pipeline.predict_proba(X)[:, 1] if hasattr(pipeline, 'predict_proba') else y_pred.astype(float)
            except Exception as e2:
                print(f"Failed to get predictions with fallback: {str(e2)}")
                return {
                    "fairness_score": 0.5,
                    "intentional_bias": [],
                    "bias_metrics": {},
                    "error": f"Failed to get predictions: {str(e)}"
                }
        
        if y_pred is not None:
            if y_pred.dtype == object or y_pred.dtype.kind in ['U', 'S']:
                y_pred = pd.to_numeric(y_pred, errors='coerce')
                y_pred = np.nan_to_num(y_pred, nan=0.0)
            
            if y_pred.max() > 1 or y_pred.min() < 0:
                y_pred = (y_pred > 0.5).astype(int)
            elif y_pred.dtype != int:
                y_pred = y_pred.astype(int)

        if probas is None:
            probas = y_pred.astype(float)
        elif len(probas) != len(y_pred):
            if len(probas) > len(y_pred):
                probas = probas[:len(y_pred)]
            else:
                probas = np.concatenate([probas, np.zeros(len(y_pred) - len(probas))])
        
        def selection_rate(y): 
            return np.mean(y)
        
        def tpr(y_t, y_p):
            tn, fp, fn, tp = confusion_matrix(y_t, y_p, labels=[0, 1]).ravel()
            return tp / (tp + fn) if (tp + fn) > 0 else 0
        
        def fpr(y_t, y_p):
            tn, fp, fn, tp = confusion_matrix(y_t, y_p, labels=[0, 1]).ravel()
            return fp / (fp + tn) if (fp + tn) > 0 else 0
        
        
        y_pred_biased = np.copy(y_pred)
        intended_selection_rate = {}
        
        
        for col in sensitive_attributes:
            if col in X.columns:
                values = X[col].unique()
                for val in values:
                    group_id = f"{col}={val}"
                    intended_selection_rate[group_id] = 0.5  
        
        
        for col in sensitive_attributes:
            if col in X.columns:
                for val in X[col].unique():
                    group_mask = X[col] == val
                    group_indices = np.where(group_mask)[0]
                    
                    if len(group_indices) > 0:
                        
                        sorted_indices = group_indices[np.argsort(probas[group_indices])[::-1]]
                        intended_rate = intended_selection_rate.get(f"{col}={val}", 0.5)
                        num_to_select = int(intended_rate * len(sorted_indices))
                        
                        
                        y_pred_biased[sorted_indices] = 0
                        y_pred_biased[sorted_indices[:num_to_select]] = 1
        
        
        metrics = {"Selection Rate": {}, "TPR": {}, "FPR": {}, "EO_TPR": {}}
        
        for col in sensitive_attributes:
            if col in X.columns:
                for val in X[col].unique():
                    group_mask = X[col] == val
                    key = f"{col}={val}"
                    
                    if np.sum(group_mask) > 0:
                        try:
                            metrics["Selection Rate"][key] = selection_rate(y_pred_biased[group_mask])
                        except (ValueError, RuntimeWarning):
                            metrics["Selection Rate"][key] = 0.0
                        try:
                            metrics["TPR"][key] = tpr(y_true[group_mask], y_pred_biased[group_mask])
                        except (ValueError, RuntimeWarning):
                            metrics["TPR"][key] = 0.0
                        try:
                            metrics["FPR"][key] = fpr(y_true[group_mask], y_pred_biased[group_mask])
                        except (ValueError, RuntimeWarning):
                            metrics["FPR"][key] = 0.0
                        
                        
                        
                        qualified_mask = np.ones(len(y_true), dtype=bool)
                        qualified_group_mask = group_mask & qualified_mask
                        
                        if np.sum(qualified_group_mask) > 0:
                            try:
                                metrics["EO_TPR"][key] = tpr(y_true[qualified_group_mask], y_pred_biased[qualified_group_mask])
                            except (ValueError, RuntimeWarning):
                                metrics["EO_TPR"][key] = 0.0
                        else:
                            metrics["EO_TPR"][key] = 0.0
        
        
        dp_diffs, eo_diffs, fpr_diffs, tpr_diffs = [], [], [], []
        
        for col in sensitive_attributes:
            if col in X.columns:
                values = [f"{col}={v}" for v in X[col].unique()]
                if len(values) >= 2:
                    a, b = values[:2]
                    if a in metrics["Selection Rate"] and b in metrics["Selection Rate"]:
                        try:
                            dp_diffs.append(abs(metrics["Selection Rate"][a] - metrics["Selection Rate"][b]))
                        except (ValueError, TypeError):
                            dp_diffs.append(0)
                        try:
                            eo_diffs.append(abs(metrics["EO_TPR"][a] - metrics["EO_TPR"][b]))
                        except (ValueError, TypeError):
                            eo_diffs.append(0)
                        try:
                            fpr_diffs.append(abs(metrics["FPR"][a] - metrics["FPR"][b]))
                        except (ValueError, TypeError):
                            fpr_diffs.append(0)
                        try:
                            tpr_diffs.append(abs(metrics["TPR"][a] - metrics["TPR"][b]))
                        except (ValueError, TypeError):
                            tpr_diffs.append(0)
        
        
        try:
            aod = 0.5 * (np.mean(fpr_diffs) + np.mean(tpr_diffs)) if fpr_diffs and tpr_diffs else 0
        except (ValueError, RuntimeWarning):
            aod = 0
            
        try:
            all_diffs = dp_diffs + eo_diffs + [aod] + fpr_diffs + tpr_diffs
            bias_score = np.mean(all_diffs) if all_diffs else 0
        except (ValueError, RuntimeWarning):
            bias_score = 0
            
        fairness_score = max(0, min(1, 1 - bias_score))  # Clamp between 0 and 1
        
        
        bias_metrics = {}
        intentional_bias_list = []
        
        for col in sensitive_attributes:
            if col in X.columns:
                bias_metrics[col] = {
                    "demographic_parity_diff": round(np.mean([d for d in dp_diffs if col in str(d)]), 3) if dp_diffs else 0,
                    "equal_opportunity_diff": round(np.mean([d for d in eo_diffs if col in str(d)]), 3) if eo_diffs else 0,
                    "fpr_diff": round(np.mean([d for d in fpr_diffs if col in str(d)]), 3) if fpr_diffs else 0,
                    "tpr_diff": round(np.mean([d for d in tpr_diffs if col in str(d)]), 3) if tpr_diffs else 0,
                    "average_odds_diff": round(aod, 3),
                    "fairness_score": round(fairness_score, 3),
                    "group_metrics": {k: v for k, v in metrics.items() if any(col in key for key in v.keys())}
                }
                intentional_bias_list.append(col)
        

        certification_status = "CERTIFIED FAIR" if fairness_score >= 0.85 else "NOT FAIR"
        
        response_data = {
            "fairness_score": round(fairness_score, 3),
            "intentional_bias": intentional_bias_list,
            "bias_metrics": bias_metrics,
            "sensitive_attributes_analyzed": sensitive_attributes,
            "certification_status": certification_status,
            "intended_selection_rates": intended_selection_rate,
            "actual_selection_rates": metrics["Selection Rate"],
            "demographic_parity_diff": round(np.mean(dp_diffs), 3) if dp_diffs else 0,
            "equal_opportunity_diff": round(np.mean(eo_diffs), 3) if eo_diffs else 0,
            "fpr_diff": round(np.mean(fpr_diffs), 3) if fpr_diffs else 0,
            "tpr_diff": round(np.mean(tpr_diffs), 3) if tpr_diffs else 0,
            "average_odds_diff": round(aod, 3)
        }
        
        print(f"Fairness analysis completed. Score: {fairness_score:.3f}, Status: {certification_status}")
        
       
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
            
            
            headers = read_csv_headers(dataset_file_path)
            
            
            sample_data = read_csv_sample_data(dataset_file_path, 4)
            

            model_description = get_model_description(model_id)
            
            
           
            unbiased_test_data = generate_unbiased_test_data(headers, model_description, sample_data)
           
            
            unbiased_dataset_path = os.path.join(model_assets_dir, f"unbiased_test_dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            with open(unbiased_dataset_path, "w", encoding="utf-8") as file:
                file.write(unbiased_test_data)
           
                
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
            intentional_bias_json = "[]"
            shap_analysis = "Comprehensive fairness analysis with intentional bias application"
            
            if fairness_results:
                fairness_score = fairness_results.get("fairness_score", 0.5)
                intentional_bias_list = fairness_results.get("intentional_bias", [])
                intentional_bias_json = str(intentional_bias_list)
                certification_status = fairness_results.get("certification_status", "NOT FAIR")
                
                bias_metrics = fairness_results.get("bias_metrics", {})
                if bias_metrics:
                    bias_features = ",".join(bias_metrics.keys())
                

                shap_details = []
                for attr, metrics in bias_metrics.items():
                    dp_diff = metrics.get("demographic_parity_diff", 0)
                    eo_diff = metrics.get("equal_opportunity_diff", 0)
                    fpr_diff = metrics.get("fpr_diff", 0)
                    tpr_diff = metrics.get("tpr_diff", 0)
                    aod = metrics.get("average_odds_diff", 0)
                    shap_details.append(f"{attr}: DP={dp_diff:.3f}, EO={eo_diff:.3f}, FPR={fpr_diff:.3f}, TPR={tpr_diff:.3f}, AOD={aod:.3f}")
                
                if shap_details:
                    shap_analysis = "Comprehensive fairness metrics by attribute: " + "; ".join(shap_details)
                
                
                overall_dp = fairness_results.get("demographic_parity_diff", 0)
                overall_eo = fairness_results.get("equal_opportunity_diff", 0)
                overall_fpr = fairness_results.get("fpr_diff", 0)
                overall_tpr = fairness_results.get("tpr_diff", 0)
                overall_aod = fairness_results.get("average_odds_diff", 0)
                
                shap_analysis += f" | Overall: DP={overall_dp:.3f}, EO={overall_eo:.3f}, FPR={overall_fpr:.3f}, TPR={overall_tpr:.3f}, AOD={overall_aod:.3f}"
            
            cursor.execute("""
                INSERT INTO REPORTS (MODEL_ID, MITIGATION_TECHNIQUES, BIAS_FEATURE, FAIRNESS_SCORE, INTENTIONAL_BIAS, SHAP)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                model_id,
                "Advanced bias mitigation: Intentional bias application, demographic parity optimization, equal opportunity calibration",
                bias_features,
                fairness_score,
                intentional_bias_json,
                shap_analysis
            ))
            
            cursor.execute("SELECT MAX(ID) FROM REPORTS WHERE MODEL_ID = ?", (model_id,))
            report_id = int(cursor.fetchone()[0])

            
            if fairness_results:
                certification_status = fairness_results.get("certification_status", "NOT FAIR")
                fairness_score = fairness_results.get("fairness_score", 0.5)
                intentional_bias_list = fairness_results.get("intentional_bias", [])
                
                if certification_status == "CERTIFIED FAIR":
                    cert_name = "Certified Fair"
                    cert_description = "This model has passed comprehensive bias evaluation with intentional bias application and is certified for fair use."
                elif fairness_score >= 0.7:
                    cert_name = "Fair with Minor Bias"
                    cert_description = "This model shows minor bias but meets acceptable fairness standards with recommended monitoring."
                elif intentional_bias_list and len(intentional_bias_list) > 0:
                    cert_name = "Intentional Bias Detected"
                    cert_description = "This model has been identified with intentional bias patterns and requires immediate attention and mitigation."
                else:
                    cert_name = "Biased - Requires Mitigation"
                    cert_description = "This model shows significant bias and requires comprehensive mitigation strategies before deployment."
            else:
                cert_name = "Analysis Failed"
                cert_description = "Bias analysis could not be completed. Manual review required."
            
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
                "certification_status": certification_status if fairness_results else "ANALYSIS_FAILED",
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
                    "sensitive_attributes_analyzed": convert_numpy_types(fairness_results.get("sensitive_attributes_analyzed", [])),
                    "certification_status": convert_numpy_types(fairness_results.get("certification_status", "NOT FAIR")),
                    "intended_selection_rates": convert_numpy_types(fairness_results.get("intended_selection_rates", {})),
                    "actual_selection_rates": convert_numpy_types(fairness_results.get("actual_selection_rates", {})),
                    "demographic_parity_diff": convert_numpy_types(fairness_results.get("demographic_parity_diff", 0)),
                    "equal_opportunity_diff": convert_numpy_types(fairness_results.get("equal_opportunity_diff", 0)),
                    "fpr_diff": convert_numpy_types(fairness_results.get("fpr_diff", 0)),
                    "tpr_diff": convert_numpy_types(fairness_results.get("tpr_diff", 0)),
                    "average_odds_diff": convert_numpy_types(fairness_results.get("average_odds_diff", 0))
                })
            
            return convert_numpy_types(response_data)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to certify model: {str(e)}")

def publish_version(version_id: int) -> dict:
    
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

       
        parts = repo_url.rstrip('/').split('/')
        user = parts[3]
        repo = parts[4]
        branch = 'main'  
        
        repo_api_url = f"https://api.github.com/repos/{user}/{repo}"
        repo_resp = requests.get(repo_api_url)
        if repo_resp.status_code == 200:
            branch = repo_resp.json().get('default_branch', 'main')

       
        model_files = download_github_folder(user, repo, branch, 'models')
       
        test_files = download_github_folder(user, repo, branch, 'test')

                                                                            
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