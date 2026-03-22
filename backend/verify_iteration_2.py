import requests
import time
import json

BASE_URL = "http://localhost:8000/api"

def test_rate_limiting():
    print("Testing Rate Limiting (UC-RBAC-001)...")
    url = f"{BASE_URL}/auth/login"
    payload = {"email": "invalid@cec.edu.in", "password": "wrong"}
    
    for i in range(7):
        resp = requests.post(url, json=payload)
        print(f"Attempt {i+1}: Status {resp.status_code}")
        if resp.status_code == 429:
            data = resp.json()
            print(f"SUCCESS: Received 429. Body: {data}")
            if data.get("retry_after") == 60 and "Retry-After" in resp.headers:
                print("SUCCESS: JSON body and headers match spec.")
            return True
    print("FAILED: Did not receive 429 after 6 attempts.")
    return False

def test_bulk_import():
    print("\nTesting Bulk Import Resolution (UC-RBAC-007)...")
    # First, need to login as admin
    login_url = f"{BASE_URL}/auth/login"
    login_resp = requests.post(login_url, json={"email": "admin@cec.edu.in", "password": "Admin@123"})
    if login_resp.status_code != 200:
        print(f"FAILED: Admin login failed with {login_resp.status_code}")
        return False
    
    cookies = login_resp.cookies
    import_url = f"{BASE_URL}/users/bulk-import"
    
    # Create a small CSV content
    # Note: These must exist in the DB from previous seeds
    csv_content = (
        "name,email,usn,department_code,semester,section\n"
        "Bulk Student 1,bulk1@cec.edu.in,1CE25AI999,AIML,1,E\n"
        "Bulk Student 2,bulk2@cec.edu.in,1CE25AI998,AIML,1,F\n"
    )
    
    files = {'file': ('test.csv', csv_content, 'text/csv')}
    resp = requests.post(import_url, files=files, cookies=cookies)
    
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Imported: {data.get('imported')}, Skipped: {data.get('skipped')}, Errors: {data.get('errors')}")
        if data.get('imported') > 0 and 'credentials' in data:
            print(f"SUCCESS: {len(data['credentials'])} credentials returned for download.")
            return True
        elif data.get('imported') > 0:
            print("FAILED: Imported but no credentials returned.")
    else:
        print(f"FAILED: Bulk import returned {resp.status_code} - {resp.text}")
    return False

if __name__ == "__main__":
    # Note: Backend must be running
    try:
        if test_rate_limiting():
            # Wait for rate limit to clear or use a different IP/approach 
            # (or just test bulk import if login still works for admin)
            test_bulk_import()
    except Exception as e:
        print(f"ERROR during verification: {e}")
