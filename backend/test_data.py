from db.connection import db_manager
from datetime import datetime

def populate_sample_data():
    try:
        with db_manager.get_cursor() as cursor:
            organizations = [
                ("TechCorp Solutions", "San Francisco", "USA", "techcorp@example.com", "password123"),
                ("AI Innovations Ltd", "London", "UK", "aiinnovations@example.com", "password123"),
                ("DataFlow Systems", "Berlin", "Germany", "dataflow@example.com", "password123"),
                ("SmartHire Inc", "Toronto", "Canada", "smarthire@example.com", "password123"),
                ("FutureTech Labs", "Singapore", "Singapore", "futuretech@example.com", "password123"),
            ]
            
            for org in organizations:
                cursor.execute("""
                    INSERT INTO ORGANIZATIONS (NAME, CITY, COUNTRY, EMAIL, PASSWORD)
                    VALUES (?, ?, ?, ?, ?)
                """, org)
            
            cursor.execute("SELECT ID FROM ORGANIZATIONS")
            org_ids = [row[0] for row in cursor.fetchall()]
            
            models = [
                (org_ids[0], "HiringAI v1.0", "Machine Learning", "AI-powered hiring model for technical roles"),
                (org_ids[0], "ResumeParser Pro", "NLP", "Advanced resume parsing and candidate matching"),
                (org_ids[1], "BiasFree Recruiter", "Deep Learning", "Fair hiring model with bias detection"),
                (org_ids[1], "TalentMatch AI", "Machine Learning", "Intelligent candidate-job matching system"),
                (org_ids[2], "EqualHire", "AI", "Ensuring equal opportunity in hiring processes"),
                (org_ids[3], "SmartRecruit", "Machine Learning", "Comprehensive recruitment automation"),
                (org_ids[4], "FairHire AI", "Deep Learning", "Bias-free hiring with transparency"),
            ]
            
            for model in models:
                cursor.execute("""
                    INSERT INTO MODELS (ORGANIZATION_ID, NAME, TYPE, DESCRIPTION)
                    VALUES (?, ?, ?, ?)
                """, model)
            
            cursor.execute("SELECT ID FROM MODELS")
            model_ids = [row[0] for row in cursor.fetchall()]
            
            certification_types = [
                ("Bias-Free Certification", "Ensures no demographic bias in hiring decisions"),
                ("Fair Hiring Standard", "Meets industry standards for fair hiring practices"),
                ("Equal Opportunity Certified", "Guarantees equal opportunity for all candidates"),
            ]
            
            for cert in certification_types:
                cursor.execute("""
                    INSERT INTO CERTIFICATION_TYPES (NAME, DESCRIPTION)
                    VALUES (?, ?)
                """, cert)
            
            cursor.execute("SELECT ID FROM CERTIFICATION_TYPES")
            cert_ids = [row[0] for row in cursor.fetchall()]
            
            reports = [
                (model_ids[0], "Comprehensive bias mitigation techniques applied", "Gender", 0.94, "None", "SHAP analysis shows balanced feature importance"),
                (model_ids[1], "Advanced NLP techniques for fair parsing", "Age", 0.91, "None", "Feature importance analysis completed"),
                (model_ids[2], "Deep learning model with bias detection", "Race", 0.96, "None", "Comprehensive SHAP analysis"),
                (model_ids[3], "Machine learning with fairness constraints", "Gender", 0.93, "None", "Fairness metrics analysis"),
                (model_ids[4], "AI model with transparency features", "Age", 0.90, "None", "Detailed bias analysis"),
                (model_ids[5], "Automated recruitment with fairness", "Gender", 0.92, "None", "Comprehensive evaluation"),
                (model_ids[6], "Transparent AI hiring system", "Race", 0.95, "None", "Full bias analysis completed"),
            ]
            
            for report in reports:
                cursor.execute("""
                    INSERT INTO REPORTS (MODEL_ID, MITIGATION_TECHNIQUES, BIAS_FEATURE, FAIRNESS_SCORE, INTENTIONAL_BIAS, SHAP)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, report)
            
            cursor.execute("SELECT ID FROM REPORTS")
            report_ids = [row[0] for row in cursor.fetchall()]
            
            versions = [
                (model_ids[0], "v1.0", "Balanced dataset with 50-50 gender distribution", True, cert_ids[0], report_ids[0]),
                (model_ids[1], "v2.1", "Age-neutral resume parsing", True, cert_ids[1], report_ids[1]),
                (model_ids[2], "v1.5", "Bias detection enabled", True, cert_ids[2], report_ids[2]),
                (model_ids[3], "v2.0", "Fair matching algorithm", True, cert_ids[0], report_ids[3]),
                (model_ids[4], "v1.2", "Equal opportunity features", True, cert_ids[1], report_ids[4]),
                (model_ids[5], "v3.0", "Automated fairness checks", True, cert_ids[2], report_ids[5]),
                (model_ids[6], "v1.8", "Transparency layer added", True, cert_ids[0], report_ids[6]),
            ]
            
            for version in versions:
                cursor.execute("""
                    INSERT INTO VERSIONS (MODEL_ID, NAME, SELECTION_DATA, IS_PUBLIC, CERTIFICATION_TYPE_ID, REPORT_ID)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, version)
            
            print("Sample data populated successfully!")
            print(f"Created {len(organizations)} organizations")
            print(f"Created {len(models)} models")
            print(f"Created {len(certification_types)} certification types")
            print(f"Created {len(reports)} reports")
            print(f"Created {len(versions)} versions")
            
    except Exception as e:
        print(f"Error populating sample data: {str(e)}")
        raise

if __name__ == "__main__":
    populate_sample_data() 