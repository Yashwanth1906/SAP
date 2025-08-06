import base64
import requests
import json

# GitHub API endpoint for file content
url = "https://api.github.com/repos/shivasankaran18/model_test/contents/model.py"

headers = {
    "Accept": "application/vnd.github.v3+json"
}

response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    decoded_content = base64.b64decode(data["content"]).decode("utf-8")
    print(decoded_content)
else:
    print(f"Error: {response.status_code}")
